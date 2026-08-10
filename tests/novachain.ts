import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Novachain } from "../target/types/novachain";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("novachain", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Novachain as Program<Novachain>;

  // Wallets
  const admin = provider.wallet as anchor.Wallet;
  const facultyWallet = Keypair.generate();
  const researcherWallet = Keypair.generate();

  // PDAs
  let globalStatePDA: PublicKey;
  let facultyPDA: PublicKey;
  let researcherPDA: PublicKey;
  let equipmentPDA: PublicKey;
  let reservationPDA: PublicKey;

  // Dummy values
  const merkleTree = Keypair.generate().publicKey;
  const sbtMintFaculty = Keypair.generate().publicKey;
  const sbtMintResearcher = Keypair.generate().publicKey;
  const cnftAssetId = Array(32).fill(1);
  const equipmentName = "Electron Microscope";
  const reservationId = "res-001";

  before(async () => {
    // Airdrop SOL
    await provider.connection.requestAirdrop(facultyWallet.publicKey, 2e9);
    await provider.connection.requestAirdrop(researcherWallet.publicKey, 2e9);
    await new Promise((r) => setTimeout(r, 2000)); 

    // Derive PDAs
    [globalStatePDA] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], program.programId);
    [facultyPDA] = PublicKey.findProgramAddressSync([Buffer.from("researcher"), facultyWallet.publicKey.toBuffer()], program.programId);
    [researcherPDA] = PublicKey.findProgramAddressSync([Buffer.from("researcher"), researcherWallet.publicKey.toBuffer()], program.programId);
    [equipmentPDA] = PublicKey.findProgramAddressSync([Buffer.from("equipment"), Buffer.from(equipmentName)], program.programId);
    [reservationPDA] = PublicKey.findProgramAddressSync([Buffer.from("reservation"), Buffer.from(reservationId)], program.programId);
  });

  it("Initializes the global state", async () => {
    await program.methods.initialize(merkleTree).accounts({
      globalState: globalStatePDA,
      admin: admin.publicKey,
      systemProgram: SystemProgram.programId,
    }).rpc();
  });

  it("Admin registers a Faculty member", async () => {
    await program.methods.registerUser({ faculty: {} }, "Computer Science", "Dr. Anika Sharma", sbtMintFaculty)
      .accounts({ globalState: globalStatePDA, admin: admin.publicKey, userWallet: facultyWallet.publicKey, researcher: facultyPDA, systemProgram: SystemProgram.programId })
      .rpc();
  });

  it("Admin registers a Researcher", async () => {
    await program.methods.registerUser({ researcher: {} }, "Physics", "Rahul Mehta", sbtMintResearcher)
      .accounts({ globalState: globalStatePDA, admin: admin.publicKey, userWallet: researcherWallet.publicKey, researcher: researcherPDA, systemProgram: SystemProgram.programId })
      .rpc();
  });

  it("Admin registers equipment", async () => {
    await program.methods.registerEquipment(equipmentName, "Microscopy", "Physics Lab A", "SN-99923", "Physics", "ipfs://uri1", cnftAssetId)
      .accounts({ globalState: globalStatePDA, admin: admin.publicKey, equipment: equipmentPDA, systemProgram: SystemProgram.programId })
      .rpc();
  });

  it("Researcher creates a reservation", async () => {
    const now = Math.floor(Date.now() / 1000);
    await program.methods.createReservation(reservationId, new anchor.BN(now), new anchor.BN(now + 3600))
      .accounts({ researcherWallet: researcherWallet.publicKey, researcher: researcherPDA, equipment: equipmentPDA, reservation: reservationPDA, systemProgram: SystemProgram.programId })
      .signers([researcherWallet])
      .rpc();

    const eq = await program.account.equipment.fetch(equipmentPDA);
    assert.ok(eq.status.hasOwnProperty("pending"));
  });

  it("Faculty approves the reservation", async () => {
    await program.methods.approveReservation(true)
      .accounts({ facultyWallet: facultyWallet.publicKey, faculty: facultyPDA, reservation: reservationPDA, equipment: equipmentPDA })
      .signers([facultyWallet])
      .rpc();

    const eq = await program.account.equipment.fetch(equipmentPDA);
    assert.ok(eq.status.hasOwnProperty("reserved"));
  });

  it("Researcher can cancel an approved reservation", async () => {
    await program.methods.cancelReservation()
      .accounts({ researcherWallet: researcherWallet.publicKey, researcher: researcherPDA, reservation: reservationPDA, equipment: equipmentPDA })
      .signers([researcherWallet])
      .rpc();

    const eq = await program.account.equipment.fetch(equipmentPDA);
    const res = await program.account.reservation.fetch(reservationPDA);
    assert.ok(eq.status.hasOwnProperty("available"));
    assert.ok(res.status.hasOwnProperty("cancelled"));
  });

  it("Admin can revoke user access", async () => {
    await program.methods.revokeUser()
      .accounts({ globalState: globalStatePDA, admin: admin.publicKey, researcher: researcherPDA })
      .rpc();
      
    const r = await program.account.researcher.fetch(researcherPDA);
    assert.ok(r.status.hasOwnProperty("revoked"));
  });

  it("Revoked user cannot create a reservation", async () => {
    try {
      const now = Math.floor(Date.now() / 1000);
      await program.methods.createReservation("res-002", new anchor.BN(now), new anchor.BN(now + 3600))
        .accounts({ researcherWallet: researcherWallet.publicKey, researcher: researcherPDA, equipment: equipmentPDA, reservation: reservationPDA, systemProgram: SystemProgram.programId })
        .signers([researcherWallet])
        .rpc();
      assert.fail("Should have thrown AccountRevoked error");
    } catch (e: any) {
      assert.include(e.message, "revoked");
    }
  });

  it("Admin can reinstate user access", async () => {
    await program.methods.reinstateUser()
      .accounts({ globalState: globalStatePDA, admin: admin.publicKey, researcher: researcherPDA })
      .rpc();
  });

  it("Admin can update user role", async () => {
    await program.methods.updateUserRole({ faculty: {} }, "Advanced Physics")
      .accounts({ globalState: globalStatePDA, admin: admin.publicKey, researcher: researcherPDA })
      .rpc();
  });

  it("Admin can decommission equipment", async () => {
    await program.methods.decommissionEquipment()
      .accounts({ globalState: globalStatePDA, admin: admin.publicKey, equipment: equipmentPDA })
      .rpc();
      
    const eq = await program.account.equipment.fetch(equipmentPDA);
    assert.ok(eq.status.hasOwnProperty("decommissioned"));
  });

});

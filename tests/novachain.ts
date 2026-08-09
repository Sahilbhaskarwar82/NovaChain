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
    // Airdrop SOL to faculty and researcher wallets for transactions
    await provider.connection.requestAirdrop(facultyWallet.publicKey, 2e9);
    await provider.connection.requestAirdrop(researcherWallet.publicKey, 2e9);
    await new Promise((r) => setTimeout(r, 2000)); // Wait for confirmations

    // Derive PDAs
    [globalStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("global_state")],
      program.programId
    );

    [facultyPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("researcher"), facultyWallet.publicKey.toBuffer()],
      program.programId
    );

    [researcherPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("researcher"), researcherWallet.publicKey.toBuffer()],
      program.programId
    );

    [equipmentPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("equipment"), Buffer.from(equipmentName)],
      program.programId
    );

    [reservationPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("reservation"), Buffer.from(reservationId)],
      program.programId
    );
  });

  // ─────────────────────────────────────────────
  // Test 1: Initialize Global State
  // ─────────────────────────────────────────────
  it("Initializes the global state with admin and merkle tree", async () => {
    await program.methods
      .initialize(merkleTree)
      .accounts({
        globalState: globalStatePDA,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const gs = await program.account.globalState.fetch(globalStatePDA);
    assert.strictEqual(gs.admin.toBase58(), admin.publicKey.toBase58(), "Admin mismatch");
    assert.strictEqual(gs.merkleTree.toBase58(), merkleTree.toBase58(), "Merkle tree mismatch");
    console.log("✅ Global state initialized");
  });

  // ─────────────────────────────────────────────
  // Test 2: Register Faculty
  // ─────────────────────────────────────────────
  it("Admin registers a Faculty member", async () => {
    await program.methods
      .registerUser(
        { faculty: {} },
        "Computer Science",
        "Dr. Anika Sharma",
        sbtMintFaculty
      )
      .accounts({
        globalState: globalStatePDA,
        admin: admin.publicKey,
        userWallet: facultyWallet.publicKey,
        researcher: facultyPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const faculty = await program.account.researcher.fetch(facultyPDA);
    assert.ok(faculty.role.hasOwnProperty("faculty"), "Role should be Faculty");
    assert.strictEqual(faculty.name, "Dr. Anika Sharma");
    console.log("✅ Faculty registered:", faculty.name);
  });

  // ─────────────────────────────────────────────
  // Test 3: Register Researcher
  // ─────────────────────────────────────────────
  it("Admin registers a Researcher", async () => {
    await program.methods
      .registerUser(
        { researcher: {} },
        "Physics",
        "Rahul Mehta",
        sbtMintResearcher
      )
      .accounts({
        globalState: globalStatePDA,
        admin: admin.publicKey,
        userWallet: researcherWallet.publicKey,
        researcher: researcherPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const researcher = await program.account.researcher.fetch(researcherPDA);
    assert.ok(researcher.role.hasOwnProperty("researcher"), "Role should be Researcher");
    assert.strictEqual(researcher.name, "Rahul Mehta");
    console.log("✅ Researcher registered:", researcher.name);
  });

  // ─────────────────────────────────────────────
  // Test 4: Register Equipment
  // ─────────────────────────────────────────────
  it("Admin registers a piece of equipment", async () => {
    await program.methods
      .registerEquipment(
        equipmentName,
        "Microscopy",
        "Physics Lab A",
        cnftAssetId
      )
      .accounts({
        globalState: globalStatePDA,
        admin: admin.publicKey,
        equipment: equipmentPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const equipment = await program.account.equipment.fetch(equipmentPDA);
    assert.strictEqual(equipment.name, equipmentName);
    assert.ok(equipment.status.hasOwnProperty("available"), "Status should be Available");
    console.log("✅ Equipment registered:", equipment.name);
  });

  // ─────────────────────────────────────────────
  // Test 5: Create Reservation
  // ─────────────────────────────────────────────
  it("Researcher creates a reservation for equipment", async () => {
    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .createReservation(reservationId, new anchor.BN(now), new anchor.BN(now + 3600))
      .accounts({
        researcherWallet: researcherWallet.publicKey,
        researcher: researcherPDA,
        equipment: equipmentPDA,
        reservation: reservationPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([researcherWallet])
      .rpc();

    const reservation = await program.account.reservation.fetch(reservationPDA);
    assert.ok(reservation.status.hasOwnProperty("pending"), "Reservation should be Pending");
    console.log("✅ Reservation created with status:", Object.keys(reservation.status)[0]);
  });

  // ─────────────────────────────────────────────
  // Test 6: Approve Reservation
  // ─────────────────────────────────────────────
  it("Faculty approves the reservation", async () => {
    await program.methods
      .approveReservation(true)
      .accounts({
        facultyWallet: facultyWallet.publicKey,
        faculty: facultyPDA,
        reservation: reservationPDA,
        equipment: equipmentPDA,
      })
      .signers([facultyWallet])
      .rpc();

    const reservation = await program.account.reservation.fetch(reservationPDA);
    const equipment = await program.account.equipment.fetch(equipmentPDA);
    assert.ok(reservation.status.hasOwnProperty("approved"), "Reservation should be Approved");
    assert.ok(equipment.status.hasOwnProperty("reserved"), "Equipment should be Reserved");
    console.log("✅ Reservation approved, equipment is now Reserved");
  });

  // ─────────────────────────────────────────────
  // Test 7: RBAC - Non-faculty cannot approve
  // ─────────────────────────────────────────────
  it("Researcher CANNOT approve reservations (RBAC check)", async () => {
    try {
      await program.methods
        .approveReservation(true)
        .accounts({
          facultyWallet: researcherWallet.publicKey,  // Using researcher as faculty — should fail
          faculty: researcherPDA,
          reservation: reservationPDA,
          equipment: equipmentPDA,
        })
        .signers([researcherWallet])
        .rpc();
      assert.fail("Should have thrown Unauthorized error");
    } catch (err: any) {
      assert.include(err.message, "Unauthorized");
      console.log("✅ RBAC check passed — Researcher correctly blocked from approving");
    }
  });

  // ─────────────────────────────────────────────
  // Test 8: Publish Paper
  // ─────────────────────────────────────────────
  it("Faculty can publish a research paper", async () => {
    await program.methods
      .publishPaper("Quantum Computing in Lab", "10.1234/qcl", cnftAssetId)
      .accounts({
        facultyWallet: facultyWallet.publicKey,
        faculty: facultyPDA,
        globalState: globalStatePDA,
        researcherWallet: researcherWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([facultyWallet])
      .rpc();
    console.log("✅ Paper published successfully");
  });
});

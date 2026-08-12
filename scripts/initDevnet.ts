import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import path from "path";

// Load the admin keypair from the Solana CLI default location
const keypairPath = `${os.homedir()}/.config/solana/id.json`;
const secretKeyString = fs.readFileSync(keypairPath, "utf-8");
const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
const adminKeypair = Keypair.fromSecretKey(secretKey);

// Setup Devnet provider
const connection = new anchor.web3.Connection(
  process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || "https://api.devnet.solana.com",
  "confirmed"
);
const wallet = new anchor.Wallet(adminKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" });
anchor.setProvider(provider);

// Load the program
const idlPath = path.join(__dirname, "../target/idl/novachain.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
const program = new Program(idl, provider) as any;

async function main() {
  console.log("Admin Wallet:", adminKeypair.publicKey.toBase58());
  console.log("Program ID:  DBfVgqx6nkAYYGjMQbodBLVgXJa8tDztzZyiragHXxZc");
  
  const [globalStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    program.programId
  );

  try {
    const existingState = await program.account.globalState.fetch(globalStatePDA);
    console.log("✅ Contract is already initialized!");
    console.log("Admin on-chain:", existingState.admin.toBase58());
    return;
  } catch (e) {
    console.log("Global state not found. Initializing on Devnet...");
  }

  const dummyTree = Keypair.generate().publicKey;

  try {
    const tx = await program.methods
      .initialize(dummyTree)
      .accounts({
        globalState: globalStatePDA,
        admin: adminKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([adminKeypair])
      .rpc();
      
    console.log("🎉 Successfully initialized on Devnet!");
    console.log("Transaction Hash:", tx);
  } catch (err) {
    console.error("Failed to initialize:", err);
  }
}

main();

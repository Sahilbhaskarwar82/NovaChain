import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "@/idl/novachain.json";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "E5tjhztUxbo3Aa6Up8wH4NucXDzhcez56haLm5DbShiw"
);

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

export const connection = new Connection(RPC_URL, "confirmed");

// ─── PDA Derivation Helpers ────────────────────────────────────────────────

export function getGlobalStatePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    PROGRAM_ID
  );
}

export function getResearcherPDA(walletPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("researcher"), walletPubkey.toBuffer()],
    PROGRAM_ID
  );
}

export function getEquipmentPDA(name: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("equipment"), Buffer.from(name)],
    PROGRAM_ID
  );
}

export function getReservationPDA(reservationId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("reservation"), Buffer.from(reservationId)],
    PROGRAM_ID
  );
}

// ─── Program Instance ─────────────────────────────────────────────────────

export function getProgram(provider: AnchorProvider): Program {
  setProvider(provider);
  return new Program(idl as Idl, provider);
}

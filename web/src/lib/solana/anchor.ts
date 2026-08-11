import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "@/idl/novachain.json";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "DBfVgqx6nkAYYGjMQbodBLVgXJa8tDztzZyiragHXxZc"
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

export async function getPublicationPDA(authorWallet: PublicKey, doi: string): Promise<[PublicKey, number]> {
  // .slice().buffer gives a plain ArrayBuffer (not ArrayBufferLike) to satisfy Web Crypto
  const data = new TextEncoder().encode(doi);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data.slice().buffer);
  const hashArray = new Uint8Array(hashBuffer);

  return PublicKey.findProgramAddressSync(
    [Buffer.from("publication"), authorWallet.toBuffer(), hashArray],
    PROGRAM_ID
  );
}

// ─── Program Instance ─────────────────────────────────────────────────────

export function getProgram(provider: AnchorProvider): Program {
  setProvider(provider);
  return new Program(idl as Idl, provider);
}

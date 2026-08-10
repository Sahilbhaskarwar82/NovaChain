import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { RPC_URL } from "./anchor";

export function getUmi(wallet: any) {
  const umi = createUmi(RPC_URL)
    .use(mplBubblegum())
    .use(walletAdapterIdentity(wallet));
  return umi;
}

export function generateMockAssetId(): number[] {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
}

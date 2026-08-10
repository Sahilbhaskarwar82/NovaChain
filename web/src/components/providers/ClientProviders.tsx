"use client";

import React, { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { RPC_URL } from "@/lib/solana/anchor";

// Import default wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  // Modern wallets like Phantom and Solflare implement the Wallet Standard
  // and are automatically detected. We can pass an empty array or just rely on the standard.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

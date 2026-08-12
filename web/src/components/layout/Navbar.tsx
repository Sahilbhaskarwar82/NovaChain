"use client";

import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { AnchorProvider } from "@coral-xyz/anchor";
import { useEffect, useState } from "react";
import Link from "next/link";
import { connection, getGlobalStatePDA, getProgram, getResearcherPDA } from "@/lib/solana/anchor";
import { motion } from "framer-motion";

type Role = "Admin" | "Faculty" | "Researcher" | null;

const ROLE_COLORS: Record<string, string> = {
  Admin: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  Faculty: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  Researcher: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
};

const ROLE_LINKS: Record<string, string> = {
  Admin: "/admin",
  Faculty: "/faculty",
  Researcher: "/researcher",
};

export function Navbar() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [role, setRole] = useState<Role>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!publicKey || !anchorWallet) {
      setRole(null);
      return;
    }
    (async () => {
      try {
        const provider = new AnchorProvider(connection, anchorWallet, {});
        const program = getProgram(provider);

        // Check if this wallet is the admin
        const [globalStatePDA] = getGlobalStatePDA();
        const gs = await (program.account as any).globalState.fetch(globalStatePDA).catch(() => null);
        if (gs && (gs.admin as { toString(): string }).toString() === publicKey.toString()) {
          setRole("Admin");
          return;
        }

        // Otherwise check their researcher PDA role
        const [researcherPDA] = getResearcherPDA(publicKey);
        const researcher = await (program.account as any).researcher.fetch(researcherPDA).catch(() => null);
        if (researcher) {
          const r = researcher.role as Record<string, unknown>;
          if ("faculty" in r) setRole("Faculty");
          else setRole("Researcher");
        } else {
          setRole(null);
        }
      } catch {
        setRole(null);
      }
    })();
  }, [publicKey, anchorWallet]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-surface/80 backdrop-blur-2xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary-glow group-hover:shadow-accent-glow transition-all duration-500 group-hover:scale-105">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-extrabold text-white text-xl tracking-tight">NovaChain</span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {role && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <Link
                href={ROLE_LINKS[role]}
                className={`text-sm font-semibold px-4 py-2 rounded-full border ${ROLE_COLORS[role]} shadow-sm transition-all hover:scale-105`}
              >
                {role} Dashboard
              </Link>
            </motion.div>
          )}
        </div>

        {/* Wallet — only render on client to avoid SSR/hydration mismatch */}
        {mounted && (
          <WalletMultiButton />
        )}
      </div>
    </nav>
  );
}

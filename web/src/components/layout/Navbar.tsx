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
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#080c14]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-bold text-white text-lg tracking-tight">NovaChain</span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-6">
          {role && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <Link
                href={ROLE_LINKS[role]}
                className={`text-sm font-medium px-3 py-1 rounded-full border ${ROLE_COLORS[role]} transition-all`}
              >
                {role} Dashboard
              </Link>
            </motion.div>
          )}
        </div>

        {/* Wallet — only render on client to avoid SSR/hydration mismatch */}
        {mounted && (
          <WalletMultiButton
            style={{
              background: "linear-gradient(135deg, #7c3aed, #0891b2)",
              borderRadius: "0.625rem",
              height: "38px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          />
        )}
      </div>
    </nav>
  );
}

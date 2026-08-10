"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { Shield, Microscope, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { connection, getGlobalStatePDA, getProgram, getResearcherPDA } from "@/lib/solana/anchor";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const { publicKey, wallet } = useWallet();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!publicKey) return;

    let isMounted = true;
    const checkRole = async () => {
      setLoading(true);
      try {
        // @ts-expect-error - We only need publicKey for reading
        const provider = new AnchorProvider(connection, { publicKey }, {});
        const program = getProgram(provider);

        const [globalStatePDA] = getGlobalStatePDA();
        const gs = await program.account.globalState.fetch(globalStatePDA).catch(() => null);

        if (gs && gs.admin.toString() === publicKey.toString()) {
          if (isMounted) router.push("/admin");
          return;
        }

        const [researcherPDA] = getResearcherPDA(publicKey);
        const researcher = await program.account.researcher.fetch(researcherPDA).catch(() => null);

        if (researcher) {
          const status = researcher.status as any;
          if (status.revoked !== undefined) {
            alert("Your account has been revoked by the administrator.");
            return;
          }

          const r = researcher.role as any;
          if (r.faculty) {
             if (isMounted) router.push("/faculty");
          } else {
             if (isMounted) router.push("/researcher");
          }
        }
      } catch (e) {
        console.error("Error checking role:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkRole();

    return () => { isMounted = false; };
  }, [publicKey, router]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-4xl z-10"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
          The Future of <br className="hidden md:block" />
          <span className="gradient-text">Research Infrastructure</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          NovaChain empowers institutions with decentralized lab equipment booking, soulbound researcher identities, and verifiable on-chain publication tracking.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          {!publicKey ? (
            <div className="transform scale-125 origin-center">
              {mounted && (
                <WalletMultiButton 
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #0891b2)",
                    borderRadius: "12px",
                    height: "48px",
                    fontSize: "16px",
                    fontWeight: 600,
                    boxShadow: "0 0 20px rgba(124, 58, 237, 0.3)"
                  }}
                />
              )}
            </div>
          ) : loading ? (
            <div className="flex items-center gap-3 text-violet-400 font-medium bg-violet-500/10 px-6 py-3 rounded-full border border-violet-500/20 glass">
              <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              Routing to your dashboard...
            </div>
          ) : (
            <div className="text-amber-400 font-medium bg-amber-500/10 px-6 py-3 rounded-full border border-amber-500/20 glass">
              Waiting for Role Detection...
            </div>
          )}
        </div>
      </motion.div>

      {/* Feature Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 max-w-5xl z-10 w-full"
      >
        <FeatureCard 
          icon={<Shield className="w-6 h-6 text-violet-400" />}
          title="Soulbound Identity"
          desc="Role-based access control backed by non-transferable SBTs for Faculty and Researchers."
        />
        <FeatureCard 
          icon={<Microscope className="w-6 h-6 text-cyan-400" />}
          title="Equipment cNFTs"
          desc="High-value lab instruments tokenized as compressed NFTs for transparent availability tracking."
        />
        <FeatureCard 
          icon={<Award className="w-6 h-6 text-amber-400" />}
          title="Verified Publishing"
          desc="Research papers immutably linked to their authors through Metaplex Bubblegum trees."
        />
      </motion.div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="glass-card p-8 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

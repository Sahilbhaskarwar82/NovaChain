"use client";

import { useEffect, useState } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { 
  connection, 
  getProgram, 
  getResearcherPDA,
  getGlobalStatePDA 
} from "@/lib/solana/anchor";
import { generateMockAssetId } from "@/lib/solana/umi";
import { motion } from "framer-motion";
import { BookOpen, Check, X, FileText } from "lucide-react";

type Reservation = {
  publicKey: PublicKey;
  account: {
    equipmentPda: PublicKey;
    researcherPda: PublicKey;
    startTime: any;
    endTime: any;
    status: any;
  };
};

export default function FacultyDashboard() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Publish Paper State
  const [title, setTitle] = useState("");
  const [doi, setDoi] = useState("");
  const [authorWallet, setAuthorWallet] = useState("");
  const [publishLoading, setPublishLoading] = useState(false);

  const fetchReservations = async () => {
    if (!anchorWallet) return;
    try {
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);
      // Fetch all reservations. In production, we'd use an indexer.
      const res = await program.account.reservation.all();
      // Filter for Pending only
      setReservations(res.filter(r => (r.account.status as any).pending !== undefined));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (anchorWallet) fetchReservations();
  }, [anchorWallet]);

  const handleApproval = async (resPubkey: PublicKey, equipmentPubkey: PublicKey, approve: boolean) => {
    if (!anchorWallet || !publicKey) return;
    try {
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);
      const [facultyPDA] = getResearcherPDA(publicKey);

      await program.methods
        .approveReservation(approve)
        .accounts({
          facultyWallet: publicKey,
          faculty: facultyPDA,
          reservation: resPubkey,
          equipment: equipmentPubkey,
        })
        .rpc();

      // Refresh list
      fetchReservations();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const handlePublishPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anchorWallet || !publicKey) return;

    setPublishLoading(true);
    try {
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);
      
      const [facultyPDA] = getResearcherPDA(publicKey);
      const [globalStatePDA] = getGlobalStatePDA();
      const mockAssetId = generateMockAssetId();

      await program.methods
        .publishPaper(title, doi, mockAssetId)
        .accounts({
          facultyWallet: publicKey,
          faculty: facultyPDA,
          globalState: globalStatePDA,
          researcherWallet: new PublicKey(authorWallet),
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      alert("Paper published as cNFT!");
      setTitle("");
      setDoi("");
      setAuthorWallet("");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setPublishLoading(false);
    }
  };

  if (!publicKey) {
    return <div className="text-center mt-20 text-slate-400">Please connect your wallet...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center gap-4 mb-12">
        <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center glow-violet">
          <BookOpen className="text-violet-400 w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Faculty Dashboard</h1>
          <p className="text-slate-400 mt-1">Review lab reservations and publish research cNFTs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reservation Queue */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <Check className="text-emerald-400" />
            <h2 className="text-xl font-semibold">Pending Reservations</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {loading ? (
              <div className="text-slate-400 text-sm">Loading queue...</div>
            ) : reservations.length === 0 ? (
              <div className="text-slate-500 text-sm italic">No pending reservations.</div>
            ) : (
              reservations.map((res) => (
                <div key={res.publicKey.toBase58()} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-mono text-slate-300 mb-1">
                      Eq: {res.account.equipmentPda.toBase58().slice(0, 8)}...
                    </div>
                    <div className="text-xs text-slate-500">
                      Req by: {res.account.researcherPda.toBase58().slice(0, 8)}...
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApproval(res.publicKey, res.account.equipmentPda, false)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleApproval(res.publicKey, res.account.equipmentPda, true)}
                      className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Publish Paper Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-amber-400" />
            <h2 className="text-xl font-semibold">Publish Research Paper</h2>
          </div>
          
          <form onSubmit={handlePublishPaper} className="space-y-5">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Paper Title</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Advancements in Quantum Sensing"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">DOI (Digital Object Identifier)</label>
              <input 
                type="text" 
                required
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                placeholder="10.1000/xyz123"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-2">Author (Researcher Wallet)</label>
              <input 
                type="text" 
                required
                value={authorWallet}
                onChange={(e) => setAuthorWallet(e.target.value)}
                placeholder="Solana Base58 Address"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="pt-2">
              <button 
                disabled={publishLoading}
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {publishLoading ? "Publishing..." : "Mint Publication cNFT"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

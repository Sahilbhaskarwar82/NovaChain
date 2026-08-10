"use client";

import { useState } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Keypair, SystemProgram, PublicKey } from "@solana/web3.js";
import { 
  connection, 
  getProgram, 
  getGlobalStatePDA, 
  getResearcherPDA,
  getEquipmentPDA 
} from "@/lib/solana/anchor";
import { generateMockAssetId } from "@/lib/solana/umi";
import { motion } from "framer-motion";
import { Shield, Microscope, Plus, UserPlus } from "lucide-react";

export default function AdminDashboard() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();

  // Register User State
  const [role, setRole] = useState<"Faculty" | "Researcher">("Researcher");
  const [userWallet, setUserWallet] = useState("");
  const [department, setDepartment] = useState("");
  const [userName, setUserName] = useState("");

  // Register Equipment State
  const [eqName, setEqName] = useState("");
  const [eqCategory, setEqCategory] = useState("");
  const [eqLab, setEqLab] = useState("");

  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anchorWallet || !publicKey) return;

    setLoading(true);
    setTxHash("");
    try {
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);
      
      const [globalStatePDA] = getGlobalStatePDA();
      const targetWallet = new PublicKey(userWallet);
      const [researcherPDA] = getResearcherPDA(targetWallet);

      // Dummy SBT Mint for now
      const sbtMint = Keypair.generate().publicKey;

      const tx = await program.methods
        .registerUser(
          role === "Faculty" ? { faculty: {} } : { researcher: {} },
          department,
          userName,
          sbtMint
        )
        .accounts({
          globalState: globalStatePDA,
          admin: publicKey,
          userWallet: targetWallet,
          researcher: researcherPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setTxHash(tx);
      setUserName("");
      setDepartment("");
      setUserWallet("");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anchorWallet || !publicKey) return;

    setLoading(true);
    setTxHash("");
    try {
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);
      
      const [globalStatePDA] = getGlobalStatePDA();
      const [equipmentPDA] = getEquipmentPDA(eqName);
      
      // We use a mock Asset ID here. In production, this would be the actual ID from Pinata/Umi.
      const mockAssetId = generateMockAssetId();

      const tx = await program.methods
        .registerEquipment(
          eqName,
          eqCategory,
          eqLab,
          mockAssetId
        )
        .accounts({
          globalState: globalStatePDA,
          admin: publicKey,
          equipment: equipmentPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setTxHash(tx);
      setEqName("");
      setEqCategory("");
      setEqLab("");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return <div className="text-center mt-20 text-slate-400">Please connect your wallet...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center gap-4 mb-12">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center glow-amber">
          <Shield className="text-amber-400 w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage network participants and lab infrastructure.</p>
        </div>
      </div>

      {txHash && (
        <div className="mb-8 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
          Transaction Success! Hash:{" "}
          <a href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`} target="_blank" rel="noreferrer" className="underline font-mono">
            {txHash.slice(0, 16)}...
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Register User Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <UserPlus className="text-violet-400" />
            <h2 className="text-xl font-semibold">Register User</h2>
          </div>
          
          <form onSubmit={handleRegisterUser} className="space-y-5">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Role</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
              >
                <option value="Faculty">Faculty</option>
                <option value="Researcher">Researcher</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-2">Wallet Address</label>
              <input 
                type="text" 
                required
                value={userWallet}
                onChange={(e) => setUserWallet(e.target.value)}
                placeholder="Solana Base58 Address"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Department</label>
                <input 
                  type="text" 
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            <button 
              disabled={loading}
              type="submit"
              className="w-full mt-4 bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Processing..." : "Mint Soulbound Identity (SBT)"}
            </button>
          </form>
        </motion.div>

        {/* Register Equipment Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <Microscope className="text-cyan-400" />
            <h2 className="text-xl font-semibold">Tokenize Equipment</h2>
          </div>
          
          <form onSubmit={handleRegisterEquipment} className="space-y-5">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Equipment Name</label>
              <input 
                type="text" 
                required
                value={eqName}
                onChange={(e) => setEqName(e.target.value)}
                placeholder="e.g. Electron Microscope MX-900"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Category</label>
                <input 
                  type="text" 
                  required
                  value={eqCategory}
                  onChange={(e) => setEqCategory(e.target.value)}
                  placeholder="e.g. Microscopy"
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Lab Location</label>
                <input 
                  type="text" 
                  required
                  value={eqLab}
                  onChange={(e) => setEqLab(e.target.value)}
                  placeholder="e.g. Building B, Room 402"
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div className="pt-2">
              <div className="text-xs text-slate-500 mb-4 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1 shrink-0" />
                This will automatically generate a Compressed NFT (cNFT) proof and register it on-chain via Metaplex Bubblegum.
              </div>
              <button 
                disabled={loading}
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {loading ? "Processing..." : "Register & Mint cNFT"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

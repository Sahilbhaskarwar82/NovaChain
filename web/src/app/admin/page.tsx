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
import { uploadFileToPinata } from "@/lib/solana/pinata";
import { motion } from "framer-motion";
import { Shield, Microscope, Plus, UserPlus, Settings, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminDashboard() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const router = useRouter();

  // Register User State
  const [role, setRole] = useState<"Faculty" | "Researcher">("Researcher");
  const [userWallet, setUserWallet] = useState("");
  const [department, setDepartment] = useState("");
  const [userName, setUserName] = useState("");

  // Register Equipment State
  const [eqName, setEqName] = useState("");
  const [eqCategory, setEqCategory] = useState("");
  const [eqLab, setEqLab] = useState("");
  const [eqSerialNumber, setEqSerialNumber] = useState("");
  const [eqDepartment, setEqDepartment] = useState("");
  const [eqImage, setEqImage] = useState<File | null>(null);

  // User Lifecycle State
  const [manageUserWallet, setManageUserWallet] = useState("");
  const [newRole, setNewRole] = useState<"Faculty" | "Researcher">("Researcher");
  const [newDepartment, setNewDepartment] = useState("");

  // Decommission State
  const [decommissionEqName, setDecommissionEqName] = useState("");

  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anchorWallet || !publicKey) {
      alert("Please connect your wallet first.");
      return;
    }

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
    if (!eqImage) {
      alert("Please select an equipment image.");
      return;
    }

    setLoading(true);
    setTxHash("");
    try {
      // 1. Upload Image to Pinata
      let imageUri = "";
      try {
        imageUri = await uploadFileToPinata(eqImage);
      } catch (err: any) {
        throw new Error(`IPFS Upload Failed: ${err.message}`);
      }

      // 2. Register on-chain
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);
      
      const [globalStatePDA] = getGlobalStatePDA();
      const [equipmentPDA] = getEquipmentPDA(eqName);
      
      const mockAssetId = generateMockAssetId();

      const tx = await program.methods
        .registerEquipment(
          eqName,
          eqCategory,
          eqLab,
          eqSerialNumber,
          eqDepartment,
          imageUri,
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
      setEqSerialNumber("");
      setEqDepartment("");
      setEqImage(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUserLifecycle = async (action: "revoke" | "reinstate" | "updateRole") => {
    if (!anchorWallet || !publicKey || !manageUserWallet) return;
    
    setLoading(true);
    setTxHash("");
    try {
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);
      const [globalStatePDA] = getGlobalStatePDA();
      const targetWallet = new PublicKey(manageUserWallet);
      const [researcherPDA] = getResearcherPDA(targetWallet);

      let tx = "";
      
      if (action === "revoke") {
        tx = await program.methods.revokeUser().accounts({
          globalState: globalStatePDA,
          admin: publicKey,
          researcher: researcherPDA,
        }).rpc();
      } else if (action === "reinstate") {
        tx = await program.methods.reinstateUser().accounts({
          globalState: globalStatePDA,
          admin: publicKey,
          researcher: researcherPDA,
        }).rpc();
      } else if (action === "updateRole") {
        if (!newDepartment) throw new Error("Please specify the new department.");
        tx = await program.methods.updateUserRole(
          newRole === "Faculty" ? { faculty: {} } : { researcher: {} },
          newDepartment
        ).accounts({
          globalState: globalStatePDA,
          admin: publicKey,
          researcher: researcherPDA,
        }).rpc();
      }

      setTxHash(tx);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDecommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anchorWallet || !publicKey) return;

    setLoading(true);
    setTxHash("");
    try {
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);
      const [globalStatePDA] = getGlobalStatePDA();
      const [equipmentPDA] = getEquipmentPDA(decommissionEqName);

      const tx = await program.methods.decommissionEquipment().accounts({
        globalState: globalStatePDA,
        admin: publicKey,
        equipment: equipmentPDA,
      }).rpc();

      setTxHash(tx);
      setDecommissionEqName("");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!publicKey) {
      router.push("/");
    }
  }, [publicKey, router]);

  if (!publicKey) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center gap-4 mb-12">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center glow-amber">
          <Shield className="text-amber-400 w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage network participants, lab infrastructure, and access control.</p>
        </div>
      </div>

      {txHash && (
        <div className="mb-8 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 break-all">
          Transaction Success! Hash:{" "}
          <a href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`} target="_blank" rel="noreferrer" className="underline font-mono">
            {txHash}
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Registration Column */}
        <div className="space-y-8">
          {/* Register User */}
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
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500"
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
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500"
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
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Department</label>
                  <input 
                    type="text" 
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500"
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

          {/* User Lifecycle Management */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-8 border-rose-500/10">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="text-rose-400" />
              <h2 className="text-xl font-semibold">User Lifecycle Management</h2>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Target Wallet Address</label>
                <input 
                  type="text" 
                  value={manageUserWallet}
                  onChange={(e) => setManageUserWallet(e.target.value)}
                  placeholder="Solana Base58 Address"
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => handleUserLifecycle("revoke")}
                  disabled={loading || !manageUserWallet}
                  className="flex-1 bg-red-600/20 text-red-500 hover:bg-red-600/30 font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Revoke Access
                </button>
                <button 
                  onClick={() => handleUserLifecycle("reinstate")}
                  disabled={loading || !manageUserWallet}
                  className="flex-1 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30 font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Reinstate Access
                </button>
              </div>

              <div className="pt-4 border-t border-white/5">
                <label className="block text-sm text-slate-400 mb-2">Update Role/Department</label>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <select 
                    value={newRole} 
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Faculty">Faculty</option>
                    <option value="Researcher">Researcher</option>
                  </select>
                  <input 
                    type="text" 
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="New Department"
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <button 
                  onClick={() => handleUserLifecycle("updateRole")}
                  disabled={loading || !manageUserWallet}
                  className="w-full bg-slate-800 text-white hover:bg-slate-700 font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Update Role
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Equipment Column */}
        <div className="space-y-8">
          {/* Register Equipment */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-8">
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
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
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
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
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
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Serial Number</label>
                  <input 
                    type="text" 
                    required
                    value={eqSerialNumber}
                    onChange={(e) => setEqSerialNumber(e.target.value)}
                    placeholder="SN-123456"
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Department</label>
                  <input 
                    type="text" 
                    required
                    value={eqDepartment}
                    onChange={(e) => setEqDepartment(e.target.value)}
                    placeholder="e.g. Bio-Engineering"
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Equipment Image</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setEqImage(e.target.files?.[0] || null)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2 text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20"
                />
              </div>

              <div className="pt-2">
                <button 
                  disabled={loading}
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? "Uploading & Minting..." : "Register & Mint cNFT"}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Decommission Equipment */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-8 border-orange-500/10">
            <div className="flex items-center gap-3 mb-6">
              <Trash2 className="text-orange-400" />
              <h2 className="text-xl font-semibold">Decommission Equipment</h2>
            </div>
            <form onSubmit={handleDecommission} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Equipment Name</label>
                <input 
                  type="text" 
                  required
                  value={decommissionEqName}
                  onChange={(e) => setDecommissionEqName(e.target.value)}
                  placeholder="e.g. Electron Microscope MX-900"
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <button 
                disabled={loading || !decommissionEqName}
                type="submit"
                className="w-full bg-orange-600/20 text-orange-500 hover:bg-orange-600/30 font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Processing..." : "Decommission Asset"}
              </button>
            </form>
          </motion.div>
        </div>

      </div>
    </div>
  );
}

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
import { uploadFileToPinata } from "@/lib/solana/pinata";
import { motion } from "framer-motion";
import { BookOpen, Check, FileText, X, GraduationCap, CheckSquare, Microscope, XCircle, CheckCircle2, Award } from "lucide-react";
import { useRouter } from "next/navigation";

type Reservation = {
  publicKey: PublicKey;
  account: {
    equipmentPda: PublicKey;
    researcherPda: PublicKey;
    startTime: any;
    endTime: any;
    status: any;
  };
  equipment?: {
    name: string;
    uri: string;
  };
};

type Publication = {
  publicKey: PublicKey;
  account: {
    author: PublicKey;
    faculty: PublicKey;
    title: string;
    doi: string;
    uri: string;
    publishedAt: any;
  };
};

export default function FacultyDashboard() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const router = useRouter();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);

  // Publish Paper State
  const [title, setTitle] = useState("");
  const [doi, setDoi] = useState("");
  const [authorWallet, setAuthorWallet] = useState("");
  const [paperPdf, setPaperPdf] = useState<File | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [publishedUri, setPublishedUri] = useState("");

  const fetchReservations = async () => {
    if (!anchorWallet || !publicKey) return;
    try {
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);
      // Fetch all reservations
      const res = await (program.account as any).reservation.all();
      // Filter for Pending only
      const pendingRes = res.filter((r: any) => (r.account.status as any).pending !== undefined);
      
      const enhancedRes = await Promise.all(pendingRes.map(async (r: any) => {
        try {
          const eq = await (program.account as any).equipment.fetch(r.account.equipmentPda);
          return { ...r, equipment: { name: eq.name, uri: eq.uri } };
        } catch (e) {
          return r;
        }
      }));
      setReservations(enhancedRes as any);

      // Fetch publications by this faculty
      const pubs = await (program.account as any).publication.all([
        {
          memcmp: {
            offset: 40, // 8 (discriminator) + 32 (author)
            bytes: publicKey.toBase58()
          }
        }
      ]);
      setPublications(pubs as any);
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
    if (!paperPdf) {
      alert("Please select a PDF file for the research paper.");
      return;
    }

    setPublishLoading(true);
    setTxHash("");
    setPublishedUri("");
    try {
      // 1. Upload PDF to Pinata
      let pdfUri = "";
      try {
        pdfUri = await uploadFileToPinata(paperPdf);
      } catch (err: any) {
        throw new Error(`IPFS Upload Failed: ${err.message}`);
      }

      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);
      
      const authorPubkey = new PublicKey(authorWallet);
      const [facultyPDA] = getResearcherPDA(publicKey);
      const [globalStatePDA] = getGlobalStatePDA();
      const mockAssetId = generateMockAssetId();

      const data = new TextEncoder().encode(doi);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data.slice().buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      
      const { getPublicationPDA } = await import("@/lib/solana/anchor");
      const [publicationPDA] = await getPublicationPDA(authorPubkey, doi);

      const tx = await program.methods
        .publishPaper(title, doi, hashArray, pdfUri, mockAssetId)
        .accounts({
          facultyWallet: publicKey,
          faculty: facultyPDA,
          globalState: globalStatePDA,
          researcherWallet: authorPubkey,
          publication: publicationPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      setTxHash(tx);
      setPublishedUri(pdfUri);
      setTitle("");
      setDoi("");
      setAuthorWallet("");
      setPaperPdf(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setPublishLoading(false);
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
      <div className="flex items-center gap-5 mb-14">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center glow-violet shadow-inner">
          <GraduationCap className="text-primary-light w-7 h-7" />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Faculty Dashboard</h1>
          <p className="text-slate-400 mt-2 text-lg">Approve equipment bookings and publish on-chain research papers.</p>
        </div>
      </div>

      {txHash && (
        <div className="mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 break-all space-y-2">
          <div className="font-semibold text-white">🎉 Publication Minted Successfully!</div>
          <div>
            Transaction Hash:{" "}
            <a href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`} target="_blank" rel="noreferrer" className="underline font-mono">
              {txHash}
            </a>
          </div>
          {publishedUri && (
            <div>
              IPFS PDF Link:{" "}
              <a href={publishedUri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")} target="_blank" rel="noreferrer" className="underline font-mono">
                {publishedUri}
              </a>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-2 space-y-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
            <div className="flex items-center gap-3 mb-8">
              <CheckSquare className="text-emerald-400 w-6 h-6" />
              <h2 className="text-2xl font-bold tracking-wide">Pending Reservations</h2>
            </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {loading ? (
              <div className="text-slate-400 text-sm">Loading queue...</div>
            ) : reservations.length === 0 ? (
              <div className="text-slate-500 text-sm italic">No pending reservations.</div>
            ) : (
              reservations.map((res) => (
                <div key={res.publicKey.toBase58()} className="p-5 rounded-2xl bg-surface/50 border border-white/5 hover:border-white/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                        {res.equipment?.uri ? (
                          <img src={res.equipment.uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")} alt="Eq" className="w-full h-full object-cover" />
                        ) : (
                          <Microscope className="w-6 h-6 text-slate-400" />
                        )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                        <span className="text-slate-400 font-normal">Researcher:</span> {res.account.researcherPda.toBase58().slice(0,8)}...
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span className="text-accent-light font-medium">{res.equipment?.name || "Equipment"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => handleApproval(res.publicKey, res.account.equipmentPda, false)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button 
                      onClick={() => handleApproval(res.publicKey, res.account.equipmentPda, true)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-amber-400" />
            <h2 className="text-xl font-semibold">Publish Research Paper</h2>
          </div>
          
          <form onSubmit={handlePublishPaper} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Paper Title</label>
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
              <label className="block text-sm font-medium text-slate-300 mb-2">DOI (Digital Object Identifier)</label>
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
              <label className="block text-sm font-medium text-slate-300 mb-2">Author (Researcher Wallet)</label>
              <input 
                type="text" 
                required
                value={authorWallet}
                onChange={(e) => setAuthorWallet(e.target.value)}
                placeholder="Solana Base58 Address"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Research Paper (PDF)</label>
              <input 
                type="file" 
                accept="application/pdf"
                onChange={(e) => setPaperPdf(e.target.files?.[0] || null)}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2 text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20"
              />
            </div>

            <div className="pt-2">
              <button 
                disabled={publishLoading}
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {publishLoading ? "Uploading & Publishing..." : "Mint Publication cNFT"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-12 glass-card p-8">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="text-violet-400 w-6 h-6" />
          <h2 className="text-2xl font-bold tracking-wide">Published by You</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="text-slate-400 text-sm">Loading publications...</div>
          ) : publications.length === 0 ? (
            <div className="text-slate-500 text-sm italic">You haven't published any papers yet.</div>
          ) : (
            publications.map((pub) => (
              <div key={pub.publicKey.toBase58()} className="p-6 rounded-2xl bg-surface/50 border border-white/5 hover:border-violet-500/30 transition-all flex flex-col h-full group">
                <h3 className="font-bold text-lg text-white mb-2 line-clamp-2">{pub.account.title}</h3>
                <div className="text-xs text-slate-400 mb-6 font-mono p-2 bg-black/20 rounded-lg border border-white/5">DOI: {pub.account.doi}</div>
                <div className="mt-auto flex justify-between items-center">
                  <div className="text-sm font-medium text-slate-500">
                    {new Date(pub.account.publishedAt.toNumber() * 1000).toLocaleDateString()}
                  </div>
                  <a 
                    href={pub.account.uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs px-4 py-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors font-bold"
                  >
                    View PDF
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

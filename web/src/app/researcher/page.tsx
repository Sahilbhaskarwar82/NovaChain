"use client";

import { useEffect, useState } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { 
  connection, 
  getProgram, 
  getResearcherPDA,
  getReservationPDA 
} from "@/lib/solana/anchor";
import { motion } from "framer-motion";
import { Microscope, Calendar, Clock, List, XCircle, CheckCircle2, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

type Equipment = {
  publicKey: PublicKey;
  account: {
    name: string;
    category: string;
    lab: string;
    status: any;
    uri: string;
  };
};

type Publication = {
  publicKey: PublicKey;
  account: {
    title: string;
    doi: string;
    uri: string;
    publishedAt: any;
  };
};

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

export default function ResearcherDashboard() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const router = useRouter();

  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTs, setNowTs] = useState(Math.floor(Date.now() / 1000));

  // Booking State
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [durationHours, setDurationHours] = useState("2");

  const fetchData = async () => {
    if (!anchorWallet || !publicKey) return;
    try {
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);
      
      const eq = await (program.account as any).equipment.all();
      setEquipmentList(eq as any);

      const [myPDA] = getResearcherPDA(publicKey);
      const res = await (program.account as any).reservation.all([
        {
          memcmp: {
            offset: 8 + 32, // skip discriminator and equipment_pda
            bytes: myPDA.toBase58(),
          },
        },
      ]);
      setMyReservations(res as any);

      const pubs = await (program.account as any).publication.all([
        {
          memcmp: {
            offset: 8, // skip discriminator
            bytes: publicKey.toBase58(),
          },
        },
      ]);
      setPublications(pubs as any);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (anchorWallet) fetchData();
  }, [anchorWallet]);

  useEffect(() => {
    const int = setInterval(() => {
      const current = Math.floor(Date.now() / 1000);
      setNowTs(current);
      
      // Auto-complete approved reservations that have expired
      myReservations.forEach(res => {
        const statusLabel = Object.keys(res.account.status)[0];
        if (statusLabel === "approved" && current > res.account.endTime.toNumber()) {
          if (!(res as any)._autoCompleting) {
            (res as any)._autoCompleting = true; // prevent spamming
            handleComplete(res.publicKey, res.account.equipmentPda);
          }
        }
      });
    }, 1000);
    return () => clearInterval(int);
  }, [myReservations, anchorWallet, publicKey]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anchorWallet || !publicKey || !selectedEq) return;

    setBookingLoading(true);
    try {
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);
      
      const [researcherPDA] = getResearcherPDA(publicKey);
      const resId = `res-${Date.now()}`;
      const [reservationPDA] = getReservationPDA(resId);

      const now = Math.floor(Date.now() / 1000);
      const end = now + parseInt(durationHours) * 3600;

      await program.methods
        .createReservation(resId, new BN(now), new BN(end))
        .accounts({
          researcherWallet: publicKey,
          researcher: researcherPDA,
          equipment: selectedEq.publicKey,
          reservation: reservationPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      alert("Reservation requested! Waiting for faculty approval.");
      setSelectedEq(null);
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancel = async (reservationPDA: PublicKey, equipmentPDA: PublicKey) => {
    if (!anchorWallet || !publicKey) return;
    try {
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);
      const [researcherPDA] = getResearcherPDA(publicKey);

      await program.methods.cancelReservation().accounts({
        researcherWallet: publicKey,
        researcher: researcherPDA,
        reservation: reservationPDA,
        equipment: equipmentPDA,
      }).rpc();

      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleComplete = async (reservationPDA: PublicKey, equipmentPDA: PublicKey) => {
    if (!anchorWallet || !publicKey) return;
    try {
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);

      await program.methods.completeReservation().accounts({
        reservation: reservationPDA,
        equipment: equipmentPDA,
      }).rpc();

      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
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
        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center glow-cyan shadow-inner">
          <Microscope className="text-accent-light w-7 h-7" />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Equipment Catalog & Booking</h1>
          <p className="text-slate-400 mt-2 text-lg">Discover, book, and manage your lab instrument reservations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Equipment & My Reservations) */}
        <div className="lg:col-span-2 space-y-10">
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
            <div className="flex items-center gap-3 mb-8">
              <List className="text-emerald-400 w-6 h-6" />
              <h2 className="text-2xl font-bold tracking-wide">My Reservations</h2>
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="text-slate-400 text-sm">Loading...</div>
              ) : myReservations.length === 0 ? (
                <div className="text-slate-500 italic text-sm">No reservations found.</div>
              ) : (
                myReservations.map(res => {
                  const statusLabel = Object.keys(res.account.status)[0];
                  const endTime = res.account.endTime.toNumber();
                  const isExpired = nowTs > endTime;
                  
                  let timerText = "";
                  if (statusLabel === "approved") {
                    if (isExpired) {
                      timerText = "Expired";
                    } else {
                      const remaining = endTime - nowTs;
                      const h = Math.floor(remaining / 3600);
                      const m = Math.floor((remaining % 3600) / 60);
                      const s = remaining % 60;
                      timerText = `${h}h ${m}m ${s}s`;
                    }
                  }

                  return (
                    <div key={res.publicKey.toBase58()} className="p-5 rounded-2xl bg-surface/50 border border-white/5 hover:border-white/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                          <span className="text-slate-400 font-normal">Equipment:</span> {res.account.equipmentPda.toBase58().slice(0,8)}...
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs uppercase font-bold tracking-wider px-2 py-1 rounded-md bg-white/5 text-slate-300">
                            {statusLabel}
                          </span>
                          {statusLabel === "approved" && (
                            <span className="text-xs text-amber-400 font-mono font-bold bg-amber-400/10 px-2 py-1 rounded-md border border-amber-400/20">
                              ⏳ {timerText}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        {(statusLabel === "pending" || statusLabel === "approved") && (
                          <button 
                            onClick={() => handleCancel(res.publicKey, res.account.equipmentPda)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                          >
                            <XCircle className="w-4 h-4" /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>

          {/* Equipment Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
               <div className="col-span-2 text-slate-400">Loading catalog...</div>
            ) : equipmentList.length === 0 ? (
               <div className="col-span-2 text-slate-500 italic">No equipment registered yet.</div>
            ) : (
              equipmentList.map((eq, i) => {
                const statusStr = Object.keys(eq.account.status)[0];
                const isAvailable = statusStr === "available";
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: i * 0.05 }}
                    key={eq.publicKey.toBase58()} 
                    onClick={() => isAvailable && setSelectedEq(eq)}
                    className={`glass-card p-6 cursor-pointer ${isAvailable ? 'hover:border-accent hover:shadow-accent-glow' : 'opacity-60 grayscale cursor-not-allowed'}`}
                  >
                    <div className="flex justify-between items-start mb-5">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                        {eq.account.uri ? (
                          <img src={eq.account.uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")} alt="Eq" className="w-full h-full object-cover" />
                        ) : (
                          <Microscope className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-lg border tracking-wide uppercase ${
                        isAvailable ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' : 
                        'text-amber-400 border-amber-400/30 bg-amber-400/10'
                      }`}>
                        {statusStr}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{eq.account.name}</h3>
                    <p className="text-sm text-slate-400 font-medium">{eq.account.category}</p>
                    <div className="mt-5 pt-4 border-t border-white/5 text-xs text-slate-500 flex items-center gap-2 font-mono">
                       <span className="w-2 h-2 rounded-full bg-accent/50 glow-cyan" />
                       {eq.account.lab}
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>

        {/* Booking Sidebar */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-8 h-fit sticky top-28">
          <div className="flex items-center gap-3 mb-8">
            <Calendar className="text-accent-light w-6 h-6" />
            <h2 className="text-2xl font-bold tracking-wide">Book Equipment</h2>
          </div>

          {!selectedEq ? (
            <div className="text-slate-400 text-sm leading-relaxed text-center py-10 px-4 bg-surface/50 rounded-2xl border border-white/5 border-dashed">
              Select an available piece of equipment from the catalog to request a reservation.
            </div>
          ) : (
            <form onSubmit={handleBooking} className="space-y-6">
              <div className="p-5 rounded-xl bg-accent/10 border border-accent/20 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/20 blur-2xl rounded-full" />
                <div className="text-xs text-accent-light font-bold mb-1.5 tracking-widest">SELECTED</div>
                <div className="text-white font-bold text-lg relative z-10">{selectedEq.account.name}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Duration (Hours)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="1"
                    max="72"
                    required
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="glass-input w-full px-4 py-3.5 pl-11 text-lg font-medium"
                  />
                  <Clock className="absolute left-3.5 top-4 w-5 h-5 text-slate-400" />
                </div>
              </div>

              <div className="pt-6">
                <button 
                  disabled={bookingLoading}
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary-light hover:to-accent-light text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookingLoading ? "Requesting..." : "Submit Reservation"}
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedEq(null)}
                  className="w-full mt-4 text-slate-400 hover:text-white text-sm font-semibold py-2 transition-colors"
                >
                  Cancel Selection
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>

      {/* My Publications */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-12 glass-card p-8">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="text-primary-light w-6 h-6" />
          <h2 className="text-2xl font-bold tracking-wide">My Published Research</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="text-slate-400 text-sm">Loading publications...</div>
          ) : publications.length === 0 ? (
            <div className="text-slate-500 text-sm italic">You don't have any publications yet.</div>
          ) : (
            publications.map((pub) => (
              <div key={pub.publicKey.toBase58()} className="p-6 rounded-2xl bg-surface/50 border border-white/5 hover:border-primary/30 hover:shadow-primary-glow transition-all flex flex-col h-full group">
                <h3 className="font-bold text-lg text-white mb-2 line-clamp-2 group-hover:text-primary-light transition-colors">{pub.account.title}</h3>
                <div className="text-xs text-slate-400 mb-6 font-mono p-2 bg-black/20 rounded-lg border border-white/5">DOI: {pub.account.doi}</div>
                <div className="mt-auto flex justify-between items-center">
                  <div className="text-sm font-medium text-slate-500">
                    {new Date(pub.account.publishedAt.toNumber() * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                  <a 
                    href={pub.account.uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs px-4 py-2 rounded-lg bg-primary/10 text-primary-light hover:bg-primary/20 border border-primary/20 transition-colors font-bold shadow-sm shadow-primary/10"
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

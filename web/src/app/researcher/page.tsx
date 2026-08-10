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
import { Microscope, Calendar, Clock } from "lucide-react";

type Equipment = {
  publicKey: PublicKey;
  account: {
    name: string;
    category: string;
    lab: string;
    status: any;
  };
};

export default function ResearcherDashboard() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();

  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking State
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [durationHours, setDurationHours] = useState("2");

  const fetchEquipment = async () => {
    if (!anchorWallet) return;
    try {
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);
      const res = await program.account.equipment.all();
      setEquipmentList(res as any);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (anchorWallet) fetchEquipment();
  }, [anchorWallet]);

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
      fetchEquipment();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setBookingLoading(false);
    }
  };

  if (!publicKey) {
    return <div className="text-center mt-20 text-slate-400">Please connect your wallet...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center gap-4 mb-12">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center glow-cyan">
          <Microscope className="text-cyan-400 w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Equipment Catalog</h1>
          <p className="text-slate-400 mt-1">Discover and book high-value lab instruments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Equipment Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
             <div className="col-span-2 text-slate-400">Loading catalog...</div>
          ) : equipmentList.length === 0 ? (
             <div className="col-span-2 text-slate-500 italic">No equipment registered yet.</div>
          ) : (
            equipmentList.map((eq, i) => {
              const isAvailable = eq.account.status.available !== undefined;
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.05 }}
                  key={eq.publicKey.toBase58()} 
                  onClick={() => isAvailable && setSelectedEq(eq)}
                  className={`glass-card p-6 cursor-pointer transition-all ${isAvailable ? 'hover:border-cyan-500/50 hover:bg-white/10' : 'opacity-50 grayscale cursor-not-allowed'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                      <Microscope className="w-5 h-5 text-slate-300" />
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                      isAvailable ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' : 
                      'text-amber-400 border-amber-400/20 bg-amber-400/10'
                    }`}>
                      {Object.keys(eq.account.status)[0].toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">{eq.account.name}</h3>
                  <p className="text-sm text-slate-400">{eq.account.category}</p>
                  <div className="mt-4 pt-4 border-t border-white/5 text-xs text-slate-500 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-cyan-500/50" />
                     {eq.account.lab}
                  </div>
                </motion.div>
              )
            })
          )}
        </div>

        {/* Booking Sidebar */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-8 h-fit sticky top-24">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="text-cyan-400" />
            <h2 className="text-xl font-semibold">Book Equipment</h2>
          </div>

          {!selectedEq ? (
            <div className="text-slate-500 text-sm italic text-center py-8">
              Select an available piece of equipment from the catalog to request a reservation.
            </div>
          ) : (
            <form onSubmit={handleBooking} className="space-y-5">
              <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20 mb-6">
                <div className="text-xs text-cyan-400 font-medium mb-1">SELECTED</div>
                <div className="text-white font-semibold">{selectedEq.account.name}</div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Duration (Hours)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="1"
                    max="72"
                    required
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 pl-10 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <Clock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  disabled={bookingLoading}
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {bookingLoading ? "Requesting..." : "Submit Reservation"}
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedEq(null)}
                  className="w-full mt-3 text-slate-400 hover:text-white text-sm py-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}

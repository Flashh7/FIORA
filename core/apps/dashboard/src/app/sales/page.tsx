"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Database, Clock, Briefcase } from 'lucide-react';

export default function SalesPage() {
  const [dbLeads, setDbLeads] = useState<any[]>([]);

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads?filter=sales');
      const data = await res.json();
      if (res.ok) setDbLeads(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 5000); // Live poll
    return () => clearInterval(interval);
  }, []);

  const containerVariants: import('framer-motion').Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: import('framer-motion').Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="max-w-7xl mx-auto space-y-12 pb-24"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-4xl font-light tracking-tight flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-[var(--color-ironman)] glow-ironman">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[var(--color-ironman)] font-bold text-glow-ironman tracking-[0.2em] uppercase text-[10px] block mb-1">Sales Engine</span>
            <span className="text-white">Iron Man Operations</span>
          </div>
        </h1>
        <p className="text-white/50 mt-4 text-lg max-w-2xl font-light">View qualified leads and active opportunities ready for closing. Automated opportunity routing and pipeline management.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {[
          { name: 'Hot Leads', icon: Target, active: true }, 
          { name: 'Requests', icon: Database, active: false }, 
          { name: 'Opportunities', icon: Briefcase, active: false }, 
          { name: 'Customers', icon: TrendingUp, active: false }, 
          { name: 'Follow-Ups', icon: Clock, active: false }
        ].map((tab, i) => (
          <motion.div 
            whileHover={{ y: -5 }}
            key={tab.name} 
            className={`p-6 glass-panel rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-3 relative overflow-hidden group ${tab.active ? 'border-[var(--color-ironman)]/50 shadow-[0_0_20px_rgba(59,167,255,0.1)]' : 'border-white/5 hover:border-white/20 hover:bg-white/[0.04]'}`}
          >
            {tab.active && <div className="absolute inset-0 bg-[var(--color-ironman)]/5 pointer-events-none"></div>}
            <tab.icon className={`w-6 h-6 ${tab.active ? 'text-[var(--color-ironman)] glow-ironman' : 'text-white/40 group-hover:text-white/70'} transition-colors`} />
            <h3 className={`font-medium tracking-wide ${tab.active ? 'text-white' : 'text-white/50 group-hover:text-white'}`}>{tab.name}</h3>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="glass-panel border border-white/5 rounded-3xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-ironman)]/5 to-transparent pointer-events-none"></div>
        <div className="p-8 border-b border-white/5 flex items-center justify-between relative z-10">
          <div>
            <h2 className="text-xl font-light flex items-center gap-3">Sales Pipeline <span className="px-3 py-1 bg-[var(--color-ironman)]/10 text-[var(--color-ironman)] border border-[var(--color-ironman)]/20 text-[10px] font-mono tracking-widest uppercase rounded-full">Live Neural Sync</span></h2>
            <p className="text-sm text-white/40 mt-2 font-light">Real-time view of Hot Leads qualified and transferred by Hulk.</p>
          </div>
        </div>
        
        <div className="p-8 relative z-10">
          {dbLeads.length === 0 ? (
            <div className="p-16 text-center text-white/30 font-light border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              No active pipeline detected. Initiate a marketing campaign to fill the funnel.
            </div>
          ) : (
            <div className="space-y-6">
              {dbLeads.map(lead => (
                <motion.div whileHover={{ scale: 1.01 }} key={lead.id} className="p-6 border border-[var(--color-ironman)]/20 rounded-2xl bg-black/60 backdrop-blur-sm flex justify-between items-center relative overflow-hidden group shadow-[0_0_15px_rgba(59,167,255,0.05)]">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-ironman)] glow-ironman"></div>
                  <div className="absolute right-0 top-0 w-64 h-64 bg-[var(--color-ironman)]/5 blur-[60px] rounded-full group-hover:bg-[var(--color-ironman)]/10 transition-colors pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <h3 className="font-semibold tracking-wide text-lg text-white mb-1">
                      {lead.name}
                    </h3>
                    <p className="text-xs text-[var(--color-cyan)] font-mono tracking-widest uppercase mb-3">{lead.phone_number}</p>
                    <p className="text-sm text-white/60 font-light max-w-lg leading-relaxed"><strong className="text-white/80 font-medium">Captured Requirement:</strong> {lead.notes || 'No specific requirement captured.'}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-3 relative z-10">
                    <span className="px-4 py-1.5 bg-[var(--color-ironman)]/10 text-[var(--color-ironman)] text-[10px] font-mono tracking-widest rounded-full border border-[var(--color-ironman)]/30 shadow-[0_0_10px_rgba(59,167,255,0.2)]">READY TO CLOSE</span>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Routing: {lead.source}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

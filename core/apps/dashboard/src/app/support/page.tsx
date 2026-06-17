"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, Activity, BarChart2 } from 'lucide-react';

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    fetch('/api/support')
      .then(res => res.json())
      .then(data => setTickets(data))
      .catch(err => console.error('Error fetching tickets', err));
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
          <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-[var(--color-homelander)] glow-homelander">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[var(--color-homelander)] font-bold text-glow-homelander tracking-[0.2em] uppercase text-[10px] block mb-1">Support Operations</span>
            <span className="text-white">Homelander Engine</span>
          </div>
        </h1>
        <p className="text-white/50 mt-4 text-lg max-w-2xl font-light">Manage customer complaints, refunds, and issue resolution automatically. Deescalating critical incidents in real-time.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { name: 'Active Escalations', icon: AlertTriangle, active: true }, 
          { name: 'Resolved Tickets', icon: CheckCircle, active: false }, 
          { name: 'Customer Satisfaction', icon: Activity, active: false }, 
          { name: 'Analytics', icon: BarChart2, active: false }
        ].map((tab, i) => (
          <motion.div 
            whileHover={{ y: -5 }}
            key={tab.name} 
            className={`p-6 glass-panel rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-3 relative overflow-hidden group ${tab.active ? 'border-[var(--color-homelander)]/50 shadow-[0_0_20px_rgba(255,211,77,0.1)]' : 'border-white/5 hover:border-white/20 hover:bg-white/[0.04]'}`}
          >
            {tab.active && <div className="absolute inset-0 bg-[var(--color-homelander)]/5 pointer-events-none"></div>}
            <tab.icon className={`w-6 h-6 ${tab.active ? 'text-[var(--color-homelander)] glow-homelander' : 'text-white/40 group-hover:text-white/70'} transition-colors`} />
            <h3 className={`font-medium tracking-wide ${tab.active ? 'text-white' : 'text-white/50 group-hover:text-white'}`}>{tab.name}</h3>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="glass-panel border border-white/5 rounded-3xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-homelander)]/5 to-transparent pointer-events-none"></div>
        <div className="p-8 border-b border-white/5 flex items-center justify-between relative z-10">
          <div>
            <h2 className="text-xl font-light flex items-center gap-3">Live Support Queue <span className="px-3 py-1 bg-[var(--color-homelander)]/10 text-[var(--color-homelander)] border border-[var(--color-homelander)]/20 text-[10px] font-mono tracking-widest uppercase rounded-full">Monitoring</span></h2>
            <p className="text-sm text-white/40 mt-2 font-light">Real-time view of customer complaints and issues.</p>
          </div>
        </div>
        
        <div className="p-8 relative z-10">
          {tickets.length === 0 ? (
            <div className="p-16 text-center text-white/30 font-light border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              No active support escalations. All systems nominal.
            </div>
          ) : (
            <div className="overflow-x-auto relative z-10">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/40 text-white/40 font-mono text-[10px] uppercase tracking-widest border-b border-white/5">
                  <tr>
                    <th className="px-8 py-4 font-normal">Customer Name</th>
                    <th className="px-8 py-4 font-normal">Contact Node</th>
                    <th className="px-8 py-4 font-normal">Severity / Status</th>
                    <th className="px-8 py-4 font-normal">Issue Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tickets.map((ticket: any) => (
                    <tr key={ticket.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-5 text-white/90 font-medium">{ticket.customer_name}</td>
                      <td className="px-8 py-5 font-mono text-white/50">{ticket.phone}</td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 bg-[var(--color-homelander)]/10 text-[var(--color-homelander)] rounded-full text-[10px] font-mono tracking-widest uppercase border border-[var(--color-homelander)]/20 shadow-[0_0_10px_rgba(255,211,77,0.1)]">{ticket.status}</span>
                      </td>
                      <td className="px-8 py-5 text-white/50 font-light max-w-sm leading-relaxed group-hover:text-white/80 transition-colors">{ticket.issue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

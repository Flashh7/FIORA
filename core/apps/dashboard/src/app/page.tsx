'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FioraCore } from '../components/FioraCore';
import { Activity, Zap, TrendingUp, Shield, DollarSign, Users } from 'lucide-react';

const containerVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function Dashboard() {
  return (
    <div className="relative min-h-full w-full flex flex-col items-center pt-20 pb-12">
      <FioraCore />
      
      <div className="relative z-10 max-w-7xl w-full px-8 space-y-24">
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 glass-panel mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse glow-hulk"></span>
            <span className="text-xs uppercase tracking-widest text-white/70 font-mono">FIORA OS V2.0 ONLINE</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 leading-tight pb-2">
            Your AI Business Team.<br/>Available 24/7.
          </h1>
          <p className="text-xl text-white/50 max-w-2xl mx-auto font-light tracking-wide">
            Marketing. Sales. Support. Intelligence. One Platform.
          </p>
          <div className="flex items-center justify-center gap-6 pt-8">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-8 py-4 rounded-full bg-white text-black font-semibold tracking-wide hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all">
              Launch Dashboard
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-8 py-4 rounded-full border border-white/20 glass-panel text-white font-semibold tracking-wide hover:bg-white/5 transition-all">
              Watch AI In Action
            </motion.button>
          </div>
        </motion.div>

        {/* The Four Core Agents Showcase */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          
          {/* HULK */}
          <Link href="/marketing" className="group block" style={{ perspective: 1000 }}>
            <motion.div 
              variants={itemVariants}
              whileHover={{ rotateX: 5, rotateY: -5, scale: 1.02, z: 50 }}
              className="p-8 h-full glass-panel border-[var(--color-hulk)]/20 hover:border-[var(--color-hulk)]/50 rounded-3xl relative overflow-hidden transition-colors duration-500 shadow-2xl"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-hulk)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--color-hulk)]/20 blur-[50px] rounded-full group-hover:bg-[var(--color-hulk)]/30 transition-all"></div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center mb-6 text-[var(--color-hulk)] glow-hulk">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">Hulk</h2>
                <p className="text-[10px] text-[var(--color-hulk)] uppercase tracking-[0.2em] font-mono mb-6">Marketing Engine</p>
                <p className="text-white/50 text-sm leading-relaxed mb-8">
                  Generates, qualifies, and nurtures leads. Initiates outbound calls to prospects and seamlessly hands off interested parties.
                </p>
              </div>
            </motion.div>
          </Link>

          {/* IRON MAN */}
          <Link href="/sales" className="group block" style={{ perspective: 1000 }}>
            <motion.div 
              variants={itemVariants}
              whileHover={{ rotateX: 5, rotateY: -5, scale: 1.02, z: 50 }}
              className="p-8 h-full glass-panel border-[var(--color-ironman)]/20 hover:border-[var(--color-ironman)]/50 rounded-3xl relative overflow-hidden transition-colors duration-500 shadow-2xl"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-ironman)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--color-ironman)]/20 blur-[50px] rounded-full group-hover:bg-[var(--color-ironman)]/30 transition-all"></div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center mb-6 text-[var(--color-ironman)] glow-ironman">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">Iron Man</h2>
                <p className="text-[10px] text-[var(--color-ironman)] uppercase tracking-[0.2em] font-mono mb-6">Sales & CRM</p>
                <p className="text-white/50 text-sm leading-relaxed mb-8">
                  Captures requirements and creates business opportunities. Handles all incoming phone calls and books reservations.
                </p>
              </div>
            </motion.div>
          </Link>

          {/* HOMELANDER */}
          <Link href="/support" className="group block" style={{ perspective: 1000 }}>
            <motion.div 
              variants={itemVariants}
              whileHover={{ rotateX: 5, rotateY: 5, scale: 1.02, z: 50 }}
              className="p-8 h-full glass-panel border-[var(--color-homelander)]/20 hover:border-[var(--color-homelander)]/50 rounded-3xl relative overflow-hidden transition-colors duration-500 shadow-2xl"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-homelander)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--color-homelander)]/20 blur-[50px] rounded-full group-hover:bg-[var(--color-homelander)]/30 transition-all"></div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center mb-6 text-[var(--color-homelander)] glow-homelander">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">Homelander</h2>
                <p className="text-[10px] text-[var(--color-homelander)] uppercase tracking-[0.2em] font-mono mb-6">Support Operations</p>
                <p className="text-white/50 text-sm leading-relaxed mb-8">
                  Patiently handles all customer complaints and support tickets. Provides top-tier issue resolution at scale.
                </p>
              </div>
            </motion.div>
          </Link>

          {/* DOCTOR STRANGE */}
          <Link href="/finance" className="group block" style={{ perspective: 1000 }}>
            <motion.div 
              variants={itemVariants}
              whileHover={{ rotateX: 5, rotateY: 5, scale: 1.02, z: 50 }}
              className="p-8 h-full glass-panel border-[var(--color-strange)]/20 hover:border-[var(--color-strange)]/50 rounded-3xl relative overflow-hidden transition-colors duration-500 shadow-2xl"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-strange)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--color-strange)]/20 blur-[50px] rounded-full group-hover:bg-[var(--color-strange)]/30 transition-all"></div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center mb-6 text-[var(--color-strange)] glow-strange">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">Dr. Strange</h2>
                <p className="text-[10px] text-[var(--color-strange)] uppercase tracking-[0.2em] font-mono mb-6">Financial Intelligence</p>
                <p className="text-white/50 text-sm leading-relaxed mb-8">
                  Analyzes live data streams to generate financial reports, track conversion metrics, and magical revenue forecasting.
                </p>
              </div>
            </motion.div>
          </Link>

        </motion.div>

        {/* Global Live Feed */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-12 p-8 glass-panel rounded-3xl border border-white/5 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-light tracking-wide text-white">Live Operations Feed</h3>
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Activity className="w-4 h-4 animate-pulse" />
                Monitoring
              </span>
            </div>
            
            <div className="space-y-4">
              <motion.div whileHover={{ x: 10 }} className="p-5 glass-panel rounded-2xl flex items-center justify-between transition-transform cursor-default">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-ironman)]/10 text-[var(--color-ironman)] border border-[var(--color-ironman)]/20 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(59,167,255,0.2)]">IM</div>
                  <div>
                    <p className="text-sm font-medium text-white/90">Iron Man captured a new requirement</p>
                    <p className="text-xs text-[var(--color-cyan)] mt-1 font-mono">Website Redesign • ₹1,50,000</p>
                  </div>
                </div>
                <span className="text-[10px] text-white/30 uppercase tracking-widest">Just now</span>
              </motion.div>
              
              <motion.div whileHover={{ x: 10 }} className="p-5 glass-panel rounded-2xl flex items-center justify-between transition-transform cursor-default">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-hulk)]/10 text-[var(--color-hulk)] border border-[var(--color-hulk)]/20 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(91,255,122,0.2)]">H</div>
                  <div>
                    <p className="text-sm font-medium text-white/90">Hulk successfully transferred a lead to Iron Man</p>
                    <p className="text-xs text-[var(--color-hulk)] mt-1 font-mono">Outbound Call • Catering Service</p>
                  </div>
                </div>
                <span className="text-[10px] text-white/30 uppercase tracking-widest">10 mins ago</span>
              </motion.div>

              <motion.div whileHover={{ x: 10 }} className="p-5 glass-panel rounded-2xl flex items-center justify-between transition-transform cursor-default">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-strange)]/10 text-[var(--color-strange)] border border-[var(--color-strange)]/20 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(168,85,247,0.2)]">DS</div>
                  <div>
                    <p className="text-sm font-medium text-white/90">Dr. Strange answered a BI query</p>
                    <p className="text-xs text-[var(--color-pink)] mt-1 font-mono">"What was our conversion rate?"</p>
                  </div>
                </div>
                <span className="text-[10px] text-white/30 uppercase tracking-widest">1 hour ago</span>
              </motion.div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

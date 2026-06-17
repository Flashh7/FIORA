"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, BarChart3, TrendingUp, Sparkles, Database, Zap } from 'lucide-react';

export default function FinancePage() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    // Fetch live metrics directly from Doctor Strange API
    fetch('http://localhost:3010/api/payments/metrics')
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(console.error);
      
    fetch('http://localhost:3010/api/payments/recent')
      .then(res => res.json())
      .then(data => setPayments(data))
      .catch(console.error);
  }, []);

  const askDoctorStrange = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3010/api/finance/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      });
      const data = await res.json();
      setAnswer(data.answer);
    } catch (e) {
      setAnswer("Sorry, the magical connection to the database failed.");
    } finally {
      setLoading(false);
    }
  };

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
          <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-[var(--color-strange)] glow-strange">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[var(--color-strange)] font-bold text-glow-strange tracking-[0.2em] uppercase text-[10px] block mb-1">Financial Intelligence</span>
            <span className="text-white">Dr. Strange Engine</span>
          </div>
        </h1>
        <p className="text-white/50 mt-4 text-lg max-w-2xl font-light">Business intelligence, real-time analytics, and magical forecasting. Interrogate your financial data streams using natural language.</p>
      </motion.div>

      {/* Live Financial Metrics */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 glass-panel border border-[var(--color-strange)]/20 rounded-3xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-[var(--color-strange)]/5 group-hover:bg-[var(--color-strange)]/10 transition-colors pointer-events-none"></div>
          <h3 className="text-[10px] text-[var(--color-strange)] uppercase tracking-[0.2em] font-mono mb-3 relative z-10">Gross Revenue</h3>
          <p className="text-3xl font-light text-white relative z-10 flex items-baseline gap-2">
            {metrics?.razorpay?.gross_volume ? metrics.razorpay.gross_volume.split(' ')[0] : '0.00'}
            <span className="text-sm text-white/40 uppercase tracking-widest">{metrics?.razorpay?.gross_volume ? metrics.razorpay.gross_volume.split(' ')[1] : 'INR'}</span>
          </p>
        </div>
        <div className="p-6 glass-panel border border-white/5 hover:border-white/10 rounded-3xl transition-colors">
          <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono mb-3">Net Profit</h3>
          <p className="text-3xl font-light text-white flex items-baseline gap-2">
            {metrics?.razorpay?.net_profit ? metrics.razorpay.net_profit.split(' ')[0] : '0.00'}
            <span className="text-sm text-white/40 uppercase tracking-widest">{metrics?.razorpay?.net_profit ? metrics.razorpay.net_profit.split(' ')[1] : 'INR'}</span>
          </p>
        </div>
        <div className="p-6 glass-panel border border-white/5 hover:border-white/10 rounded-3xl transition-colors">
          <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono mb-3">Transactions</h3>
          <p className="text-3xl font-light text-white">{metrics?.razorpay?.transactions || '0'}</p>
        </div>
        <div className="p-6 glass-panel border border-white/5 hover:border-white/10 rounded-3xl transition-colors">
          <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono mb-3">Avg Order Value</h3>
          <p className="text-3xl font-light text-white flex items-baseline gap-2">
            {metrics?.razorpay?.aov ? metrics.razorpay.aov.split(' ')[0] : '0.00'}
            <span className="text-sm text-white/40 uppercase tracking-widest">{metrics?.razorpay?.aov ? metrics.razorpay.aov.split(' ')[1] : 'INR'}</span>
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={containerVariants} className="col-span-2 space-y-8">
          
          {/* AI Assistant */}
          <motion.div variants={itemVariants} className="p-8 glass-panel border border-[var(--color-strange)]/30 rounded-3xl relative overflow-hidden group shadow-[0_0_30px_rgba(168,85,247,0.1)]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-strange)]/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none group-hover:bg-[var(--color-strange)]/20 transition-all duration-1000"></div>
            
            <h2 className="text-2xl font-light mb-6 flex items-center gap-3 relative z-10"><Sparkles className="w-6 h-6 text-[var(--color-strange)]" /> Query The Multiverse</h2>
            
            <div className="flex gap-4 mb-8 relative z-10">
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="e.g., How much revenue did we make this month?"
                className="flex-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[var(--color-strange)]/50 transition-colors text-lg font-light"
                onKeyDown={e => e.key === 'Enter' && askDoctorStrange()}
              />
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={askDoctorStrange}
                disabled={loading}
                className="bg-[var(--color-strange)] hover:bg-[var(--color-strange)]/90 text-white font-medium px-8 py-4 rounded-2xl transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              >
                {loading ? 'Analyzing...' : 'Execute'}
              </motion.button>
            </div>
            
            {answer && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 bg-black/60 backdrop-blur-md border border-[var(--color-strange)]/20 rounded-2xl text-white/90 leading-relaxed whitespace-pre-wrap relative z-10 font-light"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-strange)] glow-strange rounded-l-2xl"></div>
                {answer}
              </motion.div>
            )}
          </motion.div>

          {/* Recent Transactions Feed */}
          <motion.div variants={itemVariants} className="p-8 glass-panel border border-white/5 rounded-3xl relative overflow-hidden">
            <h2 className="text-xl font-light mb-6 flex items-center gap-3"><Database className="w-5 h-5 text-white/50" /> Recent Transactions <span className="px-3 py-1 bg-white/5 text-white/40 text-[10px] font-mono tracking-widest uppercase rounded-full ml-auto">Live</span></h2>
            
            <div className="space-y-4">
              {payments.filter(tx => tx.gateway === 'Razorpay').slice(0, 3).map((tx, i) => (
                <motion.div whileHover={{ x: 5 }} key={i} className="flex items-center justify-between p-5 glass-panel border border-white/5 rounded-2xl hover:border-white/10 transition-all cursor-default">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-white/5 text-white/50 border border-white/10">
                      RZ
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">{tx.customer}</p>
                      <p className="text-xs text-white/40 font-mono tracking-wider mt-1">{new Date(tx.date).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-400 font-mono">+{tx.amount} {tx.currency}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>{tx.status}</p>
                  </div>
                </motion.div>
              ))}
              {payments.filter(tx => tx.gateway === 'Razorpay').length === 0 && (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                  <p className="text-sm text-white/30 font-light">No recent transactions detected in the stream.</p>
                </div>
              )}
            </div>
          </motion.div>

        </motion.div>
        
        <motion.div variants={itemVariants} className="col-span-1 space-y-6">
          <div className="p-8 glass-panel border border-white/5 rounded-3xl">
            <h3 className="font-medium mb-6 text-white/40 uppercase tracking-[0.2em] text-[10px] flex items-center gap-2"><Zap className="w-3 h-3" /> Quick Analytics</h3>
            <ul className="space-y-4">
              {[
                "Which gateway generated the most revenue?",
                "Summarize the latest transactions.",
                "Are there any failing payments?"
              ].map((q, i) => (
                <li key={i} className="cursor-pointer group">
                  <div 
                    onClick={() => setQuery(q)}
                    className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-[var(--color-strange)]/5 hover:border-[var(--color-strange)]/20 transition-all"
                  >
                    <p className="text-sm text-white/60 font-light leading-relaxed group-hover:text-[var(--color-strange)] transition-colors">"{q}"</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

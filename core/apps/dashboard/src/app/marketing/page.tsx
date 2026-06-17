"use client";

import React, { useState, useRef } from 'react';
import { Upload, Play, Pause, Phone, CheckCircle2, XCircle, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface BulkContact {
  id: string;
  name: string;
  phone: string;
  status: 'pending' | 'calling' | 'success' | 'error';
  message?: string;
}

export default function MarketingPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'calling' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Bulk Dialer State
  const [bulkContacts, setBulkContacts] = useState<BulkContact[]>([]);
  const [isBulkCalling, setIsBulkCalling] = useState(false);
  const isBulkCallingRef = useRef(false);

  // Database Leads State
  const [dbLeads, setDbLeads] = useState<any[]>([]);

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads?filter=marketing');
      const data = await res.json();
      if (res.ok) setDbLeads(data);
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 5000); // Poll every 5s for live updates
    return () => clearInterval(interval);
  }, []);

  const initiateSingleCall = async () => {
    if (!phoneNumber) return;
    
    setStatus('calling');
    try {
      const res = await fetch('/api/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phoneNumber })
      });
      
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(`Call initiated! SID: ${data.callSid}`);
        setPhoneNumber('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to connect call');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Network error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      const parsed: BulkContact[] = [];
      
      lines.forEach((line, i) => {
        if (i === 0 && line.toLowerCase().includes('phone')) return; // Skip header
        
        const parts = line.split(',');
        if (parts.length >= 2) {
          parsed.push({ id: Math.random().toString(), name: parts[0].trim(), phone: parts[1].trim(), status: 'pending' });
        } else if (parts.length === 1) {
          parsed.push({ id: Math.random().toString(), name: `Contact ${i}`, phone: parts[0].trim(), status: 'pending' });
        }
      });
      
      setBulkContacts(parsed);
    };
    reader.readAsText(file);
  };

  const processQueue = async (currentIndex: number, currentContacts: BulkContact[]) => {
    if (!isBulkCallingRef.current) return;
    
    if (currentIndex >= currentContacts.length) {
      setIsBulkCalling(false);
      isBulkCallingRef.current = false;
      return;
    }

    const contact = currentContacts[currentIndex];
    if (contact.status !== 'pending') {
      processQueue(currentIndex + 1, currentContacts);
      return;
    }

    setBulkContacts(prev => prev.map((c, i) => i === currentIndex ? { ...c, status: 'calling' } : c));

    try {
      const res = await fetch('/api/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: contact.phone })
      });
      const data = await res.json();
      
      setBulkContacts(prev => prev.map((c, i) => i === currentIndex ? { 
        ...c, 
        status: res.ok ? 'success' : 'error',
        message: res.ok ? 'Initiated' : (data.error || 'Failed')
      } : c));
    } catch (err: any) {
      setBulkContacts(prev => prev.map((c, i) => i === currentIndex ? { 
        ...c, 
        status: 'error',
        message: err.message
      } : c));
    }

    setTimeout(() => {
      setBulkContacts(prev => {
        processQueue(currentIndex + 1, prev);
        return prev;
      });
    }, 5000);
  };

  const toggleCampaign = () => {
    if (isBulkCalling) {
      setIsBulkCalling(false);
      isBulkCallingRef.current = false;
    } else {
      setIsBulkCalling(true);
      isBulkCallingRef.current = true;
      setBulkContacts(prev => {
        processQueue(0, prev);
        return prev;
      });
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
          <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-[var(--color-hulk)] glow-hulk">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[var(--color-hulk)] font-bold text-glow-hulk tracking-[0.2em] uppercase text-[10px] block mb-1">Marketing Engine</span>
            <span className="text-white">Hulk Operations</span>
          </div>
        </h1>
        <p className="text-white/50 mt-4 text-lg max-w-2xl font-light">Generate, qualify, and nurture leads with autonomous outbound voice AI. Campaigns process in parallel using the core neural network.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Manual Dialer */}
        <motion.div variants={itemVariants} className="p-8 glass-panel border border-[var(--color-hulk)]/20 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-hulk)]/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-[var(--color-hulk)]/10 transition-colors"></div>
          <h2 className="text-xl mb-4 font-light flex items-center gap-3"><Phone className="w-5 h-5 text-[var(--color-hulk)]" /> Manual Dial Pipeline</h2>
          <p className="text-sm text-white/40 mb-8 font-light leading-relaxed">Enter a customer's phone number to trigger Hulk's outbound AI calling flow instantly.</p>
          
          <div className="flex gap-4 relative z-10">
            <input 
              type="tel" 
              placeholder="+1234567890" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="flex-1 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-[var(--color-hulk)]/50 transition-colors"
            />
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={initiateSingleCall}
              disabled={status === 'calling' || !phoneNumber}
              className="bg-[var(--color-hulk)] hover:bg-[var(--color-hulk)]/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold tracking-wide px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(91,255,122,0.3)]"
            >
              {status === 'calling' ? 'Calling...' : 'Dial Now'}
            </motion.button>
          </div>
          
          {message && (
            <p className={`mt-4 text-sm ${status === 'error' ? 'text-rose-400' : 'text-[var(--color-hulk)]'}`}>
              {message}
            </p>
          )}
        </motion.div>

        {/* Bulk CSV Dialer */}
        <motion.div variants={itemVariants} className="p-8 glass-panel border border-white/5 rounded-3xl relative overflow-hidden group flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-[var(--color-hulk)]/5 transition-colors"></div>
          <h2 className="text-xl mb-4 font-light flex items-center gap-3"><Upload className="w-5 h-5 text-white/70" /> Bulk Campaign Engine</h2>
          <p className="text-sm text-white/40 mb-8 font-light leading-relaxed">Upload a CSV file (Name, Phone) to automatically dial multiple prospects in sequence.</p>
          
          <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-2xl p-6 relative hover:border-[var(--color-hulk)]/50 hover:bg-white/[0.02] transition-all cursor-pointer">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="text-center">
              <Upload className="w-8 h-8 text-white/30 mx-auto mb-3 group-hover:text-[var(--color-hulk)] transition-colors" />
              <p className="text-sm text-white/40 font-light">Click to upload CSV or drag and drop</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Campaign Queue Table */}
      {bulkContacts.length > 0 && (
        <motion.div variants={itemVariants} className="glass-panel border border-[var(--color-hulk)]/20 rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-hulk)]/5 to-transparent pointer-events-none"></div>
          <div className="p-6 border-b border-white/5 flex justify-between items-center relative z-10">
            <h2 className="text-lg font-light">Active Campaign Queue <span className="text-[var(--color-hulk)] ml-2">({bulkContacts.filter(c => c.status === 'success').length} / {bulkContacts.length})</span></h2>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleCampaign}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold tracking-wide transition-all ${
                isBulkCalling 
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20' 
                  : 'bg-[var(--color-hulk)] text-black shadow-[0_0_20px_rgba(91,255,122,0.3)] hover:bg-[var(--color-hulk)]/90'
              }`}
            >
              {isBulkCalling ? <><Pause className="w-4 h-4" /> Pause Campaign</> : <><Play className="w-4 h-4" /> Initialize Campaign</>}
            </motion.button>
          </div>
          
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 text-white/40 font-mono text-[10px] uppercase tracking-widest border-b border-white/5">
                <tr>
                  <th className="px-8 py-4 font-normal">Subject Name</th>
                  <th className="px-8 py-4 font-normal">Contact Node</th>
                  <th className="px-8 py-4 font-normal">Dialer Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bulkContacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-5 text-white/90">{contact.name}</td>
                    <td className="px-8 py-5 font-mono text-white/50">{contact.phone}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        {contact.status === 'pending' && <Clock className="w-4 h-4 text-white/30" />}
                        {contact.status === 'calling' && <Phone className="w-4 h-4 text-blue-400 animate-pulse glow-ironman" />}
                        {contact.status === 'success' && <CheckCircle2 className="w-4 h-4 text-[var(--color-hulk)] glow-hulk" />}
                        {contact.status === 'error' && <XCircle className="w-4 h-4 text-rose-400" />}
                        <span className={`capitalize text-xs font-medium tracking-wide ${
                          contact.status === 'success' ? 'text-[var(--color-hulk)]' :
                          contact.status === 'calling' ? 'text-blue-400' :
                          contact.status === 'error' ? 'text-rose-400' : 'text-white/40'
                        }`}>{contact.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Database Campaign Results */}
      <motion.div variants={itemVariants} className="glass-panel border border-white/5 rounded-3xl overflow-hidden relative">
        <div className="p-8 border-b border-white/5 relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-light flex items-center gap-3">Campaign Analytics <span className="px-3 py-1 bg-[var(--color-hulk)]/10 text-[var(--color-hulk)] border border-[var(--color-hulk)]/20 text-[10px] font-mono tracking-widest uppercase rounded-full">Live Neural Sync</span></h2>
            <p className="text-sm text-white/40 mt-2 font-light">Real-time telemetry of leads qualified by Hulk during the current active campaign.</p>
          </div>
        </div>
        
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 text-white/40 font-mono text-[10px] uppercase tracking-widest border-b border-white/5">
              <tr>
                <th className="px-8 py-4 font-normal">Subject Name</th>
                <th className="px-8 py-4 font-normal">Contact Node</th>
                <th className="px-8 py-4 font-normal">Classification</th>
                <th className="px-8 py-4 font-normal">Extracted Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {dbLeads.length === 0 ? (
                 <tr><td colSpan={4} className="px-8 py-12 text-center text-white/30 font-light">No outbound calls have been processed. Standing by for campaign execution.</td></tr>
              ) : dbLeads.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-5 text-white/90">{lead.name}</td>
                  <td className="px-8 py-5 font-mono text-white/50">{lead.phone_number}</td>
                  <td className="px-8 py-5">
                    {lead.status === 'INTERESTED' ? (
                      <span className="px-3 py-1 bg-[var(--color-hulk)]/10 text-[var(--color-hulk)] rounded-full text-xs font-medium border border-[var(--color-hulk)]/20 shadow-[0_0_10px_rgba(91,255,122,0.1)]">INTERESTED</span>
                    ) : lead.status === 'NOT_INTERESTED' ? (
                      <span className="px-3 py-1 bg-rose-500/10 text-rose-400 rounded-full text-xs font-medium border border-rose-500/20">NOT INTERESTED</span>
                    ) : lead.status === 'MORE_INFORMATION_REQUESTED' ? (
                      <span className="px-3 py-1 bg-[var(--color-ironman)]/10 text-[var(--color-ironman)] rounded-full text-xs font-medium border border-[var(--color-ironman)]/20 shadow-[0_0_10px_rgba(59,167,255,0.1)]">MORE INFO</span>
                    ) : (
                      <span className="px-3 py-1 bg-white/5 text-white/50 rounded-full text-xs font-medium border border-white/10">{lead.status}</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-white/50 font-light">{lead.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

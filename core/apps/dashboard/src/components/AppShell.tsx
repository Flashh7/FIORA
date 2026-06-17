"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/AuthProvider';
import { WebSocketProvider } from '../lib/websocket';
import { Toaster } from 'react-hot-toast';
import AgentSidebar from './AgentSidebar';
import { ParticleUniverse } from './ParticleUniverse';
import { useHealth } from '../lib/HealthProvider';
import { motion } from 'framer-motion';
import { Activity, Bell } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { statuses } = useHealth();
  
  useEffect(() => {
    if (!user && pathname !== '/login') {
      window.location.href = '/login';
    }
  }, [user, pathname]);
  
  if (pathname === '/login') {
    return (
      <main className="flex-1 relative overflow-y-auto">
        <Toaster position="top-right" toastOptions={{ className: '!bg-[#0F1115] !text-white !border !border-white/10' }} />
        <ParticleUniverse />
        {children}
      </main>
    );
  }

  const allSystemsOperational = Object.values(statuses).every(s => s === 'online');

  return (
    <WebSocketProvider>
      <ParticleUniverse />
      <div className="flex h-screen overflow-hidden bg-transparent text-white">
        <AgentSidebar />
        
        {/* Main Content Area */}
        <main className="flex-1 relative overflow-y-auto flex flex-col">
          {/* Top Navigation */}
          <header className="h-16 border-b border-white/5 glass-panel sticky top-0 z-40 flex items-center justify-between px-8">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <div className={`w-2 h-2 rounded-full animate-pulse ${allSystemsOperational ? 'bg-emerald-400 glow-hulk' : 'bg-rose-500'}`}></div>
                <span className="text-xs font-mono uppercase tracking-widest text-white/70">
                  {allSystemsOperational ? 'Systems Nominal' : 'Degraded Performance'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <motion.button whileHover={{ scale: 1.1 }} className="relative text-white/70 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-[#050505]"></span>
              </motion.button>
            </div>
          </header>

          <div className="flex-1 p-8">
            <Toaster position="top-right" toastOptions={{ className: '!bg-[#0F1115] !text-white !border !border-white/10' }} />
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </WebSocketProvider>
  );
}

"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/AuthProvider';
import { useHealth } from '../lib/HealthProvider';
import { motion } from 'framer-motion';
import { Shield, TrendingUp, Users, DollarSign, Activity, Zap } from 'lucide-react';

export default function AgentSidebar() {
  const { user, logout } = useAuth();
  const { statuses } = useHealth();
  const pathname = usePathname();

  const navItems = [
    { name: 'Core Overview', path: '/', icon: Activity, color: 'text-white' },
    { name: 'Marketing (Hulk)', path: '/marketing', icon: Users, color: 'text-[var(--color-hulk)]', glow: 'bg-[var(--color-hulk)] glow-hulk' },
    { name: 'Sales (Iron Man)', path: '/sales', icon: TrendingUp, color: 'text-[var(--color-ironman)]', glow: 'bg-[var(--color-ironman)] glow-ironman' },
    { name: 'Support (Homelander)', path: '/support', icon: Shield, color: 'text-[var(--color-homelander)]', glow: 'bg-[var(--color-homelander)] glow-homelander' },
    { name: 'Finance (Strange)', path: '/finance', icon: DollarSign, color: 'text-[var(--color-strange)]', glow: 'bg-[var(--color-strange)] glow-strange' },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-white/5 flex flex-col justify-between h-full relative z-10 transition-all duration-300">
      <div className="p-6 overflow-y-auto">
        <Link href="/">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-3 mb-12 cursor-pointer"
          >
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md text-white flex items-center justify-center font-bold tracking-tighter rounded-xl border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] relative overflow-hidden">
              <span className="relative z-10">F</span>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 animate-pulse"></div>
            </div>
            <div>
              <span className="font-bold tracking-[0.2em] text-sm uppercase text-white/90">Fiora OS</span>
              <p className="text-[10px] text-white/40 tracking-widest font-mono uppercase mt-0.5">Core System v2.0</p>
            </div>
          </motion.div>
        </Link>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mb-4 px-3">System Nodes</h3>
            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                return (
                  <Link key={item.path} href={item.path} className="block relative">
                    <motion.div 
                      whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-white/10 shadow-lg border border-white/10' : 'border border-transparent'}`}
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="activeIndicator"
                          className={`absolute left-0 w-1 h-8 rounded-r-full ${item.glow || 'bg-white'}`} 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                        />
                      )}
                      <item.icon className={`w-4 h-4 ${isActive ? item.color : 'text-white/40'}`} />
                      <span className={`text-sm tracking-wide ${isActive ? 'text-white font-medium' : 'text-white/50'}`}>
                        {item.name}
                      </span>
                    </motion.div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-md">
        <div 
          onClick={logout}
          className="flex items-center space-x-3 cursor-pointer group p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/0 group-hover:via-rose-500/10 to-rose-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white group-hover:bg-rose-500/20 group-hover:text-rose-400 group-hover:shadow-[0_0_10px_rgba(244,63,94,0.3)] transition-all">
            <Zap className="w-3 h-3" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium tracking-wide text-white/80 group-hover:text-white truncate">Disconnect</p>
            <p className="text-[10px] text-white/30 truncate uppercase tracking-wider font-mono">End Session</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

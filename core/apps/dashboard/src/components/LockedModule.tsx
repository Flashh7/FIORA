"use client";

import { AgentMetadata } from '@fiora/agent-registry';

export default function LockedModule({ agent }: { agent: AgentMetadata }) {
  return (
    <div className="flex items-center justify-center h-full bg-black">
      <div className="max-w-md p-8 border border-white/10 bg-[#0a0a0a] rounded-xl shadow-2xl text-center relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>

        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
          <span className="text-2xl">🔒</span>
        </div>
        
        <h2 className="text-2xl font-semibold text-white mb-2 relative z-10">{agent.name}</h2>
        <p className="text-sm text-gray-400 mb-6 relative z-10 leading-relaxed">
          {agent.description}
        </p>

        <div className="bg-black/50 border border-white/5 rounded-lg p-4 mb-8 text-left relative z-10">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Capabilities</h4>
          <ul className="space-y-2">
            {agent.capabilities.map((cap, i) => (
              <li key={i} className="flex items-center text-sm text-gray-300">
                <span className="text-emerald-500 mr-2">✓</span> {cap}
              </li>
            ))}
          </ul>
        </div>

        <button className="w-full py-3 px-4 bg-white text-black font-medium text-sm rounded-lg hover:bg-gray-200 transition-colors relative z-10 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          Upgrade Plan to Unlock
        </button>
      </div>
    </div>
  );
}

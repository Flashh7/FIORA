'use client';

import React, { useEffect, useState } from 'react';
import { Database, Activity, Key, RefreshCw, Cpu, Server, Network } from 'lucide-react';

export default function GlobalMemoryPanel() {
  const [memory, setMemory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMemory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/memory');
      const data = await res.json();
      setMemory(data);
    } catch (err) {
      console.error('Failed to fetch global memory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemory();
    const interval = setInterval(fetchMemory, 5000); // Polling every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-black/40 border border-white/10 p-6 rounded-lg backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center">
            <Database className="w-6 h-6 mr-3 text-purple-400" />
            Global Memory Bus
          </h1>
          <p className="text-sm text-gray-400 mt-1">Shared context layer across all active autonomous agents.</p>
        </div>
        <button 
          onClick={fetchMemory} 
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm text-gray-300 transition-colors flex items-center"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          {loading ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center">
            <Key className="w-4 h-4 mr-2 text-gray-500" />
            Active Entities in Memory
          </h3>
          
          {memory && Object.keys(memory.memoryStore).map((key) => (
            <div key={key} className="bg-white/[0.03] border border-white/5 rounded-lg p-4 hover:border-purple-500/30 transition-colors group cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-purple-300">{key}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="text-xs text-gray-500">
                {Object.keys(memory.memoryStore[key]).length} context variables
              </div>
            </div>
          ))}
          
          {!memory && (
             <div className="animate-pulse flex flex-col space-y-4">
               <div className="h-20 bg-white/5 rounded-lg w-full"></div>
               <div className="h-20 bg-white/5 rounded-lg w-full"></div>
             </div>
          )}
        </div>

        {/* JSON Inspector */}
        <div className="lg:col-span-2">
          <div className="bg-[#0a0a0c] border border-white/10 rounded-lg overflow-hidden h-full flex flex-col">
            <div className="border-b border-white/10 bg-black/40 px-4 py-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center">
                <Network className="w-4 h-4 mr-2 text-blue-400" />
                Raw Context State
              </h3>
              <div className="flex space-x-2">
                <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] uppercase rounded">Redis Synced</span>
              </div>
            </div>
            
            <div className="flex-1 p-6 overflow-auto">
              {memory ? (
                <div className="space-y-6">
                  {Object.entries(memory.memoryStore).map(([key, data]: [string, any]) => (
                    <div key={key} className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
                      <h4 className="text-purple-300 font-mono text-xs mb-4 pb-2 border-b border-white/5">{key}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(data).map(([k, v]: [string, any]) => (
                          <div key={k} className="flex flex-col bg-black/40 p-4 rounded-lg border border-white/5 shadow-inner">
                            <span className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 font-semibold">{k.replace(/_/g, ' ')}</span>
                            <span className={`text-sm font-medium ${typeof v === 'boolean' ? (v ? 'text-emerald-400' : 'text-rose-400') : typeof v === 'number' ? 'text-blue-300' : 'text-gray-200'}`}>
                              {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-white/5 rounded w-1/4"></div>
                  <div className="h-4 bg-white/5 rounded w-1/2"></div>
                  <div className="h-4 bg-white/5 rounded w-1/3"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Temporal History Log */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center mb-4">
          <Activity className="w-4 h-4 mr-2 text-rose-400" />
          Temporal History (Event Ledger)
        </h3>
        <div className="bg-black/20 border border-white/5 rounded-lg p-5">
          {memory ? (
            <div className="space-y-4">
              {Object.entries(memory.temporalHistory).map(([entity, events]: [string, any]) => (
                <div key={entity} className="border-l-2 border-white/10 pl-4 py-1">
                  <div className="text-xs text-gray-500 mb-2 font-mono">{entity}</div>
                  <div className="space-y-2">
                    {events.map((ev: any, idx: number) => (
                      <div key={idx} className="flex items-start text-sm">
                        <span className="text-gray-600 font-mono text-[10px] w-24 pt-1 flex-shrink-0">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-gray-300 bg-white/[0.02] px-2 py-1 rounded">
                          {JSON.stringify(ev.context)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-10 bg-white/5 rounded animate-pulse w-full"></div>
          )}
        </div>
      </div>
    </div>
  );
}

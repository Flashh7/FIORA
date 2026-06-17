"use client";

import { useEffect, useState } from 'react';
import { getServiceWsUrl } from '@fiora/service-discovery';

export default function EventStreamPanel() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const coreWs = getServiceWsUrl('core') || 'ws://localhost:3001';
    // Convert ws:// to http:// for SSE EventSource
    const sseUrl = coreWs.replace('ws://', 'http://').replace('wss://', 'https://');
    const sse = new EventSource(`${sseUrl}/api/ws/live?token=dummy`);
    
    sse.onerror = () => {
      console.warn('[EventStream] Service offline');
    };
    
    sse.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        
        setEvents((prev) => {
          // Keep only the last 50 events
          const updated = [data, ...prev].slice(0, 50);
          return updated;
        });
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    return () => {
      sse.close();
    };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-medium tracking-tight">Live Event Stream</h2>
          <div className="bg-white/[0.05] rounded p-1 flex items-center text-xs space-x-1">
            <button className="px-2 py-1 text-gray-500 hover:text-white transition">SIMULATION</button>
            <button className="px-2 py-1 bg-white/10 rounded shadow-sm">PRODUCTION</button>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Real-time connected</span>
        </div>
      </div>
      
      <div className="border border-white/5 bg-white/[0.01] rounded-lg overflow-hidden h-[400px] overflow-y-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-white/[0.02] border-b border-white/5 text-gray-400 text-[10px] uppercase tracking-wider sticky top-0 backdrop-blur-md">
            <tr>
              <th className="px-6 py-4 font-medium">Time</th>
              <th className="px-6 py-4 font-medium">Event Type</th>
              <th className="px-6 py-4 font-medium">Execution ID</th>
              <th className="px-6 py-4 font-medium">Status / Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-gray-300 font-mono text-xs">
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Waiting for live events...</td>
              </tr>
            ) : events.map((row, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 text-gray-500">{new Date().toLocaleTimeString()}</td>
                <td className="px-6 py-4 text-blue-300 font-medium">{row.type}</td>
                <td className="px-6 py-4 text-gray-400">{row.data?.execution_id?.substring(0,8) || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium tracking-wide ${
                    row.data?.status === 'COMPLETED' ? 'bg-emerald-400/10 text-emerald-400' :
                    row.data?.status === 'APPROVED' ? 'bg-emerald-400/10 text-emerald-400' :
                    row.data?.status === 'ESCALATED' ? 'bg-amber-400/10 text-amber-400' :
                    row.data?.status === 'REJECTED' ? 'bg-rose-400/10 text-rose-400' :
                    row.data?.status === 'PENDING' ? 'bg-amber-400/10 text-amber-400 animate-pulse' :
                    'bg-white/10 text-white'
                  }`}>
                    {row.data?.status || 'LOGGED'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

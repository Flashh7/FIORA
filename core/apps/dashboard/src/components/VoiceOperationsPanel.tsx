"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthProvider';
import { getServiceWsUrl } from '@fiora/service-discovery';

export default function VoiceOperationsPanel() {
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);

  useEffect(() => {
    // We use the same SSE endpoint that dashboard uses for other events
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const voiceWs = getServiceWsUrl('voice') || 'ws://localhost:3004';
    // Convert ws:// to http:// for SSE EventSource
    const sseUrl = voiceWs.replace('ws://', 'http://').replace('wss://', 'https://');
    const sse = new EventSource(`${sseUrl}/api/ws/live?token=${token}`);
    
    sse.onerror = () => {
      console.warn('[VoiceOperations] Service offline');
    };

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'CALL_TRANSCRIPT') {
          setTranscripts(prev => [data.data, ...prev].slice(0, 10));
        } else if (data.type === 'ESCALATION_CREATED' && data.data.agent_name === 'voice-agent') {
          setEscalations(prev => [data.data, ...prev].slice(0, 5));
        }
      } catch (e) {
        console.error(e);
      }
    };

    return () => sse.close();
  }, []);

  return (
    <div className="md:col-span-2 mt-8">
      <h2 className="text-lg font-medium tracking-tight mb-4 flex items-center">
        <span className="w-2 h-2 rounded-full bg-violet-500 mr-2"></span>
        Governed Voice Operations (Live)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Live Interactions</h3>
          <div className="space-y-3 text-xs">
            {transcripts.length === 0 && <p className="text-gray-500">Waiting for live voice streams...</p>}
            {transcripts.map((t, i) => (
              <div key={i} className={`p-2 border rounded bg-white/[0.01] border-white/5`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-medium ${t.speaker === 'AI' ? 'text-violet-400' : 'text-emerald-400'}`}>{t.speaker}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                    {new Date(t.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-gray-400">
                  {t.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5 md:col-span-2">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Conversational Governance Alerts</h3>
          <div className="space-y-3">
            {escalations.length === 0 && <p className="text-gray-500">No active escalations.</p>}
            {escalations.map((esc, i) => (
              <div key={i} className="p-3 border-l-2 border-rose-500 bg-white/[0.01]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-gray-400 font-mono">CALL SID: {esc.callSid || esc.execution_id}</span>
                  <div className="flex space-x-2">
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[9px] uppercase rounded">DISTRESS_DETECTED</span>
                  </div>
                </div>
                <div className="text-xs text-gray-300">
                  <span className="font-semibold text-rose-400">Escalation Triggered:</span> {esc.reason}
                </div>
                <div className="mt-3 flex space-x-2">
                  <button className="px-3 py-1 bg-violet-500/20 text-violet-400 text-xs rounded hover:bg-violet-500/30 transition">Take Over Call (WebRTC)</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

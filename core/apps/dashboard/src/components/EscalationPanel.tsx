"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthProvider';
import { useWebSocket } from '../lib/websocket';
import { toast } from 'react-hot-toast';
import { getServiceUrl } from '@fiora/service-discovery';

export default function EscalationPanel() {
  const [escalations, setEscalations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const { lastMessage } = useWebSocket();
  const [confirming, setConfirming] = useState<{id: string, action: 'approve'|'reject'} | null>(null);

  const fetchEscalations = async () => {
    if (!token) return;
    try {
      const coreApi = getServiceUrl('core');
      const res = await fetch(`${coreApi}/api/escalations/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch escalations');
      }
      const data = await res.json();
      console.log("ESCALATIONS RESPONSE:", data);
      
      const normalized = Array.isArray(data) 
        ? data 
        : data.data || data.escalations || [];
        
      setEscalations(normalized);
    } catch (err) {
      console.warn('[Dashboard] Escalation API offline or failed');
      setEscalations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalations();
  }, [token]);

  // Handle Real-time WebSocket Updates
  useEffect(() => {
    if (!lastMessage) return;
    
    if (lastMessage.type === 'EVENT_LOGGED' && lastMessage.data.type === 'SUPPORT_TICKET_CREATED') {
      fetchEscalations();
    } else if (lastMessage.type === 'ESCALATION_CREATED') {
      toast('New Support Escalation Required', { icon: '⚠️', style: { border: '1px solid #f59e0b', color: '#f59e0b' } });
      fetchEscalations();
    } else if (lastMessage.type === 'ESCALATION_RESOLVED') {
      setEscalations(prev => prev.filter(e => e.id !== lastMessage.data.id));
    }
  }, [lastMessage]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (!token) return;
    try {
      // Optimistic update
      setEscalations(prev => prev.filter(e => e.id !== id));
      
      const coreApi = getServiceUrl('core');
      const res = await fetch(`${coreApi}/api/escalation/${id}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error('Action failed');
      
      toast.success(`Escalation ${action}d successfully`);
      fetchEscalations();
      setConfirming(null);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${action} escalation`);
      fetchEscalations(); // Revert optimistic update
    }
  };

  const escalationList = Array.isArray(escalations) ? escalations : [];

  return (
    <div>
      <h2 className="text-lg font-medium tracking-tight mb-4 flex items-center">
        <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
        Escalation Override
      </h2>
      <div className="bg-white/[0.02] border border-amber-500/20 rounded-lg p-5 flex flex-col h-[230px] overflow-y-auto">
        {loading ? (
          <div className="text-xs text-gray-500 animate-pulse">Loading escalations...</div>
        ) : escalationList.length === 0 ? (
          <div className="text-xs text-gray-500">No pending escalations.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {escalationList.map((esc) => (
              <div key={esc.id} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-amber-400">Escalation Required</h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono">Execution: {esc.execution_id.substring(0,8)}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] rounded">{esc.status}</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed mb-3">
                  {esc.reason} (Confidence: {esc.final_confidence})
                </p>
                
                {confirming?.id === esc.id ? (
                  <div className="p-3 bg-gray-900 border border-gray-700 rounded-md">
                    <p className="text-xs text-gray-300 mb-3">Are you sure you want to {confirming?.action} this escalation?</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => confirming && handleAction(esc.id, confirming.action)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded ${confirming?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'}`}
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => setConfirming(null)}
                        className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setConfirming({id: esc.id, action: 'approve'})}
                      className="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded transition"
                    >
                      APPROVE
                    </button>
                    <button 
                      onClick={() => setConfirming({id: esc.id, action: 'reject'})}
                      className="py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium rounded transition"
                    >
                      REJECT
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

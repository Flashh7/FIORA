'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, DollarSign, Activity, AlertCircle, RefreshCw } from 'lucide-react';

export default function PaymentTrackingPanel() {
  const [metrics, setMetrics] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [metricsRes, paymentsRes] = await Promise.all([
        fetch('http://localhost:3010/api/payments/metrics'),
        fetch('http://localhost:3010/api/payments/recent')
      ]);

      if (!metricsRes.ok || !paymentsRes.ok) throw new Error('API Error');

      const metricsData = await metricsRes.json();
      const paymentsData = await paymentsRes.json();
      
      setMetrics(metricsData);
      setPayments(paymentsData);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="md:col-span-2 mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium tracking-tight flex items-center">
          <DollarSign className="w-4 h-4 text-emerald-400 mr-2" />
          Real-time Payment Tracking
        </h2>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-300 flex items-center"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Sync
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg mb-6 flex items-center text-sm">
          <AlertCircle className="w-4 h-4 mr-2" />
          Could not connect to the Finance Agent backend on port 3010.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metrics Column */}
        <div className="space-y-4">
          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Stripe Account</h3>
            {metrics ? (
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-gray-500 mb-1">Available Balance</div>
                  <div className="text-xl font-medium text-emerald-400">{metrics.stripe.available}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-1">Pending</div>
                  <div className="text-sm font-medium text-gray-300">{metrics.stripe.pending}</div>
                </div>
                {metrics.stripe.mocked && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] uppercase rounded">MOCK DATA</span>
                )}
              </div>
            ) : (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-white/5 rounded w-3/4"></div>
                  <div className="h-4 bg-white/5 rounded w-1/2"></div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Razorpay Account</h3>
            {metrics ? (
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-gray-500 mb-1">Recent Volume</div>
                  <div className="text-xl font-medium text-emerald-400">{metrics.razorpay.volume}</div>
                </div>
                {metrics.razorpay.mrr && (
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">Estimated MRR</div>
                    <div className="text-sm font-medium text-gray-300">{metrics.razorpay.mrr}</div>
                  </div>
                )}
                {metrics.razorpay.mocked && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] uppercase rounded">MOCK DATA</span>
                )}
              </div>
            ) : (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-white/5 rounded w-3/4"></div>
                  <div className="h-4 bg-white/5 rounded w-1/2"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Column */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5 md:col-span-2 flex flex-col h-full">
          <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center">
            <Activity className="w-4 h-4 text-blue-400 mr-2" />
            Live Transaction Stream
          </h3>
          <div className="space-y-3 flex-1 overflow-auto pr-2">
            {!loading && payments.length === 0 && !error && (
              <div className="text-xs text-gray-500 flex h-full items-center justify-center">
                No recent payments found.
              </div>
            )}
            
            {loading && !payments.length ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white/5 rounded"></div>
                ))}
              </div>
            ) : (
              payments.map((p, i) => (
                <div key={i} className="p-3 border-l-2 border-emerald-500 bg-white/[0.01] hover:bg-white/[0.03] transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-gray-400 font-mono flex items-center">
                        <CreditCard className="w-3 h-3 mr-1" />
                        {p.id}
                      </span>
                      <span className="px-1.5 py-0.5 bg-gray-500/10 text-gray-400 text-[9px] uppercase rounded">
                        {p.gateway}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-right">
                      <span className="text-sm font-semibold text-gray-200">
                        {p.amount} <span className="text-[10px] text-gray-500">{p.currency}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-xs text-gray-400">
                      <span className="text-gray-300">{p.customer}</span>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${p.status === 'succeeded' || p.status === 'captured' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {p.status}
                      </span>
                      <span className="text-[9px] text-gray-600">
                        {new Date(p.date).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

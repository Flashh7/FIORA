import { crmState } from '../lib/mock-data';

export default function RevenueOpsPanel() {
  return (
    <div className="md:col-span-2 mt-8">
      <h2 className="text-lg font-medium tracking-tight mb-4 flex items-center">
        <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
        Governed Revenue Operations
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-3">CRM Intelligence State</h3>
          <div className="space-y-3 text-xs">
            {crmState.map((crm, i) => (
              <div key={i} className={`p-2 bg-white/[0.01] border border-white/5 rounded`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-200">{crm.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${crm.risky ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {crm.status}
                  </span>
                </div>
                <div className="text-gray-500 flex justify-between">
                  <span>{crm.tier}</span>
                  <span className={crm.risky ? 'text-rose-400' : 'text-blue-400'}>{crm.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5 md:col-span-2">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Outreach Governance Queue</h3>
          <div className="space-y-3">
            <div className="p-3 border-l-2 border-amber-500 bg-white/[0.01]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-gray-400 font-mono">OPP-9481 (Acme Corp)</span>
                <div className="flex space-x-2">
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] uppercase rounded">PENDING_APPROVAL</span>
                </div>
              </div>
              <div className="text-xs text-gray-300">
                <span className="font-semibold">Reason:</span> OUTREACH_FREQUENCY_LIMIT_EXCEEDED
              </div>
              <div className="mt-2 text-[10px] text-gray-500">
                Throttled duration: 24h. Payload certified and locked.
              </div>
              <div className="mt-3 flex space-x-2">
                <button className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded hover:bg-emerald-500/30 transition">Approve</button>
                <button className="px-3 py-1 bg-rose-500/20 text-rose-400 text-xs rounded hover:bg-rose-500/30 transition">Reject</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

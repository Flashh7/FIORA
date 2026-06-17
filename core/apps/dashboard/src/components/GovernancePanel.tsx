import { trustScores } from '../lib/mock-data';

export default function GovernancePanel() {
  return (
    <div className="md:col-span-2 mt-8">
      <h2 className="text-lg font-medium tracking-tight mb-4 flex items-center">
        <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
        Determinism Certification & Trust Governance
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Operational Trust Scores</h3>
          <div className="space-y-4">
            {trustScores.map((t, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-white/[0.01] border border-white/5 rounded">
                <div>
                  <div className="text-sm text-gray-200">{t.agent}</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-1">Trust Score: {t.score.toFixed(2)}</div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-2 py-0.5 text-[10px] rounded ${t.tier === 'TIER_1' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {t.tier}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-1 uppercase">Risk: {t.risk}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Live Pilot Workflows</h3>
          <div className="flex flex-col space-y-2">
            <div className="p-3 border border-indigo-500/30 bg-white/[0.01] rounded">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-indigo-400 font-mono">pilot_641f</span>
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[9px] uppercase rounded">Simulated</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-400 font-mono">
                <span className="text-gray-300">Gateway</span>
                <span>→</span>
                <span className="text-gray-300">Marketing</span>
                <span>→</span>
                <span className="text-amber-400 border border-amber-500/30 px-1 rounded">Approval Gate</span>
              </div>
              <div className="mt-4 flex space-x-2">
                <button className="flex-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-medium rounded transition border border-emerald-500/20">APPROVE PRODUCTION RUN</button>
                <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] font-medium rounded transition border border-white/5">CERTIFY GRAPH</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

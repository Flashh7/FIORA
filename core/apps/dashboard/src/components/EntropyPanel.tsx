export default function EntropyPanel() {
  return (
    <div className="md:col-span-2 mt-8">
      <h2 className="text-lg font-medium tracking-tight mb-4 flex items-center">
        <span className="w-2 h-2 rounded-full bg-fuchsia-500 mr-2"></span>
        Operational Entropy Governance
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Entropy & Debt</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Entropy Budget</span>
                <span className="text-gray-200">54.4 / 100.0</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5">
                <div className="bg-fuchsia-500 h-1.5 rounded-full" style={{ width: '54.4%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Replay Debt Score</span>
                <span className="text-rose-400">85.5 (HIGH RISK)</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5">
                <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: '85.5%' }}></div>
              </div>
            </div>
            <div className="text-xs text-gray-500 border-t border-white/5 pt-2">
              <span className="text-gray-400">Recovery ETA:</span> 45 mins
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5 md:col-span-2">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Recovery Orchestration Certifications</h3>
          <div className="space-y-3">
            <div className="p-3 border border-fuchsia-500/20 bg-white/[0.01] rounded">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-gray-400 font-mono">REC: endurance-sim-999</span>
                <span className="px-2 py-0.5 bg-fuchsia-500/10 text-fuchsia-400 text-[9px] uppercase rounded">RECOVERY_CERTIFIED</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="text-[10px] text-gray-500">
                  <span className="text-gray-400 block mb-0.5">Integrity Score</span>
                  <span className="text-emerald-400 font-mono text-xs">1.00</span>
                </div>
                <div className="text-[10px] text-gray-500">
                  <span className="text-gray-400 block mb-0.5">Stalled Queue Resync</span>
                  <span className="text-gray-200 font-mono text-xs">4,500 events</span>
                </div>
              </div>
              <div className="mt-3 text-[9px] font-mono text-gray-600 truncate">
                HASH: 8f7c9b2a1d3e...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

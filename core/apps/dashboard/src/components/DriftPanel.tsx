import { driftAlerts } from '../lib/mock-data';

export default function DriftPanel() {
  return (
    <div>
      <h2 className="text-lg font-medium tracking-tight mb-4 flex items-center">
        <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
        Replay Drift Detection
      </h2>
      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5 space-y-4">
        {driftAlerts.map((alert, i) => (
          <div key={i} className={`flex items-center justify-between p-3 rounded bg-white/[0.01] border ${alert.alert ? 'border-amber-500/30' : 'border-white/5'}`}>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 font-mono">{alert.id}</span>
              <span className="text-[10px] text-gray-500 uppercase mt-1">
                {alert.structural ? 'Structural Drift' : 'Semantic Drift'}
              </span>
            </div>
            <div className="flex items-center space-x-4 text-xs font-mono">
              <span className={alert.drift === "0.00" ? 'text-emerald-400' : 'text-amber-400'}>Δ {alert.drift}</span>
              <span className="text-gray-500">{alert.latency}</span>
              <button className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded transition text-gray-300">COMPARE</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

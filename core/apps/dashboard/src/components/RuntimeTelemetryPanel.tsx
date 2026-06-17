import { traceEvents } from '../lib/mock-data';

export default function RuntimeTelemetryPanel() {
  return (
    <div className="md:col-span-2 mt-8">
      <h2 className="text-lg font-medium tracking-tight mb-4 flex items-center">
        <span className="w-2 h-2 rounded-full bg-rose-500 mr-2"></span>
        Distributed Runtime Governance
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Runtime Stability</h3>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-amber-400 font-mono text-sm">DEGRADED</span>
          </div>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex justify-between"><span>Active Backpressure:</span> <span className="text-rose-400">THROTTLE_REPLAYS</span></div>
            <div className="flex justify-between"><span>Queue Latency:</span> <span>2,450ms</span></div>
            <div className="flex justify-between"><span>Escalation Burst:</span> <span className="text-amber-400">24/min</span></div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5 md:col-span-2">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Distributed Event Trace (Window: 15m)</h3>
          <div className="space-y-3">
            {traceEvents.map((trace, i) => (
              <div key={i} className={`p-2 border-l-2 bg-white/[0.01] ${trace.isError ? 'border-rose-500' : 'border-emerald-500'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 font-mono">SEQ: {trace.seq}</span>
                  <span className={`text-[10px] ${trace.isError ? 'text-rose-400' : 'text-emerald-400'}`}>{trace.status}</span>
                </div>
                <div className="text-xs text-gray-300 mt-1">{trace.flow}</div>
                <div className="text-[10px] text-gray-500 mt-1">Duration: {trace.duration} | Skew: {trace.skew}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

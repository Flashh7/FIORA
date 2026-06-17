import { systemMetrics } from '../lib/mock-data';

export default function HeaderMetrics() {
  return (
    <>
      <header className="mb-12">
        <h1 className="text-3xl font-light tracking-tight">System Status: <span className="text-emerald-400 font-medium">Optimal</span></h1>
        <p className="text-gray-400 mt-2 text-sm">All orchestration nodes are online. Event queue is processing.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-12">
        {systemMetrics.map((metric, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/5 rounded-lg p-5 flex flex-col justify-between h-24">
            <h3 className="text-gray-500 text-[10px] font-medium uppercase tracking-wider mb-2">{metric.label}</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-light">{metric.value}</span>
              {metric.status === 'warning' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>}
              {metric.status === 'stable' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>}
              {metric.status === 'info' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

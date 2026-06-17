import { workforceMatrix } from '../lib/mock-data';

export default function AgentWorkforceMatrix() {
  return (
    <div className="md:col-span-2 mt-8">
      <h2 className="text-lg font-medium tracking-tight mb-4 flex items-center">
        <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
        Operational Workforce Command Center
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5 md:col-span-2">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Live Agent Workforce Matrix</h3>
          <div className="space-y-3">
            {workforceMatrix.map((agent, i) => {
              const colors: any = {
                indigo: { bg: 'bg-indigo-500/5', border: 'border-indigo-500/20', dot: 'bg-indigo-400', textLight: 'text-indigo-300', textDark: 'text-indigo-400' },
                emerald: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', dot: 'bg-emerald-400', textLight: 'text-emerald-300', textDark: 'text-emerald-400' },
                cyan: { bg: 'bg-cyan-500/5', border: 'border-cyan-500/20', dot: 'bg-cyan-400', textLight: 'text-cyan-300', textDark: 'text-cyan-400' },
                amber: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', dot: 'bg-amber-400', textLight: 'text-amber-300', textDark: 'text-amber-400' },
              };
              const c = colors[agent.color];

              return (
                <div key={i} className={`flex items-center justify-between p-2 ${c.bg} border ${c.border} rounded`}>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full ${c.dot} mr-2`}></span>
                    <span className={`text-xs font-medium ${c.textLight}`}>{agent.name}</span>
                  </div>
                  <span className={`text-[10px] ${c.textDark}`}>STATUS: {agent.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

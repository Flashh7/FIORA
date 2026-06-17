export default function ForecastPanel() {
  return (
    <div className="md:col-span-2 mt-8">
      <h2 className="text-lg font-medium tracking-tight mb-4 flex items-center">
        <span className="w-2 h-2 rounded-full bg-violet-500 mr-2 animate-pulse"></span>
        Organizational Cognition & Forecast Reliability
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5 md:col-span-2">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Strategic Forecast Engine</h3>
          <div className="space-y-3">
            <div className="p-3 border border-violet-500/20 bg-violet-500/5 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-violet-300">CHURN_ACCELERATION</span>
                <span className="text-[10px] text-amber-400 font-mono">UNCERTAINTY: MEDIUM</span>
              </div>
              <div className="text-xs text-gray-300 mb-2">
                <span className="font-semibold text-rose-400">Prediction:</span> Expected CHURN_ACCELERATION trajectory degradation within 90 days.
              </div>
              <div className="flex justify-between items-end mb-2">
                <div className="text-[10px] text-gray-400">
                  <div><span className="text-gray-500">Confidence Range:</span> 20.0% - 30.0%</div>
                  <div><span className="text-gray-500">Historical Accuracy:</span> 0.84</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-violet-400 font-mono bg-violet-500/5 p-1.5 rounded">
                &gt; VOLATILITY FACTORS: Recent policy override, Operator fatigue spike
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5 md:col-span-2">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Workforce Fatigue & Drift</h3>
          <div className="space-y-3">
            <div className="p-3 border-l-2 border-rose-500 bg-white/[0.01]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-gray-400 font-mono">DRIFT: NORMALIZED_ESCALATION_CULTURE</span>
                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[9px] uppercase rounded animate-pulse">SEVERITY: HIGH</span>
              </div>
              <div className="text-xs text-gray-300 mb-2">
                <span className="font-semibold text-rose-400">Workforce Intelligence:</span> Critical operator fatigue detected. Intervention density exceeds bandwidth.
              </div>
              <div className="text-[10px] text-gray-400 mb-2">
                Burnout Risk Score: <span className="text-rose-400 font-bold">0.60</span> | Escalation Density: 1.80
              </div>
              <div className="mt-2 text-[10px] text-amber-400 font-mono bg-amber-500/5 p-1.5 rounded">
                &gt; ACTION: BLOCK_NON_CRITICAL Approvals to protect human bandwidth.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

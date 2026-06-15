export interface FatigueMetrics {
  burnout_risk_score: number;
  escalation_density: number;
  intervention_fatigue: number;
  action: 'MONITOR' | 'REDISTRIBUTE_LOAD' | 'BLOCK_NON_CRITICAL';
}

export function evaluateOperatorFatigue(escalationVolume: number, operatorBandwidth: number): FatigueMetrics {
  console.log(`[WORKFORCE_INTELLIGENCE] Evaluating human operator cognitive pressure...`);
  
  const density = escalationVolume / operatorBandwidth;
  let action: 'MONITOR' | 'REDISTRIBUTE_LOAD' | 'BLOCK_NON_CRITICAL' = 'MONITOR';
  let riskScore = density * 0.5;

  if (density > 1.5) {
    action = 'BLOCK_NON_CRITICAL';
    riskScore = Math.min(1.0, density * 0.6);
    console.log(`[WORKFORCE_INTELLIGENCE] Critical operator fatigue detected. Intervention density exceeds bandwidth.`);
  } else if (density > 0.8) {
    action = 'REDISTRIBUTE_LOAD';
  }

  return {
    burnout_risk_score: riskScore,
    escalation_density: density,
    intervention_fatigue: riskScore * 0.8,
    action
  };
}

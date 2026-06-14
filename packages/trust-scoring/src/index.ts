export interface OperationalTrustScore {
  agent_name: string;
  operational_trust_score: number;
  reliability_tier: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'UNTRUSTED';
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export function calculateTrustScore(
  agent_name: string,
  metrics: {
    replay_consistency: number;
    drift_frequency: number;
    escalation_frequency: number;
    latency_stability: number;
  }
): OperationalTrustScore {
  let score = 1.0;

  score -= (1.0 - metrics.replay_consistency) * 0.4;
  score -= metrics.drift_frequency * 0.3;
  score -= metrics.escalation_frequency * 0.2;
  score -= (1.0 - metrics.latency_stability) * 0.1;

  score = Math.max(0, Math.min(1, score));

  let tier: OperationalTrustScore['reliability_tier'] = 'UNTRUSTED';
  let risk: OperationalTrustScore['risk_level'] = 'CRITICAL';

  if (score >= 0.9) {
    tier = 'TIER_1';
    risk = 'LOW';
  } else if (score >= 0.75) {
    tier = 'TIER_2';
    risk = 'MODERATE';
  } else if (score >= 0.6) {
    tier = 'TIER_3';
    risk = 'HIGH';
  }

  return {
    agent_name,
    operational_trust_score: parseFloat(score.toFixed(2)),
    reliability_tier: tier,
    risk_level: risk,
  };
}

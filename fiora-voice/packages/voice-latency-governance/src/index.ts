export interface LatencyGovernanceResult {
  is_acceptable: boolean;
  action: 'CONTINUE' | 'DEGRADED_MODE' | 'ESCALATE' | 'OPERATOR_FALLBACK';
  reason?: string;
}

export function evaluateLatency(totalLatencyMs: number): LatencyGovernanceResult {
  console.log(`[LATENCY_GOVERNANCE] Evaluating end-to-end voice latency: ${totalLatencyMs}ms`);

  if (totalLatencyMs > 5000) {
    return {
      is_acceptable: false,
      action: 'OPERATOR_FALLBACK',
      reason: 'CRITICAL_LATENCY_EXCEEDED_5000MS'
    };
  }

  if (totalLatencyMs > 3000) {
    return {
      is_acceptable: false,
      action: 'ESCALATE',
      reason: 'HIGH_LATENCY_ESCALATION_RISK'
    };
  }

  if (totalLatencyMs > 1500) {
    return {
      is_acceptable: true,
      action: 'DEGRADED_MODE',
      reason: 'CONVERSATIONAL_DEGRADATION_RISK'
    };
  }

  return {
    is_acceptable: true,
    action: 'CONTINUE'
  };
}

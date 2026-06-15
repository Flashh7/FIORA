export interface ArbitrationDecision {
  winning_priority: string;
  suppressed_signals: string[];
  reason: string;
}

export function arbitrateConflict(signals: any[]): ArbitrationDecision {
  console.log(`[OPERATIONAL_ARBITRATION] Evaluating ${signals.length} conflicting operational signals...`);

  const hasEscalation = signals.find(s => s.signalType === 'ESCALATION_PRESSURE');
  const hasMarketing = signals.find(s => s.signalType === 'AGGRESSIVE_CAMPAIGN');
  
  if (hasEscalation && hasMarketing) {
    console.log(`[ARBITRATION] Support escalation overrides Marketing campaign.`);
    return {
      winning_priority: 'SUPPORT_ESCALATION',
      suppressed_signals: ['AGGRESSIVE_CAMPAIGN'],
      reason: 'SYSTEM_STABILITY_PRIORITY'
    };
  }

  return {
    winning_priority: signals[0]?.signalType || 'UNKNOWN',
    suppressed_signals: [],
    reason: 'NO_CONFLICT'
  };
}

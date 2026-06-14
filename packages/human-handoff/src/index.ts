export interface HandoffDecision {
  requires_handoff: boolean;
  escalation_trigger?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export function evaluateHumanHandoff(sentimentScore: number, emotionalRisk: string, intent: string): HandoffDecision {
  console.log(`[HUMAN_HANDOFF] Evaluating escalation logic (Sentiment: ${sentimentScore}, Risk: ${emotionalRisk})`);

  if (emotionalRisk === 'DISTRESSED' || sentimentScore < 0.2) {
    return {
      requires_handoff: true,
      escalation_trigger: 'CUSTOMER_DISTRESS_DETECTED',
      priority: 'URGENT'
    };
  }

  if (intent === 'LEGAL_THREAT') {
    return {
      requires_handoff: true,
      escalation_trigger: 'LEGAL_RISK_DETECTED',
      priority: 'HIGH'
    };
  }

  return {
    requires_handoff: false,
    priority: 'LOW'
  };
}

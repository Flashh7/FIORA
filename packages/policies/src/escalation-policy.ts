/**
 * Escalation rules defining when human intervention is required.
 */

const THRESHOLDS: Record<string, number> = {
  'default': 0.85,
  'financial.transfer': 0.99,
  'email.send': 0.90,
  'data.delete': 0.99,
};

export function calculateFinalConfidence(
  generation_confidence: number,
  format_confidence: number,
  policy_confidence: number
): number {
  // Deterministic calculation: Lowest confidence dictates the final score to ensure safety.
  // Alternatively, we could use weighted averages, but for a deterministic orchestration system,
  // pessimistic scoring (min) prevents hallucinated certainty in one layer from masking failures in another.
  return Math.min(generation_confidence, format_confidence, policy_confidence);
}

export function requiresEscalation(actionType: string, finalConfidenceScore: number): boolean {
  const requiredConfidence = THRESHOLDS[actionType] || THRESHOLDS['default'];
  return finalConfidenceScore < requiredConfidence;
}

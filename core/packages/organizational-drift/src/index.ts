export interface DriftSignal {
  drift_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  affected_departments: string[];
}

export function detectOrganizationalDrift(metrics: any[]): DriftSignal | null {
  console.log(`[ORGANIZATIONAL_DRIFT] Scanning for slow-moving operational deterioration...`);
  
  // Simulated drift detection
  const hasCACInflation = metrics.some(m => m === 'CAC_INFLATION');
  const hasFatigue = metrics.some(m => m === 'OPERATOR_FATIGUE');
  
  if (hasCACInflation && hasFatigue) {
    console.log(`[ORGANIZATIONAL_DRIFT] Systemic deterioration detected: Marketing efficiency drops paired with Support burnout.`);
    return {
      drift_type: 'NORMALIZED_ESCALATION_CULTURE',
      severity: 'HIGH',
      affected_departments: ['MARKETING', 'SUPPORT']
    };
  }
  
  return null;
}

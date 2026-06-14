export interface CRMLeadState {
  lead_id: string;
  qualification_score: number;
  opportunity_tier: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'UNQUALIFIED';
  trust_state: 'VERIFIED' | 'UNKNOWN' | 'RISKY';
}

export function qualifyLead(companyData: any, engagementHistory: any[]): CRMLeadState {
  console.log(`[CRM_INTELLIGENCE] Evaluating lead qualification...`);
  
  let score = 0.5;
  let trustState: CRMLeadState['trust_state'] = 'UNKNOWN';

  // Deterministic mock qualification logic
  if (companyData?.industry === 'Technology' && companyData?.size > 50) {
    score += 0.3;
    trustState = 'VERIFIED';
  }

  if (engagementHistory.length > 2) {
    score += 0.15;
  }

  let tier: CRMLeadState['opportunity_tier'] = 'UNQUALIFIED';
  if (score >= 0.8) tier = 'TIER_1';
  else if (score >= 0.6) tier = 'TIER_2';
  else if (score >= 0.4) tier = 'TIER_3';

  return {
    lead_id: companyData?.id || 'lead-000',
    qualification_score: Math.min(1.0, score),
    opportunity_tier: tier,
    trust_state: trustState
  };
}

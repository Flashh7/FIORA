"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qualifyLead = qualifyLead;
function qualifyLead(companyData, engagementHistory) {
    console.log("[CRM_INTELLIGENCE] Evaluating lead qualification...");
    var score = 0.5;
    var trustState = 'UNKNOWN';
    // Deterministic mock qualification logic
    if ((companyData === null || companyData === void 0 ? void 0 : companyData.industry) === 'Technology' && (companyData === null || companyData === void 0 ? void 0 : companyData.size) > 50) {
        score += 0.3;
        trustState = 'VERIFIED';
    }
    if (engagementHistory.length > 2) {
        score += 0.15;
    }
    var tier = 'UNQUALIFIED';
    if (score >= 0.8)
        tier = 'TIER_1';
    else if (score >= 0.6)
        tier = 'TIER_2';
    else if (score >= 0.4)
        tier = 'TIER_3';
    return {
        lead_id: (companyData === null || companyData === void 0 ? void 0 : companyData.id) || 'lead-000',
        qualification_score: Math.min(1.0, score),
        opportunity_tier: tier,
        trust_state: trustState
    };
}

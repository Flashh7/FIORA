"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateOutboundCampaign = evaluateOutboundCampaign;
function evaluateOutboundCampaign(leadTrustState, recentCampaignsCount, isHighRiskDomain) {
    console.log("[OUTREACH_GOVERNANCE] Evaluating outbound campaign for trust state: ".concat(leadTrustState));
    if (leadTrustState === 'RISKY' || isHighRiskDomain) {
        return {
            action_permitted: false,
            campaign_status: 'PENDING_APPROVAL',
            escalation_reason: 'HIGH_RISK_DOMAIN_OR_TRUST_STATE'
        };
    }
    // Anti-spam throttling
    if (recentCampaignsCount > 2) {
        return {
            action_permitted: false,
            campaign_status: 'THROTTLED',
            escalation_reason: 'OUTREACH_FREQUENCY_LIMIT_EXCEEDED',
            throttled_duration_ms: 86400000 // 24 hours
        };
    }
    return {
        action_permitted: true,
        campaign_status: 'APPROVED'
    };
}

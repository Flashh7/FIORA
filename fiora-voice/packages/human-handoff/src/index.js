"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateHumanHandoff = evaluateHumanHandoff;
function evaluateHumanHandoff(sentimentScore, emotionalRisk, intent) {
    console.log("[HUMAN_HANDOFF] Evaluating escalation logic (Sentiment: ".concat(sentimentScore, ", Risk: ").concat(emotionalRisk, ")"));
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

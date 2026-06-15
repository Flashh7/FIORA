"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeConversation = routeConversation;
function routeConversation(intent, content) {
    console.log("[ROUTING_ENGINE] Analyzing intent: ".concat(intent));
    if (intent === 'BILLING_ISSUE' || content.toLowerCase().includes('charge')) {
        return {
            target_agent: 'SUPPORT_AGENT',
            context_payload: { issue_type: 'DOUBLE_CHARGE', sla_priority: 'URGENT' }
        };
    }
    return {
        target_agent: 'SALES_AGENT',
        context_payload: { inquiry_type: 'GENERAL' }
    };
}

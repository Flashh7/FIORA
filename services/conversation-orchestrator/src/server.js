"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationOrchestrator = void 0;
var server_1 = require("../../../services/conversation-ingress/src/server");
var index_1 = require("../../../packages/conversation-routing/src/index");
var index_2 = require("../../../packages/human-handoff/src/index");
var index_3 = require("../../../packages/conversation-governance/src/index");
var index_4 = require("../../../packages/conversation-memory/src/index");
var ConversationOrchestrator = /** @class */ (function () {
    function ConversationOrchestrator() {
    }
    ConversationOrchestrator.handleIncomingInteraction = function (channel, rawPayload, sentiment) {
        console.log("\n[ORCHESTRATOR] Received interaction on ".concat(channel));
        // 1. Ingress Normalization
        var ingress = server_1.IngressNormalizer.normalizePayload(channel, rawPayload);
        var content = ingress.normalized_content;
        var sessionId = "session-".concat(ingress.customer_id);
        // 2. Emotional Memory Tracking
        var memory = (0, index_4.updateConversationMemory)(sessionId, sentiment);
        // 3. Human Handoff Intelligence
        var intent = rawPayload.intent || 'GENERAL_INQUIRY';
        var handoff = (0, index_2.evaluateHumanHandoff)(sentiment, memory.current_risk, intent);
        if (handoff.requires_handoff) {
            console.log("[ESCALATION_TRIGGERED] Handoff required: ".concat(handoff.escalation_trigger));
            return {
                status: 'ESCALATED',
                priority: handoff.priority,
                reason: handoff.escalation_trigger,
                response: 'I am transferring you to a human specialist immediately to resolve this.'
            };
        }
        // 4. Multi-Agent Routing Engine
        var routing = (0, index_1.routeConversation)(intent, content);
        console.log("[ROUTING] Delegating to ".concat(routing.target_agent));
        // Mock Agent Response
        var draftResponse = 'I can process that request for you right now.';
        if (intent === 'REFUND_REQUEST')
            draftResponse = 'I can process your refund right now.';
        // 5. Conversational Governance Filter
        var governance = (0, index_3.filterConversationalResponse)(draftResponse, intent);
        if (!governance.is_safe) {
            console.log("[GOVERNANCE_INTERVENTION] Blocked unsafe response. Reason: ".concat(governance.blocked_reason));
            return {
                status: 'GOVERNED_RESPONSE',
                response: governance.sanitized_response,
                blocked_reason: governance.blocked_reason
            };
        }
        console.log("[RESPONSE_CERTIFIED] Governed response generated safely.");
        return {
            status: 'RESOLVED',
            response: draftResponse
        };
    };
    return ConversationOrchestrator;
}());
exports.ConversationOrchestrator = ConversationOrchestrator;

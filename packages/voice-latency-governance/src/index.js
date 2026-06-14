"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateLatency = evaluateLatency;
function evaluateLatency(totalLatencyMs) {
    console.log("[LATENCY_GOVERNANCE] Evaluating end-to-end voice latency: ".concat(totalLatencyMs, "ms"));
    if (totalLatencyMs > 5000) {
        return {
            is_acceptable: false,
            action: 'OPERATOR_FALLBACK',
            reason: 'CRITICAL_LATENCY_EXCEEDED_5000MS'
        };
    }
    if (totalLatencyMs > 3000) {
        return {
            is_acceptable: false,
            action: 'ESCALATE',
            reason: 'HIGH_LATENCY_ESCALATION_RISK'
        };
    }
    if (totalLatencyMs > 1500) {
        return {
            is_acceptable: true,
            action: 'DEGRADED_MODE',
            reason: 'CONVERSATIONAL_DEGRADATION_RISK'
        };
    }
    return {
        is_acceptable: true,
        action: 'CONTINUE'
    };
}

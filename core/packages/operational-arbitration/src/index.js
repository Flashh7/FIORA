"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arbitrateConflict = arbitrateConflict;
function arbitrateConflict(signals) {
    var _a;
    console.log("[OPERATIONAL_ARBITRATION] Evaluating ".concat(signals.length, " conflicting operational signals..."));
    var hasEscalation = signals.find(function (s) { return s.signalType === 'ESCALATION_PRESSURE'; });
    var hasMarketing = signals.find(function (s) { return s.signalType === 'AGGRESSIVE_CAMPAIGN'; });
    if (hasEscalation && hasMarketing) {
        console.log("[ARBITRATION] Support escalation overrides Marketing campaign.");
        return {
            winning_priority: 'SUPPORT_ESCALATION',
            suppressed_signals: ['AGGRESSIVE_CAMPAIGN'],
            reason: 'SYSTEM_STABILITY_PRIORITY'
        };
    }
    return {
        winning_priority: ((_a = signals[0]) === null || _a === void 0 ? void 0 : _a.signalType) || 'UNKNOWN',
        suppressed_signals: [],
        reason: 'NO_CONFLICT'
    };
}

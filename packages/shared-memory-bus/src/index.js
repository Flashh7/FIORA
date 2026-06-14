"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedMemoryBus = void 0;
var SharedMemoryBus = /** @class */ (function () {
    function SharedMemoryBus() {
    }
    SharedMemoryBus.broadcastSignal = function (sourceAgent, targetAgent, signalType, payload) {
        console.log("[SHARED_MEMORY_BUS] Signal emitted: [".concat(sourceAgent, "] -> [").concat(targetAgent, "] (").concat(signalType, ")"));
        // Deterministic mock of event ledger propagation
        return {
            signal_id: "sig-".concat(Date.now()),
            status: 'PROPAGATED',
            sourceAgent: sourceAgent,
            targetAgent: targetAgent,
            signalType: signalType,
            payload: payload
        };
    };
    SharedMemoryBus.updateEntityMemory = function (entityId, updatedBy, context) {
        console.log("[SHARED_MEMORY_BUS] Entity ".concat(entityId, " memory updated by ").concat(updatedBy));
        var existing = this.memoryStore.get(entityId) || {};
        var merged = __assign(__assign({}, existing), context);
        this.memoryStore.set(entityId, merged);
        var history = this.temporalHistory.get(entityId) || [];
        history.push({ timestamp: Date.now(), context: context });
        this.temporalHistory.set(entityId, history);
        return merged;
    };
    SharedMemoryBus.readEntityMemory = function (entityId, readerAgent) {
        console.log("[SHARED_MEMORY_BUS] Agent [".concat(readerAgent, "] retrieving context for ").concat(entityId));
        return this.memoryStore.get(entityId) || null;
    };
    SharedMemoryBus.getTemporalHistory = function (entityId) {
        return this.temporalHistory.get(entityId) || [];
    };
    SharedMemoryBus.compressStrategicMemory = function (entityId) {
        console.log("[SHARED_MEMORY_BUS] Compressing long-horizon operational history for ".concat(entityId, "..."));
        var history = this.temporalHistory.get(entityId) || [];
        if (history.length > 30) {
            var compressedHash = "hash-".concat(Date.now());
            var summary = "Compressed ".concat(history.length, " events spanning ").concat(entityId, " trajectory.");
            console.log("[SHARED_MEMORY_BUS] Temporal compression complete. Lineage Hash: ".concat(compressedHash));
            this.temporalHistory.set(entityId, [{ timestamp: Date.now(), summary: summary, compressedHash: compressedHash }]);
            return { status: 'COMPRESSED', original_count: history.length, hash: compressedHash };
        }
        return { status: 'UNNECESSARY', original_count: history.length };
    };
    SharedMemoryBus.memoryStore = new Map();
    SharedMemoryBus.temporalHistory = new Map();
    return SharedMemoryBus;
}());
exports.SharedMemoryBus = SharedMemoryBus;

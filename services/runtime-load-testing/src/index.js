"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadGenerator = void 0;
var index_1 = require("../../../packages/runtime-telemetry/src/index");
var LoadGenerator = /** @class */ (function () {
    function LoadGenerator() {
    }
    LoadGenerator.simulateConcurrencySpike = function (virtualUsers) {
        console.log("[LOAD_TEST] Simulating ".concat(virtualUsers, " concurrent pilot execution requests..."));
        // Simulate queue buildup
        var mockTelemetry = {
            time_window_mins: 5,
            queue_latency_ms: virtualUsers * 10, // latency scales with concurrency
            replay_throughput_sec: 15,
            escalation_count: Math.floor(virtualUsers * 0.05),
            retry_storm_count: Math.floor(virtualUsers * 0.1),
            clock_skew_detected: false
        };
        var health = (0, index_1.evaluateRuntimeStability)(mockTelemetry);
        console.log("[RUNTIME_HEALTH] Transitioned to: ".concat(health.state));
        console.log("[GOVERNANCE] Active Backpressure Policy: ".concat(health.backpressure));
        // Simulate ordering certification
        var received = new Date();
        var processed = new Date(received.getTime() + mockTelemetry.queue_latency_ms);
        var orderCert = (0, index_1.certifyEventOrdering)(100, 100, received, processed);
        console.log("[ORDERING_CERT] Sequence certified: ".concat(orderCert.ordering_certified, ". Processing delay: ").concat(orderCert.processing_duration_ms, "ms"));
        return { health: health, orderCert: orderCert };
    };
    return LoadGenerator;
}());
exports.LoadGenerator = LoadGenerator;

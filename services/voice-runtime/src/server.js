"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceRuntime = void 0;
var index_1 = require("../../../packages/barge-in-control/src/index");
var index_2 = require("../../../packages/voice-latency-governance/src/index");
var index_3 = require("../../../packages/operator-takeover/src/index");
var index_4 = require("../../../packages/operator-collaboration/src/index");
var VoiceRuntime = /** @class */ (function () {
    function VoiceRuntime() {
    }
    VoiceRuntime.handleStreamingAudio = function (sessionId, transcriptChunk, currentLatencyMs, playbackActive, sandboxMode) {
        if (sandboxMode === void 0) { sandboxMode = true; }
        console.log("\n[VOICE_RUNTIME] Stream active for session ".concat(sessionId, " (Latency: ").concat(currentLatencyMs, "ms, Sandbox: ").concat(sandboxMode, ")"));
        // 0. Session Recovery & Replay Certification
        if (currentLatencyMs > 2000) {
            console.log("[VOICE_RUNTIME] Severe latency spike. Triggering sub-2s fallback session recovery...");
            return { status: 'SESSION_RECOVERY_INITIATED', latency: currentLatencyMs };
        }
        // 1. Voice Latency Governance
        var latencyState = (0, index_2.evaluateLatency)(currentLatencyMs);
        if (!latencyState.is_acceptable && latencyState.action === 'OPERATOR_FALLBACK') {
            console.log("[LATENCY_FAILURE] Critical latency breached (".concat(currentLatencyMs, "ms). Triggering fallback."));
            var takeover = (0, index_3.initiateTakeover)(sessionId, { transcriptChunk: transcriptChunk });
            var collaboration = (0, index_4.initiateCollaboration)('VOICE_RUNTIME', { sessionId: sessionId, takeover: takeover }, 'Assist human operator with transcript history.');
            return { status: 'OPERATOR_TAKEOVER_INITIATED', takeover: takeover, collaboration: collaboration };
        }
        if (latencyState.action === 'ESCALATE') {
            console.log("[LATENCY_WARNING] High latency detected. Escalation risk rising.");
        }
        // 2. Barge-In & Interruption Handling
        if (playbackActive) {
            var bargeIn = (0, index_1.detectBargeIn)(500, transcriptChunk);
            if (bargeIn.is_interruption && bargeIn.action === 'HALT_PLAYBACK') {
                console.log("[BARGE_IN_DETECTED] Customer interruption: \"".concat(transcriptChunk, "\""));
                console.log("[AUDIO_TRANSPORT] Suspending TTS playback immediately.");
                if (bargeIn.distress_detected) {
                    console.log("[ESCALATION] Interruption distress detected. Rerouting to human queue.");
                    var takeover = (0, index_3.initiateTakeover)(sessionId, { transcriptChunk: transcriptChunk, reason: bargeIn.reason });
                    return { status: 'BARGE_IN_ESCALATED', takeover: takeover };
                }
                return { status: 'PLAYBACK_HALTED', reason: bargeIn.reason };
            }
        }
        console.log("[STREAM_CONTINUES] Audio stream certified safe. Proceeding.");
        return { status: 'STREAM_ACTIVE', latency_state: latencyState.action };
    };
    return VoiceRuntime;
}());
exports.VoiceRuntime = VoiceRuntime;

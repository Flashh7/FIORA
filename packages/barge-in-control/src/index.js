"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectBargeIn = detectBargeIn;
function detectBargeIn(activePlaybackDurationMs, userAudioTranscript) {
    console.log("[BARGE_IN_CONTROL] Analyzing stream: \"".concat(userAudioTranscript, "\""));
    if (userAudioTranscript.toLowerCase().includes('stop') || userAudioTranscript.toLowerCase().includes('wait')) {
        return {
            is_interruption: true,
            action: 'HALT_PLAYBACK',
            reason: 'USER_COMMAND_OVERRIDE',
            distress_detected: true
        };
    }
    // Brief audio anomalies (< 2 words) during playback might be background noise
    if (userAudioTranscript.split(' ').length > 2) {
        return {
            is_interruption: true,
            action: 'HALT_PLAYBACK',
            reason: 'SIGNIFICANT_SPEECH_OVERLAP',
            distress_detected: false
        };
    }
    return {
        is_interruption: false,
        action: 'IGNORE'
    };
}

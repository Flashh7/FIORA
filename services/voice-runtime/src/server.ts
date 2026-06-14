import { detectBargeIn } from '../../../packages/barge-in-control/src/index';
import { evaluateLatency } from '../../../packages/voice-latency-governance/src/index';
import { initiateTakeover } from '../../../packages/operator-takeover/src/index';
import { initiateCollaboration } from '../../../packages/operator-collaboration/src/index';

export class VoiceRuntime {
  public static handleStreamingAudio(sessionId: string, transcriptChunk: string, currentLatencyMs: number, playbackActive: boolean, sandboxMode: boolean = true) {
    console.log(`\n[VOICE_RUNTIME] Stream active for session ${sessionId} (Latency: ${currentLatencyMs}ms, Sandbox: ${sandboxMode})`);

    // 0. Session Recovery & Replay Certification
    if (currentLatencyMs > 2000) {
      console.log(`[VOICE_RUNTIME] Severe latency spike. Triggering sub-2s fallback session recovery...`);
      return { status: 'SESSION_RECOVERY_INITIATED', latency: currentLatencyMs };
    }

    // 1. Voice Latency Governance
    const latencyState = evaluateLatency(currentLatencyMs);
    if (!latencyState.is_acceptable && latencyState.action === 'OPERATOR_FALLBACK') {
      console.log(`[LATENCY_FAILURE] Critical latency breached (${currentLatencyMs}ms). Triggering fallback.`);
      const takeover = initiateTakeover(sessionId, { transcriptChunk });
      const collaboration = initiateCollaboration('VOICE_RUNTIME', { sessionId, takeover }, 'Assist human operator with transcript history.');
      return { status: 'OPERATOR_TAKEOVER_INITIATED', takeover, collaboration };
    }

    if (latencyState.action === 'ESCALATE') {
      console.log(`[LATENCY_WARNING] High latency detected. Escalation risk rising.`);
    }

    // 2. Barge-In & Interruption Handling
    if (playbackActive) {
      const bargeIn = detectBargeIn(500, transcriptChunk);
      if (bargeIn.is_interruption && bargeIn.action === 'HALT_PLAYBACK') {
        console.log(`[BARGE_IN_DETECTED] Customer interruption: "${transcriptChunk}"`);
        console.log(`[AUDIO_TRANSPORT] Suspending TTS playback immediately.`);
        
        if (bargeIn.distress_detected) {
          console.log(`[ESCALATION] Interruption distress detected. Rerouting to human queue.`);
          const takeover = initiateTakeover(sessionId, { transcriptChunk, reason: bargeIn.reason });
          return { status: 'BARGE_IN_ESCALATED', takeover };
        }

        return { status: 'PLAYBACK_HALTED', reason: bargeIn.reason };
      }
    }

    console.log(`[STREAM_CONTINUES] Audio stream certified safe. Proceeding.`);
    return { status: 'STREAM_ACTIVE', latency_state: latencyState.action };
  }
}

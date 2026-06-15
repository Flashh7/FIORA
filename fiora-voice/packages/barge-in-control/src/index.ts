export interface BargeInDecision {
  is_interruption: boolean;
  action: 'HALT_PLAYBACK' | 'IGNORE';
  reason?: string;
  distress_detected?: boolean;
}

export function detectBargeIn(activePlaybackDurationMs: number, userAudioTranscript: string): BargeInDecision {
  console.log(`[BARGE_IN_CONTROL] Analyzing stream: "${userAudioTranscript}"`);

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

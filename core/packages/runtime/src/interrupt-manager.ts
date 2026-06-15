import { SessionStateMachine } from './session-state';
import { PlaybackController } from './playback-controller';
import { VadMonitor } from './vad-monitor';

export class InterruptManager {
  private stateMachine: SessionStateMachine;
  private playbackController: PlaybackController;
  private vadMonitor: VadMonitor;

  constructor(stateMachine: SessionStateMachine, playbackController: PlaybackController, vadMonitor: VadMonitor) {
    this.stateMachine = stateMachine;
    this.playbackController = playbackController;
    this.vadMonitor = vadMonitor;

    // Listen for VAD interruptions
    this.vadMonitor.on('speech_started', () => this.handleSpeechDetected());
  }

  private handleSpeechDetected() {
    const currentState = this.stateMachine.getState();

    if (currentState === 'SPEAKING') {
      console.log('\n[INTERRUPT] Caller interruption detected!');
      
      // 1. Force state transition to block new chunks from playing
      this.stateMachine.transition('INTERRUPTED');
      
      // 2. Abort playback (sends 'clear' to Twilio, kills active loop)
      console.log('[INTERRUPT] Playback abort initiated');
      this.playbackController.abort();
      
      // 3. Immediately transition back to LISTENING to capture the new turn
      console.log('[INTERRUPT] Listening resumed');
      this.stateMachine.transition('LISTENING');
    }
  }
}

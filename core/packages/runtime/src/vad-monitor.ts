import { EventEmitter } from 'events';

export class VadMonitor extends EventEmitter {
  private isSpeaking: boolean = false;
  private silenceFrames: number = 0;
  
  // 50 frames of silence = ~1 second
  private readonly SILENCE_THRESHOLD = 50;

  public processBuffer(mulawBuffer: Buffer): void {
    let hasNoise = false;
    for (let i = 0; i < mulawBuffer.length; i++) {
      if (mulawBuffer[i] < 200) { // Last known working threshold
        hasNoise = true;
        break;
      }
    }

    if (hasNoise) {
      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.emit('speech_started');
      }
      this.silenceFrames = 0;
    } else {
      this.silenceFrames++;
    }

    if (this.isSpeaking && this.silenceFrames > this.SILENCE_THRESHOLD) {
      this.isSpeaking = false;
      this.silenceFrames = 0;
      this.emit('speech_ended');
    }
  }

  public forceReset(): void {
    this.isSpeaking = false;
    this.silenceFrames = 0;
  }
}

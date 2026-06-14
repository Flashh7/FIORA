import { CancellationToken } from './cancellation-token';
import { StreamQueue } from './stream-queue';
import { SessionStateMachine } from './session-state';

// @ts-ignore
import WebSocket from 'ws';

export class PlaybackController {
  private queue: StreamQueue;
  private cancelToken: CancellationToken | null = null;
  private isPlaying: boolean = false;

  constructor() {
    this.queue = new StreamQueue();
  }

  public getQueue(): StreamQueue {
    return this.queue;
  }

  public async startPlayback(ws: WebSocket, streamSid: string, token: CancellationToken, stateMachine: SessionStateMachine): Promise<void> {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.cancelToken = token;

    const CHUNK_SIZE = 160;
    const INTERVAL_MS = 20;

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.cancelToken?.isCancelled) {
          clearInterval(interval);
          this.queue.flush();
          this.isPlaying = false;
          
          if (ws.readyState === WebSocket.OPEN) {
            // Immediate handset buffer flush
            ws.send(JSON.stringify({
              event: 'clear',
              streamSid
            }));
            console.log('[INTERRUPT] Twilio handset clear signal sent.');
          }
          resolve();
          return;
        }

        if (ws.readyState !== WebSocket.OPEN) {
          clearInterval(interval);
          this.queue.flush();
          this.isPlaying = false;
          resolve();
          return;
        }

        const nextChunk = this.queue.dequeue();
        if (nextChunk) {
          // Play chunk
          const payload = nextChunk.toString('base64');
          ws.send(JSON.stringify({
            event: 'media',
            streamSid,
            media: { payload }
          }));
        } else {
          // In the future this might wait for more streaming tokens.
          // For now, if the queue is fully drained, we resolve.
          clearInterval(interval);
          this.isPlaying = false;
          console.log('[PLAYBACK] Queue drained — remaining in LISTENING');
          resolve();
        }
      }, INTERVAL_MS);
    });
  }

  public abort(): void {
    if (this.cancelToken) {
      this.cancelToken.cancel();
    }
  }
}

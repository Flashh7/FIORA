import { TurnMetrics } from './types';

export class TelemetryLogger {
  private currentTurn: TurnMetrics = {};

  public recordSttLatency(ms: number) {
    this.currentTurn.sttLatencyMs = ms;
    console.log(`[METRIC] STT latency: ${ms}ms`);
  }

  public recordLlmLatency(ms: number) {
    this.currentTurn.llmLatencyMs = ms;
    console.log(`[METRIC] LLM latency: ${ms}ms`);
  }

  public recordToolLatency(ms: number) {
    this.currentTurn.toolLatencyMs = ms;
    console.log(`[METRIC] Tool latency: ${ms}ms`);
  }

  public recordTtsLatency(ms: number) {
    this.currentTurn.ttsLatencyMs = ms;
    console.log(`[METRIC] TTS latency: ${ms}ms`);
  }

  public flushTurnMetrics() {
    const total = 
      (this.currentTurn.sttLatencyMs || 0) + 
      (this.currentTurn.llmLatencyMs || 0) + 
      (this.currentTurn.toolLatencyMs || 0) + 
      (this.currentTurn.ttsLatencyMs || 0);
    
    this.currentTurn.totalTurnLatencyMs = total;
    console.log(`[METRIC] End-to-end turn latency: ${total}ms`);
    this.currentTurn = {};
  }
}

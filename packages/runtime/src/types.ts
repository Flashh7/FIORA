export type FioraSessionState = 
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'EXECUTING_TOOL'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'ERROR';

export interface TurnMetrics {
  sttLatencyMs?: number;
  llmLatencyMs?: number;
  toolLatencyMs?: number;
  ttsLatencyMs?: number;
  totalTurnLatencyMs?: number;
}

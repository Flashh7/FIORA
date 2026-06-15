import { MarketingResponse } from '@fiora/shared-types';

export interface DriftReportData {
  generation_drift_score: number;
  confidence_drift_delta: number;
  latency_regression_ms: number;
  structural_drift_detected: boolean;
  orchestration_path_drift: boolean;
}

/**
 * Quantifies drift between an original structured response and a replay.
 */
export function analyzeMarketingDrift(
  original: MarketingResponse,
  replay: MarketingResponse,
  original_path: string[],
  replay_path: string[]
): DriftReportData {
  // 1. Confidence Drift
  const confidence_drift_delta = Math.abs(original.final_confidence - replay.final_confidence);

  // 2. Latency Regression (Positive means replay was slower)
  const latency_regression_ms = replay.latency_ms - original.latency_ms;

  // 3. Structural Drift (Are the keys perfectly identical?)
  const originalKeys = Object.keys(original.output).sort().join(',');
  const replayKeys = Object.keys(replay.output).sort().join(',');
  const structural_drift_detected = originalKeys !== replayKeys;

  // 4. Generation Drift (Simple string distance mock for Phase 4)
  // In production, use Levenshtein or embedding cosine distance
  const originalText = JSON.stringify(original.output);
  const replayText = JSON.stringify(replay.output);
  const generation_drift_score = originalText === replayText ? 0 : 1.0;

  // 5. Orchestration Path Drift
  const orchestration_path_drift = original_path.join('->') !== replay_path.join('->');

  return {
    generation_drift_score,
    confidence_drift_delta,
    latency_regression_ms,
    structural_drift_detected,
    orchestration_path_drift
  };
}

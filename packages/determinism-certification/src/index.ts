import { DeterminismCertification, OrchestrationGraphSnapshot, ReliabilitySeverity } from '@fiora/shared-types';

export function certifyDeterminism(
  execution_id: string,
  originalGraph: OrchestrationGraphSnapshot,
  replayGraph: OrchestrationGraphSnapshot,
  driftReport: any
): DeterminismCertification {
  const failures: string[] = [];

  if (originalGraph.nodes.length !== replayGraph.nodes.length) {
    failures.push('ORCHESTRATION_PATH_DIVERGENCE');
  }

  if (driftReport.structural_drift_detected) {
    failures.push('STRUCTURAL_DRIFT_DETECTED');
  }

  if (driftReport.confidence_drift_delta > 0.05) {
    failures.push('CONFIDENCE_TOLERANCE_BREACHED');
  }

  const isCertified = failures.length === 0;
  
  let severity: ReliabilitySeverity = 'INFO';
  if (!isCertified) {
    severity = failures.includes('ORCHESTRATION_PATH_DIVERGENCE') ? 'FATAL' : 'WARNING';
  }

  return {
    execution_id,
    determinism_certified: isCertified,
    certification_score: isCertified ? 1.0 : 0.4,
    drift_detected: driftReport.structural_drift_detected || driftReport.generation_drift_score > 0,
    certification_failures: failures,
    severity,
  };
}

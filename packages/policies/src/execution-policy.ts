import { ExecutionMode } from '@fiora/shared-types';

/**
 * Validates if a workflow can proceed based on current state and mode.
 */
export function canExecuteWorkflow(mode: ExecutionMode, workflowName: string): boolean {
  // Foundational rule: SIMULATION is the default safety net
  if (!mode) return false;
  
  // Future: Add granular whitelist/blacklist of workflows per mode
  return true;
}

/**
 * Determines the retry strategy based on execution mode.
 */
export function getRetryPolicy(mode: ExecutionMode) {
  if (mode === ExecutionMode.PRODUCTION) {
    return { maxRetries: 3, backoff: 'exponential' };
  }
  return { maxRetries: 1, backoff: 'linear' };
}

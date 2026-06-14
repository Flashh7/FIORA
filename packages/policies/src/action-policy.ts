import { ExecutionMode } from '@fiora/shared-types';
import { logger } from '@fiora/logger';

/**
 * Validates external actions to guarantee simulation safety.
 * ALL external side effects must pass through this guard.
 */
export function executeSafeAction<T>(
  mode: ExecutionMode,
  actionName: string,
  liveAction: () => Promise<T>,
  mockAction: () => Promise<T>,
  context: Record<string, unknown> = {}
): Promise<T> {
  const actionLogger = logger.child({ actionName, mode, ...context });

  if (mode === ExecutionMode.SIMULATION) {
    actionLogger.info('SIMULATION MODE: Bypassing real-world side effect. Executing mock action.');
    return mockAction();
  }

  actionLogger.info('Executing live real-world action.');
  return liveAction();
}

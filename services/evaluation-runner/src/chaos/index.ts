import { logger, createLogger } from '@fiora/logger';
import { EventPayload } from '@fiora/shared-types';

const chaosLogger = createLogger({ service: 'chaos-engine' });

export class ChaosEngine {
  /**
   * Intentionally delays execution to test latency constraints and timeout handling.
   */
  static async simulateAgentTimeout(ms: number = 3000): Promise<void> {
    chaosLogger.warn(`[CHAOS] Simulating agent timeout of ${ms}ms...`);
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Intentionally corrupts a payload to test Dead Letter Queue routing.
   */
  static injectMalformedPayload(payload: EventPayload): any {
    chaosLogger.warn('[CHAOS] Injecting malformed payload (stripping execution_id)...');
    const corrupted = { ...payload };
    // @ts-ignore: Intentionally breaking the type contract
    delete corrupted.execution_id;
    return corrupted;
  }

  /**
   * Forces a low confidence score to test the Escalation policy routing.
   */
  static simulatePolicyRejection(): number {
    chaosLogger.warn('[CHAOS] Forcing policy rejection via artificially low confidence...');
    return 0.45; // Below default 0.85 threshold
  }
}

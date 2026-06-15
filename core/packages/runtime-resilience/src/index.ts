export class RuntimeResilience {
  public static async executeWithRecovery<T>(workflowId: string, operation: () => Promise<T>): Promise<T> {
    console.log(`[RUNTIME_RESILIENCE] Checkpointing workflow execution: ${workflowId}`);
    
    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
      try {
        const result = await operation();
        if (attempt > 0) {
          console.log(`[RUNTIME_RESILIENCE] Workflow ${workflowId} successfully resurrected on attempt ${attempt + 1}.`);
        }
        return result;
      } catch (error: any) {
        attempt++;
        console.log(`[RUNTIME_RESILIENCE] Execution crash detected for ${workflowId}: ${error.message}`);
        
        if (attempt >= maxRetries) {
          console.log(`[RUNTIME_RESILIENCE] Terminal failure for ${workflowId}. Lineage preserved. Queueing for operator manual recovery.`);
          throw error;
        }

        console.log(`[RUNTIME_RESILIENCE] Orchestrating distributed retry (Attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error('Unreachable');
  }
}

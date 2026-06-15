export interface ExecutionContext {
  execution_id: string;
  shared_memory: any;
  confidence_score: number;
}

export abstract class AgentRuntime {
  protected agentName: string;

  constructor(agentName: string) {
    this.agentName = agentName;
  }

  public abstract execute(payload: any, context: ExecutionContext): Promise<any>;

  protected certifyExecution(payload: any, result: any, context: ExecutionContext) {
    console.log(`[${this.agentName}] Execution certified. Confidence: ${context.confidence_score}`);
    if (context.confidence_score < 0.7) {
      throw new Error(`[${this.agentName}] Escalation required. Confidence too low.`);
    }
    return {
      execution_id: context.execution_id,
      agent: this.agentName,
      status: 'CERTIFIED',
      result
    };
  }
}

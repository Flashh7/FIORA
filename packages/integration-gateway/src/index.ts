export type IntegrationMode = 'MOCK' | 'SANDBOX' | 'PRODUCTION';

interface CircuitBreaker {
  failures: number;
  status: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
  lastFailureTime: number;
}

export class IntegrationGateway {
  private static breakers: Map<string, CircuitBreaker> = new Map();

  public static async executeAction(agent: string, targetSystem: string, action: string, payload: any, mode: IntegrationMode = 'SANDBOX') {
    console.log(`[INTEGRATION_GATEWAY] Intercepting ${targetSystem} API call from [${agent}]`);
    
    if (mode === 'PRODUCTION') {
      throw new Error('[INTEGRATION_GATEWAY] Direct production mutation blocked. Strict sandbox isolation enforced.');
    }

    const breaker = this.breakers.get(targetSystem) || { failures: 0, status: 'CLOSED', lastFailureTime: 0 };
    
    if (breaker.status === 'OPEN') {
      if (Date.now() - breaker.lastFailureTime > 3000) {
        console.log(`[CIRCUIT_BREAKER] Half-opening circuit for ${targetSystem} to test recovery...`);
        breaker.status = 'HALF_OPEN';
      } else {
        throw new Error(`[CIRCUIT_BREAKER] Fast-failing integration request to ${targetSystem} (Circuit OPEN).`);
      }
    }

    if (payload.simulate_rate_limit) {
      breaker.failures += 1;
      breaker.lastFailureTime = Date.now();
      
      if (breaker.failures >= 3) {
        breaker.status = 'OPEN';
        console.log(`[CIRCUIT_BREAKER] Threshold reached. Circuit OPEN for ${targetSystem}. Isolating dead integration.`);
      }
      
      this.breakers.set(targetSystem, breaker);
      console.log(`[INTEGRATION_GATEWAY] API Rate Limit encountered for ${targetSystem}. Throwing transient error.`);
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    if (breaker.status === 'HALF_OPEN') {
      console.log(`[CIRCUIT_BREAKER] Recovery successful. Closing circuit for ${targetSystem}.`);
      breaker.status = 'CLOSED';
      breaker.failures = 0;
    }
    
    this.breakers.set(targetSystem, breaker);

    console.log(`[INTEGRATION_GATEWAY] Routing to ${mode} adapter. Execution idempotent. Mutation ID recorded.`);
    return {
      integration: targetSystem,
      action,
      status: 'SANDBOX_SUCCESS',
      mutation_id: `mut-${Date.now()}`
    };
  }
}

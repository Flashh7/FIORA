import { evaluateRuntimeStability, certifyEventOrdering } from '@fiora/runtime-telemetry';

export class LoadGenerator {
  public static simulateConcurrencySpike(virtualUsers: number) {
    console.log(`[LOAD_TEST] Simulating ${virtualUsers} concurrent pilot execution requests...`);
    
    // Simulate queue buildup
    const mockTelemetry = {
      time_window_mins: 5,
      queue_latency_ms: virtualUsers * 10, // latency scales with concurrency
      replay_throughput_sec: 15,
      escalation_count: Math.floor(virtualUsers * 0.05),
      retry_storm_count: Math.floor(virtualUsers * 0.1),
      clock_skew_detected: false
    };

    const health = evaluateRuntimeStability(mockTelemetry);
    console.log(`[RUNTIME_HEALTH] Transitioned to: ${health.state}`);
    console.log(`[GOVERNANCE] Active Backpressure Policy: ${health.backpressure}`);

    // Simulate ordering certification
    const received = new Date();
    const processed = new Date(received.getTime() + mockTelemetry.queue_latency_ms);
    const orderCert = certifyEventOrdering(100, 100, received, processed);
    
    console.log(`[ORDERING_CERT] Sequence certified: ${orderCert.ordering_certified}. Processing delay: ${orderCert.processing_duration_ms}ms`);
    
    return { health, orderCert };
  }
}

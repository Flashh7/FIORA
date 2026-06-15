export class SharedMemoryBus {
  private static memoryStore: Map<string, any> = new Map();
  private static temporalHistory: Map<string, any[]> = new Map();

  public static broadcastSignal(sourceAgent: string, targetAgent: string, signalType: string, payload: any) {
    console.log(`[SHARED_MEMORY_BUS] Signal emitted: [${sourceAgent}] -> [${targetAgent}] (${signalType})`);
    
    // Deterministic mock of event ledger propagation
    return {
      signal_id: `sig-${Date.now()}`,
      status: 'PROPAGATED',
      sourceAgent,
      targetAgent,
      signalType,
      payload
    };
  }

  public static updateEntityMemory(entityId: string, updatedBy: string, context: any) {
    console.log(`[SHARED_MEMORY_BUS] Entity ${entityId} memory updated by ${updatedBy}`);
    const existing = this.memoryStore.get(entityId) || {};
    const merged = { ...existing, ...context };
    this.memoryStore.set(entityId, merged);
    
    const history = this.temporalHistory.get(entityId) || [];
    history.push({ timestamp: Date.now(), context });
    this.temporalHistory.set(entityId, history);
    
    return merged;
  }

  public static readEntityMemory(entityId: string, readerAgent: string) {
    console.log(`[SHARED_MEMORY_BUS] Agent [${readerAgent}] retrieving context for ${entityId}`);
    return this.memoryStore.get(entityId) || null;
  }

  public static getTemporalHistory(entityId: string) {
    return this.temporalHistory.get(entityId) || [];
  }

  public static compressStrategicMemory(entityId: string) {
    console.log(`[SHARED_MEMORY_BUS] Compressing long-horizon operational history for ${entityId}...`);
    const history = this.temporalHistory.get(entityId) || [];
    if (history.length > 30) {
      const compressedHash = `hash-${Date.now()}`;
      const summary = `Compressed ${history.length} events spanning ${entityId} trajectory.`;
      console.log(`[SHARED_MEMORY_BUS] Temporal compression complete. Lineage Hash: ${compressedHash}`);
      this.temporalHistory.set(entityId, [{ timestamp: Date.now(), summary, compressedHash }]);
      return { status: 'COMPRESSED', original_count: history.length, hash: compressedHash };
    }
    return { status: 'UNNECESSARY', original_count: history.length };
  }
}

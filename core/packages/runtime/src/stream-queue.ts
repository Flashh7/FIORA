export class StreamQueue {
  private queue: Buffer[] = [];
  private limit: number;

  constructor(limit: number = 1000) {
    this.limit = limit;
  }

  public enqueue(chunk: Buffer): void {
    if (this.queue.length >= this.limit) {
      console.warn(`[QUEUE] Max limit ${this.limit} reached, dropping oldest chunk.`);
      this.queue.shift();
    }
    this.queue.push(chunk);
  }

  public dequeue(): Buffer | undefined {
    return this.queue.shift();
  }

  public flush(): void {
    console.log(`[QUEUE] Flushed ${this.queue.length} chunks.`);
    this.queue = [];
  }

  public get size(): number {
    return this.queue.length;
  }

  public isEmpty(): boolean {
    return this.queue.length === 0;
  }
}

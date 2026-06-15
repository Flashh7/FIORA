import { EventEmitter } from 'events';

export class CancellationToken {
  private _cancelled: boolean = false;
  private emitter = new EventEmitter();

  public get isCancelled(): boolean {
    return this._cancelled;
  }

  public cancel(): void {
    if (this._cancelled) return;
    this._cancelled = true;
    this.emitter.emit('cancelled');
  }

  public onCancel(listener: () => void): void {
    this.emitter.once('cancelled', listener);
  }
}

export class ToolLockManager {
  private isLocked: boolean = false;
  private activeToolName: string | null = null;

  public acquire(toolName: string): boolean {
    if (this.isLocked) {
      console.warn(`[TOOL LOCK] Rejected concurrent execution. Currently locked by: ${this.activeToolName}`);
      return false;
    }
    this.isLocked = true;
    this.activeToolName = toolName;
    console.log(`[TOOL LOCK] Acquired for ${toolName}`);
    return true;
  }

  public release(): void {
    if (!this.isLocked) return;
    console.log(`[TOOL LOCK] Released ${this.activeToolName}`);
    this.isLocked = false;
    this.activeToolName = null;
  }
}

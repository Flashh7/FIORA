import { FioraSessionState } from './types';

export class SessionStateMachine {
  private currentState: FioraSessionState = 'IDLE';

  public getState(): FioraSessionState {
    return this.currentState;
  }

  public transition(newState: FioraSessionState): void {
    // Basic deterministic guardrails
    if (this.currentState === 'ERROR' && newState !== 'LISTENING' && newState !== 'IDLE') {
      console.warn(`[STATE] Cannot transition from ERROR to ${newState}. Must reset to LISTENING.`);
      return;
    }

    if (this.currentState === 'SPEAKING' && newState === 'EXECUTING_TOOL') {
      console.warn(`[STATE] Invalid transition: SPEAKING -> EXECUTING_TOOL`);
      return;
    }

    if (this.currentState === 'SPEAKING' && newState === 'INTERRUPTED') {
      // valid
    } else if (this.currentState === 'INTERRUPTED' && newState === 'LISTENING') {
      // valid
    } else if (newState === 'INTERRUPTED') {
      console.warn(`[STATE] Invalid transition: ${this.currentState} -> INTERRUPTED (Can only interrupt while SPEAKING)`);
      return;
    }

    console.log(`[STATE] ${this.currentState} → ${newState}`);
    this.currentState = newState;
  }
}

import { FioraAgent } from './types';
import { receptionistAgent } from './receptionist.agent';
import { salesAgent } from './sales.agent';
import { supportAgent } from './support.agent';
import { conciergeAgent } from './concierge.agent';
import { financeAgent, routeToFinanceAgent } from '@fiora/finance-agent';

export class AgentRouter {
  static classifyIntent(transcript: string): FioraAgent {
    const text = transcript.toLowerCase();

    // Finance Intent
    if (routeToFinanceAgent(text)) {
      return financeAgent;
    }

    // Support Intent
    if (
      text.includes('broken') ||
      text.includes('issue') ||
      text.includes('problem') ||
      text.includes('help me with') ||
      text.includes('not working') ||
      text.includes('complain') ||
      text.includes('refund') ||
      text.includes('cancel')
    ) {
      return supportAgent;
    }

    // Sales Intent
    if (
      text.includes('buy') ||
      text.includes('price') ||
      text.includes('cost') ||
      text.includes('purchase') ||
      text.includes('upgrade') ||
      text.includes('features') ||
      text.includes('how much')
    ) {
      return salesAgent;
    }

    // Concierge Intent
    if (
      text.includes('book') ||
      text.includes('reservation') ||
      text.includes('luxury') ||
      text.includes('table') ||
      text.includes('dinner') ||
      text.includes('flight') ||
      text.includes('hotel') ||
      text.includes('arrangement')
    ) {
      return conciergeAgent;
    }

    // Default Fallback
    return receptionistAgent;
  }
}

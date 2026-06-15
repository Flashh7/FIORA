export interface AgentRoutingDecision {
  target_agent: string;
  context_payload: any;
}

export function routeConversation(intent: string, content: string): AgentRoutingDecision {
  console.log(`[ROUTING_ENGINE] Analyzing intent: ${intent}`);
  
  if (intent === 'BILLING_ISSUE' || content.toLowerCase().includes('charge')) {
    return {
      target_agent: 'SUPPORT_AGENT',
      context_payload: { issue_type: 'DOUBLE_CHARGE', sla_priority: 'URGENT' }
    };
  }

  return {
    target_agent: 'SALES_AGENT',
    context_payload: { inquiry_type: 'GENERAL' }
  };
}

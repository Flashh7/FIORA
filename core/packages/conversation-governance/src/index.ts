export interface GovernanceFilterResult {
  is_safe: boolean;
  blocked_reason?: string;
  sanitized_response?: string;
}

export function filterConversationalResponse(draftResponse: string, intent: string): GovernanceFilterResult {
  console.log(`[CONVERSATION_GOVERNANCE] Evaluating response safety...`);
  
  if (draftResponse.toLowerCase().includes('refund') && intent !== 'AUTHORIZED_REFUND') {
    return {
      is_safe: false,
      blocked_reason: 'UNAUTHORIZED_REFUND_PROMISE',
      sanitized_response: 'I understand your concern. Let me escalate this to our billing specialist for immediate review.'
    };
  }

  if (draftResponse.toLowerCase().includes('guarantee')) {
    return {
      is_safe: false,
      blocked_reason: 'UNSAFE_LEGAL_GUARANTEE',
      sanitized_response: 'We will do our absolute best to resolve this for you as quickly as possible.'
    };
  }

  return { is_safe: true };
}

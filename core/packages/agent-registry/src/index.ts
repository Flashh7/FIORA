export interface AgentMetadata {
  id: string;
  name: string;
  description: string;
  requiredEntitlement: string;
  capabilities: string[];
  icon: string;
}

export const AGENTS: Record<string, AgentMetadata> = {
  voice: {
    id: 'voice',
    name: 'Voice Agent',
    description: 'Realtime inbound and outbound calling capabilities.',
    requiredEntitlement: 'voice',
    icon: 'phone',
    capabilities: ['Inbound Calling', 'Outbound Calling', 'Realtime Transcription', 'Barge-in Support']
  },
  finance: {
    id: 'finance',
    name: 'Finance Agent',
    description: 'Internal operational finance tracking, ledgers, and invoice automation.',
    requiredEntitlement: 'finance',
    icon: 'wallet',
    capabilities: ['Invoicing', 'Payment Reminders', 'Daily Summaries', 'Ledger Integration']
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing Agent',
    description: 'Automated content generation, social posting, and ad analytics.',
    requiredEntitlement: 'marketing',
    icon: 'megaphone',
    capabilities: ['Social Scheduling', 'Copywriting', 'Ad Analytics', 'Lead Generation']
  },
  sales: {
    id: 'sales',
    name: 'Sales Agent',
    description: 'Lead qualification, CRM integration, and outbound WhatsApp outreach.',
    requiredEntitlement: 'sales',
    icon: 'chart',
    capabilities: ['CRM Syncing', 'WhatsApp Outreach', 'Lead Qualification', 'Appointment Booking']
  },
  support: {
    id: 'support',
    name: 'Support Agent',
    description: 'Automated Zendesk integration and async helpdesk triage.',
    requiredEntitlement: 'support',
    icon: 'life-buoy',
    capabilities: ['Ticket Resolution', 'FAQ Triage', 'Email Support', 'Escalation Routing']
  }
};

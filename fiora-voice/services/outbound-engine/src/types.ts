export interface CampaignConfig {
  name: string;
  systemPromptTemplate: string;
}

export type OutboundCampaignType = 'reservation-reminder' | 'sales-followup' | 'appointment-reminder';

import { createRuntimeLogger } from '@fiora/logger';

export interface MetaSpendAlert {
  campaign_id: string;
  current_spend: number;
  roas: number;
  cpa: number;
  daily_budget: number;
}

export class MetaAdsAdapter {
  private tenantId: string;
  private accessToken: string;
  private logger: any;
  private apiVersion = 'v17.0';
  private baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

  constructor(tenantId: string, accessToken: string) {
    this.tenantId = tenantId;
    this.accessToken = accessToken;
    this.logger = createRuntimeLogger({ execution_id: 'daemon', service_name: 'meta-ads-adapter', correlation_id: tenantId });
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, { ...options, headers });
    const data = await response.json() as any;

    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || response.statusText;
      this.logger.error({ endpoint, status: response.status, error: data.error }, `Meta API Error: ${errorMsg}`);
      throw new Error(`Meta API Error: ${errorMsg}`);
    }

    return data as T;
  }

  async fetchCampaignPerformance(campaignId: string): Promise<MetaSpendAlert> {
    this.logger.info({ campaignId }, 'Fetching genuine campaign performance from Meta API...');
    
    // In reality, fetching ROAS/CPA requires querying `insights` with specific fields.
    // We also fetch the campaign's current daily_budget.
    
    const [insightsData, campaignData] = await Promise.all([
      this.request<any>(`/${campaignId}/insights?fields=spend,purchase_roas,cost_per_action_type&date_preset=last_7d`),
      this.request<any>(`/${campaignId}?fields=daily_budget`)
    ]);

    const insights = insightsData.data?.[0] || {};
    const spend = parseFloat(insights.spend || '0');
    
    // Extract ROAS (return on ad spend) for purchases
    const roasAction = insights.purchase_roas?.find((a: any) => a.action_type === 'omni_purchase');
    const roas = roasAction ? parseFloat(roasAction.value) : 0;

    // Extract CPA
    const cpaAction = insights.cost_per_action_type?.find((a: any) => a.action_type === 'omni_purchase');
    const cpa = cpaAction ? parseFloat(cpaAction.value) : 0;

    const dailyBudget = parseInt(campaignData.daily_budget || '0', 10);

    return {
      campaign_id: campaignId,
      current_spend: spend,
      roas,
      cpa,
      daily_budget: dailyBudget
    };
  }

  async increaseBudget(campaignId: string, newBudgetCents: number): Promise<boolean> {
    this.logger.info({ campaignId, newBudgetCents }, 'Executing REAL budget increase via Meta API...');
    
    await this.request(`/${campaignId}`, {
      method: 'POST',
      body: JSON.stringify({ daily_budget: newBudgetCents })
    });

    this.logger.info('Meta API successfully mutated budget');
    return true;
  }

  async pauseCampaign(campaignId: string): Promise<boolean> {
    this.logger.info({ campaignId }, 'Pausing campaign via Meta API...');
    
    await this.request(`/${campaignId}`, {
      method: 'POST',
      body: JSON.stringify({ status: 'PAUSED' })
    });

    this.logger.info('Meta API successfully paused campaign');
    return true;
  }

  async resumeCampaign(campaignId: string): Promise<boolean> {
    this.logger.info({ campaignId }, 'Resuming campaign via Meta API...');
    
    await this.request(`/${campaignId}`, {
      method: 'POST',
      body: JSON.stringify({ status: 'ACTIVE' })
    });

    this.logger.info('Meta API successfully resumed campaign');
    return true;
  }
}

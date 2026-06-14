import { qualifyLead } from '../../../packages/crm-intelligence/src/index';
import { evaluateOutboundCampaign } from '../../../packages/outreach-governance/src/index';
import { AgentRuntime, ExecutionContext } from '../../../packages/agent-runtime-core/src/index';
import { SharedMemoryBus } from '../../../packages/shared-memory-bus/src/index';

export class SalesAgent extends AgentRuntime {
  constructor() {
    super('SALES_AGENT');
  }

  public async execute(payload: any, context: ExecutionContext) {
    const { leadData, engagementHistory, recentOutboundCount } = payload;
    console.log(`\n[${this.agentName}] Processing outbound opportunity for ${leadData.companyName}`);

    // Retrieve historical temporal context
    const sharedContext = SharedMemoryBus.readEntityMemory(leadData.companyName, this.agentName);
    const history = SharedMemoryBus.getTemporalHistory(leadData.companyName);
    console.log(`[${this.agentName}] Temporal historical touchpoints retrieved: ${history.length}`);
    
    if (sharedContext?.signal === 'BUYING_SIGNAL') {
      console.log(`[${this.agentName}] High-priority buying signal detected in shared memory. Fast-tracking qualification.`);
    }

    // Pipeline pressure scaling
    if (payload.pipeline_pressure > 0.8) {
       console.log(`[${this.agentName}] Pipeline pressure critical. Modulating outbound frequency constraints.`);
    }

    // 1. CRM Intelligence Layer Qualification
    const leadState = qualifyLead(leadData, engagementHistory);
    console.log(`[CRM] Lead qualified at ${leadState.opportunity_tier} (Score: ${leadState.qualification_score})`);

    // 2. Outreach Governance Verification
    const isHighRisk = leadData.domain.endsWith('.info') || leadData.domain.endsWith('.xyz');
    const governance = evaluateOutboundCampaign(leadState.trust_state, recentOutboundCount, isHighRisk);
    
    // 3. Structural Output
    if (!governance.action_permitted) {
      console.log(`[OUTREACH_THROTTLED] Campaign blocked: ${governance.escalation_reason}`);
      return this.certifyExecution(payload, {
        status: 'ESCALATED',
        resolution_required: 'HUMAN_APPROVAL',
        payload: { leadState, governance }
      }, context);
    }

    console.log(`[OUTREACH_GENERATED] Payload verified and certified for dispatch.`);
    
    // Update Shared Memory with Outreach Data
    SharedMemoryBus.updateEntityMemory(leadData.companyName, this.agentName, { last_outreach: new Date(), tier: leadState.opportunity_tier });

    return this.certifyExecution(payload, {
      status: 'COMPLETED',
      structured_outreach_payload: {
        subject: `Operational Transformation at ${leadData.companyName}`,
        body_points: ['Deterministic governance', 'Replay certification']
      },
      lineage: { crm_state: leadState, governance_state: governance }
    }, context);
  }
}

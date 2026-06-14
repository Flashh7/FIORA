import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { createRuntimeLogger } from '@fiora/logger';
import { MetaAdsAdapter } from './adapters/MetaAdsAdapter';

const prisma = new PrismaClient();
const redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');
const redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');
const logger = createRuntimeLogger({ execution_id: 'daemon', service_name: 'marketing-agent', correlation_id: 'daemon' });

// Subscribe to incoming events and approvals
redisSub.subscribe('marketing.events', 'dashboard.updates');

redisSub.on('message', async (channel, message) => {
  let payload;
  try {
    payload = JSON.parse(message);
  } catch (e) {
    return;
  }

  // Handle Escalation Approval (Phase 5 - Live Execution)
  if (channel === 'dashboard.updates' && payload.type === 'ESCALATION_RESOLVED' && payload.data?.status === 'APPROVED') {
    const escalationId = payload.data.id;
    const escalation = await prisma.escalation.findUnique({
      where: { id: escalationId }
    });

    if (escalation && escalation.agent_name === 'marketing-agent') {
      const execution_id = escalation.execution_id;
      const correlation_id = escalation.correlation_id;
      const tenant_id = escalation.tenant_id;
      const reqLogger = createRuntimeLogger({ execution_id, correlation_id, service_name: 'marketing-agent' });
      
      reqLogger.info('Received Escalation Approval. Proceeding to REAL MUTATION EXECUTION.');
      
      try {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenant_id } });
        const integration = await prisma.oAuthIntegration.findUnique({ where: { tenant_id_provider: { tenant_id, provider: 'META_ADS' } } });
        
        if (!tenant || !integration || integration.status !== 'ACTIVE') {
          reqLogger.error('Missing active tenant or integration during execution');
          return;
        }

        const metaAdapter = new MetaAdsAdapter(tenant_id, integration.access_token);
        const { performance, proposedIncrease } = escalation.context_snapshot as any;
        const targetCampaignId = performance.campaign_id;
        
        // 1. Enforce Budget Ceiling Safety Check
        const newDailyBudgetCents = performance.daily_budget + proposedIncrease;
        if (newDailyBudgetCents > tenant.max_daily_budget_cents) {
          reqLogger.error({ maxBudget: tenant.max_daily_budget_cents, proposedBudget: newDailyBudgetCents }, 'FATAL ERROR: Proposed budget exceeds tenant max_daily_budget_cents. Execution aborted!');
          return;
        }

        // 2. Idempotency Check (Duplicate Execution Prevention)
        const idempotencyKey = `BUDGET_INC_${execution_id}_${targetCampaignId}`;
        const existingAudit = await prisma.mutationAuditLog.findUnique({ where: { idempotency_key: idempotencyKey } });
        
        if (existingAudit) {
          reqLogger.warn({ idempotencyKey }, 'Idempotency key collision. Mutation already executed. Skipping.');
          return;
        }

        // 3. Pre-Mutation Audit Log
        const auditLog = await prisma.mutationAuditLog.create({
          data: {
            tenant_id,
            execution_id,
            correlation_id,
            idempotency_key: idempotencyKey,
            provider: 'META_ADS',
            mutation_type: 'BUDGET_INCREASE',
            target_resource_id: targetCampaignId,
            pre_mutation_state: performance,
            status: 'RUNNING'
          }
        });

        // 4. Execute Real External Mutation
        await metaAdapter.increaseBudget(targetCampaignId, newDailyBudgetCents);

        // 5. Post-Mutation Audit
        await prisma.mutationAuditLog.update({
          where: { id: auditLog.id },
          data: {
            status: 'SUCCESS',
            post_mutation_state: { daily_budget: newDailyBudgetCents },
            delta: { increased_by: proposedIncrease }
          }
        });

        reqLogger.info({ campaignId: targetCampaignId, newDailyBudgetCents }, 'Successfully executed governed budget mutation on Meta Ads API.');
        
        await prisma.execution.update({
          where: { execution_id },
          data: { status: 'COMPLETED' }
        });
        
      } catch (err: any) {
        reqLogger.error({ err }, 'Mutation execution failed');
        // Record failure in audit log
        await prisma.mutationAuditLog.updateMany({
          where: { execution_id, status: 'RUNNING' },
          data: { status: 'FAILED', error_message: err.message || 'Unknown error' }
        });
      }
    }
    return;
  }

  // Handle incoming Marketing Webhook Trigger
  if (channel === 'marketing.events') {
    const { tenant_id, execution_id, correlation_id, data } = payload;
    const reqLogger = createRuntimeLogger({ execution_id, correlation_id, service_name: 'marketing-agent' });
    reqLogger.info({ tenant_id }, 'Marketing Agent evaluating incoming event for optimization');

    try {
      const integration = await prisma.oAuthIntegration.findUnique({
        where: { tenant_id_provider: { tenant_id, provider: 'META_ADS' } }
      });

      if (!integration || integration.status !== 'ACTIVE') {
        reqLogger.error('No active Meta Ads integration found for tenant');
        await prisma.execution.update({ where: { execution_id }, data: { status: 'FAILED' } });
        return;
      }

      const metaAdapter = new MetaAdsAdapter(tenant_id, integration.access_token);
      
      // We expect the raw webhook payload to contain a campaign_id, or we default to a test one.
      const campaignId = data.raw_payload?.campaign_id || 'cmp_12345';
      const performance = await metaAdapter.fetchCampaignPerformance(campaignId);

      reqLogger.info({ performance }, 'Reasoning on genuine campaign performance metrics...');
      
      let proposedIncrease = 0;
      if (performance.roas > 1.0 && performance.cpa < 50.0) {
        proposedIncrease = 500; // Recommend $5.00 increase
      }

      if (proposedIncrease > 0) {
        reqLogger.info({ proposedIncrease }, 'High-risk budget increase proposed. Dispatched Escalation for human approval.');
        
        const escalation = await prisma.escalation.create({
          data: {
            tenant_id,
            execution_id,
            correlation_id,
            agent_name: 'marketing-agent',
            reason: `Campaign ${campaignId} performing well (ROAS: ${performance.roas}). Requesting approval to increase budget by ${proposedIncrease} cents.`,
            final_confidence: 0.95,
            context_snapshot: { performance, proposedIncrease } as any
          }
        });

        await prisma.execution.update({
          where: { execution_id },
          data: { status: 'ESCALATED' }
        });

        await redisPub.publish('dashboard.updates', JSON.stringify({
          type: 'ESCALATION_CREATED',
          data: escalation
        }));
      } else {
        reqLogger.info('No budget changes required.');
        await prisma.execution.update({
          where: { execution_id },
          data: { status: 'COMPLETED' }
        });
      }
    } catch (error) {
      reqLogger.error({ error }, 'Marketing reasoning workflow failed');
      await prisma.execution.update({
        where: { execution_id },
        data: { status: 'FAILED' }
      }).catch(() => {});
    }
  }
});

logger.info('Marketing Agent daemon initialized with GOVERNED EXTERNAL EXECUTION capabilities');

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await redisSub.quit();
  await redisPub.quit();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await redisSub.quit();
  await redisPub.quit();
  await prisma.$disconnect();
  process.exit(0);
});

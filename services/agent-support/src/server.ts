import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');
const redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');

async function startDaemon() {
  console.log('[SUPPORT_AGENT] Booting up and subscribing to support.events channel...');
  
  await redisSub.subscribe('support.events');

  redisSub.on('message', async (channel, message) => {
    if (channel === 'support.events') {
      try {
        const event = JSON.parse(message);
        console.log(`[SUPPORT_AGENT] Received event: ${event.execution_id}`);
        
        // Update execution status
        await prisma.execution.update({
          where: { execution_id: event.execution_id },
          data: { status: 'RUNNING' }
        });

        // Evaluate Sentiment & Risk (Simulated Logic)
        const payload = event.data;
        const text = payload.complaint?.toLowerCase() || '';
        const isDistressed = text.includes('cancel') || text.includes('angry') || text.includes('sue') || text.includes('urgent');
        
        const sentimentScore = isDistressed ? 0.2 : 0.8;
        
        console.log(`[SUPPORT_AGENT] Analyzed sentiment: ${sentimentScore}`);

        if (sentimentScore < 0.5) {
          console.log(`[SUPPORT_AGENT] Escalation required for execution: ${event.execution_id}`);
          
          await prisma.escalation.create({
            data: {
              execution_id: event.execution_id,
              correlation_id: event.correlation_id,
              agent_name: 'SUPPORT_AGENT',
              reason: 'Customer distressed. Requires human intervention.',
              final_confidence: 0.95,
              context_snapshot: { sentiment: sentimentScore, complaint: payload.complaint },
              status: 'PENDING'
            }
          });

          await prisma.execution.update({
            where: { execution_id: event.execution_id },
            data: { status: 'ESCALATED' }
          });

          // Notify dashboard
          await redisPub.publish('dashboard.updates', JSON.stringify({
            type: 'ESCALATION_CREATED',
            data: { execution_id: event.execution_id, status: 'PENDING' }
          }));

        } else {
          console.log(`[SUPPORT_AGENT] Auto-resolving execution: ${event.execution_id}`);
          
          await prisma.execution.update({
            where: { execution_id: event.execution_id },
            data: { status: 'COMPLETED' }
          });

          // Notify dashboard
          await redisPub.publish('dashboard.updates', JSON.stringify({
            type: 'EXECUTION_COMPLETED',
            data: { execution_id: event.execution_id, status: 'COMPLETED' }
          }));
        }

      } catch (err: any) {
        console.error('[SUPPORT_AGENT] Failed to process event', err);
        // Implement Dead Letter Queue Routing
        try {
          const event = JSON.parse(message);
          await prisma.deadLetterQueue.create({
            data: {
              execution_id: event.execution_id || 'unknown',
              correlation_id: event.correlation_id || 'unknown',
              failed_service: 'agent-support',
              error_reason: err.message || 'Unknown error',
              payload: event
            }
          });
        } catch (dlqErr) {
          console.error('[SUPPORT_AGENT] Failed to write to DLQ', dlqErr);
        }
      }
    }
  });

  // Graceful Shutdown
  const shutdown = async () => {
    console.log('\n[SUPPORT_AGENT] Shutting down gracefully...');
    await redisSub.quit();
    await redisPub.quit();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startDaemon().catch((err) => {
  console.error('[SUPPORT_AGENT] Fatal Error', err);
  process.exit(1);
});

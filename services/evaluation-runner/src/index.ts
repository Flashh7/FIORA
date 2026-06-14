import Fastify from 'fastify';
import { logger, createLogger } from '@fiora/logger';
import { prisma, ExecutionMode } from '@fiora/database';
import { canExecuteWorkflow } from '@fiora/policies';
import { ChaosEngine } from './chaos';
import { randomUUID } from 'crypto';
// import { analyzeMarketingDrift } from '@fiora/drift-analysis'; // Assume it's linked later

const server = Fastify();
const evalLogger = createLogger({ service: 'evaluation-runner' });

server.post('/api/evaluate/replay', async (request, reply) => {
  const { execution_id, enable_chaos } = request.body as { execution_id: string, enable_chaos?: boolean };

  evalLogger.info({ execution_id }, 'Initiating execution replay');

  try {
    const events = await prisma.eventLedger.findMany({
      where: { execution_id },
      orderBy: { sequence_number: 'asc' }
    });

    if (!events.length) {
      return reply.status(404).send({ error: 'Execution trace not found' });
    }

    if (!canExecuteWorkflow(ExecutionMode.SIMULATION, 'replay')) {
      throw new Error('Simulation execution policy rejected replay');
    }

    let payloadToReplay = events[0].payload as any;

    if (enable_chaos) {
      // 1. Randomly inject chaos
      if (Math.random() > 0.5) {
        await ChaosEngine.simulateAgentTimeout(1500);
      } else {
        payloadToReplay = ChaosEngine.injectMalformedPayload(payloadToReplay);
      }
    }

    // 2. Fire replay in SIMULATION mode
    const replay_execution_id = randomUUID();
    evalLogger.info({ replay_execution_id }, `Replaying payload safely in SIMULATION mode.`);
    
    // In real implementation:
    // const replayResponse = await triggerAgentWebhook(payloadToReplay);
    // const originalResponse = fetchOriginalFromLedger();
    // const drift = analyzeMarketingDrift(originalResponse, replayResponse, ...);
    // await prisma.driftReport.create({ data: drift });

    return reply.send({ 
      status: 'REPLAY_STARTED', 
      original_execution: execution_id,
      replay_execution: replay_execution_id,
      chaos_injected: !!enable_chaos
    });
  } catch (error) {
    evalLogger.error({ err: error }, 'Replay failed');
    return reply.status(500).send({ error: 'Internal replay failure' });
  }
});

const start = async () => {
  try {
    await server.listen({ port: 3005, host: '0.0.0.0' });
    evalLogger.info('FIORA Evaluation Runner started on port 3005');
  } catch (err) {
    evalLogger.error(err);
    process.exit(1);
  }
};

start();

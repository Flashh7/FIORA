import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { randomUUID } from 'crypto';
import { logger, createRuntimeLogger } from '@fiora/logger';
import { EventPayloadSchema, ExecutionMode } from '@fiora/shared-types';
import { canExecuteWorkflow } from '@fiora/policies';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { PassThrough } from 'stream';
import fastifyJwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import fastifyRateLimit from '@fastify/rate-limit';
import twilio from 'twilio';
import fastifyRawBody from 'fastify-raw-body';
import fastifyMultipart from '@fastify/multipart';
import { stripeWebhookRoutes, provisioningQueue } from './stripe';
import { knowledgeRoutes } from './knowledge';

const prisma = new PrismaClient();


const redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');
const redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');
redisSub.setMaxListeners(0); // Allow infinite SSE connections without EventEmiiter warnings

const server = Fastify({
  logger: false,
});

// Health check endpoint for external orchestration and load balancers
server.get('/health', async (request, reply) => {
  try {
    // Verify database connectivity
    await prisma.$queryRaw`SELECT 1`;
    return reply.status(200).send({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    return reply.status(503).send({ status: 'error', database: 'disconnected', timestamp: new Date().toISOString() });
  }
});

// Option C: Cloud Scheduler EventBridge Endpoint
server.post('/api/internal/reset-usage', async (request: any, reply: any) => {
  const authHeader = request.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.INTERNAL_SECRET || 'dev_secret'}`) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  console.log('[CRON] Running monthly usage_current reset for all tenants');
  try {
    await prisma.serviceEntitlement.updateMany({
      data: { usage_current: 0 }
    });
    console.log('[CRON] Successfully reset usage_current to 0.');
    return reply.status(200).send({ success: true });
  } catch (err) {
    console.error('[CRON ERROR]', err);
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
});

import fastifyFormbody from '@fastify/formbody';

server.register(fastifyRawBody, {
  field: 'rawBody', // the fastify request field where the raw body will be placed
  global: false, // add it only to specific routes where needed
  encoding: 'utf8', // default encoding
  runFirst: true // ensure it runs before body parsing
});

server.register(fastifyMultipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

server.register(stripeWebhookRoutes);
server.register(knowledgeRoutes);
server.register(fastifyFormbody);

server.register(cors, {
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
});
server.register(helmet);
server.register(fastifyRateLimit, {
  max: 100, // 100 requests per minute
  timeWindow: 60000
});
server.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'super-secret-fiora-key'
});

// Authentication Routes
server.post('/api/auth/login', async (request, reply) => {
  const { email, password } = request.body as any;
  const operator = await prisma.operator.findUnique({ where: { email } });
  
  if (!operator || !operator.is_active) {
    return reply.status(401).send({ error: 'Invalid credentials' });
  }
  
  const isMatch = await bcrypt.compare(password, operator.password_hash);
  if (!isMatch) {
    return reply.status(401).send({ error: 'Invalid credentials' });
  }
  
  const token = server.jwt.sign({ id: operator.id, role: operator.role, name: operator.name });
  return reply.send({ token, user: { id: operator.id, name: operator.name, role: operator.role } });
});

server.get('/api/auth/me', async (request, reply) => {
  try {
    await request.jwtVerify();
    return reply.send({ user: request.user });
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
});

import oauthRoutes from './routes/oauth';
import webhookRoutes from './routes/webhooks';

// Register Sub-routes
server.register(oauthRoutes);
server.register(webhookRoutes);

import fastifyHttpProxy from '@fastify/http-proxy';

// Register proxy for Voice Agent Stream
server.register(fastifyHttpProxy, {
  upstream: process.env.VOICE_AGENT_INTERNAL_URL || 'http://127.0.0.1:3004',
  prefix: '/api/voice/stream',
  websocket: true,
  rewritePrefix: '/',
  replyOptions: {
    onError: (reply, error) => {
      logger.error({ error }, 'Voice Agent proxy error');
      reply.send(error);
    }
  }
});

// Standardized ingestion endpoint for incoming events/webhooks
server.post('/outbound-twiml', async (request, reply) => {
  logger.info("Received outbound TwiML request from Twilio");
  
  // INITIAL VERIFICATION STEP: Just say hello
  // Full websocket integration will replace this after first test.
  const host = request.headers.host;
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${host}/api/voice/stream">
      <Parameter name="direction" value="outbound" />
    </Stream>
  </Connect>
</Response>`;

  reply.header('Content-Type', 'text/xml');
  return reply.send(twiml);
});

server.post('/api/events/ingest', async (request, reply) => {
  const execution_id = randomUUID();
  const correlation_id = (request.headers['x-correlation-id'] as string) || randomUUID();
  const reqLogger = createRuntimeLogger({ execution_id, correlation_id, service_name: 'gateway' });

  reqLogger.info({ execution_id, correlation_id }, "Event ingestion request received");

  try {
    const parsedPayload = EventPayloadSchema.parse(request.body);
    
    if (!canExecuteWorkflow(parsedPayload.execution_mode, parsedPayload.type)) {
       throw new Error(`Execution Policy rejected workflow trigger in mode: ${parsedPayload.execution_mode}`);
    }

    const enrichedPayload = {
      ...parsedPayload,
      execution_id,
      correlation_id,
      parent_execution_id: request.headers['x-parent-execution-id'] as string | undefined,
      sequence_number: 1,
      timestamp: parsedPayload.emitted_at || new Date().toISOString()
    };

    reqLogger.info({ source_service: parsedPayload.source_service }, "Publishing event to Redis bus");
    
    // Publish to Redis
    await redisPub.publish('events.incoming', JSON.stringify(enrichedPayload));

    // Also persist to Ledger
    await prisma.eventLedger.create({
      data: {
        tenant_id: parsedPayload.tenant_id,
        execution_id,
        correlation_id,
        execution_mode: parsedPayload.execution_mode === 'PRODUCTION' ? 'PRODUCTION' : 'SIMULATION',
        event_type: parsedPayload.type,
        source_service: parsedPayload.source_service,
        sequence_number: 1,
        payload: enrichedPayload as any
      }
    });

    reqLogger.info("Execution accepted for asynchronous processing");

    return reply.status(202).send({
      status: 'accepted',
      execution_id,
      correlation_id,
      mode: enrichedPayload.execution_mode
    });
  } catch (error) {
    reqLogger.error({ error }, "Gateway ingestion failed");
    return reply.status(400).send({ status: 'error', message: 'Invalid payload' });
  }
});

// Phase B: Support Escalation Flow Intake
server.post('/api/support/intake', async (request, reply) => {
  const execution_id = randomUUID();
  const correlation_id = randomUUID();
  const reqLogger = createRuntimeLogger({ execution_id, correlation_id, service_name: 'gateway' });

  try {
    const payload: any = request.body;
    reqLogger.info("Support intake received");

    const tenant_id = request.headers['x-tenant-id'] as string || payload.tenant_id;
    if (!tenant_id) {
      throw new Error('x-tenant-id header is required');
    }

    const eventPayload = {
      id: randomUUID(),
      tenant_id,
      event_version: '1.0',
      schema_version: '2026-06-12',
      type: 'SUPPORT_TICKET_CREATED',
      source_service: 'customer-portal',
      execution_mode: 'PRODUCTION',
      emitted_at: new Date().toISOString(),
      execution_id,
      correlation_id,
      sequence_number: 1,
      data: payload
    };

    // 1. Ledger Persistence
    await prisma.eventLedger.create({
      data: {
        tenant_id,
        execution_id,
        correlation_id,
        execution_mode: 'PRODUCTION',
        event_type: 'SUPPORT_TICKET_CREATED',
        source_service: 'customer-portal',
        sequence_number: 1,
        payload: eventPayload as any
      }
    });

    // Create Execution state
    await prisma.execution.create({
      data: {
        tenant_id,
        execution_id,
        correlation_id,
        workflow_name: 'SUPPORT_ESCALATION',
        mode: 'PRODUCTION',
        status: 'RUNNING'
      }
    });

    // 2. Redis Propagation
    await redisPub.publish('support.events', JSON.stringify(eventPayload));
    await redisPub.publish('dashboard.updates', JSON.stringify({ type: 'EVENT_LOGGED', data: eventPayload }));

    return reply.status(202).send({ status: 'accepted', execution_id });
  } catch (err) {
    reqLogger.error({ err }, "Support intake failed");
    return reply.status(500).send({ status: 'error', message: 'Internal Server Error' });
  }
});

// Phase G: Escalation Approvals
server.get('/api/escalations/pending', async (request, reply) => {
  const escalations = await prisma.escalation.findMany({
    where: { status: 'PENDING' },
    include: { execution: true },
    orderBy: { created_at: 'desc' }
  });
  return reply.send(escalations);
});

server.post('/api/escalation/:id/approve', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  const user = request.user as any;
  if (user.role !== 'ADMIN' && user.role !== 'SUPPORT_OPERATOR') {
    return reply.status(403).send({ error: 'Forbidden' });
  }

  const { id } = request.params as any;
  const escalation = await prisma.escalation.update({
    where: { id },
    data: { status: 'RESOLVED', resolution_type: 'APPROVE', resolved_at: new Date(), resolved_by_id: user.id }
  });

  await prisma.execution.update({
    where: { execution_id: escalation.execution_id },
    data: { status: 'COMPLETED' }
  });

  await redisPub.publish('dashboard.updates', JSON.stringify({
    type: 'ESCALATION_RESOLVED',
    data: { id, status: 'APPROVED', execution_id: escalation.execution_id, operator: user.name }
  }));

  return reply.send({ status: 'success', escalation });
});

server.post('/api/escalation/:id/reject', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  const user = request.user as any;
  if (user.role !== 'ADMIN' && user.role !== 'SUPPORT_OPERATOR') {
    return reply.status(403).send({ error: 'Forbidden' });
  }

  const { id } = request.params as any;
  const escalation = await prisma.escalation.update({
    where: { id },
    data: { status: 'REJECTED', resolution_type: 'REJECT', resolved_at: new Date(), resolved_by_id: user.id }
  });

  await prisma.execution.update({
    where: { execution_id: escalation.execution_id },
    data: { status: 'FAILED' }
  });

  await redisPub.publish('dashboard.updates', JSON.stringify({
    type: 'ESCALATION_RESOLVED',
    data: { id, status: 'REJECTED', execution_id: escalation.execution_id }
  }));

  return reply.send({ status: 'success', escalation });
});

// Phase I: Dashboard Realtime SSE Stream
server.get('/api/ws/live', (request, reply) => {
  const token = (request.query as any).token;
  if (!token) {
    return reply.status(401).send('Token required');
  }

  // Set SSE Headers
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.setHeader('Access-Control-Allow-Origin', '*');
  reply.raw.flushHeaders();

  const onMessage = (channel: string, message: string) => {
    if (channel === 'dashboard.updates') {
      reply.raw.write(`data: ${message}\n\n`);
    }
  };

  redisSub.on('message', onMessage);

  request.raw.on('close', () => {
    redisSub.off('message', onMessage);
  });
});

// --- SUPER ADMIN TENANT ROUTES ---
server.get('/api/admin/tenants', async (request, reply) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: { phone_numbers: true, operators: true, entitlements: true },
      orderBy: { created_at: 'desc' }
    });
    return reply.send(tenants);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ error: 'Failed to fetch tenants' });
  }
});

server.put('/api/admin/tenants/:id/entitlements', async (request: any, reply) => {
  try {
    const { id } = request.params;
    const adminId = request.user?.id || 'system-admin-fallback';
    const { feature_key, is_enabled } = request.body;

    const entitlement = await prisma.serviceEntitlement.upsert({
      where: {
        tenant_id_feature_key: {
          tenant_id: id,
          feature_key
        }
      },
      update: {
        is_enabled
      },
      create: {
        tenant_id: id,
        feature_key,
        is_enabled
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        tenant_id: id,
        admin_user_id: adminId,
        action: is_enabled ? `ENABLE_${feature_key.toUpperCase()}` : `DISABLE_${feature_key.toUpperCase()}`,
        previous_value: { is_enabled: !is_enabled },
        new_value: { is_enabled }
      }
    });

    return reply.send(entitlement);
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ error: 'Failed to update tenant entitlement' });
  }
});

server.post('/api/admin/tenants/:id/provision', async (request: any, reply) => {
  try {
    const { id } = request.params;
    const adminId = request.user?.id || 'system-admin-fallback';
    const { countryCode = 'US', areaCode } = request.body || {};
    
    let tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });
    
    if (tenant.provisioning_status === 'PROVISIONING') {
      return reply.status(429).send({ error: 'Provisioning already in progress' });
    }
    if (tenant.provisioning_status === 'ACTIVE' || tenant.twilio_subaccount_sid) {
      return reply.status(400).send({ error: 'Tenant already has a provisioned Twilio Sandbox' });
    }

    await prisma.tenant.update({
      where: { id },
      data: { country_code: countryCode, preferred_area_code: areaCode || null }
    });

    // Enqueue async job
    await provisioningQueue.add('provision-tenant', { tenantId: id, adminId }, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 }
    });

    return reply.send({ success: true, message: 'Provisioning enqueued' });
  } catch (err: any) {
    console.error(err);
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await server.listen({ port, host: '0.0.0.0' });
    logger.info(`FIORA Gateway running on port ${port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();

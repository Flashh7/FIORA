import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { randomUUID, createHmac } from 'crypto';
import { createRuntimeLogger } from '@fiora/logger';

const prisma = new PrismaClient();
const redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function webhookRoutes(server: FastifyInstance) {
  const logger = createRuntimeLogger({ execution_id: 'webhook-handler', service_name: 'gateway-webhooks', correlation_id: 'system' });

  // 1. Meta Webhook Verification (hub.challenge)
  server.get('/api/webhooks/meta-ads', async (request, reply) => {
    const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = request.query as any;
    
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('Meta Webhook verification successful');
      return reply.status(200).send(challenge);
    } else {
      logger.warn('Meta Webhook verification failed');
      return reply.status(403).send('Forbidden');
    }
  });

  // 2. Real Webhook Ingestion with Signature Validation
  server.post('/api/webhooks/meta-ads', async (request, reply) => {
    // Determine tenant_id from URL params or dynamically map object_id in production.
    // For this milestone, we accept `?tenant_id=` query param.
    const { tenant_id } = request.query as any;
    if (!tenant_id) {
      return reply.status(400).send({ error: 'tenant_id is required' });
    }

    const appSecret = process.env.META_APP_SECRET;
    const signature = request.headers['x-hub-signature-256'] as string;

    // Validate Signature
    if (appSecret && signature) {
      const payloadString = JSON.stringify(request.body);
      const expectedSignature = `sha256=${createHmac('sha256', appSecret).update(payloadString).digest('hex')}`;
      if (signature !== expectedSignature) {
        logger.error('Invalid Meta Webhook Signature detected');
        return reply.status(400).send({ error: 'Invalid signature' });
      }
    }

    const payload = request.body as any;
    const execution_id = randomUUID();
    const correlation_id = randomUUID();
    
    const reqLogger = createRuntimeLogger({ execution_id, correlation_id, service_name: 'gateway-webhooks' });
    reqLogger.info({ tenant_id }, "Real Meta Ads Webhook received and validated");

    // Persist raw webhook payload
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        tenant_id,
        provider: 'META_ADS',
        event_type: 'META_ADS_WEBHOOK',
        payload: payload
      }
    });

    // Create an EventLedger entry to trigger the marketing agent
    const eventPayload = {
      id: randomUUID(),
      tenant_id,
      event_version: '1.0',
      schema_version: '2026-06-12',
      source_service: 'meta-ads-webhook',
      type: 'META_SPEND_ALERT',
      execution_mode: 'PRODUCTION',
      execution_id,
      correlation_id,
      sequence_number: 1,
      emitted_at: new Date().toISOString(),
      data: {
        webhook_event_id: webhookEvent.id,
        raw_payload: payload
      }
    };

    await prisma.eventLedger.create({
      data: {
        tenant_id,
        execution_id,
        correlation_id,
        execution_mode: 'PRODUCTION',
        event_type: 'META_SPEND_ALERT',
        source_service: 'meta-ads-webhook',
        sequence_number: 1,
        payload: eventPayload as any
      }
    });

    await prisma.execution.create({
      data: {
        tenant_id,
        execution_id,
        correlation_id,
        workflow_name: 'MARKETING_OPTIMIZATION',
        mode: 'PRODUCTION',
        status: 'RUNNING'
      }
    });

    await redisPub.publish('marketing.events', JSON.stringify(eventPayload));

    return reply.status(200).send({ status: 'accepted', webhook_event_id: webhookEvent.id });
  });

  // 3. Twilio Voice Inbound Webhook (Phase 2)
  server.post('/api/webhooks/voice/inbound', async (request, reply) => {
    try {
      // Twilio sends application/x-www-form-urlencoded, fastify formbody parser is assumed or we use raw
      const payload = request.body as any;
      
      const query = request.query as any;
      const tenant_id = query['tenant_id'] as string || '94ffa16b-aa91-40e1-8ad5-c7f400adedc9'; // Real Tenant UUID from Database
      const caller_number = payload?.From || 'unknown';
      const call_sid = payload?.CallSid || randomUUID();

      logger.info({ caller_number, call_sid }, 'Incoming Voice Call Received via Twilio');

      // 1. Create VoiceSession in Database
      const voiceSession = await prisma.voiceSession.create({
        data: {
          tenant_id,
          conversation_id: call_sid,
          caller_number: caller_number,
          direction: 'INBOUND',
          transport_protocol: 'Twilio Media Streams'
        }
      });

      logger.info({ sessionId: voiceSession.id }, 'Created new VoiceSession record');

      // 2. Generate TwiML to Connect to our WebSocket Stream
      // In production, the NGROK_URL or DOMAIN would be an env var.
      const host = request.headers.host;
      // ngrok forwards x-forwarded-proto, fallback to wss for production defaults
      const protocol = (request.headers['x-forwarded-proto'] === 'https' || request.headers['x-forwarded-proto'] === 'wss') ? 'wss' : 'ws';
      // We direct the stream to the Gateway itself, which reverse proxies to the Voice Agent
      const streamUrl = process.env.VOICE_STREAM_URL || `wss://${host}/api/voice/stream`;

      const twiml = `
        <Response>
          <Connect>
            <Stream url="${streamUrl}">
              <Parameter name="tenant_id" value="${tenant_id}" />
            </Stream>
          </Connect>
        </Response>
      `;

      reply.header('Content-Type', 'text/xml');
      return reply.send(twiml);
    } catch (err) {
      console.error("VOICE WEBHOOK FAILURE:", err);
      return reply.status(500).send({
        error: String(err)
      });
    }
  });
}

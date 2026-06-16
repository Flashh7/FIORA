import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { fetchRecentPayments, fetchRevenueMetrics } from '@fiora/finance-agent';

const app = Fastify();

app.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS']
});

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

app.get('/health', async () => {
  return {
    status: 'ok',
    service: 'finance-agent',
    uptime: process.uptime(),
    timestamp: Date.now()
  };
});

app.get('/api/payments/recent', async (request, reply) => {
  try {
    const data = await fetchRecentPayments(10);
    return data;
  } catch (error) {
    app.log.error(error);
    return reply.code(500).send({ error: 'Failed to fetch recent payments' });
  }
});

app.get('/api/payments/metrics', async (request, reply) => {
  try {
    const data = await fetchRevenueMetrics();
    return data;
  } catch (error) {
    app.log.error(error);
    return reply.code(500).send({ error: 'Failed to fetch revenue metrics' });
  }
});

app.listen({ port: 3010, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Finance Agent running on ${address}`);
});

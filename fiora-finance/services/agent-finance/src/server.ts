import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

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

import OpenAI from 'openai';

const openai = new OpenAI({ 
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: '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' 
});

app.post('/api/finance/query', async (request: any, reply) => {
  try {
    const { question, tenantId } = request.body;
    
    if (!question) {
      return reply.code(400).send({ error: 'Question is required' });
    }

    // In a real implementation, we would query the Prisma DB for this specific tenant's revenue/leads
    // For now, we fetch the aggregate metrics to feed into Doctor Strange's context
    const metrics = await fetchRevenueMetrics();
    
    const completion = await openai.chat.completions.create({
      model: 'meta/llama-3.1-8b-instruct',
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: `You are Doctor Strange, the Finance and Business Intelligence Agent for FIORA.
You NEVER participate in live customer phone calls. You are a dashboard-only assistant for business owners.
Analyze the following live business data and answer the owner's question clearly, concisely, and with actionable insights.
Do not hallucinate data. If the answer isn't in the provided metrics, state that.

Current Business Data:
${JSON.stringify(metrics, null, 2)}`
        },
        { role: 'user', content: question }
      ]
    });

    return { 
      answer: completion.choices[0].message.content,
      data_context: metrics
    };
  } catch (error) {
    app.log.error(error);
    return reply.code(500).send({ error: 'Failed to process Doctor Strange query' });
  }
});

app.listen({ port: 3010, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Finance Agent running on ${address}`);
});

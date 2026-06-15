import Fastify from 'fastify';

const app = Fastify();

app.get('/health', async () => {
  return {
    status: 'ok',
    service: 'finance-agent',
    uptime: process.uptime(),
    timestamp: Date.now()
  };
});

app.listen({ port: 3010 }, () => {
  console.log('Finance Agent running on port 3010');
});

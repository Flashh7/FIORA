import Fastify from 'fastify';

const app = Fastify();

app.get('/health', async () => {
  return {
    status: 'ok',
    service: 'support-agent',
    uptime: process.uptime(),
    timestamp: Date.now()
  };
});

app.listen({ port: 3025 }, () => {
  console.log('Support Agent running on port 3025');
});

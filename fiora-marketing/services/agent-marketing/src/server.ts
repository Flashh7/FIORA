import Fastify from 'fastify';

const app = Fastify();

app.get('/health', async () => {
  return {
    status: 'ok',
    service: 'marketing-agent',
    uptime: process.uptime(),
    timestamp: Date.now()
  };
});

app.listen({ port: 3015 }, () => {
  console.log('Marketing Agent running on port 3015');
});

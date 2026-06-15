import Fastify from 'fastify';

const app = Fastify();

app.get('/health', async () => {
  return {
    status: 'ok',
    service: 'sales-agent',
    uptime: process.uptime(),
    timestamp: Date.now()
  };
});

app.listen({ port: 3020 }, () => {
  console.log('Sales Agent running on port 3020');
});

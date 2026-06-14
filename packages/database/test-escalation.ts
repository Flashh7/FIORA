import { PrismaClient } from '@prisma/client';

async function test() {
  const prisma = new PrismaClient();
  try {
    console.log("=== 11. Database Validation ===");
    
    const execs = await prisma.execution.findMany({ orderBy: { started_at: 'desc' }, take: 2 });
    console.log("Recent Executions:", execs.map(e => ({ id: e.execution_id, status: e.status })));
    
    const escalations = await prisma.escalation.findMany({ orderBy: { created_at: 'desc' }, take: 2 });
    console.log("Recent Escalations:", escalations.map(e => ({ id: e.id, status: e.status, reason: e.reason })));
    
    console.log("\n=== 13. Dead Letter Queue Validation ===");
    const dlqs = await prisma.deadLetterQueue.findMany({ orderBy: { created_at: 'desc' }, take: 2 });
    console.log("Recent DLQ entries:", dlqs.length);
    
  } catch(err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
test();

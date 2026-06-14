import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const tenant = await prisma.tenant.findFirst();
  console.log('TENANT_ID=' + (tenant?.id || 'NO_TENANTS'));
}
run();

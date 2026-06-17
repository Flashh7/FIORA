const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT tgname, tgenabled, tgtype 
    FROM pg_trigger 
    WHERE tgrelid = '"AdminAuditLog"'::regclass;
  `);
  console.log(result);
}
main().finally(() => prisma.$disconnect());

// Seed the default SYSTEM tenant
const { PrismaClient } = require('./node_modules/.prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://fiora_app_user:fiora_password@localhost:5432/fiora' } }
});

async function main() {
  console.log('Seeding default SYSTEM tenant...');

  // Check if there's already a tenant
  const existing = await prisma.tenant.findFirst();
  if (existing) {
    console.log('Tenant already exists:', existing.id, existing.name);
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: 'FIORA',
      account_status: 'ACTIVE',
      provisioning_status: 'ACTIVE',
      country_code: 'IN',
    }
  });

  console.log('Created SYSTEM tenant:', tenant.id);
  console.log('\nAdd this to your .env: SYSTEM_TENANT_ID=' + tenant.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());

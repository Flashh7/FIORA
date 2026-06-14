import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password_hash = await bcrypt.hash('password123', 10);
  
  const defaultTenant = await prisma.tenant.create({
    data: { name: 'Fiora Labs HQ' }
  });

  await prisma.operator.upsert({
    where: { email: 'admin@fiora.app' },
    update: {
      password_hash,
      role: 'ADMIN',
      name: 'System Admin',
      tenant_id: defaultTenant.id
    },
    create: {
      email: 'admin@fiora.app',
      password_hash,
      role: 'ADMIN',
      name: 'System Admin',
      tenant_id: defaultTenant.id
    }
  });

  console.log('Seeded Admin Operator: admin@fiora.app / password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());


const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  console.log('Total Users in Live DB:', count);
}

main().finally(() => prisma.$disconnect());

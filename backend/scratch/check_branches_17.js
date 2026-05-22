const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({ where: { companyId: 17 } });
  console.log(`Branches for Company 17:`);
  branches.forEach(b => console.log(`- ${b.name} (ID: ${b.id})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());

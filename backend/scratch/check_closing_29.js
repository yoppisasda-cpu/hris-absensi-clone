const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lastClosing = await prisma.posClosing.findFirst({
    where: { companyId: 17, branchId: 29, status: 'COMPLETED' },
    orderBy: { endTime: 'desc' }
  });
  console.log(lastClosing);
}

main().catch(console.error).finally(() => prisma.$disconnect());

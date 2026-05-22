const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companyId = 17;
  const today = new Date('2026-05-09T00:00:00Z');

  const sales = await prisma.sale.findMany({
    where: { companyId, date: { gte: today } },
    include: { branch: { select: { name: true } } }
  });

  console.log(`Sales on May 9: ${sales.length}`);
  const branches = {};
  sales.forEach(s => {
    const key = s.branchId ? `${s.branch?.name} (ID: ${s.branchId})` : "NULL Branch";
    branches[key] = (branches[key] || 0) + s.totalAmount;
  });
  console.log(branches);
}

main().catch(console.error).finally(() => prisma.$disconnect());

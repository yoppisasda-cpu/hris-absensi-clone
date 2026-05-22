const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companyId = 17; // KNC

  const sales = await prisma.sale.findMany({
    where: { companyId, date: { gte: new Date('2026-05-07T00:00:00Z') } },
    include: { branch: { select: { name: true } }, cashier: { select: { email: true } } },
    orderBy: { date: 'desc' }
  });

  console.log(`Total sales since May 7: ${sales.length}`);
  const branches = {};
  sales.forEach(s => {
    const key = s.branchId ? `${s.branch?.name} (ID: ${s.branchId})` : "NULL Branch";
    branches[key] = (branches[key] || 0) + s.totalAmount;
  });
  console.log("\nOmset by Branch (since May 7):", branches);

  const cashiers = {};
  sales.forEach(s => {
    const key = s.cashier?.email || "Unknown";
    cashiers[key] = (cashiers[key] || 0) + s.totalAmount;
  });
  console.log("\nOmset by Cashier (since May 7):", cashiers);
  
  // Check specifically for May 8
  const may8Sales = sales.filter(s => s.date.toISOString().startsWith('2026-05-08'));
  console.log(`\nMay 8 Total Omset: ${may8Sales.reduce((sum, s) => sum + s.totalAmount, 0)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companyId = 17; // KNC

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const sales = await prisma.sale.findMany({
    where: {
      companyId,
      date: { gte: new Date('2026-05-08T00:00:00Z') },
      invoiceNumber: { startsWith: 'POS-' }
    },
    include: { 
        cashier: { select: { email: true } },
        branch: { select: { name: true } }
    },
    orderBy: { date: 'desc' }
  });

  console.log(`Recent sales for company 17: ${sales.length}`);
  sales.forEach(s => {
    console.log(`- [${s.date.toISOString()}] ${s.invoiceNumber} | Branch: ${s.branch?.name || 'NULL'} (ID: ${s.branchId}) | Cashier: ${s.cashier?.email} | Amount: ${s.totalAmount}`);
  });

  // Check closings
  const closings = await prisma.posClosing.findMany({
    where: { companyId },
    orderBy: { endTime: 'desc' },
    take: 5
  });
  console.log(`\nRecent closings: ${closings.length}`);
  closings.forEach(c => {
    console.log(`- [${c.endTime.toISOString()}] Branch: ${c.branchId} | Cashier: ${c.cashierId} | Transactions: ${c.totalTransactions}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

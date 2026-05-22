const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branchId = 22; // Sukmajaya
  const companyId = 17; // KNC

  // Last closing for branch 22
  const lastClosing = await prisma.posClosing.findFirst({
    where: { companyId, branchId, status: 'COMPLETED' },
    orderBy: { endTime: 'desc' }
  });

  const startTime = lastClosing ? lastClosing.endTime : new Date('2026-05-01T00:00:00Z');

  console.log(`Branch: 22 (Sukmajaya)`);
  console.log(`StartTime from DB (UTC): ${startTime.toISOString()}`);
  console.log(`StartTime in WIB: ${new Date(startTime.getTime() + 7 * 3600000).toISOString()}`);

  const sales = await prisma.sale.findMany({
    where: {
      companyId,
      branchId,
      date: { gt: startTime },
      invoiceNumber: { startsWith: 'POS-' }
    },
    orderBy: { date: 'asc' }
  });

  console.log(`\nTotal Sales since startTime: ${sales.length}`);
  let totalAmount = 0;
  sales.forEach(s => {
    totalAmount += s.totalAmount;
    console.log(`- [${s.date.toISOString()}] ${s.invoiceNumber} | Amount: ${s.totalAmount}`);
  });

  console.log(`\nTOTAL OMSET IN SUMMARY: ${totalAmount}`);

  // Now check sales for May 8 for branch 22
  const may8Start = new Date('2026-05-08T00:00:00Z');
  const may8End = new Date('2026-05-08T23:59:59Z');
  const salesMay8 = await prisma.sale.findMany({
    where: { companyId, branchId, date: { gte: may8Start, lte: may8End } }
  });
  console.log(`\nSales on May 8 for Branch 22: ${salesMay8.reduce((sum, s) => sum + s.totalAmount, 0)} (${salesMay8.length} trans)`);

  // Check sales for May 9 for branch 22
  const may9Start = new Date('2026-05-09T00:00:00Z');
  const salesMay9 = await prisma.sale.findMany({
    where: { companyId, branchId, date: { gte: may9Start } }
  });
  console.log(`Sales on May 9 for Branch 22: ${salesMay9.reduce((sum, s) => sum + s.totalAmount, 0)} (${salesMay9.length} trans)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

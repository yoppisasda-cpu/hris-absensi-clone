const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companyId = 17;
  const startTime = new Date('2026-05-07T05:23:31.342Z'); // 12:23 WIB

  const sales = await prisma.sale.findMany({
    where: {
      companyId,
      branchId: null,
      date: { gt: startTime },
      invoiceNumber: { startsWith: 'POS-' }
    }
  });

  console.log(`NULL Branch Sales since shift start: ${sales.length}`);
  console.log(`Total Amount: ${sales.reduce((sum, s) => sum + s.totalAmount, 0)}`);
  
  sales.forEach(s => console.log(`- [${s.date.toISOString()}] ${s.invoiceNumber} | ${s.totalAmount}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());

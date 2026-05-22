const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branchId = 35; // PIM3
  const companyId = 17; // KNC

  // 1. Get last closing
  const lastClosing = await prisma.posClosing.findFirst({
    where: { companyId, branchId, status: 'COMPLETED' },
    orderBy: { endTime: 'desc' }
  });

  const defaultStartTime = new Date();
  defaultStartTime.setHours(0, 0, 0, 0);
  const startTime = lastClosing ? lastClosing.endTime : defaultStartTime;

  console.log(`Branch ID: ${branchId}`);
  console.log(`Last Closing: ${lastClosing ? lastClosing.endTime.toISOString() : 'Never'}`);
  console.log(`Summary start time: ${startTime.toISOString()}`);

  // 2. Sales unclosed
  const sales = await prisma.sale.findMany({
    where: {
      companyId,
      branchId,
      date: { gt: startTime },
      invoiceNumber: { startsWith: 'POS-' }
    },
    include: { cashier: { select: { name: true, email: true } } }
  });

  console.log(`Total Sales unclosed: ${sales.length}`);
  
  // Group by date
  const groups = {};
  sales.forEach(s => {
    const d = s.date.toISOString().split('T')[0];
    groups[d] = (groups[d] || 0) + 1;
  });
  console.log("Sales count by date:", groups);

  // Group by cashier
  const cashiers = {};
  sales.forEach(s => {
    const name = s.cashier?.email || 'Unknown';
    cashiers[name] = (cashiers[name] || 0) + 1;
  });
  console.log("Sales count by cashier:", cashiers);

  // Check for sales specifically from yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0,0,0,0);
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  
  const yesterdaySales = sales.filter(s => s.date >= yesterday && s.date < todayStart);
  console.log(`\nYesterday unclosed sales: ${yesterdaySales.length}`);
  if (yesterdaySales.length > 0) {
      console.log(`Yesterday's unclosed sales involve cashiers:`, [...new Set(yesterdaySales.map(s => s.cashier?.email))]);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

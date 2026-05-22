const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDiscrepancy() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'kasir@knc.com' }
    });

    if (!user) {
      console.log("User kasir@knc.com not found");
      return;
    }

    if (!user.branchId) {
      const firstBranch = await prisma.branch.findFirst({ where: { companyId: user.companyId } });
      if (firstBranch) {
        user.branchId = firstBranch.id;
        console.log(`User has no branch, falling back to first branch: ${firstBranch.name} (ID: ${firstBranch.id})`);
      }
    }

    if (!user.branchId) {
      console.log("User has no branch and no fallback found.");
      return;
    }

    // 1. Get last closing for this branch
    const lastClosing = await prisma.posClosing.findFirst({
      where: { companyId: user.companyId, branchId: user.branchId, status: 'COMPLETED' },
      orderBy: { endTime: 'desc' }
    });

    const defaultStartTime = new Date();
    defaultStartTime.setHours(0, 0, 0, 0);
    const startTime = lastClosing ? lastClosing.endTime : defaultStartTime;

    console.log(`Last Closing: ${lastClosing ? lastClosing.endTime.toISOString() : 'Never'}`);
    console.log(`Starting calculations from: ${startTime.toISOString()}`);

    // 2. Find sales since last closing
    const salesSinceClosing = await prisma.sale.findMany({
      where: {
        companyId: user.companyId,
        branchId: user.branchId,
        date: { gt: startTime },
        invoiceNumber: { startsWith: 'POS-' }
      },
      orderBy: { date: 'asc' }
    });

    console.log(`Total Sales since last closing: ${salesSinceClosing.length}`);
    
    if (salesSinceClosing.length > 0) {
        console.log(`First Sale date: ${salesSinceClosing[0].date.toISOString()}`);
        console.log(`Last Sale date: ${salesSinceClosing[salesSinceClosing.length - 1].date.toISOString()}`);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0,0,0,0);
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);

        const salesYesterday = salesSinceClosing.filter(s => s.date >= yesterday && s.date < todayStart);
        const salesToday = salesSinceClosing.filter(s => s.date >= todayStart);

        console.log(`Sales from yesterday (unclosed): ${salesYesterday.length}`);
        console.log(`Sales from today: ${salesToday.length}`);
        
        // Check if there are sales from other cashiers
        const otherCashiers = [...new Set(salesSinceClosing.map(s => s.cashierId))].filter(id => id !== user.id);
        console.log(`Sales involve ${otherCashiers.length} other cashiers.`);
    }

  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkDiscrepancy();

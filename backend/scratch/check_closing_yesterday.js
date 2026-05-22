const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companyId = 17; // KNC

  const yesterdayStart = new Date('2026-05-08T00:00:00Z');
  const yesterdayEnd = new Date('2026-05-08T23:59:59Z');

  const closings = await prisma.posClosing.findMany({
    where: {
      companyId,
      endTime: {
        gte: yesterdayStart,
        lte: yesterdayEnd
      }
    },
    include: {
      cashier: { select: { name: true, email: true } },
      branch: { select: { name: true } }
    }
  });

  console.log(`Closings for Company 17 on May 8, 2026: ${closings.length}`);
  
  if (closings.length > 0) {
    closings.forEach(c => {
      console.log(`- Time: ${c.endTime.toISOString()} | Branch: ${c.branch?.name} (ID: ${c.branchId}) | Cashier: ${c.cashier?.name} (${c.cashier?.email}) | Status: ${c.status}`);
    });
  } else {
    console.log("No closing records found for yesterday (May 8).");
    
    // Also check for the most recent closing before yesterday
    const lastClosing = await prisma.posClosing.findFirst({
        where: { companyId, status: 'COMPLETED' },
        orderBy: { endTime: 'desc' },
        include: { branch: { select: { name: true } }, cashier: { select: { name: true } } }
    });
    
    if (lastClosing) {
        console.log(`\nLast successful closing was on: ${lastClosing.endTime.toISOString()}`);
        console.log(`Performed by: ${lastClosing.cashier?.name} at branch: ${lastClosing.branch?.name}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

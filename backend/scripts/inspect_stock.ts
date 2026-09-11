import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const st1 = await prisma.stockTransaction.findMany({
     where: { reference: { contains: 'PO-1787807312737-670' } }
  });
  console.log('StockTx 1:', st1);

  const st2 = await prisma.stockTransaction.findMany({
     where: { reference: { contains: 'PO-1788756571973-94' } }
  });
  console.log('StockTx 2:', st2);
}

run().finally(() => prisma.$disconnect());

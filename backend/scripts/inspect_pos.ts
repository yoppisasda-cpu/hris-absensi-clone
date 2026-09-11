import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const poNumbers = ['PO-1787807312737-670', 'PO-1788756571973-94'];
  for (const poNumber of poNumbers) {
     const po = await prisma.purchaseOrder.findUnique({
        where: { orderNumber: poNumber },
        include: { items: true }
     });
     if (po) {
         console.log('PO:', po.orderNumber, 'Status:', po.status);
         console.log('Items:', po.items);
     }
  }

  const expenses = await prisma.expense.findMany({
     where: { 
         description: { contains: 'PO-1787807312737-670' }
     }
  });
  console.log('Expenses 1:', expenses);

  const expenses2 = await prisma.expense.findMany({
     where: { 
         description: { contains: 'PO-1788756571973-94' }
     }
  });
  console.log('Expenses 2:', expenses2);
}

run().finally(() => prisma.$disconnect());

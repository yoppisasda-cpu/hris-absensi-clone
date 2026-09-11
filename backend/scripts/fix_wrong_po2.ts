import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const wrongExpenses = [956, 937, 948];
  
  // 1. Hapus Expenses yang salah
  await prisma.expense.deleteMany({
     where: { id: { in: wrongExpenses } }
  });
  console.log(`Deleted wrong expenses.`);

  // 2. Rollback Stock
  const stToRollback = await prisma.stockTransaction.findMany({
     where: {
        reference: {
           in: [
              'PO #PO-1787807312737-670 (Goods Received)',
              'PO #PO-1788756571973-94 (Goods Received)'
           ]
        }
     }
  });

  console.log(`Found ${stToRollback.length} stock transactions to rollback.`);

  for (const st of stToRollback) {
     // Kurangi stock product
     await prisma.product.update({
        where: { id: st.productId },
        data: { stock: { decrement: st.quantity } }
     });

     // Kurangi warehouse stock
     if (st.warehouseId) {
         await prisma.$executeRawUnsafe(`
             UPDATE "WarehouseStock" 
             SET "quantity" = "quantity" - $3, "updatedAt" = NOW()
             WHERE "productId" = $1 AND "warehouseId" = $2
         `, st.productId, st.warehouseId, st.quantity);
     }
  }

  // Hapus stock transactions
  if (stToRollback.length > 0) {
      await prisma.stockTransaction.deleteMany({
         where: { id: { in: stToRollback.map(s => s.id) } }
      });
  }
  console.log(`Rollbacked stock for ${stToRollback.length} items.`);

  // 3. Reset receivedQty di PO
  const pos = ['PO-1787807312737-670', 'PO-1788756571973-94'];
  const poRecords = await prisma.purchaseOrder.findMany({
      where: { orderNumber: { in: pos } },
      select: { id: true }
  });
  const poIds = poRecords.map(p => p.id);

  await prisma.purchaseOrderItem.updateMany({
     where: { purchaseOrderId: { in: poIds } },
     data: { receivedQty: 0 }
  });

  console.log('Reset receivedQty to 0 for both POs.');

  // 4. Update status PO lama menjadi COMPLETED agar tidak ada tombol lagi
  const cutoffDate = new Date('2026-09-10T00:00:00Z');
  const updatedPOs = await prisma.purchaseOrder.updateMany({
      where: {
          status: { in: ['APPROVED', 'PARTIAL'] },
          createdAt: { lt: cutoffDate }
      },
      data: { status: 'COMPLETED' }
  });
  
  console.log(`Marked ${updatedPOs.count} old POs as COMPLETED.`);
}

run().catch(e => console.error(e)).finally(() => prisma.$disconnect());

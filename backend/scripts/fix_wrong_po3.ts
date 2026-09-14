import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  // 1. Find Expenses to delete
  const expenses = await prisma.expense.findMany({
      where: {
          description: { contains: 'PO-1788756571973-94 (Penerimaan Barang)' }
      }
  });
  
  if (expenses.length > 0) {
      await prisma.expense.deleteMany({
          where: { id: { in: expenses.map(e => e.id) } }
      });
      console.log(`Deleted ${expenses.length} wrong expenses for PO-1788756571973-94.`);
  }

  // 2. Rollback Stock
  const stToRollback = await prisma.stockTransaction.findMany({
     where: {
        reference: 'PO #PO-1788756571973-94 (Goods Received)'
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
      console.log(`Rollbacked stock for ${stToRollback.length} items.`);
  }

  // 3. Reset receivedQty di PO
  const poRecords = await prisma.purchaseOrder.findMany({
      where: { orderNumber: 'PO-1788756571973-94' },
      select: { id: true }
  });
  const poIds = poRecords.map(p => p.id);

  if (poIds.length > 0) {
      await prisma.purchaseOrderItem.updateMany({
         where: { purchaseOrderId: { in: poIds } },
         data: { receivedQty: 0 }
      });
      console.log('Reset receivedQty to 0 for PO-1788756571973-94.');
  }
}

run().catch(e => console.error(e)).finally(() => prisma.$disconnect());

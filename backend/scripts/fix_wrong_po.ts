import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const wrongExpenses = [956, 937, 948];
  
  await prisma.$transaction(async (tx) => {
      // 1. Hapus Expenses yang salah
      await tx.expense.deleteMany({
         where: { id: { in: wrongExpenses } }
      });
      console.log(`Deleted ${wrongExpenses.length} wrong expenses.`);

      // 2. Rollback Stock
      // Stock transactions to rollback
      const stToRollback = await tx.stockTransaction.findMany({
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
         await tx.product.update({
            where: { id: st.productId },
            data: { stock: { decrement: st.quantity } }
         });

         // Kurangi warehouse stock
         if (st.warehouseId) {
             await tx.$executeRawUnsafe(`
                 UPDATE "WarehouseStock" 
                 SET "quantity" = "quantity" - $3, "updatedAt" = NOW()
                 WHERE "productId" = $1 AND "warehouseId" = $2
             `, st.productId, st.warehouseId, st.quantity);
         }
      }

      // Hapus stock transactions
      await tx.stockTransaction.deleteMany({
         where: { id: { in: stToRollback.map(s => s.id) } }
      });
      console.log(`Rollbacked stock for ${stToRollback.length} items.`);

      // 3. Reset receivedQty di PO
      const pos = ['PO-1787807312737-670', 'PO-1788756571973-94'];
      const poRecords = await tx.purchaseOrder.findMany({
          where: { orderNumber: { in: pos } },
          select: { id: true }
      });
      const poIds = poRecords.map(p => p.id);

      await tx.purchaseOrderItem.updateMany({
         where: { purchaseOrderId: { in: poIds } },
         data: { receivedQty: 0 }
      });

      console.log('Reset receivedQty to 0 for both POs.');

      // 4. Update status PO lama menjadi COMPLETED agar tidak ada tombol lagi
      // Misalnya semua PO APPROVED/PARTIAL sebelum tgl 11 Sep 2026.
      // Atur batas tanggal sesuai kebutuhan.
      const cutoffDate = new Date('2026-09-10T00:00:00Z');
      const updatedPOs = await tx.purchaseOrder.updateMany({
          where: {
              status: { in: ['APPROVED', 'PARTIAL'] },
              createdAt: { lt: cutoffDate }
          },
          data: { status: 'COMPLETED' }
      });
      
      console.log(`Marked ${updatedPOs.count} old POs as COMPLETED.`);
  });
}

run().catch(e => console.error(e)).finally(() => prisma.$disconnect());

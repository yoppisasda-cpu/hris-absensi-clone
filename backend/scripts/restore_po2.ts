import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  await prisma.$transaction(async (tx) => {
      // Restore PO-1788756571973-94
      
      const po = await tx.purchaseOrder.findUnique({
          where: { orderNumber: 'PO-1788756571973-94' },
          include: { items: true }
      });
      if (!po) throw new Error('PO not found');

      // Update status back to PARTIAL
      await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: 'PARTIAL' }
      });

      // Restore receivedQty
      const quantities = {
          2162: 50,
          2163: 70,
          2164: 60,
          2166: 29,
          2167: 50
      };

      for (const item of po.items) {
          if (quantities[item.productId!]) {
              await tx.purchaseOrderItem.update({
                  where: { id: item.id },
                  data: { receivedQty: quantities[item.productId!] }
              });
          }
      }

      // Re-create expenses
      await tx.expense.create({
          data: {
              id: 937, // Force same ID if possible, or just let auto increment
              companyId: 31,
              categoryId: 220,
              amount: 2131200,
              taxAmount: 0,
              paidAmount: 0,
              date: new Date('2026-09-08T00:00:00.000Z'),
              description: 'Hutang otomatis dari PO #PO-1788756571973-94 (Penerimaan Barang)',
              paidTo: 'CK Roti subuh',
              dueDate: new Date('2026-09-15T00:00:00.000Z'),
              status: 'PENDING',
              supplierId: 50
          }
      });
      await tx.expense.create({
          data: {
              id: 948,
              companyId: 31,
              categoryId: 220,
              amount: 1408000,
              taxAmount: 0,
              paidAmount: 0,
              date: new Date('2026-09-09T00:00:00.000Z'),
              description: 'Hutang otomatis dari PO #PO-1788756571973-94 (Penerimaan Barang)',
              paidTo: 'CK Roti subuh',
              dueDate: new Date('2026-09-16T00:00:00.000Z'),
              status: 'PENDING',
              supplierId: 50
          }
      });

      // Restore Product Stock (add back)
      const stockToAdd = [
         { productId: 2162, qty: 30 + 20 },
         { productId: 2163, qty: 50 + 20 },
         { productId: 2164, qty: 50 + 10 },
         { productId: 2166, qty: 9 + 20 },
         { productId: 2167, qty: 20 + 30 }
      ];

      for (const s of stockToAdd) {
          await tx.product.update({
              where: { id: s.productId },
              data: { stock: { increment: s.qty } }
          });
          // Update warehouse 22
          await tx.$executeRawUnsafe(`
                 UPDATE "WarehouseStock" 
                 SET "quantity" = "quantity" + $3, "updatedAt" = NOW()
                 WHERE "productId" = $1 AND "warehouseId" = $2
          `, s.productId, 22, s.qty);
      }

      console.log('Restored PO-1788756571973-94 correctly!');
  });
}

run().catch(e => console.error(e)).finally(() => prisma.$disconnect());

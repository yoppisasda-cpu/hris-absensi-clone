import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixKentangStock() {
  try {
    // Cari produk kentang
    const product = await prisma.product.findFirst({
      where: { name: { contains: 'kentang', mode: 'insensitive' } }
    });

    if (!product) {
        console.log("Produk 'kentang' tidak ditemukan.");
        return;
    }

    console.log(`Product: ${product.name} (ID: ${product.id}), Current Stock: ${product.stock}`);

    // Cari PO item untuk kentang yang sudah APPROVED
    const poItems = await prisma.purchaseOrderItem.findMany({
        where: { productId: product.id },
        include: { purchaseOrder: true }
    });

    let totalMasuk = 0;
    
    console.log("\nPurchase Order (Approved):");
    poItems.forEach(item => {
        if (item.purchaseOrder.status === 'APPROVED') {
            console.log(`- PO: ${item.purchaseOrder.orderNumber}, Qty: ${item.quantity}`);
            totalMasuk += item.quantity;
        }
    });

    console.log(`Total seharusnya masuk dari PO: ${totalMasuk}`);

    if (totalMasuk > 0) {
        // Karena saat ini -2 dan belum dikurangi total masuk, kita set ke -2 + 10 = 8
        const targetStock = product.stock + totalMasuk;
        console.log(`Memperbaiki stok menjadi: ${targetStock}`);

        await prisma.$transaction(async (tx) => {
            // Update stok
            await tx.product.update({
                where: { id: product.id },
                data: { stock: targetStock }
            });

            // Catat history
            await tx.stockTransaction.create({
                data: {
                    productId: product.id,
                    type: 'IN',
                    quantity: totalMasuk,
                    reference: 'Sync perbaikan PO masa lalu',
                }
            });
        });
        
        console.log("Stok berhasil diperbaiki!");
    } else {
        console.log("Tidak ada PO approved yang perlu disinkronisasi.");
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

fixKentangStock();

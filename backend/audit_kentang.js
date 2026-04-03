const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkKentang() {
  try {
    const product = await prisma.product.findFirst({
      where: { name: { contains: 'kentang', mode: 'insensitive' } },
      include: {
        StockTransaction: {
            orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!product) {
      console.log("Produk 'kentang' tidak ditemukan.");
      return;
    }

    console.log(`Product: ${product.name} (ID: ${product.id})`);
    console.log(`Current Stock Field: ${product.stock}`);
    console.log("\nTransactions:");
    product.StockTransaction.forEach(t \=\> {
      console.log(`- Type: ${t.type} | Qty: ${t.quantity} | Ref: ${t.reference} | Date: ${t.date || t.createdAt}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkKentang();

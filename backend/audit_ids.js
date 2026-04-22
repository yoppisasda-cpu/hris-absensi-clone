const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkIds() {
  try {
    console.log("Checking DB Content...");
    const products = await prisma.product.findMany({
      take: 10,
      select: { id: true, name: true, companyId: true, sku: true }
    });
    console.log("Products Sample:", products);

    const companies = await prisma.company.findMany({
      take: 5,
      select: { id: true, name: true }
    });
    console.log("Companies:", companies);

    const transactions = await prisma.stockTransaction.findMany({
      take: 5,
      include: { Product: { select: { companyId: true } } }
    });
    console.log("Transactions Sample:", transactions);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
checkIds();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const products = await prisma.product.findMany({});
    console.log("All Products:", products.length);
    console.log(JSON.stringify(products, null, 2));

    const warehouses = await prisma.warehouse.findMany({});
    console.log("\nAll Warehouses:", warehouses.length);
    console.log(JSON.stringify(warehouses, null, 2));

    const wStocks = await prisma.warehouseStock.findMany({});
    console.log("\nAll Stock:", wStocks.length);
    console.log(JSON.stringify(wStocks, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();

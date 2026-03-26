
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const warehouses = await prisma.warehouse.findMany();
    console.log('Warehouses:', JSON.stringify(warehouses, null, 2));
    
    const products = await prisma.product.findMany({ take: 5 });
    console.log('Sample Products:', JSON.stringify(products, null, 2));

  } catch (err) {
    console.error('Error checking DB:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

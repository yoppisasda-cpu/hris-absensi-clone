
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Product'
    `;
    console.log('Product Columns:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Error checking columns:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

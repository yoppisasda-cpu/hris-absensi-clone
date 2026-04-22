const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCol() {
  try {
    const res = await prisma.$queryRawUnsafe(`SELECT "supplierId" FROM "StockTransaction" LIMIT 1`);
    console.log("Success! The column exists:", res);
  } catch (error) {
    console.error("FAIL: The column STILL DOES NOT EXIST in the remote database!");
    console.error(error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCol();

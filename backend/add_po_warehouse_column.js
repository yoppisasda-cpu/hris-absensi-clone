const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Adding warehouseId column to PurchaseOrder table...");
  try {
    // In PostgreSQL, IF NOT EXISTS is only for tables, not columns in ALTER TABLE (usually)
    // But we can check if it exists first.
    await prisma.$executeRawUnsafe(`
      DO \$\$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='PurchaseOrder' AND column_name='warehouseId') THEN
          ALTER TABLE "PurchaseOrder" ADD COLUMN "warehouseId" INTEGER;
        END IF;
      END \$\$;
    `);
    console.log("Successfully ensured warehouseId column exists in PurchaseOrder.");
  } catch (error) {
    console.error("Error modifying table:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

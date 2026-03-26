import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Multi-Warehouse Migration (Raw SQL)...');

  try {
    // 1. Create Warehouse table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Warehouse" (
        "id" SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "name" TEXT NOT NULL,
        "location" TEXT,
        "isMain" BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Warehouse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE
      )
    `);
    console.log('✅ Warehouse table created.');

    // 2. Create WarehouseStock table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WarehouseStock" (
        "id" SERIAL PRIMARY KEY,
        "productId" INTEGER NOT NULL,
        "warehouseId" INTEGER NOT NULL,
        "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "WarehouseStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
        CONSTRAINT "WarehouseStock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE,
        UNIQUE ("productId", "warehouseId")
      )
    `);
    console.log('✅ WarehouseStock table created.');

    // 3. Update StockTransaction to include warehouseId
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "warehouseId" INTEGER;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_warehouseId_fkey" 
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL;
    `);
    console.log('✅ StockTransaction updated with warehouseId.');

    console.log('✨ Multi-Warehouse Migration Completed Successfully!');
  } catch (error) {
    console.error('❌ Migration Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

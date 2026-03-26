import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Inventory Schema Migration (Raw SQL)...');

  try {
    // 1. Add 'INVENTORY' to AppModule enum
    // In Postgres, adding a value to an enum is done with ALTER TYPE
    await prisma.$executeRawUnsafe(`ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'INVENTORY'`);
    console.log('✅ AppModule enum updated.');

    // 2. Create Product table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Product" (
        "id" SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "name" TEXT NOT NULL,
        "sku" TEXT UNIQUE,
        "description" TEXT,
        "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "categoryId" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE
      )
    `);
    console.log('✅ Product table created.');

    // 3. Create StockTransaction table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StockTransaction" (
        "id" SERIAL PRIMARY KEY,
        "productId" INTEGER NOT NULL,
        "type" TEXT NOT NULL, -- 'IN', 'OUT', 'ADJUST'
        "quantity" DOUBLE PRECISION NOT NULL,
        "reference" TEXT,
        "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "StockTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
      )
    `);
    console.log('✅ StockTransaction table created.');

    console.log('✨ Inventory Migration Completed Successfully!');
  } catch (error) {
    console.error('❌ Migration Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

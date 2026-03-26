import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Adding "unit" column to Product table...');

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Product" 
      ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT 'Pcs'
    `);
    console.log('✅ Column "unit" added successfully.');
  } catch (error) {
    console.error('❌ Migration Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

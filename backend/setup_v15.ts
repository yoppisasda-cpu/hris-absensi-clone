import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Phase 15 DB Setup...');

  try {
    // 1. Add supplierId to Expense table
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "supplierId" INTEGER
    `);
    console.log('✅ supplierId added to Expense table.');

    // 2. Add foreign key if possible (optional but good)
    try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Expense" 
          ADD CONSTRAINT "Expense_supplierId_fkey" 
          FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL
        `);
        console.log('✅ Foreign key constraint added to Expense.');
    } catch(e) {
        console.log('⚠️ Foreign key might already exist or Supplier table is raw. Skipping constraint.');
    }

    console.log('✨ DB Setup Completed Successfully!');
  } catch (error) {
    console.error('❌ DB Setup Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

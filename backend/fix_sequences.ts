import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fix() {
  try {
    console.log("Resetting database sequences...");
    
    // Reset ExpenseCategory sequence
    await prisma.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('"ExpenseCategory"', 'id'), coalesce(max(id), 0) + 1, false) FROM "ExpenseCategory";
    `);
    console.log("ExpenseCategory sequence reset.");

    // Reset Expense sequence
    await prisma.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('"Expense"', 'id'), coalesce(max(id), 0) + 1, false) FROM "Expense";
    `);
    console.log("Expense sequence reset.");

    // Reset FinancialAccount sequence
    await prisma.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('"FinancialAccount"', 'id'), coalesce(max(id), 0) + 1, false) FROM "FinancialAccount";
    `);
    console.log("FinancialAccount sequence reset.");

    console.log("All relevant sequences have been synchronized with MAX(id).");

  } catch (err) {
    console.error("Error resetting sequences:", err);
  } finally {
    await prisma.$disconnect();
  }
}

fix();

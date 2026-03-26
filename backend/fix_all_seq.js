
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = [
    'FinancialAccount',
    'IncomeCategory',
    'ExpenseCategory',
    'Income',
    'Expense',
    'Sale',
    'PeriodClosing',
    'Product',
    'Supplier',
    'Warehouse',
    'StockTransaction',
    'ProductRecipe',
    'SaleItem',
    'SaleReturn',
    'SaleReturnItem',
    'Company'
  ];

  for (const table of tables) {
    try {
      console.log(`Resetting sequence for ${table}...`);
      await prisma.$executeRawUnsafe(`
        SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id), 0) + 1, false) FROM "${table}";
      `);
      console.log(`✅ ${table} sequence reset successful.`);
    } catch (err) {
      console.log(`⚠️ Note: ${table} sequence reset skipped or failed: ${err.message}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

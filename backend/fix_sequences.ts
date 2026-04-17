import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tables = [
    'ExpenseCategory',
    'FinancialAccount',
    'Expense',
    'Reimbursement',
    'User',
    'Company',
    'Branch'
  ];

  console.log('Fixing sequences...');

  for (const table of tables) {
    try {
      // Get the max ID
      const result: any[] = await prisma.$queryRawUnsafe(`SELECT MAX(id) as max_id FROM "${table}"`);
      const maxId = result[0].max_id || 0;
      
      console.log(`Table ${table}: Max ID is ${maxId}. Resetting sequence...`);
      
      // Reset the sequence
      // Note: pg_get_serial_sequence expects table name as 'public."TableName"' or just '"TableName"'
      await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), ${maxId})`);
      
      console.log(`Table ${table}: Success.`);
    } catch (err: any) {
      console.error(`Table ${table}: Error - ${err.message}`);
    }
  }

  await prisma.$disconnect();
}

main();

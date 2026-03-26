
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 1;
  const name = 'Verify Category ' + Date.now();
  
  try {
    console.log('Testing Expense Category Creation...');
    const result = await prisma.$queryRawUnsafe(
      `INSERT INTO "ExpenseCategory" ("companyId", "name", "type", "updatedAt") 
       VALUES ($1, $2, $3::"ExpenseType", NOW()) 
       RETURNING "id", "name"`,
      tenantId, name, 'OPERATIONAL'
    );
    console.log('SUCCESS Created:', result[0]);
  } catch (err) {
    console.error('FAILED:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

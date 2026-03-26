import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debug() {
  const tenantId = 1; // Adjust if needed
  console.log('--- Debugging Dashboard Stats Queries ---');
  
  try {
    console.log('1. Checking Expense Table...');
    const expenseCount = await prisma.expense.count();
    console.log('Total Expenses:', expenseCount);

    console.log('2. Querying Total Payable (Hutang)...');
    const payableRes: any[] = await prisma.$queryRaw`
      SELECT SUM(amount) as value FROM "Expense" WHERE "companyId" = ${tenantId} AND "status"::text = 'PENDING'
    `;
    console.log('Payable Result:', payableRes);

    console.log('3. Checking Sale Table...');
    // We use $queryRaw because Sale might not be in the generated client if not re-generated
    const saleCount: any[] = await prisma.$queryRaw`SELECT COUNT(*) FROM "Sale"`;
    console.log('Total Sales:', saleCount);

    console.log('4. Querying Total Receivable (Piutang)...');
    const receivableRes: any[] = await prisma.$queryRaw`
      SELECT SUM("totalAmount") as value FROM "Sale" WHERE "companyId" = ${tenantId} AND "status" = 'UNPAID'
    `;
    console.log('Receivable Result:', receivableRes);

  } catch (err: any) {
    console.error('ERROR during debug:');
    console.error(err.message);
    if (err.code) console.error('Code:', err.code);
    if (err.meta) console.error('Meta:', err.meta);
  } finally {
    await prisma.$disconnect();
  }
}

debug();

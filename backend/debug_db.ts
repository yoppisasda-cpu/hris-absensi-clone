import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('--- Expenses ---');
    const expenses: any[] = await prisma.$queryRawUnsafe('SELECT id, "supplierId", "companyId", amount, status FROM "Expense" WHERE status = \'PENDING\'');
    console.log(expenses);

    console.log('--- Suppliers ---');
    const suppliers: any[] = await prisma.$queryRawUnsafe('SELECT id, name, "companyId" FROM "Supplier"');
    console.log(suppliers);
    
    console.log('--- Sales ---');
    const sales: any[] = await prisma.$queryRawUnsafe('SELECT id, "customerId", "companyId", "totalAmount", status FROM "Sale" WHERE status = \'UNPAID\'');
    console.log(sales);

    console.log('--- Customers ---');
    const customers: any[] = await prisma.$queryRawUnsafe('SELECT id, name, "companyId" FROM "Customer"');
    console.log(customers);

  } catch (error: any) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

check();

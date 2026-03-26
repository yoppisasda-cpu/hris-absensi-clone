import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error('No company found. Please run setup first.');
    return;
  }
  const tenantId = company.id;

  console.log(`🚀 Generating Sample Data for Company: ${company.name} (ID: ${tenantId})...`);

  // 1. Ensure Financial Account
  let account = await prisma.financialAccount.findFirst({ where: { companyId: tenantId } });
  if (!account) {
    try {
        account = await prisma.financialAccount.create({
          data: {
            companyId: tenantId,
            name: 'Kas Utama',
            type: 'CASH',
            balance: 10000000
          }
        });
    } catch(e) {
        account = await prisma.financialAccount.findFirst({ where: { companyId: tenantId } });
    }
  }

  // 2. Create Products
  const products = [
    { name: 'Kopi Arabika 250g', price: 85000, costPrice: 50000, stock: 50, minStock: 10, sku: 'KOP-ARA-250' },
    { name: 'Kopi Robusta 250g', price: 45000, costPrice: 20000, stock: 8, minStock: 10, sku: 'KOP-ROB-250' },
    { name: 'Gula Aren 1kg', price: 35000, costPrice: 15000, stock: 2, minStock: 5, sku: 'GUL-ARE-1KG' },
    { name: 'Susu UHT 1L', price: 22000, costPrice: 15000, stock: 20, minStock: 5, sku: 'SUS-UHT-1L' },
    { name: 'Paper Cup 8oz', price: 500, costPrice: 200, stock: 500, minStock: 100, sku: 'CUP-8OZ' },
  ];

  for (const p of products) {
    try {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "Product" ("companyId", "name", "price", "costPrice", "stock", "minStock", "sku", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT ("sku") DO UPDATE SET stock = EXCLUDED.stock
        `, tenantId, p.name, p.price, p.costPrice, p.stock, p.minStock, p.sku);
    } catch(e) {}
  }
  console.log('✅ Products processed.');

  // 3. Ensure Categories
  let incCat: any;
  try {
      incCat = await prisma.incomeCategory.findFirst({ where: { companyId: tenantId, name: 'Penjualan Retail' } });
      if (!incCat) {
          incCat = await prisma.incomeCategory.create({ data: { companyId: tenantId, name: 'Penjualan Retail' } });
      }
  } catch(e) {
      incCat = await prisma.incomeCategory.findFirst({ where: { companyId: tenantId, name: 'Penjualan Retail' } });
  }
  
  let expCat: any;
  try {
      expCat = await prisma.expenseCategory.findFirst({ where: { companyId: tenantId, name: 'Operasional' } });
      if (!expCat) {
          expCat = await prisma.expenseCategory.create({ data: { companyId: tenantId, name: 'Operasional', type: 'OPERATIONAL' } });
      }
  } catch(e) {
      expCat = await prisma.expenseCategory.findFirst({ where: { companyId: tenantId, name: 'Operasional' } });
  }

  // 4. Create Transactions for last 7 days
  if (account && incCat && expCat) {
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        try {
            // Revenue (Income)
            const dailyRevenue = 150000 + (Math.random() * 300000);
            await prisma.income.create({
              data: {
                companyId: tenantId,
                accountId: account.id,
                categoryId: incCat.id,
                amount: dailyRevenue,
                date: date,
                description: `Penjualan Harian - ${date.toLocaleDateString()}`
              }
            });

            // Expenditure (Expense)
            const dailyExpense = 50000 + (Math.random() * 150000);
            await prisma.expense.create({
              data: {
                companyId: tenantId,
                accountId: account.id,
                categoryId: expCat.id,
                amount: dailyExpense,
                date: date,
                description: `Biaya Operasional - ${date.toLocaleDateString()}`
              }
            });
        } catch(e) {}
      }
      console.log('✅ 30-day History generated.');
  }

  console.log('✨ Success! Check your dashboard now.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

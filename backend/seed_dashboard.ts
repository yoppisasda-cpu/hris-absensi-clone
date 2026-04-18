import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Executive Dashboard Seeding...');

  // 1. Get the first company
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error('❌ No company found. Run basic setup first.');
    return;
  }
  const tenantId = company.id;
  console.log(`🏢 Targeting Company: ${company.name} (ID: ${tenantId})`);

  // 2. Ensure Financial Account
  let account = await prisma.financialAccount.findFirst({ where: { companyId: tenantId } });
  if (!account) {
    account = await prisma.financialAccount.create({
      data: {
        companyId: tenantId,
        name: 'Executive Operating Fund',
        type: 'CASH',
        balance: 250000000 // 250M
      }
    });
    console.log('💰 Created Financial Account.');
  }

  // 3. Categories
  const incCat = await prisma.incomeCategory.upsert({
    where: { companyId_name: { companyId: tenantId, name: 'Revenue - Intelligence Seed' } },
    update: {},
    create: { companyId: tenantId, name: 'Revenue - Intelligence Seed' }
  });

  const expCat = await prisma.expenseCategory.upsert({
    where: { companyId_name: { companyId: tenantId, name: 'Ops - Intelligence Seed' } },
    update: {},
    create: { companyId: tenantId, name: 'Ops - Intelligence Seed', type: 'OPERATIONAL' }
  });

  // 4. Generate 30 days of randomized data
  console.log('📅 Generating 30-day financial history...');
  
  const now = new Date();
  const historyCount = 30;

  for (let i = 0; i < historyCount; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(12, 0, 0, 0);

    // Random Revenue (5M - 15M)
    const revAmount = 5000000 + Math.random() * 10000000;
    // Random Expense (3M - 8M)
    const expAmount = 3000000 + Math.random() * 5000000;

    // Create Income
    await prisma.income.create({
      data: {
        companyId: tenantId,
        accountId: account.id,
        categoryId: incCat.id,
        amount: revAmount,
        date: date,
        description: `Daily Revenue Segment - Day -${i}`
      }
    });

    // Create Expense
    await prisma.expense.create({
      data: {
        companyId: tenantId,
        accountId: account.id,
        categoryId: expCat.id,
        amount: expAmount,
        date: date,
        description: `Operational Buffer - Day -${i}`,
        status: 'PAID'
      }
    });
  }

  // 5. Create some dummy Sales for POS parity
  console.log('🛒 Generating sample POS Sales...');
  for (let i = 0; i < 5; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    await prisma.sale.create({
      data: {
        companyId: tenantId,
        invoiceNumber: `INV-SEED-${Math.random().toString(36).substring(7).toUpperCase()}`,
        date: date,
        totalAmount: 2500000 + Math.random() * 2000000,
        status: 'PAID'
      }
    });
  }

  console.log('✅ Seeding Complete. Dashboard should now be alive!');
}

main()
  .catch(e => {
    console.error('❌ Seeding Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

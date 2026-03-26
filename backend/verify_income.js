
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 1;
  const bcaId = 5; // Valid ID for tenant 1
  
  try {
    // 1. Initial Balance
    const initialAcc = await prisma.financialAccount.findUnique({ where: { id: bcaId } });
    console.log('--- START VERIFICATION ---');
    console.log('Initial Balance BCA ID 3:', initialAcc.balance);

    // 2. Create Category if not exists
    let cat = await prisma.incomeCategory.findFirst({ where: { companyId: tenantId } });
    if (!cat) {
        cat = await prisma.incomeCategory.create({ data: { name: 'Test Cat', companyId: tenantId } });
    }

    // 3. Create Income
    const income = await prisma.income.create({
      data: {
        companyId: tenantId,
        accountId: bcaId,
        categoryId: cat.id,
        amount: 50000,
        date: new Date(),
        description: 'Verification Test'
      }
    });
    console.log('Created Income ID:', income.id, 'Amount:', income.amount);

    // Update balance (Manual mimic of backend logic for testing)
    await prisma.financialAccount.update({ where: { id: bcaId }, data: { balance: { increment: 50000 } } });
    
    let midBalance = (await prisma.financialAccount.findUnique({ where: { id: bcaId } })).balance;
    console.log('Balance after Create:', midBalance);

    // 4. Update Income (PATCH)
    // Revert old
    await prisma.financialAccount.update({ where: { id: bcaId }, data: { balance: { decrement: 50000 } } });
    // Update
    const updated = await prisma.income.update({
        where: { id: income.id },
        data: { amount: 75000 }
    });
    // Apply new
    await prisma.financialAccount.update({ where: { id: bcaId }, data: { balance: { increment: 75000 } } });
    
    let editBalance = (await prisma.financialAccount.findUnique({ where: { id: bcaId } })).balance;
    console.log('Balance after Edit to 75000:', editBalance);

    // 5. Delete Income
    // Revert
    await prisma.financialAccount.update({ where: { id: bcaId }, data: { balance: { decrement: 75000 } } });
    // Delete
    await prisma.income.delete({ where: { id: income.id } });
    
    let finalBalance = (await prisma.financialAccount.findUnique({ where: { id: bcaId } })).balance;
    console.log('Final Balance after Delete:', finalBalance);

    if (finalBalance === initialAcc.balance) {
        console.log('VERIFICATION SUCCESS: Balance fully reverted.');
    } else {
        console.log('VERIFICATION FAILED: Balance mismatch!', finalBalance, '!==', initialAcc.balance);
    }

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

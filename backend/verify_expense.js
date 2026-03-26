
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 1;
  const accId = 1; // Kas Utama (from previous findMany)
  
  try {
    // 1. Initial Balance
    const initialAcc = await prisma.financialAccount.findUnique({ where: { id: accId } });
    console.log('--- START EXPENSE VERIFICATION ---');
    console.log('Initial Balance Account ID 1:', initialAcc.balance);

    // 2. Get/Create Category
    let cat = await prisma.expenseCategory.findFirst({ where: { companyId: tenantId, type: 'OPERATIONAL' } });
    if (!cat) {
        cat = await prisma.expenseCategory.create({ data: { name: 'Test Op Cat', companyId: tenantId, type: 'OPERATIONAL' } });
    }

    // 3. Create Expense
    const expense = await prisma.expense.create({
      data: {
        companyId: tenantId,
        accountId: accId,
        categoryId: cat.id,
        amount: 100000,
        date: new Date(),
        status: 'PAID',
        description: 'Expense verification test'
      }
    });
    console.log('Created Expense ID:', expense.id, 'Amount:', expense.amount);

    // Update balance (Manual mimic)
    await prisma.financialAccount.update({ where: { id: accId }, data: { balance: { decrement: 100000 } } });
    
    let midBalance = (await prisma.financialAccount.findUnique({ where: { id: accId } })).balance;
    console.log('Balance after Create:', midBalance);

    // 4. Update Expense (Amount change)
    // Revert old
    await prisma.financialAccount.update({ where: { id: accId }, data: { balance: { increment: 100000 } } });
    // Update
    await prisma.expense.update({
        where: { id: expense.id },
        data: { amount: 150000 }
    });
    // Apply new
    await prisma.financialAccount.update({ where: { id: accId }, data: { balance: { decrement: 150000 } } });
    
    let editBalance = (await prisma.financialAccount.findUnique({ where: { id: accId } })).balance;
    console.log('Balance after Edit to 150000:', editBalance);

    // 5. Delete Expense
    // Revert
    await prisma.financialAccount.update({ where: { id: accId }, data: { balance: { increment: 150000 } } });
    // Delete
    await prisma.expense.delete({ where: { id: expense.id } });
    
    let finalBalance = (await prisma.financialAccount.findUnique({ where: { id: accId } })).balance;
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

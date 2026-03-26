
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const idToDelete = 3; // The Debug Account ID from previous success
    const tenantId = 1;
    
    // Check if exists
    const acc = await prisma.financialAccount.findFirst({ where: { id: idToDelete, companyId: tenantId } });
    if (!acc) {
      console.log('Account not found:', idToDelete);
      return;
    }
    
    console.log('Found account:', acc.name);
    
    // Check transactions
    const incomeCount = await prisma.income.count({ where: { accountId: idToDelete } });
    const expenseCount = await prisma.expense.count({ where: { accountId: idToDelete } });
    const salesCount = await prisma.sale.count({ where: { accountId: idToDelete } });
    
    console.log('Transactions - Income:', incomeCount, 'Expense:', expenseCount, 'Sales:', salesCount);
    
    if (incomeCount > 0 || expenseCount > 0 || salesCount > 0) {
       console.log('CANNOT DELETE: Has transactions');
    } else {
       await prisma.financialAccount.delete({ where: { id: idToDelete } });
       console.log('SUCCESSFULLY DELETED ID:', idToDelete);
    }
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

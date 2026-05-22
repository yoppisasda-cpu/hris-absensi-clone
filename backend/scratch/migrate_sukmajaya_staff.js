const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const targetCompanyId = 21; // PT. KNC Sukmajaya
  const targetBranchId = 22; // Donat Enter Sukmajaya Depok

  console.log(`Starting migration of Sukmajaya staff to Company ${targetCompanyId}...`);

  // 1. Find all users currently assigned to Sukmajaya branch
  const usersToMove = await prisma.user.findMany({
    where: { branchId: targetBranchId, companyId: { not: targetCompanyId } }
  });

  const userIds = usersToMove.map(u => u.id);
  console.log(`Found ${usersToMove.length} users to move: ${usersToMove.map(u => u.email).join(', ')}`);

  if (userIds.length === 0) {
    console.log("No users need moving. Finishing.");
    return;
  }

  // 2. Update User records
  const updatedUsers = await prisma.user.updateMany({
    where: { id: { in: userIds } },
    data: { companyId: targetCompanyId }
  });
  console.log(`Updated ${updatedUsers.count} User records.`);

  // 3. Update all related data models
  const modelsToUpdate = [
    'attendance', 'sale', 'income', 'expense', 'inventoryMovement', 
    'payroll', 'loan', 'reimbursement', 'bonus', 'asset', 
    'userShift', 'userAssignment'
  ];

  for (const model of modelsToUpdate) {
    try {
      const result = await prisma[model].updateMany({
        where: { userId: { in: userIds } },
        data: { companyId: targetCompanyId }
      });
      console.log(`Updated ${result.count} records in ${model}.`);
    } catch (e) {
      // Some models might use different field names or not exist
      if (model === 'sale' || model === 'income' || model === 'expense') {
          // Sale might not have userId directly if it's cashierId
          const field = (model === 'sale' ? 'cashierId' : 'userId');
          const res = await prisma[model].updateMany({
              where: { [field]: { in: userIds } },
              data: { companyId: targetCompanyId }
          });
          console.log(`Updated ${res.count} records in ${model} (via ${field}).`);
      } else {
          console.log(`Skipped or failed updating ${model}: ${e.message}`);
      }
    }
  }

  // 4. Specifically check for Sales/Incomes/Expenses tied to the Branch itself (regardless of user)
  const branchDataUpdate = ['sale', 'income', 'expense', 'asset', 'inventoryMovement'];
  for (const model of branchDataUpdate) {
      const result = await prisma[model].updateMany({
          where: { branchId: targetBranchId, companyId: { not: targetCompanyId } },
          data: { companyId: targetCompanyId }
      });
      console.log(`Updated ${result.count} branch-specific records in ${model}.`);
  }

  console.log("Migration Completed Successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());

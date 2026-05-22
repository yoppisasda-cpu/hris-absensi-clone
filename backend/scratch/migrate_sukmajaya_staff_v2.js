const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const targetCompanyId = 21; // PT. KNC Sukmajaya
  const targetBranchId = 22; // Donat Enter Sukmajaya Depok

  console.log(`Starting migration of Sukmajaya staff to Company ${targetCompanyId}...`);

  const usersToMove = await prisma.user.findMany({
    where: { branchId: targetBranchId, companyId: { not: targetCompanyId } }
  });

  const userIds = usersToMove.map(u => u.id);
  console.log(`Found ${usersToMove.length} users to move.`);

  if (userIds.length > 0) {
    await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { companyId: targetCompanyId } });
    console.log("Updated User records.");

    // Update models with 'userId'
    const userModels = ['attendance', 'payroll', 'loan', 'reimbursement', 'bonus', 'userShift', 'userAssignment'];
    for (const m of userModels) {
        try {
            const res = await prisma[m].updateMany({ where: { userId: { in: userIds } }, data: { companyId: targetCompanyId } });
            console.log(`Updated ${res.count} records in ${m}`);
        } catch (e) { console.log(`Skipped ${m}`); }
    }

    // Update Sales (cashierId)
    const sales = await prisma.sale.updateMany({ where: { cashierId: { in: userIds } }, data: { companyId: targetCompanyId } });
    console.log(`Updated ${sales.count} sales records.`);
  }

  // Update models by branchId
  const branchModels = ['sale', 'income', 'expense', 'asset', 'inventoryMovement'];
  for (const m of branchModels) {
    try {
        const res = await prisma[m].updateMany({ where: { branchId: targetBranchId }, data: { companyId: targetCompanyId } });
        console.log(`Updated ${res.count} records in ${m} via branchId`);
    } catch (e) { console.log(`Skipped ${m} (branchId)`); }
  }

  console.log("Migration Completed Successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company17 = 17; // PT. KNC PIM3
  const company21 = 21; // PT. KNC Sukmajaya
  const branchPIM3 = 35;
  const branchSukmajaya = 22;

  console.log("Starting Data Fix...");

  // 1. Move Branch 22 to Company 21
  const updatedBranch = await prisma.branch.update({
    where: { id: branchSukmajaya },
    data: { companyId: company21 }
  });
  console.log(`Moved Branch ${branchSukmajaya} (${updatedBranch.name}) to Company ${company21}`);

  // 2. Fix Users for Company 17
  const users17 = await prisma.user.updateMany({
    where: { companyId: company17, branchId: null },
    data: { branchId: branchPIM3 }
  });
  console.log(`Updated ${users17.count} users in Company 17 to Branch ${branchPIM3}`);

  // 3. Fix Users for Company 21
  const users21 = await prisma.user.updateMany({
    where: { companyId: company21, branchId: null },
    data: { branchId: branchSukmajaya }
  });
  console.log(`Updated ${users21.count} users in Company 21 to Branch ${branchSukmajaya}`);

  // 4. Update Sales with NULL branch
  const sales17 = await prisma.sale.updateMany({
    where: { companyId: company17, branchId: null },
    data: { branchId: branchPIM3 }
  });
  console.log(`Updated ${sales17.count} sales in Company 17 to Branch ${branchPIM3}`);

  const sales21 = await prisma.sale.updateMany({
    where: { companyId: company21, branchId: null },
    data: { branchId: branchSukmajaya }
  });
  console.log(`Updated ${sales21.count} sales in Company 21 to Branch ${branchSukmajaya}`);

  // 5. Update Incomes/Expenses/Attendance
  await prisma.income.updateMany({ where: { companyId: company17, branchId: null }, data: { branchId: branchPIM3 } });
  await prisma.income.updateMany({ where: { companyId: company21, branchId: null }, data: { branchId: branchSukmajaya } });
  await prisma.expense.updateMany({ where: { companyId: company17, branchId: null }, data: { branchId: branchPIM3 } });
  await prisma.expense.updateMany({ where: { companyId: company21, branchId: null }, data: { branchId: branchSukmajaya } });

  console.log("Data Fix Completed Successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());

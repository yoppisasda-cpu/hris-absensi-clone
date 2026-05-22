const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const b22 = await prisma.branch.findUnique({ where: { id: 22 } });
  console.log("Branch 22:", b22 ? { id: b22.id, name: b22.name, companyId: b22.companyId } : "Not found");

  const u21 = await prisma.user.findMany({ where: { companyId: 21 } });
  console.log("Users Company 21:", u21.map(x => ({ email: x.email, branch: x.branchId })));

  const u17 = await prisma.user.findMany({ where: { companyId: 17 } });
  console.log("Users Company 17 (subset):", u17.slice(0, 5).map(x => ({ email: x.email, branch: x.branchId })));
  
  const nullSales = await prisma.sale.count({ where: { branchId: null, companyId: { in: [17, 21] } } });
  console.log("Sales with NULL branch for KNC:", nullSales);
}

main().catch(console.error).finally(() => prisma.$disconnect());

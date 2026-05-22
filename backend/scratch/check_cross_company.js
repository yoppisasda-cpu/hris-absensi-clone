const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { branchId: { not: null } },
    include: { branch: true }
  });

  const inconsistent = users.filter(u => u.companyId !== u.branch.companyId);

  console.log(`Inconsistent User-Branch assignments: ${inconsistent.length}`);
  inconsistent.forEach(u => {
    console.log(`- User: ${u.email} (Comp: ${u.companyId}) | Branch: ${u.branch.name} (Comp: ${u.branch.companyId})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

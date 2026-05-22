const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({ where: { name: 'PT. KNC PIM3' } });
  if (!company) {
    console.log('Company not found');
    return;
  }
  const users = await prisma.user.findMany({ where: { companyId: company.id } });
  console.log(`Users in PT. KNC PIM3 (ID: ${company.id}):`);
  users.forEach(u => console.log(`- ${u.name} (${u.email}) | Role: ${u.role} | Branch: ${u.branchId}`));
  
  // Check branches
  const branches = await prisma.branch.findMany({ where: { companyId: company.id } });
  console.log(`\nBranches:`);
  branches.forEach(b => console.log(`- ${b.name} (ID: ${b.id})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());

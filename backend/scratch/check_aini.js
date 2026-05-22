const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'aini' } },
    include: { company: true, branch: true }
  });

  console.log("Found Aini accounts:");
  users.forEach(u => {
    console.log(`- ${u.email} | Company: ${u.company?.name} (ID: ${u.companyId}) | Branch: ${u.branch?.name} (ID: ${u.branchId})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

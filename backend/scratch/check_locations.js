const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({ 
    select: { id: true, name: true, latitude: true, longitude: true } 
  });
  console.log("Companies:", companies);

  const branches = await prisma.branch.findMany({
    select: { id: true, name: true, companyId: true, latitude: true, longitude: true }
  });
  console.log("\nBranches:", branches);
}

main().catch(console.error).finally(() => prisma.$disconnect());

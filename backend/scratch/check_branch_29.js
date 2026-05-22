const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.findUnique({ 
    where: { id: 29 }, 
    include: { company: true } 
  });
  console.log(branch);
}

main().catch(console.error).finally(() => prisma.$disconnect());


const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true }
  });
  console.log(JSON.stringify(companies, null, 2));
}

main().finally(() => prisma.$disconnect());

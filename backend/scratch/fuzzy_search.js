
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const nameToSearch = 'BASAMO';
  const companies = await prisma.company.findMany({
    where: { name: { contains: nameToSearch, mode: 'insensitive' } }
  });
  console.log('Results for ' + nameToSearch + ':', JSON.stringify(companies, null, 2));

  const all = await prisma.company.findMany({ select: { id: true, name: true } });
  console.log('All companies:', JSON.stringify(all, null, 2));
}

main().finally(() => prisma.$disconnect());

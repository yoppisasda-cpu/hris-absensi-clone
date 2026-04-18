
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: { name: { contains: 'DAPUR BASAMO SAMO', mode: 'insensitive' } }
  });
  if (company) {
    console.log('API_KEY=' + company.integrationApiKey);
    console.log('COMPANY_ID=' + company.id);
  } else {
    console.log('Company not found');
  }
}

main().finally(() => prisma.$disconnect());

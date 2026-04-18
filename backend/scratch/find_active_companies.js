
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const productCompanies = await prisma.product.findMany({
    select: { companyId: true },
    distinct: ['companyId']
  });
  
  const companies = await prisma.company.findMany({
    where: { id: { in: productCompanies.map(pc => pc.companyId) } },
    select: { id: true, name: true, integrationApiKey: true }
  });
  
  console.log(JSON.stringify(companies, null, 2));
}

main().finally(() => prisma.$disconnect());

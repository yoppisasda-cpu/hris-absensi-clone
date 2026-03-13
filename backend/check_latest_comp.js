const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestCompanies() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log('Latest Companies:');
    companies.forEach(c => {
      console.log(`- ID: ${c.id}, Name: ${c.name}, CreatedAt: ${c.createdAt}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestCompanies();

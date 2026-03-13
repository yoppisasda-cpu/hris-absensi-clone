const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listCompanies() {
  try {
    const companies = await prisma.company.findMany();
    console.log('Total Companies:', companies.length);
    companies.forEach(c => {
      console.log(`ID: ${c.id}, Name: ${c.name}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

listCompanies();

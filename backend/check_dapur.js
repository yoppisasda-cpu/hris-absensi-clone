const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    where: {
      name: {
        contains: 'DAPUR BASAMO SAMO',
        mode: 'insensitive'
      }
    }
  });
  console.log(JSON.stringify(companies, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

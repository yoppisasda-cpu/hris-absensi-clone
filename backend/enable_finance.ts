import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Update all companies to have access to BOTH modules (ABSENSI and FINANCE)
  // or specifically the one with name like 'Rajo'
  const result = await prisma.company.updateMany({
    data: {
      modules: 'BOTH'
    }
  });
  
  console.log(`Updated ${result.count} companies to BOTH modules.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.company.updateMany({
    data: { modules: 'BOTH' }
  });
  console.log(`Successfully updated ${result.count} companies to BOTH modules (Absensi & Finance).`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error updating modules:', e);
  process.exit(1);
});

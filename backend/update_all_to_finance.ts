import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const result = await (prisma as any).company.updateMany({
    data: { modules: 'FINANCE' }
  });
  console.log(`Updated ${result.count} companies to FINANCE.`);
  await prisma.$disconnect();
}
main();

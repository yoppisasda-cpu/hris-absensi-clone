import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const companyId = 1; // Assuming 'Aivola Cloud System' is ID 1
  const result = await prisma.company.update({
    where: { id: companyId },
    data: {
      purchasedInsights: {
        set: ['PREMIUM_PROFIT', 'PREMIUM_STOCK']
      }
    }
  });
  console.log(`Successfully unlocked insights for ${result.name}:`, result.purchasedInsights);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error unlocking insights:', e);
  process.exit(1);
});

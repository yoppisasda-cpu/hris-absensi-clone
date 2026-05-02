
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // Fix Dapur Basamo logo: it's actually a JPEG not PNG
  await prisma.company.update({
    where: { id: 4 },
    data: { logoUrl: '/uploads/logos/dapur_basamo_logo.jpg' }
  });
  console.log('Updated: Dapur Basamo logo -> .jpg');

  // Verify all company logos
  const all = await prisma.company.findMany({
    where: { addons: { has: 'AIVOLA_GO' } },
    select: { id: true, name: true, logoUrl: true }
  });
  console.log('\nCurrent logo URLs:');
  all.forEach(c => console.log(`  [${c.id}] ${c.name}: ${c.logoUrl}`));
}
main().finally(() => prisma.$disconnect());

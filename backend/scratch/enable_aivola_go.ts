
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.company.update({
    where: { id: 1 },
    data: {
      addons: {
        set: ['PROSPECTING_AI', 'AIVOLA_GO']
      }
    }
  });
  console.log('✅ Aivola GO Ecosystem Add-on enabled for Company 1');
}
main().finally(() => prisma.$disconnect());

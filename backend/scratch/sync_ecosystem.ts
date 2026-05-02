
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // 1. Update Dapur Basamo Samo (ID 4)
  await prisma.company.update({
    where: { id: 4 },
    data: {
      logoUrl: "/uploads/logos/dapur_basamo_logo.png",
      addons: { set: ["AIVOLA_GO"] }
    }
  });

  // 2. Enable AIVOLA_GO for others too (Demo purposes)
  await prisma.company.updateMany({
    where: { id: { in: [2, 3] } },
    data: {
      addons: { set: ["AIVOLA_GO"] }
    }
  });

  console.log('✅ Ecosystem synced: All merchants active & Dapur Basamo logo updated.');
}
main().finally(() => prisma.$disconnect());

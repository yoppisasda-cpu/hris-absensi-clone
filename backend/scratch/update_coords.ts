
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 1;

  // Update PIM 3
  await prisma.branch.updateMany({
    where: { companyId: tenantId, name: 'PIM 3' },
    data: { latitude: -6.265217, longitude: 106.784013 }
  });

  // Update Depok
  await prisma.branch.updateMany({
    where: { companyId: tenantId, name: 'depok' },
    data: { latitude: -6.372242, longitude: 106.833215 }
  });

  console.log('✅ Koordinat Cabang telah diperbarui ke lokasi asli.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

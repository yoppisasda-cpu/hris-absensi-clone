import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const companyId = 1; // Berdasarkan screenshot Bapak
  
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    console.error("Perusahaan tidak ditemukan!");
    return;
  }

  const currentAddons = company.addons || [];
  if (!currentAddons.includes('PROSPECTING')) {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        addons: [...currentAddons, 'PROSPECTING']
      }
    });
    console.log("✅ Berhasil mengaktifkan add-on PROSPECTING untuk ID #1");
  } else {
    console.log("ℹ️ Add-on PROSPECTING sudah aktif.");
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

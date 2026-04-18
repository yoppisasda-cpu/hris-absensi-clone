
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  const companyName = "PT. DAPUR BASAMO SAMO";
  console.log(`--- MENGAKTIFKAN API UNTUK: ${companyName} ---`);

  // 1. Cari atau buat perusahaan
  let company = await prisma.company.findFirst({
    where: { 
      OR: [
        { name: { contains: 'BASAMO', mode: 'insensitive' } },
        { name: { contains: 'RAJO KOPI', mode: 'insensitive' } } // Antisipasi jika ini adalah perusahaan yang ingin di-rebranding
      ]
    }
  });

  const newApiKey = `av_${randomUUID().replace(/-/g, '')}`;

  if (company) {
    console.log(`Menemukan perusahaan eksisting: ${company.name} (ID: ${company.id})`);
    company = await prisma.company.update({
      where: { id: company.id },
      data: {
        name: companyName,
        isApiEnabled: true,
        integrationApiKey: newApiKey
      }
    });
  } else {
    console.log(`Perusahaan tidak ditemukan. Membuat baru...`);
    company = await prisma.company.create({
      data: {
        name: companyName,
        isApiEnabled: true,
        integrationApiKey: newApiKey,
        plan: 'ENTERPRISE',
        modules: 'BOTH'
      }
    });
  }

  console.log("--------------------------------------------------");
  console.log("✅ AKTIVASI BERHASIL!");
  console.log(`🏢 Nama Perusahaan : ${company.name}`);
  console.log(`🔑 Integration Key: ${newApiKey}`);
  console.log("--------------------------------------------------");
  console.log("\nKey ini sekarang bisa digunakan oleh tim pabrik.");
  console.log("Perubahan juga akan terlihat di menu Settings/Integrasi API di Dashboard.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

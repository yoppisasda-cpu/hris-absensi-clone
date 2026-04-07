import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  console.log("--- MENCARI PERUSAHAAN UNTUK GENERATE API KEY ---");
  
  const companies = await prisma.company.findMany();
  
  if (companies.length === 0) {
    console.error("Gagal: Tidak ada perusahaan yang terdaftar di database.");
    return;
  }

  const target = companies[0]; // Kita ambil perusahaan pertama sebagai target
  const newApiKey = `av_${randomUUID().replace(/-/g, '')}`;

  await prisma.company.update({
    where: { id: target.id },
    data: {
      integrationApiKey: newApiKey,
      isApiEnabled: true
    }
  });

  console.log("--------------------------------------------------");
  console.log("✅ BERHASIL: API Key telah diaktifkan!");
  console.log(`🏢 Perusahaan : ${target.name}`);
  console.log(`🔑 API Key    : ${newApiKey}`);
  console.log("--------------------------------------------------");
  console.log("\nKirimkan API Key di atas ke developer pabrik bos.");
  console.log("Jangan lupa jalankan 'npm run dev' di folder backend setelah ini.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

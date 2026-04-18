
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('node:crypto');

const prisma = new PrismaClient();

async function main() {
  const companyName = "PT. DAPUR BASAMO SAMO";
  console.log(`--- MENGAKTIFKAN API UNTUK: ${companyName} ---`);

  // 1. Cari atau buat perusahaan
  let company = await prisma.company.findFirst({
    where: { 
      OR: [
        { name: { contains: 'BASAMO', mode: 'insensitive' } },
        { name: { contains: 'RAJO KOPI', mode: 'insensitive' } }
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

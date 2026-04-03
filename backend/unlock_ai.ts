import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableAllAIFeatures() {
  try {
    // Cari semua company yang ada
    const companies = await prisma.company.findMany();
    
    console.log(`Menemukan ${companies.length} perusahaan. Mengaktifkan semua fitur AI Premium...`);

    const premiumFeatures = [
        'KPI', 
        'LEARNING', 
        'AI_ADVISOR', 
        'PULSE', 
        'PREMIUM_PROFIT', 
        'PREMIUM_RETENTION', 
        'PREMIUM_STOCK'
    ];

    for (const company of companies) {
      await prisma.company.update({
        where: { id: company.id },
        data: {
          purchasedInsights: premiumFeatures
        }
      });
      console.log(`✅ AI Premium diaktifkan untuk: ${company.name}`);
    }

    console.log("\nSemua fitur AI sekarang sudah TERBUKA (Unlocked) untuk semua akun!");

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

enableAllAIFeatures();

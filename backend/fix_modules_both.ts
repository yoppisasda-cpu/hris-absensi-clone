import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixModules() {
  console.log('🚀 Starting Module Synchronization Fix...');
  
  try {
    // 1. Find all companies that are ENTERPRISE or PRO but still marked as ABSENSI only
    const affectedCompanies = await prisma.company.findMany({
      where: {
        OR: [
          { plan: 'ENTERPRISE' },
          { plan: 'PRO' }
        ],
        modules: 'ABSENSI'
      }
    });

    console.log(`[INFO] Found ${affectedCompanies.length} companies needing synchronization.`);

    for (const company of affectedCompanies) {
      console.log(`[SYNCING] Company: ${company.name} (ID: ${company.id}, Plan: ${company.plan})`);
      
      await prisma.company.update({
        where: { id: company.id },
        data: { modules: 'BOTH' }
      });
      
      console.log(`✅ [SUCCESS] ${company.name} is now set to BOTH modules.`);
    }

    console.log('\n✨ Database synchronization complete!');
  } catch (error) {
    console.error('❌ Error during synchronization:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixModules();

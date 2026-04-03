import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migratePlans() {
  try {
    console.log('--- Memulai Migrasi Paket Layanan ---');
    
    // Set semua perusahaan yang sudah ada ke ENTERPRISE agar tidak terkunci selama masa transisi
    const result = await prisma.company.updateMany({
      data: {
        plan: 'ENTERPRISE',
        modules: 'BOTH'
      }
    });

    console.log(`✅ Berhasil mengupdate ${result.count} perusahaan ke paket ENTERPRISE.`);
    console.log('--- Migrasi Selesai ---');

  } catch (error: any) {
    console.error('❌ Gagal melakukan migrasi:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

migratePlans();

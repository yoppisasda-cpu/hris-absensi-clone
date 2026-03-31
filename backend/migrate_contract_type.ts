import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Mencari perusahaan dengan contractType LUMSUM atau SATUAN...');

  // Hitung dulu berapa yang akan dihapus
  const toDelete = await prisma.$queryRaw<{id: number, name: string}[]>`
    SELECT id, name FROM "Company" WHERE "contractType" IN ('LUMSUM', 'SATUAN')
  `;

  if (toDelete.length === 0) {
    console.log('✅ Tidak ada data LUMSUM/SATUAN yang perlu dihapus.');
  } else {
    console.log(`📋 Akan dihapus ${toDelete.length} perusahaan:`);
    toDelete.forEach((c) => console.log(`  - [${c.id}] ${c.name}`));

    // Hapus semua company dengan contractType lama
    // Prisma cascade akan ikut hapus User, Branch, Attendance, dll
    for (const c of toDelete) {
      console.log(`🗑️  Menghapus: ${c.name} (ID: ${c.id})...`);
      await prisma.company.delete({ where: { id: c.id } });
    }
    console.log('✅ Semua data lama berhasil dihapus.');
  }

  // Sekarang rename enum values di database
  console.log('\n🔄 Me-rename enum ContractType: LUMSUM → BULANAN, SATUAN → TAHUNAN...');
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "ContractType" RENAME VALUE 'LUMSUM' TO 'BULANAN'`);
    console.log('✅ LUMSUM → BULANAN: OK');
  } catch (e: any) {
    if (e.message?.includes('does not exist')) {
      console.log('⏭️  LUMSUM sudah tidak ada (mungkin sudah direname sebelumnya).');
    } else {
      console.warn('⚠️  Rename LUMSUM:', e.message);
    }
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "ContractType" RENAME VALUE 'SATUAN' TO 'TAHUNAN'`);
    console.log('✅ SATUAN → TAHUNAN: OK');
  } catch (e: any) {
    if (e.message?.includes('does not exist')) {
      console.log('⏭️  SATUAN sudah tidak ada (mungkin sudah direname sebelumnya).');
    } else {
      console.warn('⚠️  Rename SATUAN:', e.message);
    }
  }

  // Verifikasi akhir
  const result = await prisma.$queryRaw<{enumlabel: string}[]>`
    SELECT enumlabel FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'ContractType'
    ORDER BY enumsortorder
  `;
  console.log('\n📊 Nilai enum ContractType saat ini:', result.map(r => r.enumlabel).join(', '));
  console.log('\n🎉 Selesai! Jalankan "npx prisma generate" untuk sinkronisasi Prisma client.');
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

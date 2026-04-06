import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixApiKey() {
    console.log('🔧 [FIX] Memperbaiki API Key untuk PT RAJO KOPI INDONESIA...');

    const targetKey = 'ak_b8i9fvesw0azkrwmhkbf9'; // Kunci yang ada di Dashboard App.jsx

    try {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'RAJO KOPI' } }
        });

        if (!company) {
            console.error('❌ Gagal: Perusahaan PT RAJO KOPI tidak ditemukan di database.');
            return;
        }

        const updated = await prisma.company.update({
            where: { id: company.id },
            data: {
                integrationApiKey: targetKey,
                isApiEnabled: true
            }
        });

        console.log('✅ BERHASIL!');
        console.log(`🏢 Perusahaan: ${updated.name}`);
        console.log(`🔑 API Key Baru: ${updated.integrationApiKey}`);
        console.log(`📢 Status API: ${updated.isApiEnabled ? 'AKTIF' : 'NON-AKTIF'}`);
        console.log('\n✨ Sekarang Dashboard Seven Billion harusnya sudah bisa Sinkron!');

    } catch (error: any) {
        console.error('❌ [ERROR] Terjadi kegagalan update database:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixApiKey();

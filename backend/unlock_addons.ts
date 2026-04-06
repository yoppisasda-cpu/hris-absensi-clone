import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 [SYNCING ADD-ONS] Menyelaraskan nama sandi fitur...');

    // 1. Cari Perusahaan Bos
    const company = await prisma.company.findFirst({
        where: { name: { contains: 'RAJO KOPI', mode: 'insensitive' } }
    });

    if (!company) {
        console.log('❌ Perusahaan tidak ditemukan!');
        return;
    }

    // 2. Update dengan Nama Sandi yang Sesuai UI Admin
    await prisma.company.update({
        where: { id: company.id },
        data: {
            plan: 'PRO',
            // purchasedInsights digunakan untuk KPI dan Premium AI Dashboard
            purchasedInsights: [
                'KPI',           // Biar muncul ikon Target 🎯 di Manajemen Klien
                'LEARNING',      // Biar muncul ikon Buku 📚
                'PREMIUM_PROFIT', 
                'PREMIUM_RETENTION',
                'PREMIUM_STOCK'
            ],
            // addons digunakan untuk Inventory dan AI Advisor
            addons: [
                'INVENTORY',     // Biar muncul ikon Dus 📦
                'AI_ADVISOR',    // Biar muncul ikon Otak 🧠
                'FRAUD_DETECTION' // Biar muncul ikon Perisai 🛡️
            ]
        }
    });

    console.log('✅ SINRONISASI BERHASIL!');
    console.log('✨ Sekarang coba bos Refresh halaman MANAJEMEN KLIEN. Ikon-ikonnya pasti sudah nongol!');
}

main()
    .catch((e) => {
        console.error('❌ Gagal sinkronisasi:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

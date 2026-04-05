import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 [ADMIN INJECTION] Berjalan di Database LIVE/PRODUKSI...');

    // 1. Pastikan Perusahaan Sistem (Owner) ada di database
    const systemOwner = await prisma.company.upsert({
        where: { id: 1 }, 
        create: {
            id: 1,
            name: 'Aivola Cloud System',
        },
        update: {
            name: 'Aivola Cloud System',
        }
    });

    console.log(`✅ System Owner terverifikasi: ${systemOwner.name} (ID: ${systemOwner.id})`);

    // 2. Buat Password Terenkripsi
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 3. Masukkan / Update Akun SUPERADMIN (Admin Pusat)
    const superAdmin = await prisma.user.upsert({
        where: { email: 'owner@aivola.id' },
        create: {
            companyId: systemOwner.id,
            name: 'Aivola Owner (Pusat)',
            email: 'owner@aivola.id',
            password: hashedPassword,
            role: 'SUPERADMIN',
        },
        update: {
            role: 'SUPERADMIN',
            password: hashedPassword, // Reset jika password lupa
            companyId: systemOwner.id
        }
    });

    console.log(`✨ BERHASIL! Akun Pusat [${superAdmin.email}] sekarang aktif dan siap Approve Request API.`);
    console.log('💡 Silakan Login dengan Akun di atas - Password: admin123');
}

main()
    .catch((e) => {
        console.error('❌ Gagal menyuntikkan Admin:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Memulai seeder data awal untuk SaaS...');

    // 0. Buat Perusahaan Sistem (Owner)
    const systemOwner = await prisma.company.upsert({
        where: { id: 1 }, // Biasanya ID 1 adalah yang utama
        create: {
            id: 1,
            name: 'Aivola Cloud System',
        },
        update: {
            name: 'Aivola Cloud System',
        }
    });

    console.log(`Dibuat System Owner: ${systemOwner.name} (ID: ${systemOwner.id})`);

    // 1. Buat 2 Perusahaan sebagai Tenant (Dengan Lokasi GPS)
    const ptMaju = await prisma.company.upsert({
        where: { id: 2 },
        create: {
            id: 2,
            name: 'PT. Maju Jaya',
            latitude: -6.175392, // Tugu Monas
            longitude: 106.827153,
            radius: 100 // meter
        },
        update: {
            name: 'PT. Maju Jaya'
        }
    });

    const ptMuncurId = 3;
    const ptMundur = await prisma.company.upsert({
        where: { id: ptMuncurId },
        create: {
            id: ptMuncurId,
            name: 'PT. Mundur Terus',
            latitude: -6.194911, // Bundaran HI
            longitude: 106.823055,
            radius: 50 // meter
        },
        update: {
            name: 'PT. Mundur Terus'
        }
    });

    console.log(`Dibuat Tenant 1: ${ptMaju.name} (ID: ${ptMaju.id})`);
    console.log(`Dibuat Tenant 2: ${ptMundur.name} (ID: ${ptMundur.id})`);

    // ... sisa logic lainnya ...
    // Buat Master Data Shift untuk PT Maju
    const shiftPagi = await prisma.shift.create({
        data: {
            companyId: ptMaju.id,
            title: 'Shift Pagi Reguler',
            startTime: '08:00',
            endTime: '17:00'
        }
    });

    // ...
    // Buat password terenkripsi untuk User Dummy
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 0.1 Buat SUPERADMIN (Owner)
    await prisma.user.upsert({
        where: { email: 'owner@aivola.id' },
        create: {
            companyId: systemOwner.id,
            name: 'Aivola Owner',
            email: 'owner@aivola.id',
            password: hashedPassword,
            role: 'SUPERADMIN',
        },
        update: {
            role: 'SUPERADMIN',
            password: hashedPassword
        }
    });

    // 2. Buat Karyawan untuk PT Maju (Tenant 1) dengan Shift
    await prisma.user.create({
        data: {
            companyId: ptMaju.id,
            shiftId: shiftPagi.id,
            name: 'Budi Santoso',
            email: 'budi@ptmaju.com',
            password: hashedPassword,
            role: 'ADMIN',
        },
    });

    console.log('Seeding selesai!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

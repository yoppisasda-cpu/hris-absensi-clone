import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Memulai seeder data awal untuk SaaS...');

    // 1. Buat 2 Perusahaan sebagai Tenant
    const ptMaju = await prisma.company.create({
        data: { name: 'PT. Maju Jaya' },
    });

    const ptMundur = await prisma.company.create({
        data: { name: 'PT. Mundur Terus' },
    });

    console.log(`Dibuat Tenant 1: ${ptMaju.name} (ID: ${ptMaju.id})`);
    console.log(`Dibuat Tenant 2: ${ptMundur.name} (ID: ${ptMundur.id})`);

    // 2. Buat Karyawan untuk PT Maju (Tenant 1)
    await prisma.user.create({
        data: {
            companyId: ptMaju.id,
            name: 'Budi Santoso',
            email: 'budi@ptmaju.com',
            password: 'hashedpassword', // Di sistem nyata harus pakai bcrypt
            role: 'ADMIN',
        },
    });

    // 3. Buat Karyawan untuk PT Mundur (Tenant 2)
    await prisma.user.create({
        data: {
            companyId: ptMundur.id,
            name: 'Andi Setiawan',
            email: 'andi@ptmundur.com',
            password: 'hashedpassword',
            role: 'EMPLOYEE',
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

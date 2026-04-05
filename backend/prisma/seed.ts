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
            radius: 100, // meter
            modules: 'BOTH'
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
            radius: 50, // meter
            modules: 'BOTH'
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
    await prisma.user.upsert({
        where: { email: 'budi@ptmaju.com' },
        create: {
            companyId: ptMaju.id,
            shiftId: shiftPagi.id,
            name: 'Budi Santoso',
            email: 'budi@ptmaju.com',
            password: hashedPassword,
            role: 'ADMIN',
        },
        update: {
            role: 'ADMIN',
            password: hashedPassword
        }
    });

    // 4. Buat Perusahaan Khusus User Yoppi (Owner Tenant)
    const ptRki = await prisma.company.upsert({
        where: { id: 4 },
        create: {
            id: 4,
            name: 'PT. RAJO KOPI INDONESIA',
            latitude: -6.208763,
            longitude: 106.845599,
            radius: 500,
            contractType: 'BULANAN',
            contractValue: 5000000,
            contractStart: new Date(),
            contractEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            employeeLimit: 100,
            photoRetentionDays: 30,
            modules: 'BOTH'
        },
        update: {
            name: 'PT. RAJO KOPI INDONESIA'
        }
    });

    console.log(`Dibuat Tenant Utama: ${ptRki.name} (ID: ${ptRki.id})`);

    // --- SEED FINANCE DATA ---
    const cashAccount = await prisma.financialAccount.upsert({
        where: { id: 1 },
        create: {
            id: 1,
            companyId: ptRki.id,
            name: 'Kas Utama (Tunai)',
            type: 'CASH',
            balance: 5000000
        },
        update: {}
    });

    const bankAccount = await prisma.financialAccount.upsert({
        where: { id: 2 },
        create: {
            id: 2,
            companyId: ptRki.id,
            name: 'Bank BCA (Operasional)',
            type: 'BANK',
            balance: 25000000
        },
        update: {}
    });

    const salesCategory = await prisma.incomeCategory.upsert({
        where: { id: 1 },
        create: {
            id: 1,
            companyId: ptRki.id,
            name: 'Penjualan Produk'
        },
        update: {}
    });

    const serviceCategory = await prisma.incomeCategory.upsert({
        where: { id: 2 },
        create: {
            id: 2,
            companyId: ptRki.id,
            name: 'Pendapatan Jasa'
        },
        update: {}
    });

    console.log('Seed Finance Data selesai!');

    // --- SEED EXPENSE CATEGORIES ---
    const expenseCategories = [
        'Gaji & Upah',
        'Sewa Kantor',
        'Listrik & Air',
        'Internet & Telepon',
        'Perlengkapan Kantor',
        'Perjalanan Dinas',
        'Pemasaran & Iklan',
        'Biaya Operasional Lainnya'
    ];

    for (const catName of expenseCategories) {
        await prisma.expenseCategory.upsert({
            where: { id: expenseCategories.indexOf(catName) + 1 },
            create: {
                id: expenseCategories.indexOf(catName) + 1,
                companyId: ptRki.id,
                name: catName
            },
            update: {}
        });
    }

    console.log('Seed Expense Categories selesai!');

    // 0.2 Buat OWNER (Tenant Owner)
    const yoppi = await prisma.user.upsert({
        where: { email: 'yoppi@rki.com' },
        create: {
            companyId: ptRki.id,
            name: 'YOPPI',
            email: 'yoppi@rki.com',
            password: hashedPassword,
            role: 'OWNER',
            jobTitle: 'HR Director'
        },
        update: {
            role: 'OWNER',
            password: hashedPassword,
            companyId: ptRki.id
        }
    });

    // --- SEED INTEGRATION REQUEST ---
    await (prisma as any).integrationRequest.upsert({
        where: { id: 1 },
        create: {
            id: 1,
            companyId: ptMaju.id,
            note: 'Mohon izin akses API untuk integrasi dengan sistem kasir kami.',
            status: 'PENDING'
        },
        update: {}
    });

    // --- SEED POS DATA (PT RKI) ---
    const coffeeCategory = await prisma.productCategory.upsert({
        where: { id: 1 },
        create: {
            id: 1,
            companyId: ptRki.id,
            name: 'Coffee Series'
        },
        update: {}
    });

    const snackCategory = await prisma.productCategory.upsert({
        where: { id: 2 },
        create: {
            id: 2,
            companyId: ptRki.id,
            name: 'Snacks'
        },
        update: {}
    });

    const products = [
        { name: 'Espresso Single', price: 15000, categoryId: coffeeCategory.id, stock: 100, unit: 'Cup' },
        { name: 'Cafe Latte', price: 28000, categoryId: coffeeCategory.id, stock: 50, unit: 'Cup' },
        { name: 'Cappuccino', price: 28000, categoryId: coffeeCategory.id, stock: 50, unit: 'Cup' },
        { name: 'Americano', price: 22000, categoryId: coffeeCategory.id, stock: 80, unit: 'Cup' },
        { name: 'Croissant Butter', price: 25000, categoryId: snackCategory.id, stock: 20, unit: 'Pcs' },
        { name: 'Brownies Choco', price: 18000, categoryId: snackCategory.id, stock: 30, unit: 'Pcs' },
    ];

    for (const p of products) {
        await prisma.product.upsert({
            where: { id: products.indexOf(p) + 1 },
            create: {
                id: products.indexOf(p) + 1,
                companyId: ptRki.id,
                name: p.name,
                price: p.price,
                categoryId: p.categoryId,
                stock: p.stock,
                unit: p.unit,
                updatedAt: new Date()
            },
            update: {
                price: p.price,
                stock: p.stock
            }
        });
    }

    console.log('Seed POS Data selesai!');

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

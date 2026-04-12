const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('--- Rekonstruksi Akun Admin ---');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 1. Buat Perusahaan Utama
    const company = await prisma.company.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            name: 'Aivola System Core',
            modules: 'BOTH'
        }
    });

    console.log('Perusahaan Berhasil Dibuat: ' + company.name);

    // 2. Buat User Admin
    const user = await prisma.user.upsert({
        where: { email: 'admin@aivola.com' },
        update: {
            password: hashedPassword,
            role: 'OWNER'
        },
        create: {
            companyId: company.id,
            name: 'Super Admin',
            email: 'admin@aivola.com',
            password: hashedPassword,
            role: 'OWNER',
            basicSalary: 0,
            allowance: 0,
            mealAllowance: 0,
            overtimeRate: 0
        }
    });

    console.log('Admin Berhasil Dibuat!');
    console.log('Email: admin@aivola.com');
    console.log('Password: admin123');
    console.log('------------------------------');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Memulai seeder data awal untuk SaaS...');
    // 1. Buat 2 Perusahaan sebagai Tenant (Dengan Lokasi GPS)
    const ptMaju = await prisma.company.create({
        data: {
            name: 'PT. Maju Jaya',
            latitude: -6.175392, // Tugu Monas
            longitude: 106.827153,
            radius: 100 // meter
        },
    });
    const ptMundur = await prisma.company.create({
        data: {
            name: 'PT. Mundur Terus',
            latitude: -6.194911, // Bundaran HI
            longitude: 106.823055,
            radius: 50 // meter
        },
    });
    console.log(`Dibuat Tenant 1: ${ptMaju.name} (ID: ${ptMaju.id})`);
    console.log(`Dibuat Tenant 2: ${ptMundur.name} (ID: ${ptMundur.id})`);
    // Buat Master Data Shift untuk PT Maju
    const shiftPagi = await prisma.shift.create({
        data: {
            companyId: ptMaju.id,
            title: 'Shift Pagi Reguler',
            startTime: '08:00',
            endTime: '17:00'
        }
    });
    const shiftMalam = await prisma.shift.create({
        data: {
            companyId: ptMaju.id,
            title: 'Shift Malam (Lembur)',
            startTime: '20:00',
            endTime: '05:00'
        }
    });
    // Buat password terenkripsi untuk User Dummy
    const hashedPassword = await bcryptjs_1.default.hash('password123', 10);
    // 2. Buat Karyawan untuk PT Maju (Tenant 1) dengan Shift
    await prisma.user.create({
        data: {
            companyId: ptMaju.id,
            shiftId: shiftPagi.id, // <-- Tersambung ke Shift Pagi (08:00 - 17:00)
            name: 'Budi Santoso',
            email: 'budi@ptmaju.com',
            password: hashedPassword,
            role: 'ADMIN',
        },
    });
    // 3. Buat Karyawan untuk PT Mundur (Tenant 2) Tanpa Shift Khusus
    await prisma.user.create({
        data: {
            companyId: ptMundur.id,
            name: 'Andi Setiawan',
            email: 'andi@ptmundur.com',
            password: hashedPassword,
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

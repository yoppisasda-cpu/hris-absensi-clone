
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedSystemKPIs() {
    try {
        const companies = await prisma.company.findMany();
        console.log(`Seeding system KPIs for ${companies.length} companies...`);

        for (const company of companies) {
            // 1. Kehadiran (Attendance)
            const attExists = await prisma.kPIIndicator.findFirst({
                where: { companyId: company.id, systemType: 'ATTENDANCE' }
            });
            if (!attExists) {
                await prisma.kPIIndicator.create({
                    data: {
                        companyId: company.id,
                        name: 'Kehadiran (Sistem)',
                        description: 'Penilaian objektif berdasarkan persentase kehadiran masuk kerja (Actual / Target Working Days).',
                        target: 100,
                        weight: 1,
                        isSystem: true,
                        systemType: 'ATTENDANCE'
                    }
                });
                console.log(`- Seeded Attendance KPI for ${company.name}`);
            }

            // 2. Ketepatan Waktu (Punctuality)
            const punctExists = await prisma.kPIIndicator.findFirst({
                where: { companyId: company.id, systemType: 'PUNCTUALITY' }
            });
            if (!punctExists) {
                await prisma.kPIIndicator.create({
                    data: {
                        companyId: company.id,
                        name: 'Ketepatan Waktu (Sistem)',
                        description: 'Penilaian objektif berdasarkan persentase kedatangan tepat waktu (On-time / Total Presence).',
                        target: 100,
                        weight: 1,
                        isSystem: true,
                        systemType: 'PUNCTUALITY'
                    }
                });
                console.log(`- Seeded Punctuality KPI for ${company.name}`);
            }
        }
        console.log('System KPIs seeded successfully.');
    } catch (error) {
        console.error('Error seeding system KPIs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedSystemKPIs();

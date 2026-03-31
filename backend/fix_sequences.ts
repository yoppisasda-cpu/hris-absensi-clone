import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    try {
        await prisma.$executeRawUnsafe(`SELECT setval('"IncomeCategory_id_seq"', (SELECT MAX(id) FROM "IncomeCategory"));`);
        console.log('✅ Sequence IncomeCategory synced');
        await prisma.$executeRawUnsafe(`SELECT setval('"ExpenseCategory_id_seq"', (SELECT MAX(id) FROM "ExpenseCategory"));`);
        console.log('✅ Sequence ExpenseCategory synced');
    } catch (e) {
        console.error('❌ Failed to sync sequences:', e);
    } finally {
        await prisma.$disconnect();
    }
}
main();

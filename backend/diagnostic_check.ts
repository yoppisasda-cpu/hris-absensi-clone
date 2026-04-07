import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCompanies() {
    console.log("=== CHECKING ALL COMPANIES ===");
    const companies = await prisma.company.findMany({
        where: { name: { contains: 'Dapur', mode: 'insensitive' } },
        select: { id: true, name: true, adminLimit: true }
    });
    console.log("Companies found:", JSON.stringify(companies, null, 2));

    console.log("\n=== CHECKING USER YOPPISASDA ===");
    const user = await prisma.user.findUnique({
        where: { email: 'yoppisasda@rajogroup.co.id' },
        select: { id: true, email: true, companyId: true, role: true }
    });
    console.log("User found:", JSON.stringify(user, null, 2));
}

checkCompanies()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

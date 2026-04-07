import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findUser() {
    console.log("=== FINDING USER ===");
    const user = await prisma.user.findUnique({
        where: { email: 'yoppisasda@rajogroup.co.id' },
        include: { company: true }
    });

    if (!user) {
        console.log("User tidak ditemukan.");
        return;
    }

    console.log(`User ID: ${user.id}`);
    console.log(`User Name: ${user.name}`);
    console.log(`Company ID: ${user.companyId}`);
    console.log(`Company Name: ${user.company.name}`);
    console.log(`Company adminLimit: ${user.company.adminLimit}`);
    
    // Check how many people already have back-office roles in this company
    const backOfficeRoles = ['ADMIN', 'OWNER', 'MANAGER', 'PURCHASING', 'OPERATIONAL'];
    const currentAdmins = await prisma.user.findMany({
        where: { 
            companyId: user.companyId,
            role: { in: backOfficeRoles as any }
        },
        select: { id: true, name: true, role: true }
    });
    
    console.log(`Current Admins (${currentAdmins.length}):`, currentAdmins);
}

findUser()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

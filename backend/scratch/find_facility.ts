import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findFacility() {
    console.log("Searching for 'RFS GUNUNG PUTRI'...");
    
    const branches = await (prisma as any).branch.findMany({
        where: { name: { contains: 'RFS GUNUNG PUTRI', mode: 'insensitive' } }
    });
    console.log(`Found ${branches.length} branches.`);
    branches.forEach((b: any) => console.log(`Branch ID: ${b.id} | Name: ${b.name}`));

    const warehouses = await (prisma as any).warehouse.findMany({
        where: { name: { contains: 'RFS GUNUNG PUTRI', mode: 'insensitive' } }
    });
    console.log(`Found ${warehouses.length} warehouses.`);
    warehouses.forEach((w: any) => console.log(`Warehouse ID: ${w.id} | Name: ${w.name}`));
}

findFacility()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());

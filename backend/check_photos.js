const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const a = await prisma.attendance.findFirst({
            where: { photoUrl: { not: null } },
            orderBy: { id: 'desc' }
        });
        if (a) {
            console.log('--- PHOTO URL ---');
            console.log(a.photoUrl);
            console.log('--- END ---');
        } else {
            console.log('No attendance with photo found');
        }
    } finally {
        await prisma.$disconnect();
    }
}
main();

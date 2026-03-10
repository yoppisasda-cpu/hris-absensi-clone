
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Get current Admin context
    const admin = await prisma.user.findUnique({
      where: { email: 'budi@ptmaju.com' },
      select: { id: true, name: true, companyId: true }
    });
    console.log('Admin Context:', JSON.stringify(admin, null, 2));

    if (admin) {
      // 2. List all users in that company
      const users = await prisma.user.findMany({
        where: { companyId: admin.companyId },
        select: { id: true, name: true, email: true, isActive: true }
      });
      console.log(`Users in Company ID ${admin.companyId}:`, JSON.stringify(users, null, 2));
      
      // 3. List some users NOT in that company for comparison
      const otherUsers = await prisma.user.findMany({
        where: { companyId: { not: admin.companyId } },
        take: 5,
        select: { id: true, name: true, email: true, companyId: true }
      });
      console.log('Sample Users in OTHER Companies:', JSON.stringify(otherUsers, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

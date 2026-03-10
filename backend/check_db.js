
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      take: 5,
      select: { id: true, name: true, isActive: true, resignDate: true }
    });
    console.log('User status check:', JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Prisma Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

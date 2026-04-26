
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      name: {
        contains: 'SOFIAH',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      name: true
    }
  });
  console.log(users);
}

main().finally(() => prisma.$disconnect());

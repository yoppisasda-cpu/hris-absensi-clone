
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const attendances = await prisma.attendance.findMany({
    where: {
      lateMinutes: 757
    },
    include: {
      user: true
    }
  });

  console.log(JSON.stringify(attendances, null, 2));
}

main().finally(() => prisma.$disconnect());

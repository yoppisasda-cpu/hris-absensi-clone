const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCom1() {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: 1 },
      select: { email: true, role: true, name: true, branchId: true }
    });
    console.log("Users in Company 1 (Berkah Coffee):");
    console.log(JSON.stringify(users, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkCom1();

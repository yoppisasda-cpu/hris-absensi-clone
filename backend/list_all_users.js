const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllUsers() {
  try {
    const users = await prisma.user.findMany({
      include: { company: true }
    });
    console.log("--- All Users ---");
    users.forEach(u => {
      console.log(`ID: ${u.id} | Role: ${u.role} | Email: ${u.email} | CompanyID: ${u.companyId} (${u.company?.name}) | BranchID: ${u.branchId}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllUsers();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'owner@aivola.id' },
      select: { id: true, companyId: true, role: true }
    });
    console.log("Current User Info:", user);
    
    const company = await prisma.company.findUnique({
      where: { id: user.companyId }
    });
    console.log("Current Company Info:", company);
    
    const accounts = await prisma.financialAccount.findMany({
        where: { companyId: user.companyId }
    });
    console.log("Financial Accounts count for this company:", accounts.length);
    console.log("Details:", accounts);
  } catch (err) {
    console.error("USER CHECK ERROR:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();

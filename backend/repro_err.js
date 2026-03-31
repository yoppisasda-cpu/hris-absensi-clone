const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reproduce() {
  try {
    console.log("--- ATTEMPTING REPRODUCTION ---");
    const data = {
        companyId: 999,
        name: "Test Account",
        type: "BANK",
        balance: 0
    };
    const account = await prisma.financialAccount.create({ data });
    console.log("SUCCESS:", account);
  } catch (err) {
    console.error("REPRODUCTION ERROR:", err.message);
    console.error("FULL ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

reproduce();

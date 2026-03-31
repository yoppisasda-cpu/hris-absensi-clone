const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log("--- DB CHECK START ---");
    const count = await prisma.financialAccount.count();
    console.log("FinancialAccount count:", count);
    
    // Check tables in public schema
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log("Tables found:", tables.map(t => t.table_name).join(", "));
    
    if (!tables.some(t => t.table_name === 'FinancialAccount')) {
        console.error("FATAL: Table 'FinancialAccount' NOT FOUND in public schema");
    } else {
        console.log("SUCCESS: Table 'FinancialAccount' exists.");
    }
  } catch (err) {
    console.error("DB CHECK ERROR:", err.message);
    if (err.message.includes("relation \"FinancialAccount\" does not exist")) {
        console.error("CONFIRMED: Table is missing.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

check();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      include: { company: true },
      take: 10
    });
    console.log("--- Account List (Top 10) ---");
    users.forEach(u => {
      console.log(`- Role: ${u.role} | Email: ${u.email} | Company: ${u.company.name}`);
    });
    console.log("\nNote: Default password for system-generated accounts is usually 'admin123' or 'password123'");
  } catch (err) {
    console.error("LIST USERS ERROR:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLive() {
  console.log("=== CHECKING LIVE DATABASE (Old Folder) ===");
  try {
    const userCount = await prisma.user.count();
    const companyCount = await prisma.company.count();
    
    console.log(`Total Perusahaan: ${companyCount}`);
    console.log(`Total User/Karyawan: ${userCount}`);
    
    const companies = await prisma.company.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log("\n--- 10 Perusahaan Terbaru ---");
    companies.forEach(c => {
      console.log(`ID: ${c.id} | Nama: ${c.name} | Dibuat: ${c.createdAt}`);
    });

  } catch (err) {
    console.error("DATABASE ERROR:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLive();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createKasir() {
  try {
    const h = await bcrypt.hash('password123', 10);
    // get branch 1 or create
    let b = await prisma.branch.findFirst({where:{companyId:1}});
    if (!b) b = await prisma.branch.create({data:{companyId:1, name:'Headquarters', address:'hq'}});

    await prisma.$executeRawUnsafe(`
      INSERT INTO "User" ("email", "name", "password", "role", "companyId", "branchId", "updatedAt") 
      VALUES ('kasir@berkah.com', 'Kasir Berkah', '${h}', 'STAFF', 1, ${b.id}, NOW()) 
      ON CONFLICT ("email") DO UPDATE SET "companyId" = 1, "branchId" = ${b.id};
    `);
    console.log('CREATED kasir@berkah.com');
  } catch(e) { console.error(e); }
  prisma.$disconnect();
}
createKasir();

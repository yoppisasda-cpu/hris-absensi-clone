const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    select: { email: true, companyId: true, role: true }
  });
  console.log("Users and their companies:");
  console.log(users);

  const prod999 = await prisma.product.count({ where: { companyId: 999 } });
  const prod1 = await prisma.product.count({ where: { companyId: 1 } });
  console.log(`\nProducts in Co.999: ${prod999}`);
  console.log(`Products in Co.1: ${prod1}`);
  
  if (prod1 > 0) {
     const sample1 = await prisma.product.findFirst({ where: { companyId: 1 }});
     console.log("\nSample product Co.1:");
     console.log(sample1);
  }
}
check().finally(() => prisma.$disconnect());

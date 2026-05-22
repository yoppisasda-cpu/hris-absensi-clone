const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({ where: { name: { contains: 'RFS' } } });
  console.log("RFS Company:", company ? { id: company.id, name: company.name } : "Not found");

  if (company) {
      const updated = await prisma.user.update({
          where: { email: 'aini@rfs.co.id' },
          data: { companyId: company.id }
      });
      console.log(`Moved aini@rfs.co.id to Company ${company.id} (${company.name})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

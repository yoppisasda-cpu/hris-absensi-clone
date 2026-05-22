const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'aini@rfs.co.id';
  const targetCompanyId = 13; // PT. RAJO FOOD SOLUTION

  const updated = await prisma.user.update({
    where: { email },
    data: { companyId: targetCompanyId }
  });
  console.log(`Successfully moved ${email} to Company ID ${targetCompanyId} (PT. RAJO FOOD SOLUTION)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

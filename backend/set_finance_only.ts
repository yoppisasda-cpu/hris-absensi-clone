import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const company = await (prisma as any).company.findFirst();
  if (company) {
    console.log(`Current: ID=${company.id}, Name=${company.name}, Modules=${company.modules}`);
    await (prisma as any).company.update({
      where: { id: company.id },
      data: { modules: 'FINANCE' }
    });
    console.log(`Successfully updated Company ID ${company.id} to FINANCE module only.`);
  } else {
    console.log("No company found.");
  }
  await prisma.$disconnect();
}
main().catch(e => {
  console.error(e);
  process.exit(1);
});

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: { name: { contains: 'Aivola' } }
  });

  if (company) {
    const updatedName = company.name.replace(/Aivola/g, 'Aivola.id');
    await prisma.company.update({
      where: { id: company.id },
      data: { name: updatedName }
    });
    console.log(`Updated company name from "${company.name}" to "${updatedName}"`);
  } else {
    console.log('No company found containing "Aivola"');
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

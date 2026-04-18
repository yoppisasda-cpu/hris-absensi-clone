
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { name: { contains: 'PLASTIK', mode: 'insensitive' } },
    include: { Company: true }
  });
  console.log(JSON.stringify(products, null, 2));
}

main().finally(() => prisma.$disconnect());

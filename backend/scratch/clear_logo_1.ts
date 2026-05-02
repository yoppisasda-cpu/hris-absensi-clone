
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.company.update({
    where: { id: 1 },
    data: { logoUrl: null }
  });
  console.log("Company 1 logoUrl cleared");
}
main().finally(() => prisma.$disconnect());

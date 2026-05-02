
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.company.update({
    where: { id: 1 },
    data: { logoUrl: '/uploads/logos/aivola_logo.png' }
  });
  console.log('Updated Company 1 logo URL');
}
main().finally(() => prisma.$disconnect());

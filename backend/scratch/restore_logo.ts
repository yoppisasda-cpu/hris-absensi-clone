
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.company.update({
    where: { id: 1 },
    data: {
      logoUrl: "/uploads/logos/67670847b0e63b507f3a14532c74fdaa"
    }
  });
  console.log('✅ Logo Perusahaan 1 telah dikembalikan.');
}
main().finally(() => prisma.$disconnect());

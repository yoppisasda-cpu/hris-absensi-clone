
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.company.update({
    where: { id: 4 },
    data: {
      primaryColor: "#10B981", // Emerald Green
      secondaryColor: "#064E3B", // Dark Green
    }
  });
  console.log('✅ Branding Perusahaan 4 telah diperbarui ke Emerald Green.');
}
main().finally(() => prisma.$disconnect());

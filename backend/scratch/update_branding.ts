
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Update Company 1 (Aivola Cloud System) branding
  await prisma.company.update({
    where: { id: 1 },
    data: {
      primaryColor: "#FF5722", // Deep Orange
      secondaryColor: "#121212", // Deep Black
      logoUrl: "https://aivola.id/logo.png" // Placeholder
    }
  });

  console.log('✅ Branding Perusahaan 1 telah diperbarui ke Deep Orange.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const logos = {
    1: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=200&h=200&fit=crop", // Maju Jaya
    2: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop", // Mundur Terus
    4: "https://images.unsplash.com/photo-1555126634-323283e090fa?w=200&h=200&fit=crop", // Dapur Basamo
    3: "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=200&h=200&fit=crop"  // Aivola Cloud
  };

  for (const [id, url] of Object.entries(logos)) {
    await prisma.company.update({
      where: { id: parseInt(id) },
      data: { logoUrl: url }
    });
  }
  console.log("Sample logos updated in database");
}
main().finally(() => prisma.$disconnect());

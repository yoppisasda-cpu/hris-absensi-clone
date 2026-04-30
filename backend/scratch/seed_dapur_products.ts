
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const companyId = 4; // Dapur Basamo Samo

  // 1. Get or Create Category
  let category = await prisma.productCategory.findFirst({
    where: { companyId, name: "Makanan Utama" }
  });

  if (!category) {
    category = await prisma.productCategory.create({
      data: { companyId, name: "Makanan Utama" }
    });
  }

  // 2. Add some products
  const products = [
    { name: "Nasi Kapau Spesial", price: 45000, categoryId: category.id },
    { name: "Rendang Daging Sapi", price: 35000, categoryId: category.id },
    { name: "Ayam Pop Gurih", price: 28000, categoryId: category.id },
    { name: "Teh Talua", price: 15000, categoryId: category.id }
  ];

  for (const p of products) {
    // Check if product exists to avoid duplicates
    const existing = await prisma.product.findFirst({
        where: { companyId, name: p.name }
    });
    if (!existing) {
        await prisma.product.create({
          data: {
            companyId,
            name: p.name,
            price: p.price,
            categoryId: p.categoryId,
            stock: 99,
            showInPos: true,
            updatedAt: new Date()
          }
        });
    }
  }

  console.log('✅ Menu Dapur Basamo Samo telah diisi!');
}
main().finally(() => prisma.$disconnect());

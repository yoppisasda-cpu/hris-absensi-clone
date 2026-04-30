
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const companyId = 1;
    const products = await prisma.product.findMany({
      where: { 
        companyId, 
        showInPos: true,
        company: {
          isActive: true,
          addons: { has: 'AIVOLA_GO' }
        }
      },
      include: { category: true },
      orderBy: { name: 'asc' }
    });
    console.log('Success:', products.length);
  } catch (error: any) {
    console.error('Prisma Error:', error.message);
    if (error.stack) console.error(error.stack);
  }
}
main().finally(() => prisma.$disconnect());

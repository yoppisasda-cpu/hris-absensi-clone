import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Starting COGS backfill...');
  
  // Ambil semua transaksi sale
  const sales = await prisma.sale.findMany({
    where: { totalCogs: 0, status: { notIn: ['CANCELLED', 'PENDING', 'RETURNED', 'VOID'] } },
    include: {
      SaleItem: {
        include: {
          product: {
             include: {
                Recipes: { include: { Material: true } }
             }
          }
        }
      }
    }
  });

  console.log(`Ditemukan ${sales.length} transaksi yang perlu dihitung.`);

  let count = 0;
  for (const sale of sales) {
    let saleCogs = 0;

    for (const item of sale.SaleItem) {
       const product = item.product;
       if (!product) continue;
       
       let unitCost = Number(product.costPrice) || 0;
       
       // Handle auto deduct (wip) recipes
       if (product.isAutoDeduct && product.Recipes && product.Recipes.length > 0) {
          let recipeCost = 0;
          for (const recipe of product.Recipes) {
             const matCost = Number(recipe.Material?.costPrice) || 0;
             recipeCost += (Number(recipe.quantity) * matCost);
          }
          const yieldFactor = Number(product.recipeYield) || 1;
          unitCost = yieldFactor > 0 ? recipeCost / yieldFactor : recipeCost;
       }

       saleCogs += (Number(item.quantity) * unitCost);
    }

    if (saleCogs > 0) {
       await prisma.sale.update({
         where: { id: sale.id },
         data: { totalCogs: saleCogs }
       });
       count++;
    }
  }

  console.log(`Selesai! Berhasil update ${count} transaksi.`);
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

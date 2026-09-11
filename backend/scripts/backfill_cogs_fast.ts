import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Starting fast COGS backfill...');
  
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

  const updates: { id: number, cogs: number }[] = [];

  for (const sale of sales) {
    let saleCogs = 0;

    for (const item of sale.SaleItem) {
       const product = item.product;
       if (!product) continue;
       
       let unitCost = Number(product.costPrice) || 0;
       
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
       updates.push({ id: sale.id, cogs: saleCogs });
    }
  }

  console.log(`Menyiapkan ${updates.length} updates secara paralel...`);
  
  // Batch updates in chunks of 100
  const CHUNK_SIZE = 100;
  let count = 0;
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(u => 
          prisma.sale.update({
             where: { id: u.id },
             data: { totalCogs: u.cogs }
          })
      ));
      count += chunk.length;
      if (count % 1000 === 0) console.log(`Processed ${count} records...`);
  }

  console.log(`Selesai! Berhasil update ${count} transaksi dengan cepat.`);
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

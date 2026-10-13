import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const t0 = Date.now();
  console.log("Checking sales needing COGS backfill...");
  
  const companiesWithZeroCogs: any[] = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT "companyId" 
    FROM "Sale" 
    WHERE ("totalCogs" = 0 OR "totalCogs" IS NULL)
    AND "status" NOT IN ('CANCELLED', 'PENDING', 'RETURNED', 'VOID')
  `);

  console.log(`Found ${companiesWithZeroCogs.length} companies with zero COGS sales.`);

  let totalUpdated = 0;

  for (const row of companiesWithZeroCogs) {
    const companyId = row.companyId;
    if (!companyId) continue;

    const allProducts = await prisma.product.findMany({
      where: { companyId },
      include: {
        Recipes: {
          include: { Material: true }
        }
      }
    });

    const getProductCost = (product: any, visited = new Set<number>()): number => {
      if (!product || visited.has(product.id)) return 0;
      
      if (!product.isAutoDeduct || !product.Recipes || product.Recipes.length === 0) {
        return Number(product.costPrice) || 0;
      }

      visited.add(product.id);
      let totalRecipeCost = 0;
      const yieldFactor = Number(product.recipeYield) || 1;

      for (const recipe of product.Recipes) {
        const mat = recipe.Material;
        if (mat) {
          const matCost = getProductCost(mat, visited);
          totalRecipeCost += (Number(recipe.quantity) * matCost);
        }
      }
      visited.delete(product.id);
      
      return yieldFactor > 0 ? totalRecipeCost / yieldFactor : totalRecipeCost;
    };

    const productCostMap = new Map<number, number>();
    for (const p of allProducts) {
      productCostMap.set(p.id, getProductCost(p));
    }

    const sales = await prisma.sale.findMany({
      where: {
        companyId,
        status: { notIn: ["CANCELLED", "PENDING", "RETURNED", "VOID"] },
        totalCogs: 0
      },
      include: {
        SaleItem: true
      }
    });

    if (sales.length === 0) continue;

    const updates: { id: number; cogs: number }[] = [];

    for (const s of sales) {
      let sCogs = 0;
      for (const item of s.SaleItem) {
        if (!item.productId) continue;
        const unitCost = productCostMap.get(item.productId) || 0;
        let itemCogs = Number(item.quantity) * unitCost;

        if (item.modifiers) {
          try {
            const mods = typeof item.modifiers === "string" ? JSON.parse(item.modifiers) : item.modifiers;
            Object.values(mods).forEach((val: any) => {
              if (val && val.linkedProductId) {
                const linkedProdId = Number(val.linkedProductId);
                const linkedQty = Number(val.linkedQuantity) || 1;
                const modUnitCost = productCostMap.get(linkedProdId) || 0;
                itemCogs += Number(item.quantity) * linkedQty * modUnitCost;
              }
            });
          } catch (e) {}
        }

        sCogs += itemCogs;
      }

      if (sCogs > 0) {
        updates.push({ id: s.id, cogs: sCogs });
      }
    }

    const CHUNK_SIZE = 500;
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      const valuesClause = chunk.map(u => `(${u.id}, ${u.cogs.toFixed(4)})`).join(",");
      await prisma.$executeRawUnsafe(`
        UPDATE "Sale" AS s 
        SET "totalCogs" = c.cogs 
        FROM (VALUES ${valuesClause}) AS c(id, cogs)
        WHERE s.id = c.id
      `);
    }

    totalUpdated += updates.length;
    console.log(`Company ${companyId}: updated ${updates.length} of ${sales.length} sales.`);
  }

  console.log(`Done! Total updated sales: ${totalUpdated} in ${Date.now() - t0}ms`);
}

run().finally(() => prisma.$disconnect());

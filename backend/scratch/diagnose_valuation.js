require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("--- FINDING THE 116 SKU COMPANY ---");
        const productGroups = await prisma.$queryRawUnsafe(`
            SELECT "companyId", COUNT(*) as count, SUM(stock * price) as val_price, SUM(stock * "costPrice") as val_cost
            FROM "Product"
            GROUP BY "companyId"
        `);
        console.log(JSON.stringify(productGroups.map(g => ({
            ...g,
            count: Number(g.count),
            val_price: Number(g.val_price),
            val_cost: Number(g.val_cost)
        })), null, 2));

        // Let's find the company with 116 items or the 514B value
        const targetGroup = productGroups.find(g => Number(g.count) === 116 || Math.abs(Number(g.val_price) - 514957648300) < 1000);
        
        if (targetGroup) {
            const coId = Number(targetGroup.companyId);
            console.log(`\n--- TARGET COMPANY ID: ${coId} ---`);
            const company = await prisma.company.findUnique({ where: { id: coId } });
            console.log("Company Name:", company?.name);

            console.log("\n--- TOP 10 ITEMS BY VALUATION (stock * price) IN THIS COMPANY ---");
            const topItems = await prisma.$queryRawUnsafe(`
                SELECT id, name, stock, price, "costPrice", (stock * price) as val
                FROM "Product"
                WHERE "companyId" = ${coId}
                ORDER BY (stock * price) DESC
                LIMIT 10
            `);
            console.log(JSON.stringify(topItems.map(i => ({...i, val: Number(i.val)})), null, 2));
        } else {
            console.log("\nTarget company not found in Product groups.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

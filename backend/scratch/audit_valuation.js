require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("--- FINAL DATA AUDIT ---");
        
        // 1. Get ALL products regardless of company
        const allProducts = await prisma.$queryRawUnsafe('SELECT id, name, "companyId", stock, price, "costPrice" FROM "Product"');
        console.log(`Total Products in DB: ${allProducts.length}`);

        // 2. Identify the ones causing 514B
        const culprits = allProducts.filter(p => (Number(p.stock) * Number(p.price)) > 1000000000); // Items > 1B
        if (culprits.length > 0) {
            console.log("\n--- INFLATED DATA POINTS FOUND (> Rp 1B) ---");
            console.log(JSON.stringify(culprits.map(p => ({
                id: p.id,
                name: p.name,
                companyId: p.companyId,
                stock: p.stock,
                price: p.price,
                total_valuation: Number(p.stock) * Number(p.price)
            })), null, 2));
        } else {
            console.log("\nNo single item > Rp 1B found.");
        }

        // 3. Summarize per company
        const summary = {};
        allProducts.forEach(p => {
            const coId = p.companyId || 'NULL';
            if (!summary[coId]) summary[coId] = { count: 0, val_price: 0, val_cost: 0 };
            summary[coId].count++;
            summary[coId].val_price += (Number(p.stock) * Number(p.price));
            summary[coId].val_cost += (Number(p.stock) * Number(p.costPrice));
        });
        console.log("\n--- AGGREGATED VIEW PER COMPANY ID ---");
        console.log(JSON.stringify(summary, null, 2));

        // 4. Products with Dapur in name
        const dapurItems = allProducts.filter(p => p.name && p.name.toLowerCase().includes('dapur'));
        console.log("\n--- PRODUCTS WITH 'DAPUR' ---");
        console.log(JSON.stringify(dapurItems, null, 2));

    } catch (e) {
        console.error("Audit Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

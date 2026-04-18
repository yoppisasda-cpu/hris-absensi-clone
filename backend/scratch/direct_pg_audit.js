require('dotenv').config();
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    try {
        await client.connect();
        console.log("Connected to:", process.env.DATABASE_URL.split('@')[1]); // Log host only for privacy
        
        const res = await client.query('SELECT id, name, "companyId", stock, price, "costPrice" FROM "Product"');
        console.log(`TOTAL PRODUCTS (Direct PG): ${res.rows.length}`);
        
        if (res.rows.length > 0) {
            const highValueItems = res.rows.filter(p => (Number(p.stock) * Number(p.price)) > 10000000); // Items > 10M
            console.log("\n--- HIGH VALUE ITEMS (>10M) ---");
            console.log(JSON.stringify(highValueItems.map(p => ({
                ...p,
                valuation: Number(p.stock) * Number(p.price)
            })), null, 2));

            const summary = {};
            res.rows.forEach(p => {
                const coId = p.companyId || 'NULL';
                if (!summary[coId]) summary[coId] = { count: 0, val_price: 0 };
                summary[coId].count++;
                summary[coId].val_price += (Number(p.stock) * Number(p.price));
            });
            console.log("\n--- SUMMARY PER COMPANY ---");
            console.log(JSON.stringify(summary, null, 2));
        }

    } catch (err) {
        console.error("Direct PG Error:", err);
    } finally {
        await client.end();
    }
}

main();

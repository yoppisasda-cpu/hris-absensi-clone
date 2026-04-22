const { Client } = require('pg');
const connectionString = 'postgresql://postgres.mgoihulpebiqotrrelqv:qiran17DPK2026@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres';

async function check() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Connected to Supabase.");
        
        // Check Product columns
        const resProd = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'Product'");
        console.log("Columns in Product table:", resProd.rows.map(r => r.column_name).join(', '));
        
        // Check if recipeYield exists
        const hasYield = resProd.rows.find(r => r.column_name === 'recipeYield');
        console.log("Has recipeYield?", !!hasYield);
        
        // Check if WarehouseStock table exists
        const resTables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        const hasWS = resTables.rows.find(r => r.table_name === 'WarehouseStock');
        console.log("Has WarehouseStock table?", !!hasWS);
        
    } catch (err) {
        console.error("Connection failed:", err);
    } finally {
        await client.end();
    }
}

check();

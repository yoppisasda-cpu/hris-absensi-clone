const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const sales = await prisma.$queryRawUnsafe('SELECT count(*) as count FROM "Sale"');
        console.log('SALES_COUNT:' + JSON.stringify(sales));
        
        const saleItems = await prisma.$queryRawUnsafe('SELECT count(*) as count FROM "SaleItem"');
        console.log('SALE_ITEMS_COUNT:' + JSON.stringify(saleItems));
        
        const sampleSale = await prisma.$queryRawUnsafe('SELECT * FROM "Sale" LIMIT 1');
        console.log('SAMPLE_SALE:' + JSON.stringify(sampleSale));
    } catch (error) {
        console.error('DB_ERROR:' + error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();

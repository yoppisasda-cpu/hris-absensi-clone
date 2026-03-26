const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tenantId = 4; // CORRECTED based on garam product
    const products = await prisma.$queryRawUnsafe('SELECT * FROM "Product" WHERE name = \'garam\' AND "companyId" = $1', tenantId);
    console.log('BEFORE_PRODUCT:', JSON.stringify(products[0]));
    
    // Check if there are ANY accounts for this tenant
    const accounts = await prisma.financialAccount.findMany({ where: { companyId: tenantId } });
    console.log('ACCOUNTS:', JSON.stringify(accounts));
    
    // If no accounts, create one for testing
    let accountId;
    if (accounts.length === 0) {
        console.log('Creating test account...');
        const newAcc = await prisma.financialAccount.create({
            data: {
                companyId: tenantId,
                name: 'Kas Toko (Auto)',
                type: 'CASH',
                balance: 1000000,
                updatedAt: new Date()
            }
        });
        accountId = newAcc.id;
    } else {
        accountId = accounts[0].id;
    }
    
    if (products.length > 0) {
        const productId = products[0].id;
        
        console.log('Running test sale via /api/test-sale...');
        
        const response = await fetch('http://localhost:5000/api/test-sale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tenantId: tenantId,
                items: [{ productId, quantity: 5, price: 10000 }],
                accountId,
                status: 'PAID',
                notes: 'Test sale from verify script'
            })
        });
        
        const resData = await response.json();
        console.log('SALE_RESPONSE:', JSON.stringify(resData));
        
        const productsAfter = await prisma.$queryRawUnsafe('SELECT * FROM "Product" WHERE id = $1', productId);
        console.log('AFTER_PRODUCT:', JSON.stringify(productsAfter[0]));
        
        const income = await prisma.income.findFirst({
            where: { description: { contains: resData.invoiceNumber } }
        });
        console.log('INCOME_RECORD:', JSON.stringify(income));
        
        const accountAfter = await prisma.financialAccount.findUnique({ where: { id: accountId } });
        console.log('AFTER_ACCOUNT:', JSON.stringify(accountAfter));
    } else {
        console.log('Product "garam" not found for tenant 4');
    }

  } catch (err) {
    console.error('ERROR:', err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();

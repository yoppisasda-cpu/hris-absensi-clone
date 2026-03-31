const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugData() {
  try {
    const tenantId = 999;
    
    const warehouses = await prisma.warehouse.findMany({
      where: { companyId: tenantId }
    });
    console.log("Warehouses:");
    console.log(JSON.stringify(warehouses, null, 2));

    const products = await prisma.product.findMany({
      where: { companyId: tenantId }
    });
    console.log("\nProducts:");
    products.forEach(p => {
        console.log(`- ID: ${p.id} | Name: ${p.name} | showInPos: ${p.showInPos} | stock: ${p.stock}`);
    });

  } catch (err) {
    console.error("DEBUG ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

debugData();

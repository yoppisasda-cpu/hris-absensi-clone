
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tenantId = 1;
    let w = await prisma.warehouse.findFirst({
      where: { companyId: tenantId }
    });

    if (!w) {
      w = await prisma.warehouse.create({
        data: {
          name: 'Gudang Utama',
          companyId: tenantId,
          isMain: true
        }
      });
      console.log('Created default warehouse:', w.id);
    } else {
      console.log('Warehouse already exists:', w.id);
    }
  } catch (err) {
    console.error('Error seeding warehouse:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Menciptakan Data Piutang Dummy Untuk Tenant 4 ---');
  
  // Mencari company ID 4
  const company = await prisma.company.findUnique({ where: { id: 4 } });
  if (!company) {
    console.log('Company ID 4 tidak ditemukan! Mencoba ID 1...');
    const firstCompany = await prisma.company.findFirst();
    if (!firstCompany) return;
    var targetId = firstCompany.id;
  } else {
    var targetId = 4;
  }

  const dummySales = [
    {
      companyId: targetId,
      invoiceNumber: 'INV-' + Math.floor(Math.random() * 1000000).toString(),
      customerName: 'CV. Kopi Rajo Mudo',
      date: new Date(),
      totalAmount: 4200000,
      status: 'UNPAID',
      isTukarFaktur: false,
    },
    {
      companyId: targetId,
      invoiceNumber: 'INV-' + Math.floor(Math.random() * 1000000).toString(),
      customerName: 'PT. Distribusi Nasional',
      date: new Date(Date.now() - 86400000 * 5), 
      totalAmount: 2150000,
      status: 'UNPAID',
      isTukarFaktur: false,
    }
  ];

  for (const data of dummySales) {
    const sale = await prisma.sale.create({ data });
    console.log(`Berhasil membuat untuk Tenant ${targetId}: ${sale.invoiceNumber} (${sale.customerName})`);
  }

  console.log('--- Selesai ---');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

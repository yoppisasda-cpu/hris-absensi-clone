import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- DB FIX: ADMIN SLOTS ---');

  // Find the company by name
  const company = await prisma.company.findFirst({
    where: {
      name: {
        contains: 'Dapurr Basamo',
        mode: 'insensitive'
      }
    }
  });

  if (!company) {
    console.error('❌ Perusahaan tidak ditemukan dengan nama "Dapurr Basamo"');
    
    // Try a broader search
    const allCompanies = await prisma.company.findMany({ select: { name: true, id: true } });
    console.log('Daftar Perusahaan yang ada:', allCompanies);
    return;
  }

  console.log(`✅ Ditemukan: ${company.name} (ID: ${company.id})`);
  console.log(`📊 Limit Saat Ini: Admin(${company.adminLimit}), Employee(${company.employeeLimit})`);

  // Update slots to 10
  const updated = await prisma.company.update({
    where: { id: company.id },
    data: {
      adminLimit: 10,
      // If employeeLimit is also low, maybe boost it?
      // employeeLimit: Math.max(company.employeeLimit, 100) 
    }
  });

  console.log('--------------------------------------------------');
  console.log('✨ UPDATE BERHASIL!');
  console.log(`🚀 Limit Baru untuk ${updated.name}:`);
  console.log(`🔑 Admin/Back-office: ${updated.adminLimit} Slots`);
  console.log('--------------------------------------------------');
  console.log('Silakan minta user mencoba tambah role back-office lagi.');
}

main()
  .catch((e) => {
    console.error('❌ Error updating slots:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

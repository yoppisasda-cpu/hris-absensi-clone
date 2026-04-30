
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 1; // Aivola Cloud System

  // 1. Ambil semua Warehouse tipe STORE yang belum punya branchId
  const stores = await prisma.warehouse.findMany({
    where: {
      companyId: tenantId,
      type: 'STORE',
      branchId: null
    }
  });

  console.log(`Menemukan ${stores.length} Store yang perlu disinkronkan ke Cabang.`);

  for (const store of stores) {
    // 2. Buat Branch baru
    const newBranch = await prisma.branch.create({
      data: {
        companyId: tenantId,
        name: store.name,
        // Contoh koordinat default (nanti bisa diedit)
        latitude: -6.200000, 
        longitude: 106.816666,
        radius: 5000
      }
    });

    // 3. Hubungkan Warehouse ke Branch tersebut
    await prisma.warehouse.update({
      where: { id: store.id },
      data: { branchId: newBranch.id }
    });

    console.log(`✅ Berhasil membuat Cabang "${newBranch.name}" dan mensinkronkan Toko.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

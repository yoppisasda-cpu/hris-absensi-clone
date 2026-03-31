import { PrismaClient, ProductType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Memulai Pemulihan Data POS PT. RAJO KOPI INDONESIA ---');

    const tenantId = 4;

    // 1. Dapatkan atau Buat Perusahaan
    const company = await prisma.company.upsert({
        where: { id: tenantId },
        update: { modules: 'BOTH', name: 'PT. RAJO KOPI INDONESIA' },
        create: { id: tenantId, name: 'PT. RAJO KOPI INDONESIA', modules: 'BOTH' }
    });
    console.log('✅ Company target: ' + company.name);

    // 2. Buat Gudang Utama (Penting untuk POS!)
    let warehouse = await prisma.warehouse.findFirst({
        where: { companyId: tenantId, isMain: true }
    });
    
    if (!warehouse) {
        warehouse = await prisma.warehouse.create({
            data: {
                companyId: tenantId,
                name: 'Gudang Utama',
                isMain: true,
                type: 'STORE'
            }
        });
    }
    console.log('✅ Warehouse created: ' + warehouse.name);

    // 3. Buat Kategori (Minuman)
    const categoryName = 'Minuman';
    let category = await prisma.productCategory.findFirst({
        where: { name: categoryName, companyId: company.id }
    });
    
    if (!category) {
        category = await prisma.productCategory.create({
            data: { name: categoryName, companyId: company.id }
        });
    }
    console.log('✅ Category: ' + category.name);

    // 4. Bersihkan data lama untuk Company 4 (Mencegah Duplikat Berlebihan)
    await prisma.product.deleteMany({ where: { companyId: tenantId } });
    await prisma.customizationGroup.deleteMany({ where: { companyId: tenantId } });

    // 5. Buat Kustomisasi (Gula, Es, Biji, Variasi)
    const levelSugar = await prisma.customizationGroup.create({
        data: {
            companyId: company.id,
            name: 'level sugar',
            isRequired: true,
            minSelections: 1,
            maxSelections: 1,
            options: {
                create: [
                    { name: 'less sugar', price: 0 },
                    { name: 'no sugar', price: 0 }
                ]
            }
        }
    });

    const levelIce = await prisma.customizationGroup.create({
        data: {
            companyId: company.id,
            name: 'level ice',
            isRequired: true,
            minSelections: 1,
            maxSelections: 1,
            options: {
                create: [
                    { name: 'less', price: 0 },
                    { name: 'normal', price: 0 },
                    { name: 'no', price: 0 }
                ]
            }
        }
    });

    const variasi = await prisma.customizationGroup.create({
        data: {
            companyId: company.id,
            name: 'variasi',
            isRequired: true,
            minSelections: 1,
            maxSelections: 1,
            options: {
                create: [
                    { name: 'hot', price: 0 },
                    { name: 'ice', price: 0 }
                ]
            }
        }
    });

    const bean = await prisma.customizationGroup.create({
        data: {
            companyId: company.id,
            name: 'bean',
            isRequired: true,
            minSelections: 1,
            maxSelections: 1,
            options: {
                create: [
                    { name: 'maple strawberyy', price: 3000 },
                    { name: 'bourbonut', price: 3000 },
                    { name: 'cerado', price: 2000 },
                    { name: 'pandann wangi', price: 2000 }
                ]
            }
        }
    });
    console.log('✅ Customization Groups & Options Restored.');

    // 6. Buat Produk & Link ke Gudang (Stock)
    const createProduct = async (name: string, price: number, sku: string) => {
        return await prisma.product.create({
            data: {
                companyId: company.id,
                name: name,
                price: price,
                costPrice: Math.floor(price * 0.6),
                stock: 100,
                sku: sku,
                categoryId: category.id,
                type: ProductType.FINISHED_GOOD,
                showInPos: true,
                updatedAt: new Date(),
                customizations: {
                    create: [
                        { groupId: levelSugar.id },
                        { groupId: levelIce.id },
                        { groupId: variasi.id },
                        { groupId: bean.id }
                    ]
                },
                WarehouseStock: {
                    create: [
                        { warehouseId: warehouse!.id, quantity: 100 }
                    ]
                }
            }
        });
    }

    await createProduct("Americano Aren", 17000, "POS-AMR-AREN-" + Date.now());
    await createProduct("Iced Americano", 25000, "POS-ICED-AMR-" + Date.now());

    console.log('✅ Products (Americano Aren & Iced Americano) with Stock Restored.');
    console.log('✨ Restoration Database SELESAI!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

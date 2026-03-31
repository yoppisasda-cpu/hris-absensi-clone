import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Restoring Data with Recipe ---');

    // 1. Restore Company 1
    const company1 = await prisma.company.upsert({
        where: { id: 1 },
        update: {},
        create: { 
            id: 1, 
            name: 'Berkah Coffee',
            modules: 'BOTH' as any
        }
    });
    console.log('Company 1 Restored with BOTH modules');

    // 2. Restore Financial Account
    const fa1 = await prisma.financialAccount.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            companyId: 1,
            name: 'Kas Utama',
            type: 'CASH',
            balance: 10000000
        }
    });
    console.log('Financial Account Restored');

    // 2b. Restore Categories
    const expenseCats = ['Operasional', 'Belanja Stok (Inventori)', 'Gaji Karyawan', 'Listrik & Air', 'Sewa Tempat'];
    for (const name of expenseCats) {
        await prisma.expenseCategory.create({
            data: { companyId: 1, name, type: 'OPERATIONAL' }
        });
    }
    const incomeCats = ['Penjualan POS', 'Pendapatan Lainnya'];
    for (const name of incomeCats) {
        await prisma.incomeCategory.create({
            data: { companyId: 1, name }
        });
    }
    console.log('Categories Restored');

    // 3. Restore Warehouse for Company 1
    const wh1 = await prisma.warehouse.create({
        data: {
            companyId: 1,
            name: 'Gudang Utama',
            isMain: true
        }
    });

    // 3. Create Raw Materials
    const m1 = await prisma.product.create({
        data: { companyId: 1, name: "Biji Kopi Arabica", stock: 10000, costPrice: 250, price: 0, unit: "Gram", sku: "BHN-001", type: "RAW_MATERIAL" as any, updatedAt: new Date() }
    });
    const m2 = await prisma.product.create({
        data: { companyId: 1, name: "air mineral", stock: 38000, costPrice: 2, price: 0, unit: "ml", sku: "BHN-002", type: "RAW_MATERIAL" as any, updatedAt: new Date() }
    });
    const m3 = await prisma.product.create({
        data: { companyId: 1, name: "es batu", stock: 29000, costPrice: 5, price: 0, unit: "Gram", sku: "BHN-003", type: "RAW_MATERIAL" as any, updatedAt: new Date() }
    });
    const m4 = await prisma.product.create({
        data: { companyId: 1, name: "cup 14oz", stock: 1100, costPrice: 850, price: 0, unit: "Pcs", sku: "BHN-004", type: "RAW_MATERIAL" as any, updatedAt: new Date() }
    });

    console.log('Raw Materials Created');

    // 4. Create WIP (Espresso Shot)
    const wip1 = await prisma.product.create({
        data: {
            companyId: 1,
            name: "Espresso Shot",
            stock: 0,
            costPrice: 0,
            price: 15000,
            unit: "Shot",
            sku: "WIP-001",
            type: "WIP" as any,
            updatedAt: new Date(),
            Recipes: {
                create: [
                    { materialId: m1.id, quantity: 18 }, // 18g coffee
                    { materialId: m2.id, quantity: 30 }  // 30ml water
                ]
            }
        }
    });
    console.log('WIP Product (Espresso) Created');

    // 5. Create Finished Good (Americano) using WIP
    const p1 = await prisma.product.create({
        data: {
            companyId: 1,
            name: "Iced Americano",
            stock: 0,
            costPrice: 0,
            price: 25000,
            unit: "Porsi",
            sku: "MNU-001",
            type: "FINISHED_GOOD" as any,
            updatedAt: new Date(),
            Recipes: {
                create: [
                    { materialId: wip1.id, quantity: 1 }, // 1 shot espresso
                    { materialId: m2.id, quantity: 150 }, // 150ml water
                    { materialId: m3.id, quantity: 120 }, // 120g ice
                    { materialId: m4.id, quantity: 1 }    // 1 cup
                ]
            }
        }
    });

    console.log('Iced Americano (Finished Good) Created');
    console.log('--- Restoration Complete ---');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());

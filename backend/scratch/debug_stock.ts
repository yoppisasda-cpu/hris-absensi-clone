import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugStock() {
    console.log("--- COMPREHENSIVE STOCK DEBUG ---");
    
    // 1. Cari SEMUA item Adas Manis di seluruh DB
    const items = await (prisma as any).product.findMany({
        where: { name: { contains: 'ADAS MANIS', mode: 'insensitive' } },
        include: {
            WarehouseStock: {
                include: {
                    warehouse: true
                }
            },
            Company: true
        }
    });

    console.log(`Found ${items.length} products matching 'ADAS MANIS'`);
    
    items.forEach((item: any) => {
        console.log(`\nPRODUCT: ${item.name} (ID: ${item.id})`);
        console.log(`Company: ${item.Company?.name} (ID: ${item.companyId})`);
        console.log(`Global Stock Field: ${item.stock} ${item.unit || ''}`);
        
        if (item.WarehouseStock && item.WarehouseStock.length > 0) {
            item.WarehouseStock.forEach((ws: any) => {
                console.log(`  -> Warehouse: ${ws.warehouse.name} (ID: ${ws.warehouseId}) | Qty: ${ws.quantity}`);
            });
        } else {
            console.log("  -> No warehouse stocks found.");
        }
    });

    // 2. Cek SEMUA daftar Warehouse di seluruh DB
    const warehouses = await (prisma as any).warehouse.findMany({
        include: { company: true }
    });
    console.log("\n--- ALL REGISTERED WAREHOUSES ---");
    warehouses.forEach((w: any) => {
        console.log(`ID: ${w.id} | Name: ${w.name} | Company: ${w.company?.name} (ID: ${w.companyId})`);
    });
}

debugStock()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());

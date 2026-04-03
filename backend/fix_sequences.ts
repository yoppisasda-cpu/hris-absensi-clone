import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixSequences() {
  try {
    console.log("Starting sequence sync for all tables...");
    
    const tables = await prisma.$queryRawUnsafe<any[]>(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND column_default LIKE 'nextval(%'
    `);

    for (const table of tables) {
      const tableName = table.table_name;
      const columnName = table.column_name;
      
      try {
        const maxResult = await prisma.$queryRawUnsafe<any[]>(`SELECT MAX("${columnName}") as max_id FROM "${tableName}"`);
        const maxId = maxResult[0].max_id || 0;
        const nextId = maxId + 1;
        
        await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${tableName}"', '${columnName}'), ${nextId}, false)`);
        console.log(`✅ Fixed sequence for ${tableName}.${columnName} to next val: ${nextId}`);
      } catch (err: any) {
        console.warn(`⚠️ Failed to fix sequence for ${tableName}: ${err.message}`);
      }
    }
    
    console.log("All sequences synchronized.");
  } catch (error) {
    console.error("Error fixing sequences:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSequences();

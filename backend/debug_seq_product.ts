import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debugSequence() {
  try {
    const tableName = 'Product';
    const columnName = 'id';
    
    const maxResult: any[] = await prisma.$queryRawUnsafe(`SELECT MAX("${columnName}") as max_id FROM "${tableName}"`);
    const maxId = maxResult[0].max_id || 0;
    
    console.log(`Table ${tableName} MAX ID: ${maxId}`);
    
    try {
      const seqResult: any[] = await prisma.$queryRawUnsafe(`SELECT pg_get_serial_sequence('"${tableName}"', '${columnName}') as seq`);
      const seqName = seqResult[0].seq;
      console.log(`Sequence Name: ${seqName}`);
      
      const currValResult: any[] = await prisma.$queryRawUnsafe(`SELECT nextval('${seqName}') as next_val`);
      console.log(`Next Val (before fix): ${currValResult[0].next_val}`);
      
      await prisma.$executeRawUnsafe(`SELECT setval('${seqName}', ${maxId + 1}, false)`);
      console.log(`✅ Fixed sequence to ${maxId + 1}`);
      
      const afterValResult: any[] = await prisma.$queryRawUnsafe(`SELECT nextval('${seqName}') as next_val_after`);
      console.log(`Check Next Val: ${afterValResult[0].next_val_after}`);
      
    } catch (err: any) {
      console.error(`Error with pg_get_serial_sequence: ${err.message}`);
    }
  } catch (error: any) {
    console.error("Debug Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugSequence();

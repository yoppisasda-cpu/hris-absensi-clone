const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`
      SELECT n.nspname as schema_name, t.typname as type_name, e.enumlabel as value
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE t.typname = 'Role'
      ORDER BY schema_name, value;
    `;
    console.log('Detailed Role Enum Analysis:', JSON.stringify(result, null, 2));
    
    // Check current schema
    const currentSchema = await prisma.$queryRaw`SELECT current_schema()`;
    console.log('Current Schema:', currentSchema);

  } catch (error) {
    console.error('Error during diagnostic:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

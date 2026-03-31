import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking Company IDs...');
    const maxCompany = await prisma.company.aggregate({
      _max: { id: true }
    });
    console.log('Max Company ID:', maxCompany._max.id);

    if (maxCompany._max.id) {
      console.log('Syncing Company sequence...');
      await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Company"', 'id'), ${maxCompany._max.id})`);
    }

    console.log('Checking User IDs...');
    const maxUser = await prisma.user.aggregate({
      _max: { id: true }
    });
    console.log('Max User ID:', maxUser._max.id);

    if (maxUser._max.id) {
      console.log('Syncing User sequence...');
      await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), ${maxUser._max.id})`);
    }

    console.log('Syncing Branch sequence...');
    const maxBranch = await prisma.branch.aggregate({
        _max: { id: true }
    });
    if (maxBranch._max.id) {
        await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Branch"', 'id'), ${maxBranch._max.id})`);
    }

    console.log('Database sequences synced successfully.');
  } catch (error) {
    console.error('Error syncing sequences:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

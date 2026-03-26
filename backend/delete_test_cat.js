
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.expenseCategory.deleteMany({
      where: {
        name: {
          startsWith: 'Verify Category'
        }
      }
    });
    console.log('Deleted:', res.count, 'test categories');
  } catch (err) {
    console.error('Error deleting category:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

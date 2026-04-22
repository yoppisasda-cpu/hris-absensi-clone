const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function test() {
  console.log('Testing connection to:', process.env.DATABASE_URL);
  try {
    await prisma.$connect();
    console.log('✅ Connection successful!');
    const count = await prisma.product.count();
    console.log('Product count:', count);
  } catch (err) {
    console.error('❌ Connection failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();

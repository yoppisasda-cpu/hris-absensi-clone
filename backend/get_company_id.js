const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'owner@aivola.id' } });
  console.log('COMPANY_ID:', user.companyId);
  process.exit(0);
}
main();

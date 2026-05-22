const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.company.findMany({ where: { name: { contains: 'KNC' } } });
  console.log("KNC Companies:", c.map(x => ({id: x.id, name: x.name})));
  
  const b = await prisma.branch.findMany({ where: { companyId: { in: c.map(x => x.id) } } });
  console.log("Branches for KNC Companies:", b.map(x => ({id: x.id, name: x.name, companyId: x.companyId, lat: x.latitude, lng: x.longitude})));
}

main().catch(console.error).finally(() => prisma.$disconnect());

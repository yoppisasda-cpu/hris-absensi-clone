const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company17 = 17; // PT. KNC PIM3
  const company21 = 21; // PT. KNC Sukmajaya

  const branches17 = await prisma.branch.findMany({ where: { companyId: company17 } });
  const branches21 = await prisma.branch.findMany({ where: { companyId: company21 } });

  console.log("Branches Company 17:", branches17.map(b => ({id: b.id, name: b.name})));
  console.log("Branches Company 21:", branches21.map(b => ({id: b.id, name: b.name})));

  const nullUsers = await prisma.user.findMany({
    where: {
      companyId: { in: [company17, company21] },
      branchId: null
    },
    select: { id: true, email: true, name: true, role: true, companyId: true }
  });

  console.log("\nUsers with NULL branchId:");
  nullUsers.forEach(u => {
    console.log(`- [${u.companyId}] ${u.name} (${u.email}) | Role: ${u.role}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

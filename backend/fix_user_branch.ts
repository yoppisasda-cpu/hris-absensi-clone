import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.findFirst();
  if (branch) {
    await prisma.user.update({
      where: { id: 1 },
      data: { branchId: branch.id }
    });
    console.log(`✅ SUCCESS: Linked User 1 to Branch: ${branch.name} (ID: ${branch.id})`);
  } else {
    // If no branch exists, create one!
    const newBranch = await prisma.branch.create({
      data: {
        companyId: 1,
        name: 'Toko Pusat (Auto Created)',
      }
    });
    await prisma.user.update({
      where: { id: 1 },
      data: { branchId: newBranch.id }
    });
    console.log(`✅ SUCCESS: Created and Linked User 1 to Branch: ${newBranch.name} (ID: ${newBranch.id})`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

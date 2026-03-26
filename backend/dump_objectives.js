const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const objectives = await prisma.learningObjective.findMany({
    include: { material: true }
  });
  console.log(JSON.stringify(objectives, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

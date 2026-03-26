const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test(userId, tenantId) {
  console.log(`Testing for User: ${userId}, Tenant: ${tenantId}`);
  
  // 1. Objectives
  const objectives = await prisma.learningObjective.findMany({
    where: { userId, companyId: tenantId },
    include: { material: true }
  });
  console.log('Objectives Count:', objectives.length);
  if (objectives.length > 0) {
      console.log('First Objective MaterialId:', objectives[0].materialId);
  }

  // 2. Exams Logic (copied from server.ts)
  const userObjectives = await prisma.learningObjective.findMany({
    where: { userId, materialId: { not: null } },
    select: { materialId: true }
  });
  const assignedMaterialIds = userObjectives.map((o) => o.materialId).filter(Boolean);
  console.log('Assigned Material Ids:', assignedMaterialIds);

  const exams = await prisma.exam.findMany({
    where: { 
      companyId: tenantId,
      OR: [
        { materialId: { in: assignedMaterialIds } },
        { AND: [{ targetDivision: null }, { targetJobTitle: null }] }
      ]
    },
    include: { material: { select: { title: true, category: true } } }
  });
  console.log('Exams found:', exams.length);
  if (exams.length > 0) {
      console.log('First Exam MaterialId:', exams[0].materialId);
  }
}

test(23, 26)
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentAnnouncements() {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { company: true }
    });
    console.log('Recent Announcements:');
    announcements.forEach(a => {
      console.log(`- Title: ${a.title}, Company: ${a.company.name} (ID: ${a.companyId}), Created: ${a.createdAt}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentAnnouncements();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function countAnnouncements() {
  try {
    const count = await prisma.announcement.count();
    console.log('Total Announcements Count:', count);
    const all = await prisma.announcement.findMany({
        include: { company: true }
    });
    all.forEach(a => {
        console.log(`[${a.id}] ${a.title} - ${a.company.name}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

countAnnouncements();

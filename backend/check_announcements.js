const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAnnouncements() {
  try {
    const announcements = await prisma.announcement.findMany({
      include: { company: true }
    });
    console.log('Total Announcements:', announcements.length);
    announcements.forEach(a => {
      console.log(`ID: ${a.id}`);
      console.log(`Title: ${a.title}`);
      console.log(`Company: ${a.company.name} (ID: ${a.companyId})`);
      console.log(`Created At: ${a.createdAt}`);
      console.log('---');
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkAnnouncements();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNotifications() {
  try {
    const notifs = await prisma.notification.findMany({
      where: { companyId: 26 },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log('Recent Notifications for Company 26:');
    notifs.forEach(n => {
      console.log(`- Title: ${n.title}, Message: ${n.message}, Created: ${n.createdAt}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotifications();

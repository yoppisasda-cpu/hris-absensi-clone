import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function findUser() {
  try {
    const companies = await prisma.company.findMany({
      where: {
        name: {
          contains: "Dapur Basamo",
          mode: 'insensitive'
        }
      },
      include: {
        users: true
      }
    });

    console.log("=== Company & Users ===");
    console.log(JSON.stringify(companies, null, 2));

  } catch (err) {
    console.error("Error finding user:", err);
  } finally {
    await prisma.$disconnect();
  }
}

findUser();

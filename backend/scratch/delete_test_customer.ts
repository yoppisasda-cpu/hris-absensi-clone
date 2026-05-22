import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'yoppisasda@yahoo.com';
  console.log(`Searching for customer with email: ${email}`);
  
  const customer = await prisma.customer.findFirst({
    where: { email: email }
  });

  if (customer) {
    console.log(`Found customer ID: ${customer.id}. Deleting...`);
    await prisma.customer.delete({
      where: { id: customer.id }
    });
    console.log('Customer deleted successfully.');
  } else {
    console.log('Customer not found.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

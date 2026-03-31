import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log('No company found.');
    return;
  }

  const accountName = 'Piutang Marketplace (GoFood/GrabFood)';
  const existing = await prisma.financialAccount.findFirst({
    where: { 
      companyId: company.id,
      name: accountName 
    }
  });

  if (existing) {
    console.log(`Account ${accountName} already exists with ID: ${existing.id}`);
  } else {
    const newAccount = await prisma.financialAccount.create({
      data: {
        companyId: company.id,
        name: accountName,
        type: 'ASSET',
        balance: 0
      }
    });
    console.log(`Created new account ${accountName} with ID: ${newAccount.id}`);
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

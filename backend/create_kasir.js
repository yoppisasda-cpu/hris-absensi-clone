const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createKasir() {
  try {
    const tenantId = 1;

    let branch = await prisma.branch.findFirst({ where: { companyId: tenantId } });
    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          companyId: tenantId,
          name: 'Cabang Utama Berkah',
          address: 'Jl. Utama'
        }
      });
    }

    const email = 'kasir@berkah.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    let user;

    if (existingUser) {
        user = await prisma.user.update({
            where: { email },
            data: { password: hashedPassword, companyId: tenantId, branchId: branch.id }
        });
    } else {
        user = await prisma.user.create({
            data: {
                email,
                name: 'Kasir POS Berkah',
                password: hashedPassword,
                role: 'STAFF',
                companyId: tenantId,
                branchId: branch.id
            }
        });
    }

    console.log(`\n✅ AKUN KASIR BERHASIL DIBUAT UNTUK LOGIN POS:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Company ID: ${user.companyId} (Berkah Coffee)`);

  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

createKasir();

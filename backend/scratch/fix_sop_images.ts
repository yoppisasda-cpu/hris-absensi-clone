import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const materials = await prisma.learningMaterial.findMany({
    where: {
      imageUrl: { startsWith: '/uploads/' },
      NOT: { imageUrl: { startsWith: '/uploads/learning/' } }
    }
  });

  console.log(`Found ${materials.length} materials to fix.`);

  const learningDir = path.join(process.cwd(), 'uploads/learning');
  if (!fs.existsSync(learningDir)) {
    fs.mkdirSync(learningDir, { recursive: true });
  }

  for (const m of materials) {
    if (!m.imageUrl) continue;
    const filename = path.basename(m.imageUrl);
    const oldPath = path.join(process.cwd(), 'uploads/reimbursements', filename);
    const newPath = path.join(process.cwd(), 'uploads/learning', filename);

    if (fs.existsSync(oldPath)) {
      console.log(`Moving ${filename} from reimbursements to learning...`);
      fs.renameSync(oldPath, newPath);
      
      await prisma.learningMaterial.update({
        where: { id: m.id },
        data: { imageUrl: `/uploads/learning/${filename}` }
      });
      console.log(`Updated ID ${m.id} in DB.`);
    } else {
      console.log(`File ${filename} not found in reimbursements folder. Checking root uploads...`);
      const rootPath = path.join(process.cwd(), 'uploads', filename);
      if (fs.existsSync(rootPath)) {
         fs.renameSync(rootPath, newPath);
         await prisma.learningMaterial.update({
            where: { id: m.id },
            data: { imageUrl: `/uploads/learning/${filename}` }
          });
          console.log(`Fixed ID ${m.id} from root folder.`);
      } else {
         console.warn(`CRITICAL: File ${filename} could not be found anywhere!`);
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

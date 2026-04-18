
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const productNames = [
  "pasta ayam bakar", "pasta ayam goreng", "pasta ayam pop", "pasta dendeng", 
  "pasta gulai ayam", "pasta gulai cincang", "pasta gulai cumi", "pasta gulai ikan", 
  "pasta gulai kapau", "pasta gulai kikil & jeroan", "pasta gulai telur", 
  "pasta gulai ubi tumbuk", "pasta ikan bakar", "pasta paru goreng", 
  "rendang pouch payakumbuah", "santan kental", "seasoning dendeng sambal hijau", 
  "seasoning dendeng sambalado merah", "seasong es kopyor", "seasoning isian cumi", 
  "seasoning kalikih santan", "seasoning pasta durian", "seasoning parkedel", 
  "seasoning sambal ayam pop", "seasoning sambal balado merah", 
  "Seasoning Sambal Hijau Goreng Nasi Bungkus", "seasoning sarikayo"
];

async function main() {
  console.log("--- MENCARI PRODUK BERDASARKAN NAMA ---");
  
  const results = await prisma.product.findMany({
    where: {
      name: {
        in: productNames,
        mode: 'insensitive'
      }
    },
    include: {
      Company: true
    }
  });

  if (results.length === 0) {
    console.log("Tidak ada produk yang cocok dengan nama di atas.");
    
    // Coba pencarian parsial jika tidak ada hasil
    console.log("\n--- COBA PENCARIAN PARSIAL (PASTA/SEASONING) ---");
    const partial = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: 'pasta', mode: 'insensitive' } },
          { name: { contains: 'seasoning', mode: 'insensitive' } }
        ]
      },
      include: { Company: true },
      take: 20
    });
    console.log(JSON.stringify(partial, null, 2));
  } else {
    console.log(JSON.stringify(results, null, 2));
  }
}

main().finally(() => prisma.$disconnect());

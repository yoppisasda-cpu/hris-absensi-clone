const fs = require('fs');
const path = 'c:/Users/user/.gemini/antigravity/scratch/absensi_app/backend/prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n'); 
let lines = content.split('\n');

const breakpoint = lines.findIndex(l => l.includes('year                Int'));

if (breakpoint !== -1) {
    const start = lines.slice(0, 422); // Before the deletion started.
    const end = lines.slice(breakpoint);
    
    const repair = [
        '}',
        '',
        'model EmployeeDocument {',
        '  id        Int      @id @default(autoincrement())',
        '  companyId Int',
        '  userId    Int',
        '  title     String',
        '  fileUrl   String',
        '  createdAt DateTime @default(now())',
        '  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)',
        '  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)',
        '}',
        '',
        'model Asset {',
        '  id              Int       @id @default(autoincrement())',
        '  companyId       Int',
        '  userId          Int?',
        '  name            String',
        '  serialNumber    String',
        '  condition       String    @default("GOOD")',
        '  purchaseDate    DateTime?',
        '  purchasePrice   Float?    @default(0)',
        '  residualValue   Float?    @default(0)',
        '  usefulLife      Int?      @default(0) // in months',
        '  isDepreciating  Boolean?  @default(false)',
        '  createdAt       DateTime  @default(now())',
        '  updatedAt       DateTime  @updatedAt',
        '  imageUrl        String?',
        '  company         Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)',
        '  user            User?     @relation(fields: [userId], references: [id])',
        '',
        '  @@unique([companyId, serialNumber])',
        '}',
        '',
        'model Bonus {',
        '  id          Int      @id @default(autoincrement())',
        '  companyId   Int',
        '  userId      Int',
        '  type        String',
        '  amount      Float',
        '  description String?',
        '  month       Int',
        '  year        Int',
        '  createdAt   DateTime @default(now())',
        '  updatedAt   DateTime @updatedAt',
        '  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)',
        '  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)',
        '}',
        '',
        'model KPIIndicator {',
        '  id          Int        @id @default(autoincrement())',
        '  companyId   Int',
        '  name        String',
        '  description String?',
        '  target      Float      @default(100)',
        '  weight      Float      @default(1)',
        '  createdAt   DateTime   @default(now())',
        '  updatedAt   DateTime   @updatedAt',
        '  isSystem    Boolean    @default(false)',
        '  systemType  String?',
        '  company     Company    @relation(fields: [companyId], references: [id], onDelete: Cascade)',
        '  scores      KPIScore[]',
        '}',
        '',
        'model KPIScore {',
        '  id                  Int                @id @default(autoincrement())',
        '  companyId           Int',
        '  userId              Int',
        '  indicatorId         Int',
        '  score               Float',
        '  comment             String?',
        '  month               Int'
    ];

    const finalContent = lines.slice(0, 421).concat(repair).concat(lines.slice(breakpoint + 1)).join('\n');
    fs.writeFileSync(path, finalContent);
    console.log('Schema REPAIRED successfully using direct write.');
} else {
    console.log('Could not find year line in schema.');
}

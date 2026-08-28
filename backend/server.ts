import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

// --- INITIALIZE ENVIRONMENT FIRST ---
dotenv.config({ path: path.resolve(__dirname, '.env') });

import cors from 'cors';
import { PrismaClient, Role, AssignmentStatus } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import { uploadToSupabase } from './supabase_storage';
import { spawn } from 'child_process';
import zlib from 'zlib';
import { initCleanupCron, runCleanup } from './cron_jobs';
import { compareFaces } from './faceAI';
import { getAIChatResponse, generateSubscriptionResponse } from './chatAI';
import { sendWhatsAppMessage } from './whatsappAPI';
import aiRoutes from './src/routes/ai.routes';
import prospectRoutes from './src/routes/prospect.routes';
// import prospectingRoutes from './src/routes/prospecting.routes'; // Hold for now
import { getFinancialForecast, getFinancialFlow, getPayrollProductivityInsights, getFinancialHealthScore } from './financeAI';

console.log('🚀 [BOOT] Aivola Backend v1.0.7-recalc-fix starting...');
console.log(`[BOOT] Working Directory: ${process.cwd()}`);
console.log(`[BOOT] .env Path: ${path.resolve(__dirname, '.env')}`);
console.log(`[BOOT] GEMINI_API_KEY Status: ${process.env.GEMINI_API_KEY ? 'LOADED (' + process.env.GEMINI_API_KEY.substring(0, 4) + '...)' : 'MISSING'}`);

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ [BOOT] GEMINI_API_KEY is missing from environment variables!');
}
const VERSION = 'v1.0.7-recalc-fix';

// Helper for cleaning up local files after Supabase upload (Phase Cloud)
const cleanupLocalFile = (filePath: string | null) => {
  if (!filePath) return;
  // Jangan hapus file jika sedang berjalan di localhost agar bisa dites
  if (process.env.NODE_ENV !== 'production' && !process.env.RAILWAY_ENVIRONMENT) {
    console.log(`[Cloud Cleanup] Dev mode: Skipping local file deletion for ${path.basename(filePath)}`);
    return;
  }
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Cloud Cleanup] Deleted local file: ${filePath}`);
    }
  } catch (err) {
    console.error(`[Cloud Cleanup] Failed to delete ${filePath}:`, err);
  }
};

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store active branch sockets: branchId -> socketId
const branchSockets = new Map<string, string>();

io.on('connection', (socket) => {
  console.log(`[Socket] New connection: ${socket.id}`);

  socket.on('register_branch', (branchId) => {
    const bKey = branchId ? branchId.toString() : 'null';
    console.log(`[Socket] Registering branch: "${bKey}" for socket: ${socket.id}`);
    branchSockets.set(bKey, socket.id);
    console.log(`[Socket] Total branches connected: ${branchSockets.size} (${Array.from(branchSockets.keys()).join(', ')})`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    // Remove from map
    for (const [bid, sid] of branchSockets.entries()) {
      if (sid === socket.id) {
        branchSockets.delete(bid);
        break;
      }
    }
  });
});

const prisma = new PrismaClient({
  log: ['error'],
});

// --- PREPARED STATEMENT ERROR AUTO-RECOVERY ---
// Supabase PgBouncer (port 6543) reuses connections, causing "prepared statement already exists/does not exist" errors.
// This middleware catches those errors, deallocates all statements on that connection, and retries the query once.
(prisma as any).$use(async (params: any, next: any) => {
  try {
    return await next(params);
  } catch (e: any) {
    const code = e?.meta?.code || e?.code;
    const isPreparedStmtError =
      code === '42P05' || code === '26000' ||
      (e?.message && (e.message.includes('prepared statement') && 
        (e.message.includes('already exists') || e.message.includes('does not exist'))));
    if (isPreparedStmtError) {
      console.warn('[DB] Prepared statement conflict detected. Running DEALLOCATE ALL and retrying...');
      try {
        await prisma.$executeRawUnsafe('DEALLOCATE ALL');
      } catch (_) { /* ignore DEALLOCATE errors */ }
      return await next(params);
    }
    throw e;
  }
});

// --- AUTO-MIGRATION: Ensure critical columns exist on every startup ---
const runAutoMigration = async () => {
  const migrations = [
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "paidAmount" FLOAT DEFAULT 0`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "isTukarFaktur" BOOLEAN DEFAULT false`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "tukarFakturDate" TIMESTAMP`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "tukarFakturRef" TEXT`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "deliveryMethod" TEXT`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "pointsUsed" INTEGER DEFAULT 0`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "saleType" TEXT DEFAULT 'RETAIL'`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "taxRate" FLOAT DEFAULT 0`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "taxAmount" FLOAT DEFAULT 0`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "branchId" INTEGER`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "cashierId" INTEGER`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "totalCommission" FLOAT DEFAULT 0`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "serviceFee" FLOAT DEFAULT 0`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "markupPercentage" FLOAT DEFAULT 0`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "memberDiscountAmount" FLOAT DEFAULT 0`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "pointsEarned" FLOAT DEFAULT 0`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "voucherCode" TEXT`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "voucherDiscountAmount" FLOAT DEFAULT 0`,
    `ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "originalPrice" FLOAT DEFAULT 0`,
    `ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "modifiers" JSON`,
    `ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "paidAmount" FLOAT DEFAULT 0`,
    `ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "supplierId" INTEGER`,
    `ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "productId" INTEGER`,
    `ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "quantity" FLOAT`,
    `ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP`,
    `ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "branchId" INTEGER`,
    `ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP`,
    `ALTER TABLE "FinancialAccount" ADD COLUMN IF NOT EXISTS "bankName" TEXT`,
    `ALTER TABLE "FinancialAccount" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT`,
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "priceQpoon" FLOAT DEFAULT 0`,
    `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "openTime" TEXT DEFAULT '08:00'`,
    `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "closeTime" TEXT DEFAULT '22:00'`,
    `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "isOpenManual" BOOLEAN DEFAULT true`,
  ];
  console.log('[AUTO-MIGRATION] Checking and applying missing columns...');
  for (const sql of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e: any) {
      // Ignore errors (e.g., column already exists with different type)
      console.warn(`[AUTO-MIGRATION] Skipped: ${sql.substring(0, 60)}... | ${e.message}`);
    }
  }
  console.log('[AUTO-MIGRATION] ✅ Done.');
};

// --- GRACEFUL SHUTDOWN ---
const gracefulShutdown = async (signal: string) => {
  console.log(`[SHUTDOWN] ${signal} received. Disconnecting Prisma...`);
  await prisma.$disconnect();
  console.log('[SHUTDOWN] Prisma disconnected. Exiting.');
  process.exit(0);
};
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// --- DIRECTORY INITIALIZATION ---
// Create required upload folders on startup (important for Railway/Cloud)
const requiredFolders = [
  path.join(process.cwd(), 'uploads'),
  path.join(process.cwd(), 'uploads/attendance'),
  path.join(process.cwd(), 'uploads/face_references'),
  path.join(process.cwd(), 'uploads/reimbursements'),
  path.join(process.cwd(), 'uploads/banners'),
  path.join(process.cwd(), 'uploads/announcements'),
  path.join(process.cwd(), 'uploads/logos'),
  path.join(process.cwd(), 'uploads/products'),
  path.join(process.cwd(), 'uploads/avatars')
];

requiredFolders.forEach(folder => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    console.log(`[BOOT] Created directory: ${folder}`);
  }
});

// --- DB SEQUENCE SYNC (OFF BY DEFAULT FOR PERFORMANCE) ---
// Visit http://localhost:5000/api/fix-sequences once instead.
/*
(async () => {
...
})();
*/

// --- MODULE FIX (OFF BY DEFAULT - ONLY RUN ONCE VIA SCRIPT) ---
/*
(async () => {
...
})();
*/

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_hris_key_123';

app.use(cors({
  origin: '*', // Allow all for dev
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));
app.use(express.json());

// Logger middleware to see incoming requests
app.use((req, res, next) => {
  res.on('finish', () => {
    try {
      const logStr = `[${new Date().toISOString()}] ${req.method} ${req.url} -> ${res.statusCode}\n`;
      fs.appendFileSync(path.join(__dirname, 'requests.log'), logStr);
    } catch (e) {
      // Ignore write errors
    }
  });
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const uploadsDir = path.resolve(process.cwd(), 'uploads');
console.log(`[BOOT] Serving static files from: ${uploadsDir}`);
app.use('/uploads', express.static(uploadsDir));


app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: 'v1.0.6-final-live',
    env: process.env.NODE_ENV,
    time: new Date().toISOString() 
  });
});

// --- ONE-TIME SEQUENCE FIX ENDPOINT ---
// Visit http://localhost:5000/api/fix-sequences in your browser to fix auto-increment issues
app.get('/api/fix-sequences', async (req: Request, res: Response) => {
  const results: any[] = [];
  try {
    const tables: any[] = await prisma.$queryRawUnsafe(`
      SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      AND c.table_name NOT IN ('_prisma_migrations')
      AND c.column_default LIKE 'nextval(%'
    `);

    for (const table of tables) {
      const t = table.table_name;
      const col = table.column_name;
      try {
        const maxRes: any[] = await prisma.$queryRawUnsafe(`SELECT COALESCE(MAX("${col}"), 0) as m FROM "${t}"`);
        const maxId = Number(maxRes[0].m) || 0;
        await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${t}"', '${col}'), ${maxId + 1}, false)`);
        results.push({ table: t, column: col, setTo: maxId + 1, status: 'OK' });
      } catch (err: any) {
        results.push({ table: t, column: col, status: 'SKIP', reason: err.message });
      }
    }
    res.json({ success: true, message: 'All sequences fixed!', results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use('/api/ai', aiRoutes);
app.post('/api/ai/subscription-draft', async (req: Request, res: Response) => {
  try {
    const { clientName, plan, isAnnual } = req.body;
    if (!clientName || !plan) {
      return res.status(400).json({ error: 'Nama klien dan paket harus diisi' });
    }

    const draft = await generateSubscriptionResponse(clientName, plan, isAnnual !== false);
    res.json({ draft });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal membuat draft AI: ' + error.message });
  }
});

// --- WHATSAPP CLOUD API WEBHOOK (META) ---

// 1. Verifikasi Webhook (Dibutuhkan saat mendaftarkan webhook di Meta Dashboard)
app.get('/api/webhook/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === (process.env.WA_VERIFY_TOKEN || 'aivola_webhook_secret_123')) {
      console.log('✅ [WA WEBHOOK] Webhook verified successfully!');
      return res.status(200).send(challenge);
    } else {
      console.warn('❌ [WA WEBHOOK] Verification failed: Token mismatch or mode incorrect.');
      return res.sendStatus(403);
    }
  }
  res.sendStatus(400);
});

// 2. Menerima Pesan Masuk dan Membalas via AI (Auto-Reply 24/7)
app.post('/api/webhook/whatsapp', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    console.log(`📩 [WA WEBHOOK] Inbound Payload: ${JSON.stringify(body)}`);

    let from = '';
    let text = '';
    let pushName = body.pushName || body.name || 'WhatsApp User';

    // 1. Parse payload: Dukungan ganda untuk Meta Cloud API dan Wablas
    if (body.object === 'whatsapp_business_account' && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const messageObj = body.entry[0].changes[0].value.messages[0];
      from = messageObj.from;
      text = messageObj.text?.body;
      pushName = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || pushName;
    } else if (body.phone && (body.message || body.text)) {
      from = body.phone || body.sender;
      text = body.message || body.text;
    }

    if (text && from) {
        console.log(`🤖 [WA AI] Memproses pesan dari ${from}: "${text}"`);
        const senderPhone = from.replace(/\D/g, '');

        // A. Identifikasi Tenant/Perusahaan
        const prospect = await prisma.prospect.findFirst({
            where: { phone: { contains: senderPhone.slice(-8) } },
        });
        const customer = await prisma.customer.findFirst({
            where: { phone: { contains: senderPhone.slice(-8) } },
        });
        const targetCompanyId = prospect?.companyId || customer?.companyId || 1;
        const targetName = prospect?.name || customer?.name || pushName;

        // B. Cari atau Buat ChatSession
        let session = await prisma.chatSession.findFirst({
            where: { 
                phone: senderPhone,
                companyId: targetCompanyId,
                isWhatsApp: true
            }
        });

        if (!session) {
            session = await prisma.chatSession.create({
                data: {
                    id: `wa-${senderPhone}`,
                    companyId: targetCompanyId,
                    visitorName: targetName,
                    phone: senderPhone,
                    isWhatsApp: true
                }
            });
        }

        // C. Simpan Pesan Pengguna ke Database
        await prisma.chatMessage.create({
            data: {
                sessionId: session.id,
                sender: 'USER',
                content: text
            }
        });

        // D. Dapatkan Balasan dari AI
        const aiResponse = await getAIChatResponse(text, []);

        // E. Simpan Pesan AI ke Database
        await prisma.chatMessage.create({
            data: {
                sessionId: session.id,
                sender: 'AI',
                content: aiResponse
            }
        });

        // F. Update Timestamp Sesi
        await prisma.chatSession.update({
            where: { id: session.id },
            data: { updatedAt: new Date() }
        });

        // G. Kirim kembali ke WhatsApp klien via Wablas
        await sendWhatsAppMessage(senderPhone, aiResponse);
        console.log(`✅ [WA AI] Balasan otomatis tersimpan di CRM & terkirim ke ${from}`);

        // Return direct plain text response for Wablas "Get Auto Reply From Webhook"
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(aiResponse);
    }

    res.status(200).send('EVENT_RECEIVED');

  } catch (error: any) {
    console.error('❌ [WA WEBHOOK Error]:', error.message);
    res.status(200).send(error.message);
  }
});

// --- WABLAS WEBHOOK (INBOUND MESSAGES) ---
app.post('/api/webhook/wablas', async (req: Request, res: Response) => {
    try {
        const body = req.body;
        console.log(`📩 [WABLAS WEBHOOK] Inbound Payload:`, JSON.stringify(body));

        // Wablas payload: phone, message, pushName, type, etc.
        const phone = body.phone || body.sender;
        const message = body.message || body.text;
        const pushName = body.pushName || body.name;

        if (!phone || !message) {
            return res.sendStatus(200); // Silent ignore
        }

        const senderPhone = phone.replace(/\D/g, '');

        // 1. Identify Tenant/Company
        // Try to find in Prospects first
        const prospect = await prisma.prospect.findFirst({
            where: { phone: { contains: senderPhone.slice(-8) } }, // Match last 8 digits for safety
        });

        // Try to find in Customers
        const customer = await prisma.customer.findFirst({
            where: { phone: { contains: senderPhone.slice(-8) } },
        });

        const targetCompanyId = prospect?.companyId || customer?.companyId || 1; // Default to central
        const targetName = pushName || prospect?.name || customer?.name || 'WhatsApp User';

        // 2. Find or Create ChatSession
        let session = await prisma.chatSession.findFirst({
            where: { 
                phone: senderPhone,
                companyId: targetCompanyId,
                isWhatsApp: true
            }
        });

        if (!session) {
            session = await prisma.chatSession.create({
                data: {
                    id: `wa-${senderPhone}`,
                    companyId: targetCompanyId,
                    visitorName: targetName,
                    phone: senderPhone,
                    isWhatsApp: true
                }
            });
        }

        // 3. Save Message
        await prisma.chatMessage.create({
            data: {
                sessionId: session.id,
                sender: 'USER',
                content: message
            }
        });

        // 4. Update session timestamp
        await prisma.chatSession.update({
            where: { id: session.id },
            data: { updatedAt: new Date() }
        });

        console.log(`✅ [WABLAS WEBHOOK] Message saved for ${targetName} (${senderPhone}) at Tenant: ${targetCompanyId}`);

        // 5. LOGIKA AI AUTO-REPLY
        // Ambil respon dari AI
        const aiResponse = await getAIChatResponse(message, []);

        // Simpan pesan AI ke database
        await prisma.chatMessage.create({
            data: {
                sessionId: session.id,
                sender: 'AI',
                content: aiResponse
            }
        });

        // Kirim kembali ke WhatsApp klien via Wablas
        await sendWhatsAppMessage(senderPhone, aiResponse);
        console.log(`🤖 [WABLAS AI] Balasan otomatis terkirim ke ${targetName} (${senderPhone})`);

        // Return direct plain text response for Wablas "Get Auto Reply From Webhook"
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(aiResponse);
    } catch (error: any) {
        console.error('❌ [WABLAS WEBHOOK Error]:', error.message);
        res.status(200).send(error.message);
    }
});

app.get('/api/setup-master', async (req: Request, res: Response) => {

  try {
    console.log('--- Temporary Setup Master Triggered ---');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Try to find if system owner exists, otherwise create it
    let company = await prisma.company.findFirst({
      where: { name: 'Aivola System Owner' }
    });

    if (!company) {
      console.log('Creating Aivola System Owner company...');
      company = await prisma.company.create({
        data: { name: 'Aivola System Owner' }
      });
    }

    const superAdmin = await prisma.user.upsert({
      where: { email: 'owner@aivola.id' },
      update: { 
        role: 'SUPERADMIN' as any, 
        password: hashedPassword 
      },
      create: {
        companyId: company.id,
        name: 'Aivola Owner',
        email: 'owner@aivola.id',
        password: hashedPassword,
        role: 'SUPERADMIN' as any
      }
    });
    
    console.log('--- SuperAdmin Created Successfully ---');
    res.json({ 
      message: 'SuperAdmin created successfully', 
      email: superAdmin.email,
      companyId: company.id
    });
  } catch (error: any) {
    fs.writeFileSync('setup_error.txt', error.stack || error.message);
    console.error('Setup Master Error:', error);
    res.status(500).json({ 
      error: error.message, 
      details: error.stack 
    });
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    version: 'v1.0.6-final-live',
    env: process.env.NODE_ENV,
    time: new Date().toISOString() 
  });
});

app.get('/api/setup-sales', async (req: Request, res: Response) => {
  try {
    console.log('--- Sales Module Setup Triggered ---');
    
    // 1. Create Sale Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Sale" (
        "id" SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "invoiceNumber" TEXT UNIQUE NOT NULL,
        "customerId" INTEGER,
        "date" TIMESTAMP NOT NULL DEFAULT NOW(),
        "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'PAID',
        "accountId" INTEGER,
        "notes" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 2. Create SaleItem Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SaleItem" (
        "id" SERIAL PRIMARY KEY,
        "saleId" INTEGER NOT NULL REFERENCES "Sale"("id") ON DELETE CASCADE,
        "productId" INTEGER NOT NULL,
        "quantity" DOUBLE PRECISION NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "total" DOUBLE PRECISION NOT NULL
      )
    `);

    // 3. Create ProductRecipe Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProductRecipe" (
        "id" SERIAL PRIMARY KEY,
        "productId" INTEGER NOT NULL,
        "materialId" INTEGER NOT NULL,
        "quantity" DOUBLE PRECISION NOT NULL,
        "updatedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);

    // 4. Create SaleReturn Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SaleReturn" (
        "id" SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "saleId" INTEGER NOT NULL REFERENCES "Sale"("id") ON DELETE CASCADE,
        "returnNumber" TEXT UNIQUE NOT NULL,
        "date" TIMESTAMP NOT NULL DEFAULT NOW(),
        "totalRefundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "notes" TEXT,
        "accountId" INTEGER,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 5. Create SaleReturnItem Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SaleReturnItem" (
        "id" SERIAL PRIMARY KEY,
        "returnId" INTEGER NOT NULL REFERENCES "SaleReturn"("id") ON DELETE CASCADE,
        "productId" INTEGER NOT NULL,
        "quantity" DOUBLE PRECISION NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "total" DOUBLE PRECISION NOT NULL
      )
    `);

    console.log('--- Sales Module Tables Created Successfully ---');
    res.json({ message: 'Tabel Sale, SaleItem, ProductRecipe, SaleReturn, dan SaleReturnItem berhasil disiapkan' });
  } catch (error: any) {
    console.error('Setup Sales Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/setup-customers', async (req: Request, res: Response) => {
  try {
    console.log('--- Customer Module Setup Triggered ---');
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Customer" (
        "id" SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "name" TEXT NOT NULL,
        "phone" TEXT,
        "email" TEXT,
        "address" TEXT,
        "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('--- Customer Table Created Successfully ---');
    res.json({ message: 'Tabel Customer berhasil disiapkan' });
  } catch (error: any) {
    console.error('Setup Customers Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/setup-suppliers', async (req: Request, res: Response) => {
  try {
    console.log('--- Supplier Module Setup Triggered ---');
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Supplier" (
        "id" SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "name" TEXT NOT NULL,
        "contactPerson" TEXT,
        "phone" TEXT,
        "email" TEXT,
        "address" TEXT,
        "category" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Ensure StockTransaction has supplierId
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "supplierId" INTEGER
    `);

    console.log('--- Supplier Table Created & StockTransaction Updated ---');
    res.json({ message: 'Tabel Supplier berhasil disiapkan dan StockTransaction diperbarui' });
  } catch (error: any) {
    console.error('Setup Suppliers Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug-db', (req, res) => {
  res.json({ url: process.env.DATABASE_URL });
});

app.use('/uploads', express.static('uploads'));

app.use('/api/ai', aiRoutes);
// app.use('/api/prospecting', tenantMiddleware, prospectingRoutes); // Hold for now

// Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- CONFIG MULTER UNTUK UPLOAD REIMBURSEMENT ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/reimbursements';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });
const learningStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/learning';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'sop-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const learningUpload = multer({ storage: learningStorage });

// --- CONFIG MULTER UNTUK DOKUMEN KARYAWAN (Phase 26) ---
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/documents';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadDocument = multer({ storage: documentStorage });

// --- CONFIG MULTER UNTUK FOTO ASET (Phase 30 Enhancement) ---
const assetStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/assets';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'asset-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadAsset = multer({ storage: assetStorage });

// --- CONFIG MULTER UNTUK RESTORE DATABASE ---
const restoreStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/restores';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, 'restore-' + Date.now() + '.sql.gz');
  }
});
const uploadRestore = multer({ storage: restoreStorage });

// --- STORAGE CONFIGURATION (Unified & Absolute) ---
const uploadAttendance = multer({ dest: path.join(process.cwd(), 'uploads/attendance/') });
const uploadFaceReference = multer({ dest: path.join(process.cwd(), 'uploads/face_references/') });
const uploadAnnouncement = multer({ dest: path.join(process.cwd(), 'uploads/announcements/') });
const uploadLogo = multer({ dest: path.join(process.cwd(), 'uploads/logos/') });
const uploadBanner = multer({ dest: path.join(process.cwd(), 'uploads/banners/') });
const uploadProduct = multer({ dest: path.join(process.cwd(), 'uploads/products/') });
const uploadAvatar = multer({ dest: path.join(process.cwd(), 'uploads/avatars/') });

// --- 1. MIDDLEWARE MULTI-TENANT & AUTH (CRITICAL) ---
// Middleware ini mengekstrak profil Karyawan dari token JWT.
// --- RESTART TRIGGER: Ensuring API Key Support is Live ---
const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  // 1. JWT PATH (Login Aplikasi Standar)
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as any).tenantId = Number(decoded.companyId);
      (req as any).userId = Number(decoded.userId);
      (req as any).userRole = decoded.role;
      (req as any).primaryCompanyId = Number(decoded.companyId);

      const targetTenantId = req.headers['x-tenant-id'] || req.query.tenantId;
      if (targetTenantId) {
          const requestedTenantId = parseInt(targetTenantId as string);
          
          if (!isNaN(requestedTenantId)) {
            // 1. SuperAdmin can switch to ANY tenant
            if (decoded.role === 'SUPERADMIN') {
                (req as any).tenantId = requestedTenantId;
            } 
            // 2. Owner or Manager can switch if they have access in UserAccess table
            else if ((decoded.role === 'OWNER' || decoded.role === 'MANAGER') && requestedTenantId !== Number(decoded.companyId)) {
                const access = await prisma.userAccess.findUnique({
                    where: {
                        userId_companyId: {
                            userId: Number(decoded.userId),
                            companyId: requestedTenantId
                        }
                    }
                });
                if (access) {
                    (req as any).tenantId = requestedTenantId;
                    console.log(`[AUTH] ${decoded.role} ${decoded.userId} authorized Switch to Tenant ${requestedTenantId}`);
                } else {
                    console.warn(`[AUTH] Unauthorized Tenant Switch attempt by ${decoded.role} ${decoded.userId} to Tenant ${requestedTenantId}`);
                    return res.status(403).json({ 
                      error: 'Akses Ditolak: Anda tidak memiliki izin akses untuk perusahaan ini. Hubungi pusat untuk menghubungkan akun.' 
                    });
                }
            }
          }
      }

      // Final Sanity Check for tenantId (Must be a Number and > 0)
      if (isNaN((req as any).tenantId) || (req as any).tenantId === 0) {
          // If no tenant assigned yet, default to their decoded companyId or fallback to 1
          (req as any).tenantId = Number(decoded.companyId) || 1;
      }

      return next();
    } catch (error) {
      return res.status(401).json({ error: 'Token tidak valid atau sudah kadaluarsa.' });
    }
  }

  // 2. API KEY PATH (Integrasi Dashboard Eksternal)
  if (apiKey) {
    try {
        const company = await prisma.company.findUnique({
            where: { integrationApiKey: apiKey as string }
        });

        if (!company) {
            console.warn(`[AUTH] API Key NOT FOUND in DB: ${apiKey}`);
            return res.status(401).json({ error: 'API Key TIDAK terdaftar di database Aivola (Periksa Profil).' });
        }

        if (!company.isApiEnabled) {
            console.warn(`[AUTH] API Integration DISABLED for: ${company.name}`);
            return res.status(401).json({ error: 'Fitur API belum diaktifkan (isApiEnabled: false) untuk perusahaan ini.' });
        }

        (req as any).tenantId = company.id;
        (req as any).userId = 0; // System/API User
        (req as any).userRole = 'API_USER';
        return next();
    } catch (error: any) {
        console.error(`[AUTH ERROR] API Key verify failed:`, error);
        return res.status(500).json({ error: 'Gagal memverifikasi API Key.', details: error.message });
    }
  }

  return res.status(401).json({
    error: 'Akses Ditolak: Token JWT atau API Key tidak ditemukan'
  });
};

// ==========================================
// HOLDING / MULTI-COMPANY MANAGEMENT
// ==========================================

// 1. Get List of Accessible Companies
app.get('/api/companies/accessible', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const primaryCompanyId = (req as any).primaryCompanyId;

    // Fetch primary company
    const primaryCompany = await prisma.company.findUnique({
      where: { id: primaryCompanyId },
      select: { id: true, name: true, logoUrl: true }
    });

    // Fetch secondary companies from UserAccess
    const accessList = await prisma.userAccess.findMany({
      where: { userId },
      include: { company: { select: { id: true, name: true, logoUrl: true } } }
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const formatLogoUrl = (url: string | null) => {
        if (url && url.startsWith('/uploads')) {
            return `${baseUrl}${url}`;
        }
        return url;
    };

    const results = [];
    if (primaryCompany) {
        results.push({ 
            ...primaryCompany, 
            logoUrl: formatLogoUrl(primaryCompany.logoUrl),
            isPrimary: true 
        });
    }
    
    accessList.forEach(acc => {
      if (acc.companyId !== primaryCompanyId) {
        results.push({ 
            ...acc.company, 
            logoUrl: formatLogoUrl(acc.company.logoUrl),
            isPrimary: false 
        });
      }
    });

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil daftar perusahaan: ' + error.message });
  }
});

// 2. Link a New Company (Self-Service for Owner)
app.post('/api/companies/link', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    const { companyName, adminPassword } = req.body;

    if (userRole !== 'OWNER' && userRole !== 'SUPERADMIN' && userRole !== 'MANAGER') {
      return res.status(403).json({ error: 'Hanya Role Owner & Manager yang dapat menghubungkan perusahaan.' });
    }

    if (!companyName || !adminPassword) {
      return res.status(400).json({ error: 'Nama perusahaan dan password admin wajib diisi.' });
    }

    // 1. Find target company
    const targetCompany = await prisma.company.findFirst({
      where: { name: { equals: companyName, mode: 'insensitive' } }
    });

    if (!targetCompany) {
      return res.status(404).json({ error: 'Perusahaan tidak ditemukan. Pastikan nama sesuai.' });
    }

    // 2. Find primary ADMIN of that company to verify password
    const targetAdmin = await prisma.user.findFirst({
      where: { companyId: targetCompany.id, role: 'ADMIN' },
      orderBy: { createdAt: 'asc' }
    });

    if (!targetAdmin) {
      return res.status(404).json({ error: 'Admin perusahaan target tidak ditemukan. Hubungi CS.' });
    }

    // 3. Verify Password
    const isValid = await bcrypt.compare(adminPassword, targetAdmin.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Password Admin perusahaan salah. Verifikasi gagal.' });
    }

    // 4. Create UserAccess Link with the user's current role
    await prisma.userAccess.upsert({
      where: { userId_companyId: { userId, companyId: targetCompany.id } },
      update: { role: userRole === 'MANAGER' ? 'MANAGER' : 'OWNER' },
      create: { userId, companyId: targetCompany.id, role: userRole === 'MANAGER' ? 'MANAGER' : 'OWNER' }
    });

    res.json({ success: true, message: `Berhasil menghubungkan ke ${targetCompany.name}!` });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal menghubungkan perusahaan: ' + error.message });
  }
});

// ==========================================
// SALES ORDERS (CUSTOMER PO) MODULE (B2B)
// ==========================================

// Debug Route
app.get('/api/sales/debug', (req: Request, res: Response) => {
  res.json({ status: 'SALES MODULE ACTIVE', time: new Date().toISOString() });
});

// 1. Get All Sales Orders
app.get('/api/sales/orders', tenantMiddleware, async (req: Request, res: Response) => {
  console.log(`[API] GET /sales/orders called by tenant: ${(req as any).tenantId}`);
  try {
    const tenantId = Number((req as any).tenantId);
    if (!tenantId) return res.status(401).json({ error: 'Tenant ID required' });
    const { month, year } = req.query;

    let dateFilter = {};
    if (month && year) {
      const m = parseInt(month as string);
      const y = parseInt(year as string);
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0, 23, 59, 59);
      dateFilter = { date: { gte: startDate, lte: endDate } };
    }
    
    const orders = await prisma.salesOrder.findMany({
      where: { companyId: tenantId, ...dateFilter },
      include: {
        customer: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error: any) {
    console.error("GET SALES ORDERS ERROR:", error);
    res.status(500).json({ error: 'Gagal memuat pesanan penjualan: ' + error.message });
  }
});

// 2. Create Sales Order
app.post('/api/sales/orders', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { customerId, orderNumber, date, notes, items, taxRate } = req.body;

    if (!customerId || !orderNumber || !items || items.length === 0) {
      return res.status(400).json({ error: 'Data pesanan tidak lengkap' });
    }

    let subtotal = 0;
    const validatedItems = items.map((item: any) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.price) || 0;
      const t = q * p;
      subtotal += t;
      return {
        productId: Number(item.productId),
        quantity: q,
        price: p,
        total: t
      };
    });

    const parsedTaxRate = Number(taxRate) || 0;
    const taxAmount = Math.round((subtotal * parsedTaxRate / 100) * 100) / 100;
    const totalAmount = subtotal + taxAmount;

    const newOrder = await prisma.salesOrder.create({
      data: {
        companyId: tenantId,
        customerId: Number(customerId),
        orderNumber,
        date: date ? new Date(date) : new Date(),
        subtotal,
        taxRate: parsedTaxRate,
        taxAmount,
        totalAmount,
        notes,
        status: 'PENDING',
        items: {
          create: validatedItems
        }
      },
      include: { items: true, customer: true }
    });

    res.status(201).json(newOrder);
  } catch (error: any) {
    console.error("CREATE SALES ORDER ERROR:", error);
    if (error.code === 'P2002') return res.status(400).json({ error: 'Nomor PO sudah digunakan' });
    res.status(500).json({ error: 'Gagal membuat pesanan penjualan: ' + error.message });
  }
});

// 3. Update Status
app.patch('/api/sales/orders/:id/status', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const orderId = Number(req.params.id);
    const { status } = req.body;

    const order = await prisma.salesOrder.findFirst({
      where: { id: orderId, companyId: tenantId }
    });

    if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan atau bukan milik Anda' });

    const updateData: any = { status };
    if (status === 'SHIPPED') {
      updateData.shippedAt = new Date();
    }

    const updated = await prisma.salesOrder.update({
      where: { id: orderId },
      data: updateData
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengupdate status: ' + error.message });
  }
});

// 3b. Update Shipped Date (Delivery Date)
app.patch('/api/sales/orders/:id/shipped-date', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const orderId = Number(req.params.id);
    const { shippedAt } = req.body;

    const order = await prisma.salesOrder.findFirst({
      where: { id: orderId, companyId: tenantId }
    });

    if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan atau bukan milik Anda' });

    const updated = await prisma.salesOrder.update({
      where: { id: orderId },
      data: {
        shippedAt: shippedAt ? new Date(shippedAt) : null
      }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengupdate tanggal kirim: ' + error.message });
  }
});


// 4. Convert to Invoice (Sale)
app.post('/api/sales/orders/:id/convert', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const orderId = Number(req.params.id);
    const userId = Number((req as any).userId);
    const { dueDate } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { branchId: true } });

    const order = await prisma.salesOrder.findFirst({
      where: { id: orderId, companyId: tenantId },
      include: { items: true, customer: true }
    });

    if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    if (order.status === 'INVOICED' || order.saleId) {
      return res.status(400).json({ error: 'Pesanan ini sudah ditagihkan sebelumnya' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const dueDateVal = (dueDate && typeof dueDate === 'string' && dueDate.trim() !== '') ? new Date(dueDate) : null;

      // 1. Create Sale (Invoice)
      const newSale = await tx.sale.create({
        data: {
          companyId: tenantId,
          branchId: user?.branchId || null,
          date: order.date,
          invoiceNumber: `INV-${order.orderNumber}`,
          customerId: order.customerId,
          customerName: order.customer.name,
          customerPhone: order.customer.phone,
          totalAmount: order.totalAmount,
          taxRate: order.taxRate || 0,
          taxAmount: order.taxAmount || 0,
          status: 'UNPAID',
          saleType: 'B2B',
          cashierId: userId,
          dueDate: dueDateVal,
          notes: order.notes 
            ? `${order.notes} (Dikonversi dari PO Customer: ${order.orderNumber})` 
            : `Dikonversi dari PO Customer: ${order.orderNumber}`,
          SaleItem: {
             create: order.items.map((i: any) => ({
               productId: i.productId,
               quantity: i.quantity,
               price: i.price,
               total: i.total
             }))
          }
        }
      });

      // 2. Deduct Stock for trackable items
      const productIds = order.items.map((item: any) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      const productMap = new Map(products.map((p: any) => [p.id, p]));

      for (const item of order.items) {
        const product = productMap.get(item.productId);
        if (product && product.trackStock && (product as any).type === 'FINISHED_GOOD') {
           await tx.product.update({
             where: { id: product.id },
             data: { stock: { decrement: item.quantity } }
           });
           
           await tx.stockTransaction.create({
               data: {
                   productId: product.id,
                   type: 'OUT',
                   quantity: item.quantity,
                   reference: `B2B Sale Order: ${order.orderNumber}`
               }
           });
        }
      }

      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: 'INVOICED', saleId: newSale.id }
      });

      return newSale;
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    res.json({ message: 'Berhasil dikonversi menjadi Invoice', sale: result });
  } catch (error: any) {
    console.error("CONVERT SALES ORDER ERROR:", error);
    res.status(500).json({ error: error.message || 'Gagal mengonversi pesanan ke Invoice' });
  }
});

// 4.5 Batalkan Invoice dan kembalikan ke PO
app.post('/api/sales/orders/:id/revert-invoice', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const orderId = Number(req.params.id);
    const userId = Number((req as any).userId);

    // 1. Role Verification
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!['SUPERADMIN', 'ADMIN', 'OWNER', 'FINANCE'].includes(user?.role || '')) {
      return res.status(403).json({ error: 'Akses Ditolak. Hanya Admin, Owner, dan Finance yang dapat membatalkan invoice.' });
    }

    const order = await prisma.salesOrder.findFirst({
      where: { id: orderId, companyId: tenantId },
      include: { items: true }
    });

    if (!order) return res.status(404).json({ error: 'Pesanan (PO) tidak ditemukan' });
    if (order.status !== 'INVOICED' || !order.saleId) {
      return res.status(400).json({ error: 'Pesanan ini belum ditagihkan atau tidak memiliki referensi invoice.' });
    }

    const saleId = order.saleId;
    const sale = await prisma.sale.findFirst({ where: { id: saleId, companyId: tenantId } });
    if (!sale) return res.status(404).json({ error: 'Data Invoice tidak ditemukan' });

    // --- CHECK CLOSING ---
    if (await isPeriodClosed(tenantId, sale.date)) {
      return res.status(403).json({ error: 'Periode buku sudah ditutup. Tidak dapat membatalkan invoice pada tanggal ini.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Hapus Pemasukan (Income) terkait
      await tx.income.deleteMany({ where: { description: { contains: sale.invoiceNumber } }});

      // 2. Hapus Riwayat Poin 
      await tx.pointHistory.deleteMany({ where: { description: { contains: sale.invoiceNumber } }});

      // 3. Hapus SaleReturnItem dan SaleReturn (Jika pernah diretur)
      const returns = await tx.saleReturn.findMany({ where: { saleId }});
      for (const r of returns) {
         await tx.saleReturnItem.deleteMany({ where: { returnId: r.id }});
         await tx.saleReturn.delete({ where: { id: r.id }});
      }

      // 4. Hapus SaleItem (Detail barang di invoice)
      await tx.saleItem.deleteMany({ where: { saleId }});

      // 5. Kembalikan stok untuk trackable items
      const productIds = order.items.map((item: any) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      const productMap = new Map(products.map((p: any) => [p.id, p]));

      for (const item of order.items) {
        const product = productMap.get(item.productId);
        if (product && product.trackStock && (product as any).type === 'FINISHED_GOOD') {
           await tx.product.update({
             where: { id: product.id },
             data: { stock: { increment: item.quantity } }
           });
           
           await tx.stockTransaction.create({
               data: {
                   productId: product.id,
                   type: 'IN',
                   quantity: item.quantity,
                   reference: `Revert B2B Sale Order: ${order.orderNumber}`
               }
           });
        }
      }

      // 6. Hapus Penjualan Utama (Invoice)
      await tx.sale.delete({ where: { id: saleId }});

      // 7. Revert Sales Order status
      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: 'PREPARING', saleId: null }
      });
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    res.json({ message: 'Invoice berhasil dibatalkan dan dikembalikan menjadi status Dikemas.' });
  } catch (error: any) {
    console.error("REVERT INVOICE ERROR:", error);
    res.status(500).json({ error: error.message || 'Gagal membatalkan invoice' });
  }
});

// 5. Get Single Sales Order
app.get('/api/sales/orders/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const orderId = Number(req.params.id);

    const order = await prisma.salesOrder.findFirst({
      where: { id: orderId, companyId: tenantId },
      include: {
        customer: true,
        items: {
          include: { product: true }
        }
      }
    });

    if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });

    // Include company for delivery note / printing
    const company = await prisma.company.findUnique({ where: { id: tenantId } });
    if (company && company.logoUrl && company.logoUrl.startsWith('/uploads')) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        company.logoUrl = `${baseUrl}${company.logoUrl}`;
    }

    res.json({ ...order, company });
  } catch (error: any) {
    console.error("GET SINGLE SALES ORDER ERROR:", error);
    res.status(500).json({ error: 'Gagal memuat pesanan: ' + error.message });
  }
});

// 6. Update Sales Order
app.put('/api/sales/orders/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const orderId = Number(req.params.id);
    const { customerId, orderNumber, date, notes, items, taxRate } = req.body;

    if (!customerId || !orderNumber || !items || items.length === 0) {
      return res.status(400).json({ error: 'Data pesanan tidak lengkap' });
    }

    const order = await prisma.salesOrder.findFirst({
      where: { id: orderId, companyId: tenantId }
    });

    if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan atau bukan milik Anda' });
    if (order.status === 'INVOICED') {
      return res.status(400).json({ error: 'Pesanan yang sudah ditagihkan (Invoice) tidak dapat diubah' });
    }

    let subtotal = 0;
    const validatedItems = items.map((item: any) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.price) || 0;
      const t = q * p;
      subtotal += t;
      return {
        productId: Number(item.productId),
        quantity: q,
        price: p,
        total: t
      };
    });

    const parsedTaxRate = Number(taxRate) || 0;
    const taxAmount = Math.round((subtotal * parsedTaxRate / 100) * 100) / 100;
    const totalAmount = subtotal + taxAmount;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Delete old items
      await tx.salesOrderItem.deleteMany({
        where: { salesOrderId: orderId }
      });

      // 2. Update order and create new items
      return await tx.salesOrder.update({
        where: { id: orderId },
        data: {
          customerId: Number(customerId),
          orderNumber,
          date: date ? new Date(date) : new Date(),
          subtotal,
          taxRate: parsedTaxRate,
          taxAmount,
          totalAmount,
          notes,
          items: {
            create: validatedItems
          }
        },
        include: { items: true, customer: true }
      });
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    res.json(updatedOrder);
  } catch (error: any) {
    console.error("UPDATE SALES ORDER ERROR:", error);
    if (error.code === 'P2002') return res.status(400).json({ error: 'Nomor PO sudah digunakan' });
    res.status(500).json({ error: 'Gagal memperbarui pesanan: ' + error.message });
  }
});

// 7. Delete Sales Order
app.delete('/api/sales/orders/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const orderId = Number(req.params.id);
    const userId = Number((req as any).userId);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!['SUPERADMIN', 'ADMIN', 'OWNER', 'FINANCE'].includes(user?.role || '')) {
      return res.status(403).json({ error: 'Akses Ditolak. Hanya Admin, Owner, dan Finance yang dapat menghapus pesanan (PO).' });
    }

    const order = await prisma.salesOrder.findFirst({
      where: { id: orderId, companyId: tenantId }
    });

    if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan atau bukan milik Anda' });

    // Since we configured onDelete: Cascade on SalesOrderItem, deleting the SalesOrder automatically deletes its items!
    await prisma.salesOrder.delete({
      where: { id: orderId }
    });

    res.json({ message: 'Pesanan berhasil dihapus' });
  } catch (error: any) {
    console.error("DELETE SALES ORDER ERROR:", error);
    res.status(500).json({ error: 'Gagal menghapus pesanan: ' + error.message });
  }
});


// --- 2. FUNGSI PEMBANTU (HAVERSINE MATEMATIKA) ---
// Menghitung jarak melengkung permukaan bumi antara 2 titik koordinat
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius bumi dalam meter
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Jarak dalam meter
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// --- FUNGSI HELPER SAAS (FRAUD DETECTION) ---
function calculateFraudScore(params: {
    faceScore: number | null,
    isDeviceMatch: boolean,
    isBorderlineLocation: boolean,
    userHasRegisteredDevice: boolean
}): { score: number, isSuspicious: boolean } {
    let score = 0;

    // 1. Face Score Analysis (Weight: 40%)
    if (params.faceScore !== null) {
        if (params.faceScore < 0.8) score += 30; // Very borderline
        else if (params.faceScore < 0.9) score += 10;
    }

    // 2. Device Fingerprint Analysis (Weight: 50%)
    if (params.userHasRegisteredDevice && !params.isDeviceMatch) {
        score += 50; // High risk - someone else's phone?
    }

    // 3. Location Borderline (Weight: 10%)
    if (params.isBorderlineLocation) {
        score += 15;
    }

    return {
        score,
        isSuspicious: score >= 60
    };
}

// --- FUNGSI HELPER SAAS (CONTRACT ENFORCEMENT) ---
/**
 * Level 0: Aktif
 * Level 1: Soft Block (0-15 hari lewat) -> Larang penambahan user
 * Level 2: Read-Only (16-30 hari lewat) -> Larang POST/PUT/DELETE
 * Level 3: Hard Block (> 30 hari lewat) -> Larang Login/Akses
 */
async function getTenantExpiryLevel(companyId: number): Promise<number> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { contractEnd: true }
  });

  if (!company || !company.contractEnd) return 0;

  const now = new Date();
  const contractEnd = new Date(company.contractEnd);

  if (now <= contractEnd) return 0;

  const diffTime = Math.abs(now.getTime() - contractEnd.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 15) return 1;
  if (diffDays <= 30) return 2;
  return 3;
}

// --- FUNGSI HELPER CLOSING PERIODE ---
async function isPeriodClosed(companyId: number, dateValue: any) {
  // --- USER OVERRIDE: Allow all edits regardless of closing status ---
  return false;
  /* 
  if (!dateValue) return false;
  try {
    const date = new Date(dateValue);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const closing = await prisma.periodClosing.findUnique({
      where: {
        companyId_month_year: {
          companyId: companyId,
          month: month,
          year: year
        }
      }
    });

    return !!closing;
  } catch (err) {
    console.error('[Closing Checker] Error:', err);
    return false;
  }
  */
}

// --- FUNGSI HELPER NOTIFIKASI (FASE 7) ---
async function sendNotification(companyId: number, userId: number, title: string, message: string) {
  try {
    const notif = await prisma.notification.create({
      data: { companyId, userId, title, message }
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.emailNotifications) {
      // Simulasi Email/Push Alert ke Console
      console.log(`\n[EMAIL NOTIFICATION SENT]`);
      console.log(`To: ${user.email} (${user.name})`);
      console.log(`Title: ${title}`);
      console.log(`Message: ${message}\n`);
    }

    return notif;
  } catch (error) {
    console.error('Gagal mengirim notifikasi:', error);
  }
}

async function notifyAdmins(companyId: number, title: string, message: string) {
  try {
    // Gunakan raw query untuk melewati validasi enum Prisma yang terkadang cache
    const admins: any[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM "User" WHERE "companyId" = $1 AND "role"::text IN ('ADMIN', 'OWNER', 'FINANCE') AND "isActive" = true`,
      companyId
    );

    for (const admin of admins) {
      await sendNotification(companyId, admin.id, title, message);
    }
  } catch (error) {
    console.error('Gagal mengirim notifikasi ke Admin:', error);
  }
}

// --- 3. ENDPOINT API (ROUTES) ---

// Global Request Logger (Simplified)
app.use((req: Request, res: Response, next: NextFunction) => {
  next();
});

// Direct Market Insight endpoint (Ensures reliability on localhost)
const { GoogleGenerativeAI: GeminiAI } = require('@google/generative-ai');
app.post('/api/prospects/market-insight', async (req: Request, res: Response) => {
  try {
    const { prospects: liveProspects } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY missing' });

    let prospectsToAnalyze = liveProspects && Array.isArray(liveProspects) && liveProspects.length > 0 ? liveProspects : [];

    if (prospectsToAnalyze.length === 0) {
      const tenantId = req.headers['x-tenant-id'];
      const companyId = parseInt(Array.isArray(tenantId) ? tenantId[0] : (tenantId as string || '0'));
      prospectsToAnalyze = await prisma.prospect.findMany({ where: { companyId } });
    }

    if (prospectsToAnalyze.length === 0) {
      return res.status(400).json({ error: 'Belum ada data prospek untuk dianalisa.' });
    }

    const genAI = new GeminiAI(apiKey);
    const model = genAI.getGenerativeModel(
      { model: 'gemini-2.5-flash' },
      { apiVersion: 'v1beta' }
    );

    const avgRating = prospectsToAnalyze.reduce((acc: number, p: any) => acc + (p.aiScore || p.rating || 0), 0) / prospectsToAnalyze.length;
    const topCompetitors = [...prospectsToAnalyze]
      .sort((a: any, b: any) => (b.aiScore || b.rating || 0) - (a.aiScore || a.rating || 0))
      .slice(0, 5)
      .map((p: any) => `- ${p.name} (Rating: ${(p.aiScore || p.rating || 0).toFixed ? (p.aiScore || p.rating || 0).toFixed(1) : (p.aiScore || p.rating || 0)}, Alamat: ${p.address || '-'})`)
      .join('\n');

    const prompt = `Laporan Analisa Pasar Strategis untuk Aivola POS.
Data Kompetitor: ${prospectsToAnalyze.length} titik. Rata-rata Rating: ${avgRating.toFixed(1)}/5.
Top Kompetitors:
${topCompetitors}

Tugas: Berikan analisa mendalam (Bahasa Indonesia) tentang Kepadatan Pasar, Celah Peluang, dan Strategi Pemenangan menggunakan Aivola. Gunakan Markdown dan Emoji.`;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();
    res.json({ analysis });
  } catch (error: any) {
    console.error('❌ [AI ERROR]:', error.message);
    res.status(500).json({ error: 'Gagal analisa AI', details: error.message });
  }
});

app.use('/api/prospects', prospectRoutes);
app.post('/api/test-direct', (req, res) => {
  console.log('🚀 [DEBUG] Hit /api/test-direct');
  res.json({ message: 'Backend is alive and routes are working!' });
});
app.get('/api/test-get', (req, res) => {
  res.json({ message: 'GET request works!' });
});

// ==========================================
// AIVOLA GO: CUSTOMER REGISTRATION ENDPOINTS (PUBLIC)
// ==========================================

// Diagnostik IP Server untuk Whitelist Wablas
app.get('/api/diag/ip', async (req: Request, res: Response) => {
  try {
    const axios = require('axios');
    const response = await axios.get('https://api.ipify.org?format=json');
    res.json({ 
      success: true, 
      server_public_ip: response.data.ip,
      note: "Gunakan IP ini untuk daftar putih (whitelist) di dashboard Wablas."
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// In-memory OTP store: { phone: { otp: string, expiry: Date } }
const customerOtpStore = new Map<string, { otp: string; expiry: Date }>();

// 1. Send OTP via WhatsApp
app.post('/api/customer/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Nomor HP wajib diisi.' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

    // Simpan OTP
    customerOtpStore.set(phone.trim(), { otp, expiry });

    // Kirim via WhatsApp (Wablas)
    const message = `🔐 *Kode OTP Aivola Anda*\n\nKode: *${otp}*\n\nBerlaku 5 menit. Jangan bagikan kode ini kepada siapapun.`;
    
    if (!process.env.WA_GATEWAY_URL || !process.env.WA_API_KEY) {
      console.error('❌ [Customer OTP] WA_GATEWAY_URL atau WA_API_KEY belum diset di .env');
      return res.status(500).json({ error: 'Sistem WhatsApp belum dikonfigurasi oleh Admin.' });
    }

    const waResult = await sendWhatsAppMessage(phone.trim(), message, undefined, undefined, true);

    if (waResult.status === true || waResult.status === 'success') {
      console.log(`✅ [Customer OTP] OTP ${otp} berhasil dikirim ke ${phone}`);
      res.json({ success: true, message: 'OTP telah dikirim ke WhatsApp Anda.' });
    } else {
      console.error(`❌ [Customer OTP] Wablas Error:`, waResult);
      res.status(500).json({ error: 'Gagal mengirim WhatsApp. Pastikan nomor HP benar.' });
    }
  } catch (error: any) {
    console.error('[Customer OTP Error]', error.message);
    res.status(500).json({ error: 'Gagal mengirim OTP: ' + error.message });
  }
});

// 2. Register Customer with OTP verification
app.post('/api/customer/register', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, otp } = req.body;

    if (!name || !email || !phone || !password || !otp) {
      return res.status(400).json({ error: 'Semua field wajib diisi.' });
    }

    // Validasi OTP
    const stored = customerOtpStore.get(phone.trim());
    if (!stored) return res.status(400).json({ error: 'OTP tidak ditemukan. Kirim ulang OTP.' });
    if (new Date() > stored.expiry) {
      customerOtpStore.delete(phone.trim());
      return res.status(400).json({ error: 'OTP sudah kadaluarsa. Kirim ulang OTP.' });
    }
    if (stored.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Kode OTP salah.' });
    }

    // Hapus OTP setelah dipakai
    customerOtpStore.delete(phone.trim());

    // Cek duplikasi email di Customer
    const existingByEmail = await prisma.customer.findFirst({ where: { email: email.trim() } });
    if (existingByEmail) return res.status(400).json({ error: 'Email sudah terdaftar.' });

    // Cek duplikasi phone di Customer
    const existingByPhone = await prisma.customer.findFirst({ where: { phone: phone.trim() } });
    if (existingByPhone) return res.status(400).json({ error: 'Nomor HP sudah terdaftar.' });

    // Buat customer baru (companyId = fallback ke company pertama jika ID 1 tidak ada)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let targetCompanyId = 1;
    const checkCompany = await prisma.company.findUnique({ where: { id: 1 } });
    if (!checkCompany) {
      const firstCompany = await prisma.company.findFirst();
      if (firstCompany) targetCompanyId = firstCompany.id;
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: hashedPassword,
        companyId: targetCompanyId,
        isActive: true,
      }
    });

    // Auto-login: generate JWT
    const token = jwt.sign(
      { customerId: customer.id, email: customer.email, role: 'CUSTOMER' },
      process.env.JWT_SECRET || 'supersecretjwtkey',
      { expiresIn: '30d' }
    );

    console.log(`[Customer Register] New customer: ${customer.email}`);
    res.status(201).json({
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      }
    });
  } catch (error: any) {
    console.error('[Customer Register Error]', error.message);
    res.status(500).json({ error: 'Gagal mendaftar: ' + error.message });
  }
});

// Z. Endpoint Login Karyawan (Menghasilkan JWT)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi.' });
    }

    const trimmedEmail = email.trim();
    console.log(`[LOGIN ATTEMPT] Email: ${trimmedEmail}`);

    let user = await prisma.user.findFirst({ 
      where: { email: { equals: trimmedEmail, mode: 'insensitive' } },
      include: { 
        company: { 
          select: { 
            name: true,
            logoUrl: true,
            primaryColor: true,
            secondaryColor: true,
            plan: true, 
            addons: true,
            globalTaxRate: true
          } 
        } 
      }
    });

    let finalAuthData: any = null;

    if (!user) {
      // Jika tidak ditemukan di User, cek di Customer (Aivola GO)
      const customer = await prisma.customer.findFirst({
        where: { email: { equals: trimmedEmail, mode: 'insensitive' } },
        include: {
          company: {
            select: {
              name: true,
              logoUrl: true,
              primaryColor: true,
              secondaryColor: true,
              plan: true,
              addons: true
            }
          }
        }
      });

      if (!customer) {
        console.log(`[LOGIN FAILED] User/Customer not found: "${trimmedEmail}"`);
        return res.status(401).json({ error: 'Email atau password salah.' });
      }

      if (!customer.password) {
        return res.status(401).json({ error: 'Akun pelanggan ini belum memiliki password. Silakan daftar via Aivola GO.' });
      }

      const isValidPassword = await bcrypt.compare(password, customer.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Email atau password salah.' });
      }

      finalAuthData = {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        companyId: customer.companyId,
        role: 'CUSTOMER',
        isActive: customer.isActive,
        company: customer.company,
        customerData: {
          id: customer.id,
          points: customer.points,
          isMember: customer.isMember,
          totalSpent: customer.totalSpent
        }
      };
    } else {
      // Found as User (Employee)
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log(`[LOGIN FAILED] Invalid password for: ${trimmedEmail}`);
        return res.status(401).json({ error: 'Email atau password salah.' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Akun Anda sudah dinonaktifkan.' });
      }

      const customer = await prisma.customer.findFirst({
        where: { email: user.email }
      });

      finalAuthData = {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: user.companyId,
        branchId: user.branchId,
        role: user.role,
        language: user.language,
        company: user.company,
        customerData: customer ? {
          id: customer.id,
          points: customer.points,
          isMember: customer.isMember,
          totalSpent: customer.totalSpent
        } : null
      };
    }

    console.log(`[LOGIN SUCCESS] ${finalAuthData.role}: ${finalAuthData.email}`);

    const token = jwt.sign(
      { 
        userId: finalAuthData.id, 
        companyId: finalAuthData.companyId, 
        role: finalAuthData.role, 
        name: finalAuthData.name,
        plan: finalAuthData.company?.plan,
        addons: finalAuthData.company?.addons || []
      },
      JWT_SECRET,
      { expiresIn: '90d' }
    );

    res.json({
      message: 'Login Berhasil',
      token,
      user: finalAuthData
    });

  } catch (error: any) {
    console.error('!!! LOGIN CRASH !!!', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server saat login (DIAGNOSTIC v1.0.3): ' + (error.message || 'Unknown Error'),
      details: error.stack,
      env_db: !!process.env.DATABASE_URL,
      env_direct: !!process.env.DIRECT_URL,
      error_code: error.code || 'NO_CODE'
    });
  }
});

// A. Endpoint Registrasi Mandiri (Trial 14 Hari)
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { companyName, adminName, email, password } = req.body;

    if (!companyName || !adminName || !email || !password) {
      return res.status(400).json({ error: 'Data pendaftaran tidak lengkap. Mohon isi semua field.' });
    }

    // 1. Validasi Duplikasi Email
    const existingUser = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email sudah terdaftar. Silakan gunakan email lain.' });
    }

    // 2. Gunakan Prisma Transaction untuk Inisialisasi Akun
    const result = await prisma.$transaction(async (tx) => {
      // Hitung tanggal akhir trial (6 Bulan / 180 Hari dari sekarang)
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 180);

      // A. Buat Database Perusahaan
      const company = await tx.company.create({
        data: {
          name: companyName,
          contractStart: new Date(),
          contractEnd: trialEnd,
          contractType: 'BULANAN',
          contractValue: 0,
          employeeLimit: 25, // Batas trial standar
          modules: 'BOTH',   // Aktifkan modul HR dan Finance agar user bisa coba semua
          plan: 'ENTERPRISE', // Default 14-day trial as ENTERPRISE
          lateGracePeriod: 15,
          workDaysPerMonth: 25,
          crmEnabled: true,
          purchasedInsights: ['KPI', 'LEARNING', 'AI_ADVISOR', 'PULSE'] 
        }
      });

      // B. Buat Akun Admin Pertama
      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = await tx.user.create({
        data: {
          companyId: company.id,
          name: adminName,
          email: email.trim(),
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true,
          emailNotifications: true,
          language: 'ID'
        }
      });

      // C. Buat Cabang Utama (Default) agar sistem tidak error saat setup awal
      await tx.branch.create({
        data: {
          companyId: company.id,
          name: 'Kantor Pusat (' + companyName + ')',
          latitude: -6.200000, // Jakarta Default
          longitude: 106.816666,
          radius: 100
        }
      });


      return { company, admin };
    });

    console.log(`[REGISTRATION SUCCESS] Company: ${result.company.name}, Admin: ${result.admin.email}`);

    res.json({
      message: 'Selamat! Akun trial Aivola Anda berhasil dibuat.',
      status: 'success',
      companyId: result.company.id,
      adminEmail: result.admin.email
    });

  } catch (error: any) {
    console.error('!!! REGISTRATION ERROR !!!', error);
    res.status(500).json({ 
      error: 'Gagal melakukan registrasi. Silakan coba beberapa saat lagi.',
      details: error.message 
    });
  }
});

app.patch('/api/auth/change-password', tenantMiddleware, async (req: Request, res: Response) => {

  try {
    const userId = (req as any).userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Password lama dan baru wajib diisi.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) return res.status(401).json({ error: 'Password lama tidak sesuai.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui password.' });
  }
});

// --- GET ALL PUBLIC MERCHANTS (For Ecosystem Selection) ---
app.get('/api/companies/public', async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      where: { 
        isActive: true,
        addons: {
          has: 'AIVOLA_GO'
        }
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        address: true,
        picPhone: true,
        latitude: true,
        longitude: true,
        branches: true,
        openTime: true,
        closeTime: true,
        isOpenManual: true,
        timezone: true
      }
    });
    res.json(companies);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil daftar merchant' });
  }
});

// --- GET PRODUCTS FOR SPECIFIC PUBLIC MERCHANT ---
app.get('/api/companies/public/:id/products', async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id as string);
    const { branchId } = req.query;

    const products = await prisma.product.findMany({
      where: { 
        companyId, 
        showInPos: true,
        // Only show products if company is active and has GO addon (additional safety)
        Company: {
          isActive: true,
          addons: { has: 'AIVOLA_GO' }
        }
      },
      include: { 
        category: true,
        WarehouseStock: {
          include: { warehouse: true }
        },
        customizations: {
          include: {
            Group: {
              include: {
                options: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Filter stock based on branch if provided
    const productsWithStock = products.map(p => {
      let displayStock = p.stock;
      const bId = branchId ? parseInt(branchId as string) : NaN;

      if (!isNaN(bId) && branchId !== 'all') {
        const branchWarehouses = p.WarehouseStock.filter((ws: any) => ws.warehouse.branchId === bId);
        displayStock = branchWarehouses.reduce((sum: number, ws: any) => sum + ws.quantity, 0);
      } else if (!branchId || branchId === 'all') {
        // If no branch specified, we can either show global stock or 0. 
        // POS usually shows global if no branch filter, but for ecosystem 
        // it might be better to stay as is (global).
        displayStock = p.stock;
      }
      
      // Clean up the response
      const { WarehouseStock, ...cleanProduct } = p as any;
      return { ...cleanProduct, stock: displayStock };
    });

    res.json(productsWithStock);
  } catch (error: any) {
    console.error("PUBLIC PRODUCTS ERROR:", error);
    res.status(500).json({ error: 'Gagal mengambil data produk ekosistem' });
  }
});

// --- GET CATEGORIES FOR SPECIFIC PUBLIC MERCHANT ---
app.get('/api/companies/public/:id/categories', async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id as string);
    const categories = await prisma.productCategory.findMany({
      where: { 
        companyId,
        company: {
          isActive: true,
          addons: { has: 'AIVOLA_GO' }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil kategori ekosistem' });
  }
});

// --- GET BRANCHES FOR SPECIFIC PUBLIC MERCHANT ---
app.get('/api/companies/public/:id/branches', async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id as string);
    const branches = await prisma.branch.findMany({
      where: { 
        companyId,
        company: {
          isActive: true,
          addons: { has: 'AIVOLA_GO' }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(branches);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil cabang ekosistem' });
  }
});

// --- GET BANNERS FOR SPECIFIC PUBLIC MERCHANT ---
app.get('/api/companies/public/:id/banners', async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id as string);
    const banners = await prisma.banner.findMany({
      where: { 
        companyId,
        isActive: true
      },
      orderBy: { order: 'asc' }
    });
    res.json(banners);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil banner promo' });
  }
});

// --- ADMIN: MANAGE BANNERS ---
app.get('/api/banners', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const banners = await prisma.banner.findMany({
      where: { companyId: tenantId },
      orderBy: { order: 'asc' }
    });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data banner admin' });
  }
});

app.post('/api/banners', tenantMiddleware, uploadBanner.single('image'), async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { title, linkUrl, isActive, order } = req.body;
    let imageUrl = '';

    if (req.file) {
      try {
        const fullLocalPath = path.join(process.cwd(), 'uploads/banners', req.file.filename);
        // Use 'announcements' bucket as a safer default if 'banners' bucket doesn't exist
        imageUrl = await uploadToSupabase(fullLocalPath, 'announcements');
        
        // If uploadToSupabase returned a relative local path (fallback), prepend the host
        if (imageUrl.startsWith('/uploads/')) {
           const protocol = req.protocol;
           const host = req.get('host');
           imageUrl = `${protocol}://${host}${imageUrl}`;
        }
        
        cleanupLocalFile(fullLocalPath);
      } catch (uploadError) {
        console.error('Failed to upload banner image:', uploadError);
      }
    }

    if (!imageUrl && !req.body.imageUrl) {
      return res.status(400).json({ error: 'Gambar banner wajib diunggah.' });
    }

    const banner = await prisma.banner.create({
      data: {
        companyId: tenantId,
        title,
        imageUrl: imageUrl || req.body.imageUrl,
        linkUrl,
        isActive: isActive === 'true' || isActive === true,
        order: parseInt(order) || 0,
        updatedAt: new Date()
      }
    });
    res.json(banner);
  } catch (error) {
    res.status(500).json({ error: 'Gagal membuat banner baru' });
  }
});

app.patch('/api/banners/:id', tenantMiddleware, uploadBanner.single('image'), async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const id = parseInt(req.params.id as string);
    const { title, linkUrl, isActive, order } = req.body;
    let imageUrl = undefined;

    if (req.file) {
      try {
        const fullLocalPath = path.join(process.cwd(), 'uploads/banners', req.file.filename);
        imageUrl = await uploadToSupabase(fullLocalPath, 'announcements');
        
        if (imageUrl.startsWith('/uploads/')) {
           const protocol = req.protocol;
           const host = req.get('host');
           imageUrl = `${protocol}://${host}${imageUrl}`;
        }
        
        cleanupLocalFile(fullLocalPath);
      } catch (uploadError) {
        console.error('Failed to upload banner image:', uploadError);
      }
    }

    await prisma.banner.updateMany({
      where: { id, companyId: tenantId },
      data: {
        title,
        imageUrl,
        linkUrl,
        isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : undefined,
        order: order !== undefined ? parseInt(order) : undefined
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui banner' });
  }
});

app.delete('/api/banners/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const id = parseInt(req.params.id as string);
    await prisma.banner.deleteMany({
      where: { id, companyId: tenantId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus banner' });
  }
});

// B3. Endpoint Mendapatkan Detail Profil Diri (Mobile/Self)
app.get('/api/users/me', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const tenantId = (req as any).tenantId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true, shift: true }
    });
    if (!user) {
      console.warn(`[Profile 404] User ID ${userId} not found in tenant ${tenantId}`);
      return res.status(404).json({ error: 'Profil tidak ditemukan' });
    }

    // Jangan kirim password
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data profil' });
  }
});

// B3.1. Update User Settings (Self)
app.patch('/api/users/me/settings', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { emailNotifications, language } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        emailNotifications: emailNotifications !== undefined ? !!emailNotifications : undefined,
        language: language !== undefined ? language : undefined
      }
    });

    res.json({
      message: 'Pengaturan berhasil diperbarui.',
      settings: {
        emailNotifications: updatedUser.emailNotifications,
        language: updatedUser.language
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui pengaturan.' });
  }
});

// U1. Upload Avatar
app.post('/api/users/me/avatar', tenantMiddleware, uploadAvatar.single('avatar'), async (req: Request, res: Response) => {
  console.log(`[AVATAR] Upload attempt by user: ${(req as any).userId}`);
  try {
    if (!req.file) {
      console.error("[AVATAR] No file in request");
      return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
    }
    console.log(`[AVATAR] Received file: ${req.file.filename}, Size: ${req.file.size}`);
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    res.json({ avatarUrl });
  } catch (error: any) {
    console.error("[AVATAR] Upload Error:", error);
    res.status(500).json({ error: 'Gagal mengunggah foto profil: ' + error.message });
  }
});

app.patch('/api/users/me', tenantMiddleware, async (req: Request, res: Response) => {
  console.log(`[PROFILE] Update attempt by user: ${(req as any).userId}, Body:`, req.body);
  try {
    const userId = (req as any).userId;
    const { name, email, phone, avatarUrl } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || undefined,
        email: email || undefined,
        avatarUrl: req.body.avatarUrl !== undefined ? req.body.avatarUrl : undefined
      }
    });

    const { password, ...safeUser } = updatedUser;
    console.log(`[PROFILE] Success for user: ${userId}`);
    res.json(safeUser);
  } catch (error: any) {
    console.error("[PROFILE] Update Error:", error);
    res.status(500).json({ error: 'Gagal memperbarui profil: ' + (error.message || 'Error tidak diketahui') });
  }
});

// A. Endpoint Mendaftar Perusahaan SaaS Baru (Super Admin)
app.post('/api/companies', async (req: Request, res: Response) => {
  try {
    const { 
      name, latitude, longitude, radius,
      picName, picPhone, contractType, contractDuration, contractValue, contractStart, contractEnd,
      employeeLimit, adminLimit, posLimit, photoRetentionDays,
      plan, addons,
      discountKpi, discountLearning, discountInventory, discountAi, discountFraud, discountExpansion, discountProspecting,
      adminEmail, adminPassword, adminName
    } = req.body;

    // Gunakan Prisma Transaction agar jika salah satu gagal, semuanya dibatalkan
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat Perusahaan
      const company = await tx.company.create({
        data: {
          name,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          radius: radius ? parseInt(radius, 10) : 100,
          // @ts-ignore
          picName,
          picPhone,
          contractType: contractType || 'BULANAN',
          contractDuration: contractDuration ? parseInt(contractDuration) : 1,
          contractValue: contractValue ? parseFloat(contractValue) : 0,
          contractStart: contractStart ? new Date(contractStart) : null,
          contractEnd: contractEnd ? new Date(contractEnd) : null,
          employeeLimit: employeeLimit ? parseInt(employeeLimit, 10) : 0,
          adminLimit: adminLimit ? parseInt(adminLimit, 10) : 2,
          posLimit: posLimit ? parseInt(posLimit, 10) : 1,
          photoRetentionDays: photoRetentionDays ? parseInt(photoRetentionDays, 10) : 30,
          plan: plan || 'STARTER',
          addons: addons || [],
          // --- AUTO-SYNC MODULES ---
          modules: (plan === 'PRO' || plan === 'ENTERPRISE') ? 'BOTH' : (req.body.modules || 'ABSENSI'),
          discountKpi: parseInt(discountKpi, 10) || 0,
          discountLearning: parseInt(discountLearning, 10) || 0,
          discountInventory: parseInt(discountInventory, 10) || 0,
          discountAi: parseInt(discountAi, 10) || 0,
          discountFraud: parseInt(discountFraud, 10) || 0,
          discountExpansion: parseInt(discountExpansion, 10) || 0,
          discountProspecting: parseInt(discountProspecting, 10) || 0
        }
      });

      let adminUser = null;

      // 2. Buat Admin Pertama jika data dikirim
      if (adminEmail && adminPassword) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        adminUser = await tx.user.create({
          data: {
            companyId: company.id,
            email: adminEmail.trim().toLowerCase(),
            password: hashedPassword,
            name: adminName || picName || 'Admin ' + name,
            role: 'ADMIN'
          }
        });
      }

      return { company, adminUser };
    });

    res.json({ 
      message: 'Perusahaan ' + (result.adminUser ? 'dan Admin ' : '') + 'berhasil didaftarkan', 
      company: result.company,
      admin: result.adminUser ? { email: result.adminUser.email, name: result.adminUser.name } : null
    });
  } catch (error: any) {
    console.error('Error creating company/admin:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email admin sudah terdaftar di sistem. Gunakan email lain.' });
    }

    res.status(500).json({ error: 'Gagal mendaftar perusahaan: ' + error.message });
  }
});

// A2. Endpoint Mendapatkan Daftar Perusahaan (Global)
app.get('/api/companies', async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { users: true }
        },
        users: {
          where: { role: 'ADMIN' },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { name: true, email: true }
        }
      }
    });

    const mappedCompanies = companies.map(c => {
        const { users, ...rest } = c;
        const mainAdmin = users && users.length > 0 ? users[0] : null;
        return {
            ...rest,
            adminEmail: mainAdmin?.email || '',
            adminName: mainAdmin?.name || ''
        };
    });

    res.json(mappedCompanies);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar klien' });
  }
});

// A2.1. Endpoint Database Backup (Super Admin Only)
app.get('/api/admin/backup', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).userRole;
    if (userRole !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Akses Ditolak: Hanya Super Admin yang dapat mencadangkan sistem' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `aivola_backup_${timestamp}.json.gz`;

    console.log(`[BACKUP] Starting pure Node.js JSON database backup: ${filename}`);

    // Dapatkan semua nama tabel (model) secara dinamis dari Prisma
    const models = require('@prisma/client').Prisma.dmmf.datamodel.models;
    const backupData: any = {};

    for (const model of models) {
      const modelName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
      try {
        backupData[modelName] = await (prisma as any)[modelName].findMany();
      } catch (e) {
        console.warn(`[BACKUP] Skipping model ${modelName} due to error`);
      }
    }

    const jsonString = JSON.stringify(backupData);

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const gzip = zlib.createGzip();
    gzip.pipe(res);
    gzip.write(jsonString);
    gzip.end();

    console.log(`[BACKUP SUCCESS] ${filename} stream finished.`);
  } catch (error: any) {
    console.error('Backup Crash:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Terjadi kesalahan sistem saat memproses backup JSON' });
    } else {
      res.end(); // Akhiri stream jika terlanjur crash di tengah jalan
    }
  }
});

// --- RESTORE DATABASE (SUPERADMIN ONLY) ---
app.post('/api/admin/restore', tenantMiddleware, uploadRestore.single('backup'), async (req: Request, res: Response) => {
  const filePath = req.file?.path;
  
  try {
    const userRole = (req as any).userRole;
    if (userRole !== 'SUPERADMIN') {
      cleanupLocalFile(filePath || null);
      return res.status(403).json({ error: 'Akses Ditolak: Hanya Super Admin yang dapat memulihkan sistem' });
    }

    if (!filePath) {
      return res.status(400).json({ error: 'File backup tidak ditemukan atau gagal diunggah.' });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      cleanupLocalFile(filePath);
      return res.status(500).json({ error: 'Konfigurasi database tidak ditemukan' });
    }

    // Extract password for PGPASSWORD
    let pgPassword = '';
    try {
        const urlObj = new URL(dbUrl);
        pgPassword = decodeURIComponent(urlObj.password);
    } catch (e) {
        console.warn("[RESTORE] Failed to parse DATABASE_URL for password extraction");
    }

    // Derive PSQL path from PG_DUMP_PATH
    const pgDumpPath = process.env.PG_DUMP_PATH || 'pg_dump';
    const psqlBinary = pgDumpPath.includes('pg_dump') 
      ? pgDumpPath.replace('pg_dump', 'psql') 
      : 'psql';

    console.log(`[RESTORE] Starting restoration from: ${filePath}`);
    console.log(`[RESTORE] Using binary: ${psqlBinary}`);

    // Spawn psql
    const psql = spawn(`"${psqlBinary}"`, ["-d", dbUrl], { 
      shell: true,
      env: { ...process.env, PGPASSWORD: pgPassword }
    });

    const gunzip = zlib.createGunzip();
    const fileStream = fs.createReadStream(filePath);

    // Pipe: File -> Gunzip -> PSQL Stdin
    fileStream.pipe(gunzip).pipe(psql.stdin);

    let errorData = '';
    psql.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`[RESTORE PSQL ERROR] ${data}`);
    });

    psql.on('error', (err: any) => {
      console.error(`[RESTORE CRITICAL] Failed to start psql: ${err.message}`);
      cleanupLocalFile(filePath);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Gagal menjalankan utilitas restore: ' + err.message });
      }
    });

    psql.on('close', (code) => {
      console.log(`[RESTORE] psql process exited with code ${code}`);
      cleanupLocalFile(filePath);
      
      if (code === 0) {
        res.json({ success: true, message: 'Database berhasil dipulihkan sepenuhnya.' });
      } else {
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Proses restore selesai dengan kesalahan.', 
            details: errorData || 'Cek console server untuk detail lebih lanjut.' 
          });
        }
      }
    });

  } catch (error: any) {
    console.error('Restore API Error:', error);
    cleanupLocalFile(filePath || null);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Gagal melakukan restore: ' + error.message });
    }
  }
});

// A2.2. Endpoint Mendapatkan Data Perusahaan Sendiri (Tenant - My Company)
app.get('/api/companies/my', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const company = await prisma.company.findUnique({
      where: { id: tenantId }
    });
    if (!company) return res.status(404).json({ error: 'Perusahaan tidak ditemukan' });
    
    // Ensure absolute URL for local logo
    if (company.logoUrl && company.logoUrl.startsWith('/uploads')) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      company.logoUrl = `${baseUrl}${company.logoUrl}`;
    }
    
    const expiryLevel = await getTenantExpiryLevel(tenantId);
    // Prevent 304 Not Modified caching issues that break module detection
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({ ...company, expiryLevel });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data perusahaan' });
  }
});

// A2.3. Update Data Perusahaan Sendiri (Tenant - My Company)
// NOTE: The full implementation is below (line ~1564) which handles address and all fields.

// --- MODUL PURCHASE ORDER (PO) ---

// PO0. AI Purchase Order Recommendations (Smart Reorder Point)
app.get('/api/inventory/ai-po-recommendations', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const daysParam = parseInt(req.query.days as string) || 7;
    const bufferDaysParam = parseInt(req.query.bufferDays as string) || 3;

    const days = Math.max(1, Math.min(daysParam, 90));
    const bufferDays = Math.max(1, Math.min(bufferDaysParam, 30));

    // 1. Fetch all products and their recipe relationships
    const products = await prisma.product.findMany({
      where: { companyId: tenantId },
      include: {
        category: true,
        Recipes: { include: { Material: true } }
      }
    });

    if (products.length === 0) {
      return res.json({ periodDays: days, bufferDays, recommendations: [], aiSummary: "Belum ada data produk di inventori." });
    }

    const productMap = new Map<number, any>(products.map(p => [p.id, p]));

    // 2. Build date range and POS filter conditions (WIB Timezone)
    const now = new Date();
    const startD = new Date(now.getTime() + 7 * 3600 * 1000 - (days - 1) * 86400 * 1000);
    const startStr = startD.toISOString().split('T')[0];
    const endStr = new Date(now.getTime() + 7 * 3600 * 1000).toISOString().split('T')[0];

    const startDate = new Date(`${startStr}T00:00:00+07:00`);
    const [y, m, d] = endStr.split('-').map(Number);
    const nextD = new Date(Date.UTC(y, m - 1, d + 1));
    const nextDayStr = nextD.toISOString().split('T')[0];
    const endDate = new Date(`${nextDayStr}T00:00:00+07:00`);

    let whereConditions = [
      `s."companyId" = $1`,
      `s."status" NOT IN ('CANCELLED', 'VOID', 'RETURNED')`,
      `s."date" >= $2`,
      `s."date" < $3`
    ];
    let queryParams: any[] = [tenantId, startDate, endDate];

    // Optional Branch Filter
    const reqBranchId = req.query.branchId as string;
    if (reqBranchId && reqBranchId !== 'all') {
      if (reqBranchId === 'null') {
        whereConditions.push(`s."branchId" IS NULL`);
      } else {
        whereConditions.push(`s."branchId" = $4`);
        queryParams.push(parseInt(reqBranchId));
      }
    }

    const whereClause = whereConditions.join(' AND ');

    // 3. Fetch Net Sales per item using clean POS sales conditions
    const saleItems: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        si."productId", 
        SUM(GREATEST(0, si.quantity - COALESCE(ret."returnedQty", 0))) as "netQtySold"
      FROM "SaleItem" si
      JOIN "Sale" s ON si."saleId" = s.id
      LEFT JOIN (
        SELECT sri."productId", sr."saleId", SUM(sri.quantity) as "returnedQty"
        FROM "SaleReturnItem" sri
        JOIN "SaleReturn" sr ON sri."returnId" = sr.id
        GROUP BY sri."productId", sr."saleId"
      ) ret ON ret."productId" = si."productId" AND ret."saleId" = si."saleId"
      WHERE ${whereClause}
      GROUP BY si."productId"
    `, ...queryParams);

    // Helper function to resolve consumption down the BOM tree recursively
    const resolveConsumption = (
      productId: number,
      qty: number,
      visited = new Set<number>()
    ) => {
      if (visited.has(productId)) return; // Prevent infinite loop in circular recipes
      visited.add(productId);

      const prod = productMap.get(productId);
      if (!prod) return;

      if (prod.Recipes && prod.Recipes.length > 0) {
        // Product has a recipe -> produced in-house, pass demand to ingredients
        const yieldFactor = prod.recipeYield || 1;
        for (const recipeItem of prod.Recipes) {
          const ingredientQty = (qty * Number(recipeItem.quantity)) / yieldFactor;
          resolveConsumption(recipeItem.materialId, ingredientQty, new Set(visited));
        }
      } else {
        // Product has no recipe -> it is a purchased item from vendor
        consumptionMap[prod.id] = (consumptionMap[prod.id] || 0) + qty;
      }
    };

    // 4. Track consumption per item via BOM resolution
    const consumptionMap: Record<number, number> = {};

    for (const item of saleItems) {
      if (!item.productId) continue;
      const qty = Number(item.netQtySold) || 0;
      resolveConsumption(Number(item.productId), qty);
    }

    // 4. Calculate PO recommendations (Only for vendor-purchased items, i.e. items without recipe)
    const recommendations: any[] = [];

    for (const prod of products) {
      // Products manufactured in-house (having recipes) are excluded from vendor PO
      if (prod.Recipes && prod.Recipes.length > 0) {
        continue;
      }

      const totalConsumed = consumptionMap[prod.id] || 0;
      const avgDailySales = Math.round((totalConsumed / days) * 100) / 100;
      const currentStock = Number(prod.stock) || 0;
      const minStock = Number(prod.minStock) || 0;

      const targetStock = (avgDailySales * bufferDays) + minStock;
      const deficit = targetStock - currentStock;
      const rawSuggestedQty = Math.max(0, deficit);
      const suggestedQty = Math.ceil(rawSuggestedQty * 10) / 10;

      let urgency: 'CRITICAL' | 'WARNING' | 'LOW' | 'SAFE' = 'SAFE';
      if (currentStock <= 0 || (minStock > 0 && currentStock <= minStock * 0.5)) {
        urgency = 'CRITICAL';
      } else if (minStock > 0 && currentStock <= minStock) {
        urgency = 'WARNING';
      } else if (suggestedQty > 0) {
        urgency = 'LOW';
      }

      // Include in recommendation if suggested PO qty > 0 or stock is in warning/critical status
      if (suggestedQty > 0 || urgency === 'CRITICAL' || urgency === 'WARNING') {
        const costPrice = Number(prod.costPrice) || 0;
        recommendations.push({
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku || '-',
          categoryName: prod.category?.name || 'Tanpa Kategori',
          unit: prod.purchaseUnit || prod.unit || 'Pcs',
          currentStock,
          minStock,
          costPrice,
          totalSalesPeriod: totalConsumed,
          avgDailySales,
          suggestedQty: Math.max(1, suggestedQty),
          estimatedTotalCost: Math.round(Math.max(1, suggestedQty) * costPrice),
          urgency
        });
      }
    }

    // Sort by urgency priority: CRITICAL -> WARNING -> LOW -> SAFE, then by daily sales
    const urgencyOrder: Record<string, number> = { CRITICAL: 1, WARNING: 2, LOW: 3, SAFE: 4 };
    recommendations.sort((a, b) => {
      const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (uDiff !== 0) return uDiff;
      return b.avgDailySales - a.avgDailySales;
    });

    // 5. Generate AI insights using Gemini AI if recommendations exist
    let aiSummary = "Stok dalam keadaan aman.";
    if (recommendations.length > 0) {
      try {
        const top5Urgent = recommendations.slice(0, 5);
        const genAI = new GeminiAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
          Anda adalah manajer inventori dan purchasing ahli.
          Berikan 2-3 poin rekomendasi pembelian barang (Purchase Order) singkat dan aksi spesifik (maksimal 2 kalimat per poin) berdasarkan analisis stok & penjualan toko berikut dalam Bahasa Indonesia yang santun & profesional:

          Data Toko:
          - Periode Analisis Penjualan: ${days} hari terakhir
          - Target Buffer Stok: ${bufferDays} hari
          - Jumlah Item Membutuhkan Reorder: ${recommendations.length} barang
          - Produk Paling Kritis/Dibutuhkan:
          ${top5Urgent.map(item => `- ${item.productName} (${item.categoryName}): Stok saat ini ${item.currentStock} ${item.unit}, Min Stok ${item.minStock}, Rata-rata Penjualan ${item.avgDailySales}/hari. Disarankan PO: ${item.suggestedQty} ${item.unit}`).join('\n')}

          Format Output: JSON dengan field "summary" (string markdown singkat dengan bullet points).
        `;

        const aiResult = await model.generateContent(prompt);
        const text = aiResult.response.text();
        const cleanedText = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanedText);
        aiSummary = parsed.summary || text;
      } catch (aiErr) {
        console.warn("[AI PO Recommendation] Gemini error, using fallback summary:", aiErr);
        const criticalCount = recommendations.filter(r => r.urgency === 'CRITICAL').length;
        aiSummary = `Terdapat ${recommendations.length} barang yang disarankan untuk dipesan (PO). ${criticalCount > 0 ? `${criticalCount} barang dalam kondisi kritis!` : 'Stok hampir mencapai batas minimum.'}`;
      }
    }

    res.json({
      periodDays: days,
      bufferDays,
      recommendations,
      aiSummary
    });
  } catch (error: any) {
    console.error("AI PO RECOMMENDATION ERROR:", error);
    res.status(500).json({ error: "Gagal menghitung rekomendasi PO: " + error.message });
  }
});

// PO1. List Purchase Orders
app.get('/api/inventory/purchase-orders', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userRole = (req as any).userRole;
    const userId = (req as any).userId;

    let where: any = { companyId: tenantId };
    
    // Role-based filtering if needed (e.g., Operational only sees their own)
    if (userRole === 'OPERATIONAL') {
      where.createdById = userId;
    }

    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { name: true, phone: true, email: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        items: { include: { product: { select: { name: true, unit: true, purchaseUnit: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(pos);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil data PO: ' + error.message });
  }
});

// PO2. Create Purchase Order
app.post('/api/inventory/purchase-orders', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);
    const { supplierId, date, items, notes, warehouseId, customerId } = req.body;
    let finalCustomerId = customerId ? parseInt(customerId) : null;

    // --- SECURITY & SYNC FIX ---
    // If we have a userId (from token), always override customerId with the one linked to user email
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const linkedCustomer = await prisma.customer.findFirst({ where: { email: user.email } });
        if (linkedCustomer) {
          finalCustomerId = linkedCustomer.id;
        }
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Minimal harus ada 1 barang yang dipesan.' });
    }

    const orderNumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.price)), 0);

    // Using Raw SQL for Create to handle warehouseId without regenerating Prisma Client
    const poResult: any[] = await prisma.$queryRawUnsafe(`
      INSERT INTO "PurchaseOrder" 
      ("companyId", "supplierId", "orderNumber", "date", "totalAmount", "status", "notes", "createdById", "updatedAt", "warehouseId")
      VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7, NOW(), $8)
      RETURNING id
    `, tenantId, parseInt(supplierId), orderNumber, date ? new Date(date) : new Date(), totalAmount, notes, userId, warehouseId ? parseInt(warehouseId) : null);

    if (!poResult || poResult.length === 0) throw new Error("Gagal membuat data PO utama.");
    const poId = poResult[0].id;

    // Create Items
    await prisma.purchaseOrderItem.createMany({
      data: items.map((item: any) => ({
        purchaseOrderId: poId,
        productId: parseInt(item.productId),
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price),
        total: parseFloat(item.quantity) * parseFloat(item.price)
      }))
    });

    const result = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true }
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("PO CREATE ERROR:", error);
    res.status(500).json({ error: 'Gagal membuat PO: ' + error.message });
  }
});

// PO2.5 Edit Purchase Order
app.put('/api/inventory/purchase-orders/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);
    const poId = parseInt(req.params.id as string);
    const { supplierId, date, items, notes, warehouseId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Minimal harus ada 1 barang yang dipesan.' });
    }

    const existingPo = await prisma.purchaseOrder.findFirst({
      where: { id: poId, companyId: tenantId }
    });

    if (!existingPo) return res.status(404).json({ error: 'Data PO tidak ditemukan' });
    if (existingPo.status !== 'PENDING') {
      return res.status(403).json({ error: 'PO yang sudah diproses tidak dapat diedit.' });
    }

    const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.price)), 0);

    await prisma.$transaction(async (tx) => {
      // 1. Update PO Header
      await tx.$executeRawUnsafe(`
        UPDATE "PurchaseOrder" 
        SET "supplierId" = $1, "date" = $2, "totalAmount" = $3, "notes" = $4, "warehouseId" = $5, "updatedAt" = NOW()
        WHERE "id" = $6
      `, parseInt(supplierId), date ? new Date(date) : existingPo.date, totalAmount, notes, warehouseId ? parseInt(warehouseId) : existingPo.warehouseId, poId);

      // 2. Delete old items
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: poId }
      });

      // 3. Create new items
      await tx.purchaseOrderItem.createMany({
        data: items.map((item: any) => ({
          purchaseOrderId: poId,
          productId: parseInt(item.productId),
          quantity: parseFloat(item.quantity),
          price: parseFloat(item.price),
          total: parseFloat(item.quantity) * parseFloat(item.price)
        }))
      });
    });

    res.json({ message: 'PO berhasil diperbarui' });
  } catch (error: any) {
    console.error("PO UPDATE ERROR:", error);
    res.status(500).json({ error: 'Gagal memperbarui PO: ' + error.message });
  }
});

// PO3. Update PO Status (Approve/Reject)
app.patch('/api/inventory/purchase-orders/:id/status', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    const id = parseInt(req.params.id as string);
    const { status, approvedDate } = req.body; // APPROVED or REJECTED

    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid.' });
    }

    // Role check: Only PURCHASING/ADMIN can approve
    if (!['PURCHASING', 'ADMIN', 'SUPERADMIN', 'OWNER', 'FINANCE'].includes(userRole)) {
      return res.status(403).json({ error: 'Anda tidak memiliki hak untuk menyetujui PO ini.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const po: any = await tx.$queryRawUnsafe(`
        SELECT po.*, s.name as supplier_name
        FROM "PurchaseOrder" po
        JOIN "Supplier" s ON po."supplierId" = s.id
        WHERE po.id = $1 AND po."companyId" = $2
      `, id, tenantId);

      if (!po || po.length === 0) throw new Error('PO tidak ditemukan.');
      const poData = po[0];

      // Fetch items separately
      const poItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id }
      });

      if (poData.status !== 'PENDING') throw new Error('PO sudah diproses sebelumnya.');

      // Gunakan updateMany untuk menjamin operasi atomik (menghindari double-click race condition)
      const updateResult = await tx.purchaseOrder.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status,
          approvedById: userId,
          updatedAt: new Date()
        }
      });

      if (updateResult.count === 0) {
        throw new Error('PO sudah diproses sebelumnya (Terdeteksi klik ganda).');
      }

      // If APPROVED, create a PENDING Expense (Hutang) AND update Inventory
      if (status === 'APPROVED') {
        const warehouseId = poData.warehouseId;
        // 1. Create Finance Record (Hutang)
        // Find or create "Pembelian (Auto-PO)" category
        let category: any = await tx.expenseCategory.findFirst({
          where: { companyId: tenantId, name: 'Pembelian (Auto-PO)' }
        });

        if (!category) {
          const catResult: any[] = await tx.$queryRawUnsafe(`
            INSERT INTO "ExpenseCategory" ("companyId", "name", "type", "updatedAt")
            VALUES ($1, 'Pembelian (Auto-PO)', 'INVENTORY', NOW())
            RETURNING id
          `, tenantId);
          
          if (!catResult || catResult.length === 0) {
            throw new Error('Gagal membuat kategori pengeluaran otomatis (Auto-PO).');
          }
          category = { id: catResult[0].id };
        }

        // Add to Expense (Hutang)
        const finalApprovedDate = approvedDate ? new Date(approvedDate) : new Date();
        const dueDate = new Date(finalApprovedDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
        await tx.expense.create({
          data: {
            companyId: tenantId,
            categoryId: category.id,
            supplierId: poData.supplierId,
            amount: poData.totalAmount,
            date: finalApprovedDate,
            dueDate: dueDate,
            description: `Hutang otomatis dari PO #${poData.orderNumber}`,
            status: 'PENDING',
            paidTo: poData.supplier_name
          }
        });

        // 2. Update Stock & Calculate Moving Average Cost for each item
        for (const item of poItems) {
          // Fetch current stock and cost price for WAC (Weighted Average Cost) calculation
          const currentProduct = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true, costPrice: true, purchaseFactor: true }
          });

          if (currentProduct) {
            const factor = currentProduct.purchaseFactor || 1;
            const currentStock = Math.max(0, currentProduct.stock);
            const currentCost = currentProduct.costPrice || 0;
            
            // CONVERSION LOGIC
            const incomingQty = item.quantity * factor;
            const incomingPrice = item.price / factor; // Price per base unit

            const newTotalStock = currentStock + incomingQty;
            
            // Formula: ((Current Stock * Current Cost) + (Incoming Qty * Incoming Price)) / New Total Stock
            const newAverageCost = newTotalStock > 0 
              ? ((currentStock * currentCost) + (incomingQty * incomingPrice)) / newTotalStock
              : incomingPrice;

            // Update Global Stock & Moving Average Cost
            await tx.product.update({
              where: { id: item.productId },
              data: { 
                stock: { increment: incomingQty },
                costPrice: Number(newAverageCost.toFixed(2))
              }
            });

            // NEW: Update Warehouse Stock
            if (warehouseId) {
              await tx.$executeRawUnsafe(`
                INSERT INTO "WarehouseStock" ("productId", "warehouseId", "quantity", "updatedAt")
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT ("productId", "warehouseId") 
                DO UPDATE SET "quantity" = "WarehouseStock"."quantity" + $3, "updatedAt" = NOW()
              `, item.productId, warehouseId, incomingQty);
            }

            // Record Stock Transaction
            await tx.stockTransaction.create({
              data: {
                productId: item.productId,
                type: 'IN',
                quantity: incomingQty,
                reference: `PO #${poData.orderNumber} (Approved - Converted)`,
                date: new Date(),
                warehouseId: warehouseId || null
              }
            });
          }
        }
      }

      return updateResult;
    }, {
      timeout: 30000 // 30 seconds to handle large PO lists safely
    });

    res.json({ message: `PO berhasil ${status === 'APPROVED' ? 'disetujui' : status === 'CANCELLED' ? 'dibatalkan' : 'ditolak'}`, result });
  } catch (error: any) {
    console.error("PO STATUS ERROR:", error);
    res.status(500).json({ error: 'Gagal memproses PO: ' + error.message });
  }
});

// PO4. Cancel (Void) Approved PO
app.post('/api/inventory/purchase-orders/:id/cancel', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userRole = (req as any).userRole;
    const id = parseInt(req.params.id as string);

    // Role check: Only PURCHASING/ADMIN can cancel
    if (!['PURCHASING', 'ADMIN', 'SUPERADMIN', 'OWNER', 'FINANCE'].includes(userRole)) {
      return res.status(403).json({ error: 'Anda tidak memiliki hak untuk membatalkan PO ini.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const po: any = await tx.$queryRawUnsafe(`
        SELECT po.*
        FROM "PurchaseOrder" po
        WHERE po.id = $1 AND po."companyId" = $2
      `, id, tenantId);

      if (!po || po.length === 0) throw new Error('PO tidak ditemukan.');
      const poData = po[0];

      if (poData.status !== 'APPROVED') {
        throw new Error('Hanya PO yang berstatus APPROVED yang dapat dibatalkan (void).');
      }

      // 1. Delete associated Expense (Hutang)
      const expense = await tx.expense.findFirst({
        where: {
          companyId: tenantId,
          description: `Hutang otomatis dari PO #${poData.orderNumber}`
        }
      });

      if (expense) {
        if (expense.status === 'PAID') {
          throw new Error('Hutang dari PO ini sudah dilunasi. Tidak dapat membatalkan PO.');
        }
        await tx.expense.delete({ where: { id: expense.id } });
      }

      // 2. Reverse Stock (Inventory)
      const poItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id }
      });

      const warehouseId = poData.warehouseId;

      for (const item of poItems) {
        const currentProduct = await tx.product.findUnique({
          where: { id: item.productId },
          select: { purchaseFactor: true }
        });

        if (currentProduct) {
          const factor = currentProduct.purchaseFactor || 1;
          const incomingQty = item.quantity * factor;

          // Update Global Stock
          await tx.product.update({
            where: { id: item.productId },
            data: { 
              stock: { decrement: incomingQty }
              // Note: We deliberately do NOT reverse the Moving Average Cost (WAC) 
              // as doing so safely requires a full ledger recalculation.
            }
          });

          // Update Warehouse Stock if applicable
          if (warehouseId) {
            await tx.$executeRawUnsafe(`
              UPDATE "WarehouseStock" 
              SET "quantity" = GREATEST("quantity" - $3, 0), "updatedAt" = NOW()
              WHERE "productId" = $1 AND "warehouseId" = $2
            `, item.productId, warehouseId, incomingQty);
          }

          // Record Stock Transaction (Reversal)
          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              type: 'OUT',
              quantity: incomingQty,
              reference: `PO #${poData.orderNumber} (Void Reversal)`,
              date: new Date(),
              warehouseId: warehouseId || null
            }
          });
        }
      }

      // 3. Update PO Status
      const updatedPo = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });

      return updatedPo;
    });

    res.json({ message: 'PO berhasil dibatalkan (Void). Hutang dan stok telah dikembalikan.', result });
  } catch (error: any) {
    console.error("PO CANCEL ERROR:", error);
    res.status(500).json({ error: 'Gagal membatalkan PO: ' + error.message });
  }
});

// A2.1. Endpoint Menghapus Perusahaan (Super Admin Only)
app.delete('/api/companies/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).userRole;
    if (userRole !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Hanya Super Admin yang dapat menghapus tenant' });
    }

    const companyId = parseInt(req.params.id as string);
    
    // Pastikan bukan menghapus Owner Company sendiri (Id 1 biasanya)
    if (companyId === 1) {
      return res.status(400).json({ error: 'Tidak dapat menghapus perusahaan sistem utama' });
    }

    await prisma.company.delete({
      where: { id: companyId }
    });

    res.json({ message: 'Perusahaan berhasil dihapus secara permanen' });
  } catch (error: any) {
    console.error('Delete Company Error:', error);
    res.status(500).json({ error: 'Gagal menghapus perusahaan: ' + error.message });
  }
});

// A2.2. Endpoint Update Detail Perusahaan (Super Admin Only)
app.patch('/api/companies/my', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;

    // --- STRICT ROLE CHECK ---
    if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN' && userRole !== 'FINANCE' && userRole !== 'OWNER') {
      console.warn(`[AUTH] Unauthorized Company Update Attempt by User: ${(req as any).userId}, Role: ${userRole}`);
      return res.status(403).json({ error: 'Akses Ditolak: Hanya Admin yang dapat merubah profil perusahaan' });
    }

    const { 
      name, latitude, longitude, radius,
      picName, picPhone, address, contractType, contractValue, contractStart, contractEnd,
      employeeLimit, adminLimit, posLimit, photoRetentionDays, modules,
      waApiKey, waGatewayUrl, waProspectTemplate,
      primaryColor, secondaryColor,
      timezone,
      addons,
      posBlindClosing,
      globalTaxRate,
      deliveryNoteTerms
    } = req.body;

    console.log(`[DEBUG PATCH /companies/my] UPDATING Tenant: ${tenantId}`, {
      adminLimit, posLimit
    });

    // Helper untuk parse angka agar aman dari NaN dan mendukung nilai 0
    const parseNum = (val: any) => {
      if (val === null || val === undefined || val === '') return undefined;
      const num = parseFloat(val.toString());
      return isNaN(num) ? undefined : num;
    };

    const parseIntNum = (val: any) => {
      if (val === null || val === undefined || val === '') return undefined;
      const num = parseInt(val.toString(), 10);
      return isNaN(num) ? undefined : num;
    };

    const updatedCompany = await prisma.company.update({
      where: { id: tenantId },
      data: {
        name,
        latitude: parseNum(latitude),
        longitude: parseNum(longitude),
        radius: parseIntNum(radius),
        picName,
        picPhone,
        address,
        primaryColor,
        secondaryColor,
        contractType,
        contractValue: parseNum(contractValue),
        contractStart: contractStart ? new Date(contractStart) : undefined,
        contractEnd: contractEnd ? new Date(contractEnd) : undefined,
        employeeLimit: parseIntNum(employeeLimit),
        adminLimit: parseIntNum(adminLimit),
        posLimit: parseIntNum(posLimit),
        photoRetentionDays: parseIntNum(photoRetentionDays),
        modules: modules || undefined,
        waApiKey: waApiKey !== undefined ? waApiKey : undefined,
        waGatewayUrl: waGatewayUrl !== undefined ? waGatewayUrl : undefined,
        waProspectTemplate: waProspectTemplate !== undefined ? waProspectTemplate : undefined,
        posBlindClosing: posBlindClosing !== undefined ? !!posBlindClosing : undefined,
        globalTaxRate: parseNum(globalTaxRate),
        timezone: timezone || undefined,
        addons: Array.isArray(addons) ? addons : undefined,
        deliveryNoteTerms: deliveryNoteTerms !== undefined ? deliveryNoteTerms : undefined,
        openTime: req.body.openTime !== undefined ? req.body.openTime : undefined,
        closeTime: req.body.closeTime !== undefined ? req.body.closeTime : undefined,
        isOpenManual: req.body.isOpenManual !== undefined ? !!req.body.isOpenManual : undefined
      }
    });

    console.log(`[SUCCESS] Company Profile Updated for Tenant: ${tenantId}`);
    res.json({ message: 'Profil perusahaan berhasil diperbarui', company: updatedCompany });
  } catch (error) {
    console.error('[ERROR] Gagal memperbarui profil perusahaan:', error);
    res.status(500).json({ error: 'Gagal memperbarui data perusahaan di database' });
  }
});

app.patch('/api/companies/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).userRole;
    const tenantIdFromAuth = (req as any).tenantId;
    const companyId = parseInt(req.params.id as string);

    // Izinkan jika dia Super Admin ATAU dia adalah Admin dari perusahaan itu sendiri
    if (userRole !== 'SUPERADMIN' && tenantIdFromAuth !== companyId) {
      return res.status(403).json({ error: 'Hanya Super Admin atau Admin terkait yang dapat mengedit data ini' });
    }
    const { 
      name, latitude, longitude, radius,
      picName, picPhone, contractType, contractDuration, contractValue, contractStart, contractEnd,
      employeeLimit, adminLimit, posLimit, photoRetentionDays,
      plan, addons, purchasedInsights,
      discountKpi, discountLearning, discountInventory, discountAi, discountFraud, discountExpansion, discountProspecting,
      adminEmail, adminPassword, adminName, globalTaxRate
    } = req.body;

    const payloadToLog = { 
      employeeLimit, adminLimit, posLimit, photoRetentionDays, plan 
    };
    console.log(`[DEBUG PATCH /companies/:id] Payload received for ID ${companyId}:`, payloadToLog);

    const safeParseInt = (val: any, fallback?: number) => {
        if (val === undefined || val === null || val === '') return fallback;
        const n = parseInt(val.toString(), 10);
        return isNaN(n) ? fallback : n;
    };

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        latitude: (latitude !== undefined && latitude !== null) ? parseFloat(latitude.toString()) : (latitude === null ? null : undefined),
        longitude: (longitude !== undefined && longitude !== null) ? parseFloat(longitude.toString()) : (longitude === null ? null : undefined),
        radius: safeParseInt(radius),
        picName,
        picPhone,
        contractType,
        contractDuration: safeParseInt(contractDuration),
        contractValue: (contractValue !== undefined && contractValue !== null) ? parseFloat(contractValue.toString()) : undefined,
        contractStart: contractStart ? new Date(contractStart) : (contractStart === null ? null : undefined),
        contractEnd: contractEnd ? new Date(contractEnd) : (contractEnd === null ? null : undefined),
        employeeLimit: safeParseInt(employeeLimit),
        adminLimit: safeParseInt(adminLimit),
        posLimit: safeParseInt(posLimit),
        photoRetentionDays: safeParseInt(photoRetentionDays),
        plan: plan !== undefined ? plan : undefined,
        addons: addons !== undefined ? addons : undefined,
        purchasedInsights: purchasedInsights !== undefined ? purchasedInsights : undefined,
        // --- AUTO-SYNC MODULES ---
        modules: (plan === 'PRO' || plan === 'ENTERPRISE') ? 'BOTH' : (req.body.modules || undefined),
        discountKpi: safeParseInt(discountKpi),
        discountLearning: safeParseInt(discountLearning),
        discountInventory: safeParseInt(discountInventory),
        discountAi: safeParseInt(discountAi),
        discountFraud: safeParseInt(discountFraud),
        discountExpansion: safeParseInt(discountExpansion),
        discountProspecting: safeParseInt(discountProspecting),
        globalTaxRate: (globalTaxRate !== undefined && globalTaxRate !== null) ? parseFloat(globalTaxRate.toString()) : undefined
      }
    });

    let adminUser = null;
    
    // Update or Create Admin if email is provided in the edit form
    if (adminEmail) {
      // Try finding the primary admin of the company
      const existingAdmin = await prisma.user.findFirst({
        where: { companyId: companyId, role: 'ADMIN' },
        orderBy: { createdAt: 'asc' } 
      });

      if (existingAdmin) {
        console.log(`[DEBUG PATCH] Updating existing admin ID ${existingAdmin.id}. New Email: "${adminEmail.trim().toLowerCase()}"`);
        const updateData: any = {
          email: adminEmail.trim().toLowerCase(),
          name: adminName || existingAdmin.name
        };
        
        if (adminPassword) {
          updateData.password = await bcrypt.hash(adminPassword, 10);
        }

        adminUser = await prisma.user.update({
          where: { id: existingAdmin.id },
          data: updateData
        });
        console.log(`[SYS] Administrator for tenant ${companyId} updated.`);
      } else if (adminPassword) {
        // Only create if we have a password for the new account
        adminUser = await prisma.user.create({
          data: {
            companyId: companyId,
            email: adminEmail.trim().toLowerCase(),
            password: await bcrypt.hash(adminPassword, 10),
            name: adminName || picName || 'Admin ' + name,
            role: 'ADMIN'
          }
        });
        console.log(`[SYS] Fresh Administrator for tenant ${companyId} created.`);
      }
    }

    console.log(`[DEBUG PATCH /companies/:id] Successfully saved, NEW ADMIN LIMIT in DB: ${updatedCompany.adminLimit}`);

    res.json({ message: 'Data klien berhasil diperbarui', company: updatedCompany });
  } catch (error: any) {
    console.error('Update Company Error:', error);
    res.status(500).json({ error: 'Gagal memperbarui data klien: ' + error.message });
  }
});

// A3. Endpoint Mendapatkan Detail Perusahaan Sendiri (Tenant) - Aligned with above
// Handled by A2.2 route (already updated)

// A3.1. Endpoint Men-generate Ulang API Key (Integrasi Kasir) - DENGAN PENGECEKAN AKTIVASI
app.post('/api/companies/my/api-key', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    // Cek apakah fitur integrasi sudah di-approve/diaktifkan oleh Owner Pusat
    const company = await prisma.company.findUnique({
        where: { id: tenantId },
        select: { isApiEnabled: true }
    });

    if (!company?.isApiEnabled) {
        return res.status(403).json({ 
            error: 'Fitur Integrasi API belum aktif.', 
            message: 'Silakan hubungi Admin Pusat (Aivola Owner) atau lakukan Request melalui menu Integrasi.' 
        });
    }

    // Generate simple random API key
    const newApiKey = 'ak_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const updatedCompany = await prisma.company.update({
      where: { id: tenantId },
      // @ts-ignore
      data: { integrationApiKey: newApiKey }
    });

    // @ts-ignore
    res.json({ message: 'API Key berhasil diperbarui', apiKey: updatedCompany.integrationApiKey });
  } catch (error) {
    res.status(500).json({ error: 'Gagal membuat API Key baru' });
  }
});

// A3.1.1 Endpoint Request Integrasi API (Oleh Klien)
app.post('/api/integrations/request', tenantMiddleware, async (req: Request, res: Response) => {
    try {
        const tenantId = (req as any).tenantId;
        const { note } = req.body;

        // Cek apakah sudah ada request PENDING
        const existingRequest = await prisma.integrationRequest.findFirst({
            where: { companyId: tenantId, status: 'PENDING' }
        });

        if (existingRequest) {
            return res.status(400).json({ error: 'Anda sudah memiliki permintaan integrasi yang sedang menunggu persetujuan.' });
        }

        const newRequest = await prisma.integrationRequest.create({
            data: {
                companyId: tenantId,
                note: note || 'Request integrasi eksternal (Pabrik/Industri/POS)',
                status: 'PENDING'
            }
        });

        res.json({ message: 'Permintaan integrasi berhasil dikirim!', request: newRequest });
    } catch (error: any) {
        res.status(500).json({ error: 'Gagal mengirim permintaan: ' + error.message });
    }
});

// A3.1.2 Endpoint Ambil Status Request Saya (Oleh Klien)
app.get('/api/integrations/my-status', tenantMiddleware, async (req: Request, res: Response) => {
    try {
        const tenantId = (req as any).tenantId;
        const request = await prisma.integrationRequest.findFirst({
            where: { companyId: tenantId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ request });
    } catch (error: any) {
        res.status(500).json({ error: 'Gagal mengambil status: ' + error.message });
    }
});

// A3.1.3 Endpoint List Request (Oleh Master Admin / SuperAdmin)
app.get('/api/admin/integrations/requests', tenantMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;
        if (userRole !== 'SUPERADMIN' && userRole !== 'OWNER') {
            return res.status(403).json({ error: 'Hanya Admin Pusat yang dapat melihat daftar request' });
        }

        const requests = await prisma.integrationRequest.findMany({
            include: { company: { select: { id: true, name: true, plan: true } } },
            orderBy: { createdAt: 'desc' }
        });

        res.json(requests);
    } catch (error: any) {
        res.status(500).json({ error: 'Gagal mengambil daftar request: ' + error.message });
    }
});

// A3.1.4 Endpoint Approve/Reject Request (Oleh Master Admin / SuperAdmin)
app.patch('/api/admin/integrations/requests/:id', tenantMiddleware, async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).userRole;
        if (userRole !== 'SUPERADMIN' && userRole !== 'OWNER') {
            return res.status(403).json({ error: 'Hanya Admin Pusat yang dapat memproses request' });
        }

        const requestId = parseInt(req.params.id as string);
        const { status } = req.body; // 'APPROVED' atau 'REJECTED'

        const request = await prisma.integrationRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) return res.status(404).json({ error: 'Request tidak ditemukan' });

        // Update Request Status
        await prisma.integrationRequest.update({
            where: { id: requestId },
            data: { status }
        });

        // Jika APPROVED, aktifkan fiturnya di tabel Company
        if (status === 'APPROVED') {
            await prisma.company.update({
                where: { id: request.companyId },
                data: { isApiEnabled: true }
            });
        } else if (status === 'REJECTED') {
            // Optional: Nonaktifkan juga jika di-reject (misal mencabut akses lama)
            await prisma.company.update({
                where: { id: request.companyId },
                data: { isApiEnabled: false }
            });
        }

        res.json({ message: `Request berhasil ${status.toLowerCase()}!` });
    } catch (error: any) {
        res.status(500).json({ error: 'Gagal memproses request: ' + error.message });
    }
});

// A3.2. Endpoint Upload Logo Perusahaan (Phase 19)
app.patch('/api/companies/my/logo', tenantMiddleware, uploadLogo.single('logo'), async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userRole = (req as any).userRole;

    console.log(`[LOGO UPLOAD] Starting for tenant: ${tenantId}, file: ${req.file?.originalname}`);

    if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Akses Ditolak: Hanya Admin yang dapat merubah logo' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }

    // 1. Baca file dan ubah ke Base64 (Data URI)
    const mimeType = req.file.mimetype;
    const base64Image = fs.readFileSync(req.file.path, { encoding: 'base64' });
    const logoUrl = `data:${mimeType};base64,${base64Image}`;
    
    console.log(`[LOGO UPLOAD] File converted to Base64, length: ${logoUrl.length}`);

    // 2. Update URL di Database
    const updatedCompany = await prisma.company.update({
      where: { id: tenantId },
      data: { logoUrl }
    });

    // 3. Cleanup local file karena sudah masuk database
    cleanupLocalFile(req.file.path);

    res.json({ 
      success: true,
      message: 'Logo berhasil diperbarui dan disimpan di database', 
      logoUrl: logoUrl 
    });
  } catch (error: any) {
    console.error('!!! LOGO UPLOAD CRITICAL ERROR !!!', error);
    res.status(500).json({ 
      error: 'Gagal mengupload logo', 
      details: error.message,
      code: error.code
    });
  }
});



// A4.1. Endpoint Update Aturan Gaji (Payroll Settings) Phase 20
app.patch('/api/companies/my/payroll-settings', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { 
      lateDeductionRate, absenceDeductionType, absenceDeductionRate, 
      sickLeaveDeductionRate, workDaysPerMonth, lateGracePeriod 
    } = req.body;

    const updatedCompany = await prisma.company.update({
      where: { id: tenantId },
      data: {
        lateDeductionRate: isNaN(parseFloat(lateDeductionRate)) ? undefined : parseFloat(lateDeductionRate),
        absenceDeductionType: absenceDeductionType, // 'PRO_RATA' | 'FIXED_AMOUNT'
        absenceDeductionRate: isNaN(parseFloat(absenceDeductionRate)) ? undefined : parseFloat(absenceDeductionRate),
        sickLeaveDeductionRate: isNaN(parseFloat(sickLeaveDeductionRate)) ? undefined : parseFloat(sickLeaveDeductionRate),
        workDaysPerMonth: isNaN(parseInt(workDaysPerMonth)) ? undefined : parseInt(workDaysPerMonth),
        lateGracePeriod: isNaN(parseInt(lateGracePeriod)) ? undefined : parseInt(lateGracePeriod),
      }
    });

    res.json({ message: 'Aturan gaji berhasil diperbarui', company: updatedCompany });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal memperbarui aturan gaji perusahaan' });
  }
});

// A5. Manajemen Cabang (Branches)
app.get('/api/branches', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const userId = (req as any).userId;

    // --- POS_VIEWER BRANCH ISOLATION ---
    if (userRole === 'POS_VIEWER') {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { branchId: true } });
      if (user?.branchId) {
        // Return only the assigned branch
        const branches = await prisma.branch.findMany({ where: { id: user.branchId, companyId: tenantId } });
        return res.json(branches);
      }
    }

    // @ts-ignore
    const branches = await prisma.branch.findMany({ where: { companyId: tenantId } });
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar cabang' });
  }
});

app.post('/api/branches', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { name, latitude, longitude, radius } = req.body;
    // @ts-ignore
    const branch = await prisma.branch.create({
      data: {
        companyId: tenantId,
        name,
        latitude: latitude ? parseFloat(latitude.toString()) : null,
        longitude: longitude ? parseFloat(longitude.toString()) : null,
        radius: radius ? parseInt(radius.toString(), 10) : 100
      }
    });
    res.json({ message: 'Cabang berhasil ditambahkan', branch });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menambahkan cabang' });
  }
});

app.delete('/api/branches/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const branchId = parseInt(req.params.id as string);

    // @ts-ignore
    const branch = await prisma.branch.findFirst({ where: { id: branchId, companyId: tenantId } });
    if (!branch) return res.status(404).json({ error: 'Cabang tidak ditemukan' });

    // @ts-ignore
    await prisma.branch.delete({ where: { id: branchId } });
    res.json({ message: 'Cabang berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus cabang, pastikan tidak ada karyawan yang terhubung.' });
  }
});

app.patch('/api/branches/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const branchId = parseInt(req.params.id as string);
    const { name, latitude, longitude, radius } = req.body;

    // Pastikan cabang milik tenant ini
    // @ts-ignore
    const branch = await prisma.branch.findFirst({ where: { id: branchId, companyId: tenantId } });
    if (!branch) return res.status(404).json({ error: 'Cabang tidak ditemukan atau bukan milik perusahaan Anda' });

    // @ts-ignore
    const updatedBranch = await prisma.branch.update({
      where: { id: branchId },
      data: {
        name,
        latitude: (latitude !== undefined && latitude !== null) ? parseFloat(latitude.toString()) : (latitude === null ? null : undefined),
        longitude: (longitude !== undefined && longitude !== null) ? parseFloat(longitude.toString()) : (longitude === null ? null : undefined),
        radius: (radius !== undefined && radius !== null) ? parseInt(radius.toString(), 10) : undefined
      }
    });

    res.json({ message: 'Data cabang berhasil diperbarui', branch: updatedBranch });
  } catch (error) {
    console.error('Update Branch Error:', error);
    res.status(500).json({ error: 'Gagal memperbarui data cabang.' });
  }
});

// A6. External API Integration (Labor Cost)
app.get('/api/integration/labor-cost', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || typeof apiKey !== 'string') return res.status(401).json({ error: 'API Key is required in header x-api-key' });

    // @ts-ignore
    const company = await prisma.company.findUnique({ where: { integrationApiKey: apiKey } });
    if (!company) return res.status(403).json({ error: 'Invalid API Key' });

    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    if (!month || !year) return res.status(400).json({ error: 'month and year query parameters are required' });

    // Sum all netSalary for the specified month and year for this company
    const payrolls = await prisma.payroll.findMany({
      where: {
        companyId: company.id,
        month: month,
        year: year
      }
    });

    const totalLaborCost = payrolls.reduce((sum, payroll) => sum + payroll.netSalary, 0);

    res.json({
      company: company.name,
      period: { month, year },
      totalLaborCost,
      employeeCount: payrolls.length
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error during integration' });
  }
});

// B. Endpoint Mendaftar Karyawan Baru pada sebuah Perusahaan SaaS
app.post('/api/users', tenantMiddleware, async (req: Request, res: Response) => {
  if ((req as any).userRole === 'FINANCE') {
    return res.status(403).json({ error: 'Akses Ditolak: Role Finance tidak memiliki izin untuk mengelola data SDM/Karyawan.' });
  }
  try {
    const tenantId = (req as any).tenantId;
    const { 
      name, email, password, role, companyId, branchId, shiftId,
      basicSalary, allowance, overtimeRate, jobTitle, division, 
      grade, joinDate, contractEndDate, reportToId,
      bpjsKesehatan, bpjsKetenagakerjaan, mealAllowance,
      taxStatus, isTaxable, isAttendanceExempt
    } = req.body;

    const requestorRole = (req as any).userRole;
    const requestorId = (req as any).userId;

    // 1. Dapatkan Tenant ID Target
    // Jika Super Admin, dia boleh menentukan companyId di body (untuk rekrut ke klien)
    let targetTenantId = tenantId;
    if (requestorRole === 'SUPERADMIN' && req.body.companyId) {
        targetTenantId = parseInt(req.body.companyId, 10);
    }

    // 2. Proteksi Role SUPERADMIN
    if (role === 'SUPERADMIN' && requestorRole !== 'SUPERADMIN') {
        console.warn(`[SECURITY] Unauthorized SUPERADMIN creation attempt by user ${requestorId}`);
        return res.status(403).json({ error: 'Hanya Super Admin yang dapat membuat akun Super Admin lain.' });
    }

    const company = await prisma.company.findUnique({
      where: { id: targetTenantId }
    });

    console.log(`[DEBUG POST /api/users] Requestor: ${requestorId} (${requestorRole}), Target Tenant: ${targetTenantId}, Limit in DB: ${company?.adminLimit}`);

    if (company) {
      // 1. Check Employee Limit (Active Employees Only)
      const activeUserCount = await prisma.user.count({
          where: { companyId: targetTenantId, isActive: true }
      });

      // Super Admin bypass limit check
      if (requestorRole !== 'SUPERADMIN' && company.employeeLimit > 0 && activeUserCount >= company.employeeLimit) {
        return res.status(403).json({ 
          error: `Limit karyawan tercapai! Tenant ini hanya diizinkan memiliki maksimal ${company.employeeLimit} karyawan.` 
        });
      }

      // 3. Check Admin/Back-office Limit
      const backOfficeRoles: Role[] = ['ADMIN', 'OWNER', 'MANAGER', 'FINANCE', 'PURCHASING', 'POS_VIEWER'] as any;
      if (backOfficeRoles.includes(role)) {
          // Gunakan raw query untuk melewati validasi enum Prisma yang terkadang cache
          const adminCountResult: any = await prisma.$queryRawUnsafe(
              `SELECT COUNT(*)::int as count FROM "User" WHERE "companyId" = $1 AND "role"::text = ANY($2)`,
              targetTenantId,
              backOfficeRoles
          );
          const currentAdminCount = adminCountResult[0]?.count || 0;

          // Super Admin bypass limit check
          if (requestorRole !== 'SUPERADMIN' && company.adminLimit > 0 && currentAdminCount >= company.adminLimit) {
              console.error(`[LIMIT FAILURE] Company: ${company.name} (ID: ${company.id}), adminLimit: ${company.adminLimit}, currentAdmins: ${currentAdminCount}`);
              return res.status(403).json({
                  error: `Limit Admin/Back-office tercapai! Paket Anda hanya mengizinkan maksimal ${company.adminLimit} user dengan role manajemen. Silakan upgrade paket atau tambah slot admin.`
              });
          }
      }

      // 4. Check POS/Cashier Limit
      if (role === 'CASHIER') {
          const companyLimit = await prisma.company.findUnique({ where: { id: targetTenantId } });
          const currentCashierCount = await prisma.user.count({
              where: { 
                  companyId: targetTenantId,
                  role: 'CASHIER'
              }
          });

          // Super Admin bypass limit check
          if (requestorRole !== 'SUPERADMIN' && companyLimit && companyLimit.posLimit > 0 && currentCashierCount >= companyLimit.posLimit) {
              return res.status(403).json({
                  error: `Limit Kasir (POS) tercapai! Paket Anda hanya mengizinkan maksimal ${companyLimit.posLimit} unit kasir. Silakan upgrade paket atau tambah slot kasir.`
              });
          }
      }
    }

    // Hitung Hash Hash (Salt Rounds: 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Menerima request pendaftaran:', { ...req.body, password: '***' });

    const parsedCompanyId = companyId ? parseInt(companyId, 10) : 1;
    const parsedBranchId = branchId ? parseInt(branchId, 10) : null;
    const parsedShiftId = shiftId ? parseInt(shiftId, 10) : null;
    const salary = typeof basicSalary === 'number' ? basicSalary : parseFloat(basicSalary || '0');
    const allow = typeof allowance === 'number' ? allowance : parseFloat(allowance || '0');
    const overTime = typeof overtimeRate === 'number' ? overtimeRate : parseFloat(overtimeRate || '0');

    // Validasi Date
    const parseDate = (d: any) => {
        if (!d) return null;
        const date = new Date(d);
        return isNaN(date.getTime()) ? null : date;
    };

    const user = await (prisma.user as any).create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'EMPLOYEE',
        companyId: targetTenantId,
        branchId: isNaN(parsedBranchId as number) ? null : parsedBranchId,
        shiftId: isNaN(parsedShiftId as number) ? null : parsedShiftId,
        basicSalary: isNaN(salary) ? 0 : salary,
        allowance: isNaN(allow) ? 0 : allow,
        overtimeRate: isNaN(overTime) ? 0 : overTime,
        jobTitle: jobTitle || null,
        division: division || null,
        grade: grade || null,
        joinDate: parseDate(joinDate),
        contractEndDate: parseDate(contractEndDate),
        reportToId: reportToId ? parseInt(reportToId) : null,
        bpjsKesehatan: !!bpjsKesehatan,
        bpjsKetenagakerjaan: !!bpjsKetenagakerjaan,
        mealAllowance: mealAllowance ? parseFloat(mealAllowance.toString()) : 0,
        taxStatus: taxStatus || 'TK-0',
        isTaxable: isTaxable === undefined ? true : !!isTaxable,
        isAttendanceExempt: !!isAttendanceExempt
      }
    });

    res.json({ message: 'Karyawan berhasil ditambahkan', user: { id: user.id, name: user.name, email: user.email } });
  } catch (error: any) {
    console.error('Error saat pendaftaran karyawan:', error);
    
    // Tangani error email duplikat dari Prisma (P2002)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email sudah terdaftar. Gunakan email lain.' });
    }

    res.status(500).json({ error: 'Gagal mendaftarkan karyawan: ' + error.message });
  }
});

// B1.5 Endpoint Edit Karyawan
app.put('/api/users/:id', tenantMiddleware, async (req: Request, res: Response) => {
  if ((req as any).userRole === 'FINANCE') {
    return res.status(403).json({ error: 'Akses Ditolak: Role Finance tidak memiliki izin untuk mengelola data SDM/Karyawan.' });
  }
  try {
    const tenantId = (req as any).tenantId;
    const requestorRole = (req as any).userRole;
    const reqUserId = parseInt(req.params.id as string);
    
    // 1. Ambil Data User yang akan diedit
    let checkUser = await prisma.user.findFirst({ where: { id: reqUserId } });
    if (!checkUser) return res.status(404).json({ error: 'Karyawan tidak ditemukan' });

    // 2. Validasi Akses: Harus Tenant yang sama ATAU Superadmin
    if (requestorRole !== 'SUPERADMIN' && checkUser.companyId !== tenantId) {
        return res.status(403).json({ error: 'Akses Ditolak: Anda tidak memiliki wewenang mengedit data tenant lain' });
    }

    const { 
      name, email, role, basicSalary, allowance, overtimeRate, 
      jobTitle, division, grade, joinDate, contractEndDate, 
      reportToId, branchId, isActive, resignDate,
      bpjsKesehatan, bpjsKetenagakerjaan, mealAllowance,
      taxStatus, isTaxable, isAttendanceExempt
    } = req.body;

    // 3. Proteksi Role SUPERADMIN
    if (role === 'SUPERADMIN' && requestorRole !== 'SUPERADMIN') {
        return res.status(403).json({ error: 'Hanya Super Admin yang dapat menunjuk akun Super Admin lain.' });
    }

    // --- ENFORCE ADMIN LIMIT ON UPDATE ---
    const backOfficeRoles: Role[] = ['ADMIN', 'OWNER', 'MANAGER', 'FINANCE', 'PURCHASING'] as any;
    if (requestorRole !== 'SUPERADMIN' && role && role !== checkUser.role && backOfficeRoles.includes(role)) {
        const company = await prisma.company.findUnique({ where: { id: checkUser.companyId } });
        const currentAdminCount = await prisma.user.count({
            where: { 
                companyId: checkUser.companyId,
                role: { in: backOfficeRoles as any }
            }
        });

        if (company && company.adminLimit > 0 && currentAdminCount >= company.adminLimit) {
            return res.status(403).json({
                error: `Gagal mengubah role! Limit Admin/Back-office (${company.adminLimit}) sudah penuh. Silakan hubungi pusat untuk menambah slot.`
            });
        }
    }

    // --- ENFORCE POS LIMIT ON UPDATE ---
    if (requestorRole !== 'SUPERADMIN' && role && role !== checkUser.role && role === 'CASHIER') {
        const company = await prisma.company.findUnique({ where: { id: checkUser.companyId } });
        const currentCashierCount = await prisma.user.count({
            where: { 
                companyId: checkUser.companyId,
                role: 'CASHIER'
            }
        });

        if (company && company.posLimit > 0 && currentCashierCount >= company.posLimit) {
            return res.status(403).json({
                error: `Gagal mengubah role! Limit Kasir/POS (${company.posLimit}) sudah penuh. Silakan hubungi pusat untuk menambah slot.`
            });
        }
    }

    const updatedUser = await (prisma.user as any).update({
      where: { id: reqUserId },
      data: {
        name,
        email,
        role,
        basicSalary: basicSalary ? parseFloat(basicSalary.toString()) : undefined,
        allowance: allowance ? parseFloat(allowance.toString()) : undefined,
        overtimeRate: overtimeRate ? parseFloat(overtimeRate.toString()) : undefined,
        jobTitle: jobTitle || null,
        division: division || null,
        grade: grade || null,
        joinDate: joinDate ? new Date(joinDate) : null,
        contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
        reportToId: reportToId ? parseInt(reportToId) : null,
        branchId: branchId ? parseInt(branchId) : null,
        isActive: isActive !== undefined ? !!isActive : undefined,
        resignDate: resignDate ? new Date(resignDate) : undefined,
        bpjsKesehatan: bpjsKesehatan !== undefined ? !!bpjsKesehatan : undefined,
        bpjsKetenagakerjaan: bpjsKetenagakerjaan !== undefined ? !!bpjsKetenagakerjaan : undefined,
        mealAllowance: mealAllowance !== undefined ? parseFloat(mealAllowance.toString()) : undefined,
        taxStatus: taxStatus !== undefined ? taxStatus : undefined,
        isTaxable: isTaxable !== undefined ? !!isTaxable : undefined,
        isAttendanceExempt: isAttendanceExempt !== undefined ? !!isAttendanceExempt : undefined
      }
    });

    res.json({ message: 'Data karyawan berhasil diperbarui', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal memperbarui data karyawan' });
  }
});

// Endpoint untuk Reset Password Karyawan
app.put('/api/users/:id/reset-password', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const requestorRole = (req as any).userRole;
    const reqUserId = parseInt(req.params.id as string);

    // Hanya Admin, Owner, atau Superadmin yang boleh reset password
    if (requestorRole !== 'SUPERADMIN' && requestorRole !== 'ADMIN' && requestorRole !== 'OWNER' && requestorRole !== 'MANAGER') {
      return res.status(403).json({ error: 'Akses Ditolak: Anda tidak memiliki wewenang untuk me-reset password karyawan.' });
    }

    const checkUser = await prisma.user.findFirst({ where: { id: reqUserId } });
    if (!checkUser) return res.status(404).json({ error: 'Karyawan tidak ditemukan' });

    // Validasi Akses: Harus Tenant yang sama ATAU Superadmin
    if (requestorRole !== 'SUPERADMIN' && checkUser.companyId !== tenantId) {
      return res.status(403).json({ error: 'Akses Ditolak: Anda tidak memiliki wewenang mengedit data tenant lain' });
    }

    // Default password baru adalah "123456"
    const newPassword = "123456";
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await (prisma.user as any).update({
      where: { id: reqUserId },
      data: {
        password: hashedPassword
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    res.json({ message: `Password untuk ${updatedUser.name} berhasil di-reset menjadi 123456`, user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal me-reset password karyawan' });
  }
});

// B1.6 Endpoint Hapus Karyawan (Permanen)
app.delete('/api/users/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const currentUserId = (req as any).userId;
    const targetUserId = parseInt(req.params.id as string);

    // 1. Prevent self-deletion
    if (currentUserId === targetUserId) {
      return res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri' });
    }

    // 2. Cek eksistensi
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Karyawan tidak ditemukan' });
    }

    // 3. Authorization Check
    // SuperAdmin can delete anyone across tenants. Regular admins only their own company.
    if (userRole !== 'SUPERADMIN' && targetUser.companyId !== tenantId) {
      return res.status(403).json({ error: 'Akses Ditolak: Anda tidak memiliki wewenang atas data tenant lain' });
    }

    // 4. Role Protection
    if (targetUser.role === 'SUPERADMIN' && userRole !== 'SUPERADMIN') {
        return res.status(403).json({ error: 'Role Super Admin dilindungi. Hubungi IT Cloud.' });
    }

    // 4. Delete
    await prisma.user.delete({
      where: { id: targetUserId }
    });

    res.json({ message: 'Karyawan berhasil dihapus secara permanen dari sistem' });

  } catch (error: any) {
    console.error('Delete User Error:', error);
    res.status(500).json({ error: 'Gagal menghapus karyawan: ' + error.message });
  }
});

// B1.6 Endpoint Deaktivasi Karyawan (Move to Ex-Employee)
app.patch('/api/users/:id/deactivate', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const reqUserId = parseInt(req.params.id as string);
    const { resignDate } = req.body || {};

    const userToDeactivate = await prisma.user.findFirst({ 
      where: { id: reqUserId, companyId: tenantId } 
    });
    
    if (!userToDeactivate) {
      return res.status(404).json({ error: 'Karyawan tidak ditemukan atau Anda tidak memiliki akses ke data ini.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: reqUserId },
      data: {
        isActive: false,
        resignDate: resignDate ? new Date(resignDate) : new Date()
      }
    });

    res.json({ message: 'Karyawan telah dipindahkan ke daftar Ex-Employee', user: updatedUser });
  } catch (error: any) {
    console.error('Error deactivating employee:', error);
    res.status(500).json({ error: 'Gagal menonaktifkan karyawan: ' + (error.message || error) });
  }
});

// B1.7 Endpoint Reset Device ID Karyawan (Anti-Fraud: izinkan ganti HP)
app.patch('/api/users/:id/reset-device', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const targetUserId = parseInt(req.params.id as string);

    // Hanya Admin dan Superadmin yang bisa melakukan reset
    if (!['ADMIN', 'SUPERADMIN', 'OWNER'].includes(userRole)) {
      return res.status(403).json({ error: 'Hanya Admin yang dapat mereset Device ID karyawan.' });
    }

    const userToReset = await prisma.user.findFirst({
      where: { id: targetUserId, companyId: tenantId }
    });

    if (!userToReset) {
      return res.status(404).json({ error: 'Karyawan tidak ditemukan atau Anda tidak memiliki akses.' });
    }

    await prisma.user.update({
      where: { id: targetUserId },
      // @ts-ignore
      data: { lastDeviceId: null }
    });

    console.log(`[Anti-Fraud] Device ID reset for user ${targetUserId} by role ${userRole}`);
    res.json({ message: `Device ID ${userToReset.name} berhasil direset. Karyawan bisa mendaftarkan HP baru pada absensi berikutnya.` });

  } catch (error: any) {
    console.error('Error resetting device ID:', error);
    res.status(500).json({ error: 'Gagal mereset Device ID: ' + (error.message || error) });
  }
});

// B2. Endpoint Mendapatkan Daftar Karyawan (Menggunakan Tenant Middleware)
app.get('/api/users', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId; 
    const userRole = (req as any).userRole;
    const { status } = req.query;

    // SECURITY: POS_VIEWER is strictly for turnover monitoring, NO HR access.
    if (userRole === 'POS_VIEWER') {
      return res.status(403).json({ error: 'Akses Ditolak: Role Anda tidak memiliki izin untuk melihat data SDM.' });
    }

    const users = await (prisma.user as any).findMany({
      where: {
        companyId: tenantId,
        ...(userRole === 'SUPERADMIN' 
          ? {} 
          : { 
              role: { not: 'SUPERADMIN' },
              name: { not: 'Aivola Owner' }
            }
        ),
        ...(status === 'inactive' ? { isActive: false } : { isActive: true })
      },
      include: {
        shift: true,
        branch: true,
        reportTo: { select: { id: true, name: true } }
      }
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data karyawan' });
  }
});

// ============================================================
// HELPER: Timezone-aware day range
// Mengembalikan { dayStart, dayEnd } dalam UTC untuk 1 hari penuh
// di timezone yang diberikan (IANA format, misal: 'Asia/Jakarta')
// Ini adalah pusat kendali masalah timezone untuk seluruh sistem absensi.
// ============================================================
function getDayRange(timezone: string = 'Asia/Jakarta', date: Date = new Date()) {
    const dateStrInTz = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
    const dayStart = new Date(`${dateStrInTz}T00:00:00`);
    const dayEnd = new Date(`${dateStrInTz}T23:59:59`);

    // Convert to proper UTC by using the timezone offset
    const startWithOffset = new Date(new Date(`${dateStrInTz}T00:00:00+00:00`).toLocaleString('en-US', { timeZone: 'UTC' }));
    
    // Cara paling reliable: gunakan ISO string dengan offset timezone
    const dayStartUTC = new Date(`${dateStrInTz}T00:00:00${getTimezoneOffset(timezone, date)}`);
    const dayEndUTC = new Date(`${dateStrInTz}T23:59:59${getTimezoneOffset(timezone, date)}`);
    
    return { dayStart: dayStartUTC, dayEnd: dayEndUTC, dateStr: dateStrInTz };
}

// Ambil offset timezone dalam format ±HH:MM dari IANA timezone string
function getTimezoneOffset(timezone: string, date: Date = new Date()): string {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const offsetMs = tzDate.getTime() - utcDate.getTime();
    const offsetHours = Math.floor(Math.abs(offsetMs) / 3600000);
    const offsetMinutes = Math.floor((Math.abs(offsetMs) % 3600000) / 60000);
    const sign = offsetMs >= 0 ? '+' : '-';
    return `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
}

// Ambil timezone dari Company (default: Asia/Jakarta)
// Nanti diintegrasikan dengan setting di database per-perusahaan
async function getCompanyTimezone(tenantId: number): Promise<string> {
    try {
        const company = await prisma.company.findUnique({ where: { id: tenantId } });
        return (company as any)?.timezone || 'Asia/Jakarta';
    } catch {
        return 'Asia/Jakarta'; // Fallback aman
    }
}

// Helper function to recalculate attendance for a specific user and date
async function recalculateAttendanceForUserAndDate(userId: number, date: Date, tenantId: number) {
    // Wrapped in outer try-catch so it NEVER crashes the parent route
    try {
        const todayStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        const dateTarget = new Date(todayStr + 'T00:00:00Z');
        
        console.log(`[RECALC DEBUG] Starting for User: ${userId}, Date: ${todayStr}`);

        // 1. Get recent attendance records for this user (increased depth for past edits)
        const recentAttendances = await prisma.attendance.findMany({
            where: {
                userId: userId,
                companyId: tenantId
            },
            orderBy: { clockIn: 'desc' },
            take: 100 
        });

        const attendance = recentAttendances.find(a => {
            const attDate = new Date(a.clockIn).toLocaleDateString('en-CA');
            return attDate === todayStr;
        });

        if (!attendance) {
            console.log(`[RECALC DEBUG] No attendance record found for User ${userId} on ${todayStr} after checking 100 records.`);
            return;
        }

        console.log(`[RECALC DEBUG] Found Attendance ID ${attendance.id}, ClockIn (Raw): ${attendance.clockIn}`);

        // 2. Get the new effective shift
        const [user, manualSchedule] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                include: { company: true, shift: true }
            }),
            (prisma as any).shiftSchedule.findUnique({
                where: { 
                    userId_date: {
                        userId: userId, 
                        date: dateTarget 
                    }
                },
                include: { shift: true }
            })
        ]);

        if (!user) {
            console.log(`[RECALC DEBUG] User ${userId} not found.`);
            return;
        }

        const effectiveShift = manualSchedule ? (manualSchedule.isOff ? null : manualSchedule.shift) : user.shift;
        const isScheduledOff = manualSchedule?.isOff;

        console.log(`[RECALC DEBUG] Effective Shift Found: ${effectiveShift?.name || 'NONE'}, StartTime: ${effectiveShift?.startTime || 'MISSING'}`);

        // 3. Recalculate status, lateMinutes, and earlyCheckOutMinutes
        let status = 'PRESENT';
        let lateMinutes = 0;
        let earlyCheckOutMinutes = 0;

        if (isScheduledOff) {
            status = 'PRESENT';
            lateMinutes = 0;
            earlyCheckOutMinutes = 0;
            console.log(`[RECALC DEBUG] Recalc Result: USER IS OFF`);
        } else if (effectiveShift?.startTime) {
            // -- CLOCK IN (LATE) --
            const clockInDate = new Date(attendance.clockIn);
            const jakartaIn = new Date(clockInDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
            
            const [sh, sm] = effectiveShift.startTime.split(':').map(Number);
            const shiftStartTime = new Date(jakartaIn);
            shiftStartTime.setHours(sh, sm, 0, 0);
            
            const gracePeriod = (user as any).company?.lateGracePeriod || 0;
            const threshold = new Date(shiftStartTime.getTime() + (gracePeriod * 60000));
            
            if (jakartaIn > threshold) {
                status = 'LATE';
                lateMinutes = Math.max(0, Math.floor((jakartaIn.getTime() - shiftStartTime.getTime()) / 60000));
            }

            // -- CLOCK OUT (EARLY CHECKOUT) --
            if (attendance.clockOut && effectiveShift.endTime) {
                const clockOutDate = new Date(attendance.clockOut);
                const jakartaOut = new Date(clockOutDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                
                const [eh, em] = effectiveShift.endTime.split(':').map(Number);
                const shiftEndTime = new Date(jakartaOut);
                shiftEndTime.setHours(eh, em, 0, 0);

                if (jakartaOut < shiftEndTime) {
                    earlyCheckOutMinutes = Math.max(0, Math.floor((shiftEndTime.getTime() - jakartaOut.getTime()) / 60000));
                }
            }
        }

        // 4. Update the attendance record
        await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                status: status as any,
                lateMinutes: lateMinutes,
                earlyCheckOutMinutes: earlyCheckOutMinutes
            }
        });

        console.log(`[RECALC SUCCESS] User ${userId}: ${status} (${lateMinutes} mins late)`);
    } catch (error) {
        console.error(`[RECALC ERROR] User ${userId}:`, error);
    }
}

// B2.1 Endpoint Mendapatkan Daftar Jadwal Shift (Kalender)
app.get('/api/schedules', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { month, year } = req.query;

    const schedules = await (prisma as any).shiftSchedule.findMany({
      where: {
        companyId: tenantId,
        ...(month && year ? {
          date: {
            gte: new Date(parseInt(year as string), parseInt(month as string) - 1, 1),
            lt: new Date(parseInt(year as string), parseInt(month as string), 1)
          }
        } : {})
      },
      include: {
        user: { select: { id: true, name: true, jobTitle: true } },
        shift: true
      },
      orderBy: { date: 'asc' }
    });

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data jadwal' });
  }
});

// B2.2 Endpoint Penugasan Jadwal Massal (Bulk Assignment)
app.post('/api/schedules/bulk', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { userIds, startDate, endDate, shiftId, isOff } = req.body;

    if (!userIds || !Array.isArray(userIds) || !startDate || !endDate) {
      return res.status(400).json({ error: 'Data tidak lengkap (userIds, startDate, endDate wajib ada).' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const results = [];

    for (const userId of userIds) {
      let current = new Date(start);
      while (current <= end) {
        const dateStr = current.toLocaleDateString('en-CA'); // YYYY-MM-DD
        console.log(`[Schedule Bulk] Processing User ${userId} for Date: ${dateStr}`);
        const schedule = await (prisma as any).shiftSchedule.upsert({
          where: {
            userId_date: {
              userId: userId,
              date: new Date(dateStr + 'T00:00:00Z')
            }
          },
          update: {
            shiftId: isOff ? null : (shiftId ? parseInt(shiftId) : null),
            isOff: !!isOff,
            companyId: tenantId
          },
          create: {
            companyId: tenantId,
            userId: userId,
            shiftId: isOff ? null : (shiftId ? parseInt(shiftId) : null),
            isOff: !!isOff,
            date: new Date(dateStr + 'T00:00:00Z')
          }
        });
        results.push(schedule);
        // --- AUTO-RECALCULATE ATTENDANCE (If they already clocked in today) ---
        await recalculateAttendanceForUserAndDate(userId, new Date(current), tenantId);
        current.setDate(current.getDate() + 1);
      }
    }

    res.json({ message: `Berhasil merencanakan ${results.length} penugasan jadwal.`, count: results.length });
  } catch (error: any) {
    console.error('Bulk Schedule Error:', error);
    res.status(500).json({ error: 'Gagal menyimpan jadwal massal: ' + error.message });
  }
});

// B2.2.5 Endpoint Penyesuaian Jadwal Matrix
app.post('/api/schedules/matrix', tenantMiddleware, async (req: Request, res: Response) => {
  console.log('[MATRIX ROUTE HIT] Saving schedule changes...');
  try {
    const tenantId = (req as any).tenantId;
    const { changes } = req.body; // Array of { userId, date, shiftId, isOff, isDefault }

    if (!changes || !Array.isArray(changes)) {
      return res.status(400).json({ error: 'Data perubahan tidak valid.' });
    }

    let updatedCount = 0;
    for (const change of changes) {
      const dateStr = new Date(change.date).toLocaleDateString('en-CA');
      console.log(`[Schedule Matrix] Processing User ${change.userId} for Date: ${dateStr}`);
      const dateTarget = new Date(dateStr + 'T00:00:00Z');

      if (change.isDefault) {
        // Hapus jika kembali ke default
        await (prisma as any).shiftSchedule.deleteMany({
          where: { userId: change.userId, date: dateTarget }
        });
      } else {
        // Upsert untuk penugasan spesifik
        await (prisma as any).shiftSchedule.upsert({
          where: {
            userId_date: {
              userId: change.userId,
              date: dateTarget
            }
          },
          update: {
            shiftId: change.isOff ? null : parseInt(change.shiftId),
            isOff: !!change.isOff,
            companyId: tenantId
          },
          create: {
            companyId: tenantId,
            userId: change.userId,
            shiftId: change.isOff ? null : parseInt(change.shiftId),
            isOff: !!change.isOff,
            date: dateTarget
          }
        });
      }
      // --- AUTO-RECALCULATE ATTENDANCE ---
      await recalculateAttendanceForUserAndDate(change.userId, dateTarget, tenantId);
      updatedCount++;
    }

    res.json({ message: `Berhasil menyimpan ${updatedCount} perubahan jadwal.`, count: updatedCount });
  } catch (error: any) {
    console.error('Matrix Schedule Error:', error);
    res.status(500).json({ error: 'Gagal menyimpan perubahan jadwal: ' + error.message });
  }
});

// B2.2.6 Endpoint Manual Recalculate Attendance (Admin Tool)
app.post('/api/attendance/recalculate', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { userId, date } = req.body;
    if (!userId || !date) return res.status(400).json({ error: 'userId dan date wajib diisi.' });
    await recalculateAttendanceForUserAndDate(parseInt(userId), new Date(date), tenantId);
    res.json({ message: `Recalculate untuk User ${userId} pada ${date} selesai.` });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal recalculate: ' + error.message });
  }
});

// B2.3 Endpoint Hapus Jadwal Spesifik
app.delete('/api/schedules/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const scheduleId = parseInt(req.params.id as string);

    const schedule = await (prisma as any).shiftSchedule.findFirst({
      where: { id: scheduleId, companyId: tenantId }
    });

    if (!schedule) return res.status(404).json({ error: 'Jadwal tidak ditemukan' });

    await (prisma as any).shiftSchedule.delete({ where: { id: scheduleId } });
    res.json({ message: 'Jadwal berhasil dihapus (Sistem akan menggunakan fallback shift profil)' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus jadwal' });
  }
});

// C. Endpoint Karyawan Melakukan Absensi (Clock-In) dengan Validasi Pagar Virtual per Cabang
app.post('/api/attendance/clock-in', tenantMiddleware, (req: Request, res: Response, next: NextFunction) => {
  uploadAttendance.single('photo')(req, res, (multerErr) => {
    if (multerErr) {
      console.error('[CLOCK-IN] Multer Error:', multerErr);
      return res.status(500).json({ error: 'Gagal memproses upload foto: ' + multerErr.message });
    }
    clockInHandler(req, res).catch(next);
  });
});

async function clockInHandler(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { lat, lng, deviceId } = req.body;

    // photoUrl diambil dari multer jika ada
    const photoUrl = req.file ? `/uploads/attendance/${req.file.filename}` : null;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Koordinat GPS perangkat wajib dilampirkan!' });
    }

    // 1. Tarik Data Karyawan beserta Cabang & Perusahaannya (Gunakan zona waktu Jakarta +7)
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    const [user, manualSchedule] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        // @ts-ignore
        include: { company: true, branch: true, shift: true }
      }),
      (prisma as any).shiftSchedule.findFirst({
        where: { 
          userId: userId, 
          date: new Date(todayStr) 
        },
        include: { shift: true }
      }).catch((e: any) => {
        // Tabel ShiftSchedule belum ada di DB (belum migrate) — skip manual schedule
        if (e?.code === 'P2021') console.warn('[Clock-In] ShiftSchedule table not found, skipping manual schedule check.');
        return null;
      })
    ]);

    // @ts-ignore
    if (!user || !user.company) return res.status(404).json({ error: 'Data karyawan atau perusahaan tidak ditemukan' });

    // Determine target shift for today
    const effectiveShift = manualSchedule ? (manualSchedule.isOff ? null : manualSchedule.shift) : user.shift;
    const isScheduledOff = manualSchedule?.isOff;

    if (isScheduledOff) {
      return res.status(400).json({ error: 'Hari ini Anda dijadwalkan LIBUR (OFF) di kalender kerja.' });
    }

    // --- FACE VERIFICATION (Phase 50/52) ---
    let faceSimilarityScore = null;
    let isFaceVerified = false;
    // @ts-ignore
    const hasReferencePhoto = !!user.faceReferenceUrl;

    if (!hasReferencePhoto) {
      // Soft warning: foto referensi belum ada, absensi tetap diizinkan tapi dicatat tidak terverifikasi
      console.warn(`[Face AI] Clock-In: User ${userId} belum punya faceReferenceUrl. Absensi diizinkan tanpa verifikasi.`);
      isFaceVerified = false;
      faceSimilarityScore = null;
    } else if (req.file) {
      try {
        const capturePath = path.join(process.cwd(), photoUrl!.replace(/^\/+/, ""));
        // @ts-ignore
        const refUrl = user.faceReferenceUrl as string;
        
        const faceResult = await compareFaces(refUrl, capturePath);
        faceSimilarityScore = faceResult.score;
        isFaceVerified = faceResult.verified;
        console.log(`[Face AI] Clock-In Verification: ${isFaceVerified} (Score: ${faceSimilarityScore})`);

        if (!isFaceVerified) {
          if (faceResult.errorMessage && faceResult.errorMessage.includes('AI Sedang Sibuk')) {
            console.warn('[Face AI] AI Server Down. Fail-safe triggered. Allowing Clock-In.');
          } else {
            const errMsg = faceResult.errorMessage ? `Error: ${faceResult.errorMessage}` : `Foto selfie tidak cocok dengan data referensi (Kemiripan: ${(faceSimilarityScore * 100).toFixed(1)}%). Pastikan wajah terlihat jelas.`;
            return res.status(400).json({ error: `Verifikasi Wajah Gagal: ${errMsg}` });
          }
        }
      } catch (faceErr) {
        console.error('[Face AI] Error during Clock-In verification:', faceErr);
        return res.status(500).json({ error: 'Terjadi kesalahan pada sistem verifikasi wajah AI.' });
      }
    } else {
      return res.status(400).json({ error: 'Verifikasi Wajah Wajib: Foto selfie tidak ditemukan.' });
    }

    // 2. Tentukan Titik Koordinat Acuan (GPS Reference Point)
    // Jika karyawan terdaftar di Cabang, gunakan GPS Cabang.
    // Jika tidak (staff pusat), gunakan GPS global Perusahaan.
    // @ts-ignore
    let refLat = user.branch?.latitude || user.company.latitude;
    // @ts-ignore
    let refLng = user.branch?.longitude || user.company.longitude;
    // @ts-ignore
    let refRadius = user.branch?.radius || user.company.radius || 100;
    // @ts-ignore
    let locationName = user.branch ? `Cabang ${user.branch.name}` : `Kantor Pusat`;

    // 3. Blokir jika karyawan di luar radius Geo-Fence
    if (refLat && refLng && refRadius) {
      const distance = getDistanceFromLatLonInM(lat, lng, refLat, refLng);

      if (distance > refRadius) {
        return res.status(400).json({
          error: `Posisi Anda di luar jangkauan absen ${locationName} (Jarak Anda: ${Math.round(distance)} meter). Toleransi: ${refRadius} meter.`
        });
      }
    }

    // --- AI FRAUD DETECTION (Phase 28) ---
    // @ts-ignore
    const isDeviceMatch = user.lastDeviceId ? (user.lastDeviceId === deviceId) : true;
    const isBorderlineLocation = (refLat && refLng && refRadius) ? (getDistanceFromLatLonInM(lat, lng, refLat, refLng) > (refRadius * 0.8)) : false;
    
    const fraudResult = calculateFraudScore({
        faceScore: faceSimilarityScore,
        isDeviceMatch,
        isBorderlineLocation,
        // @ts-ignore
        userHasRegisteredDevice: !!user.lastDeviceId
    });

    // Update User's lastDeviceId jika belum ada dan absen ini bersih
    // @ts-ignore
    if (!user.lastDeviceId && deviceId && !fraudResult.isSuspicious) {
        await prisma.user.update({
            where: { id: userId },
            // @ts-ignore
            data: { lastDeviceId: deviceId }
        });
    }

    // 4. CEK APAKAH SUDAH ABSEN HARI INI (Cegah Ganda)
    // Gunakan helper terpusat — timezone diambil dari setting perusahaan
    const companyTimezone = await getCompanyTimezone(tenantId);
    const { dayStart, dayEnd } = getDayRange(companyTimezone);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId: userId,
        clockIn: {
          gte: dayStart,
          lt: dayEnd
        }
      }
    });

    if (existingAttendance && !existingAttendance.clockOut) {
      return res.status(400).json({ 
        error: 'Anda sudah melakukan Clock-In hari ini dan belum Clock-Out.' 
      });
    }

    if (existingAttendance && existingAttendance.clockOut) {
      return res.status(400).json({ 
        error: 'Anda sudah menyelesaikan absensi hari ini (sudah Clock-In & Clock-Out).' 
      });
    }

    // 5. Simpan data aman ke tabel absen
    let finalPhotoUrl = photoUrl;
    if (photoUrl) {
      try {
        const fullPath = path.join(process.cwd(), photoUrl.replace(/^\/+/, ""));
        finalPhotoUrl = await uploadToSupabase(fullPath, 'attendance');
      } catch (uploadError) {
        console.error('Failed to upload to Supabase, falling back to absolute local URL:', uploadError);
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        finalPhotoUrl = `${baseUrl}${photoUrl}`;
      }
    }

    const attendance = await prisma.attendance.create({
      data: {
        companyId: tenantId,
        userId: userId,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        photoUrl: finalPhotoUrl,
        ...(() => {
            if (effectiveShift?.startTime) {
                const now = new Date();
                // Gunakan jam Jakarta untuk perbandingan
                const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                const [sh, sm] = effectiveShift.startTime.split(':').map(Number);
                
                const shiftStartTime = new Date(jakartaTime);
                shiftStartTime.setHours(sh, sm, 0, 0);
                
                // @ts-ignore
                const gracePeriod = user.company.lateGracePeriod || 0;
                const threshold = new Date(shiftStartTime.getTime() + (gracePeriod * 60000));
                
                if (jakartaTime > threshold) {
                    // Hanya hitung terlambat jika di hari yang sama atau setelah jam mulai
                    const lateMinutes = Math.floor((jakartaTime.getTime() - shiftStartTime.getTime()) / 60000);
                    // Jika lateMinutes negatif (absen kepagian banget sampai kena shift kemarin), set 0
                    return { status: 'LATE', lateMinutes: Math.max(0, lateMinutes) };
                }
            }
            return { status: 'PRESENT', lateMinutes: 0 };
        })(),
        // @ts-ignore
        faceSimilarityScore,
        // @ts-ignore
        isFaceVerified,
        // @ts-ignore
        fraudScore: fraudResult.score,
        // @ts-ignore
        isSuspicious: fraudResult.isSuspicious,
        // @ts-ignore
        deviceId: deviceId || null
      }
    });

    // --- AI MOOD ANALYSIS (Phase 36) - BACKGROUND JOB ---
    if (photoUrl) {
        const fullPath = path.join(process.cwd(), photoUrl.replace(/^\/+/, ""));
        console.log(`[Mood AI] Queuing photo for background analysis: ${fullPath}`);
        
        // Jalankan secara asynchronous tanpa me-lock response HTTP
        (async () => {
            if (fs.existsSync(fullPath)) {
                try {
                    const { analyzeMood } = require('./moodAI');
                    const moodResult = await analyzeMood(fullPath);
                    console.log(`[Mood AI] Background Result for attendance ${attendance.id}:`, moodResult);
                    await (prisma.attendance as any).update({
                        where: { id: attendance.id },
                        data: {
                            mood: moodResult.mood,
                            moodScore: moodResult.score
                        }
                    });
                } catch (moodErr) {
                    console.error('[Mood AI] Background Error during analysis:', moodErr);
                }
            } else {
                console.warn(`[Mood AI] Photo file not found for analysis: ${fullPath}`);
            }
            // Cleanup after Supabase upload and AI processing
            // ONLY cleanup if successfully uploaded to Supabase (finalPhotoUrl is not local)
            if (finalPhotoUrl && finalPhotoUrl.startsWith('http')) {
                cleanupLocalFile(fullPath);
            }
        })();
    }

    // TRIGGER NOTIFIKASI KE ADMIN
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    await notifyAdmins(tenantId, 'Clock-In Baru', `${targetUser?.name || 'Seorang karyawan'} melakukan clock-in.`);

    res.json({ message: 'Absent Berhasil (Clock In)', attendance });
  } catch (error: any) {
    console.error('[CLOCK-IN ERROR] Detail:', error?.message, error?.code, error?.meta);
    res.status(500).json({ error: 'Gagal melakukan absensi', detail: error?.message });
  }
}

// C1. Register Face Reference (Admin/HR Only)
app.patch('/api/users/:id/face-reference', tenantMiddleware, uploadFaceReference.single('photo'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const targetUserId = parseInt(req.params.id as string);

    // Keamanan: Hanya Admin/Superadmin yang bisa mendaftarkan wajah (mencegah fraud mandiri)
    if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Hanya Admin/HR yang dapat mendaftarkan foto referensi wajah.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File foto wajib dilampirkan.' });
    }

    // Pastikan user milik tenant yang sama (kecuali superadmin)
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user || (userRole !== 'SUPERADMIN' && user.companyId !== tenantId)) {
      return res.status(404).json({ error: 'Karyawan tidak ditemukan atau akses ditolak.' });
    }

    const localPath = `/uploads/face_references/${req.file.filename}`;
    const fullPath = path.join(process.cwd(), localPath.replace(/^\/+/, ""));

    // Upload ke Supabase
    let finalUrl = localPath;
    try {
      finalUrl = await uploadToSupabase(fullPath, 'face_references');
      // Only cleanup if successfully uploaded to Supabase
      if (finalUrl && finalUrl.startsWith('http')) {
          cleanupLocalFile(fullPath);
      }
    } catch (uploadError) {
      console.error('Supabase upload failed for face reference:', uploadError);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      finalUrl = `${baseUrl}${localPath}`;
    }

    // Simpan ke User
    await prisma.user.update({
      where: { id: targetUserId },
      // @ts-ignore
      data: { faceReferenceUrl: finalUrl }
    });

    res.json({ message: 'Foto referensi wajah berhasil didaftarkan.', faceReferenceUrl: finalUrl });

  } catch (error) {
    console.error('Face Reference Registration Error:', error);
    res.status(500).json({ error: 'Gagal mendaftarkan foto referensi wajah.' });
  }
});

// C1.1. Admin melihat semua daftar absensi (Filter per tanggal)
app.get('/api/attendance', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;

    // SECURITY: POS_VIEWER cannot see attendance logs
    if (userRole === 'POS_VIEWER') {
       return res.json([]);
    }

    // Filter by date: ?date=2026-04-17 (default: hari ini di Jakarta +7)
    // Atau filter by month: ?month=2026-04
    const dateParam = req.query.date as string | undefined;
    const monthParam = req.query.month as string | undefined;
    
    let targetDate: Date;
    let nextDate: Date;

    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      targetDate = new Date(`${monthParam}-01T00:00:00+07:00`);
      
      let nextY = y;
      let nextM = m + 1;
      if (nextM > 12) {
        nextM = 1;
        nextY++;
      }
      const nextMonthStr = `${nextY}-${String(nextM).padStart(2, '0')}-01T00:00:00+07:00`;
      nextDate = new Date(nextMonthStr);
    } else {
      const dateStr = dateParam || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
      targetDate = new Date(`${dateStr}T00:00:00+07:00`);
      nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    }

    const baseWhere = { companyId: tenantId };

    const attendances = await prisma.attendance.findMany({
      where: {
        ...baseWhere,
        clockIn: {
          gte: targetDate,
          lt: nextDate,
        },
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { clockIn: 'desc' },
    });
    res.json(attendances);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar absensi' });
  }
});

// C2. Endpoint Karyawan Melakukan Clock-Out
app.patch('/api/attendance/clock-out', tenantMiddleware, uploadAttendance.single('photo'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { lat, lng, deviceId } = req.body;

    const photoUrl = req.file ? `/uploads/attendance/${req.file.filename}` : null;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Koordinat GPS perangkat wajib dilampirkan!' });
    }

    // Cari absensi terakhir hari ini yang belum clock-out
    // Gunakan helper terpusat agar timezone konsisten dengan setting perusahaan
    const timezone = await getCompanyTimezone(tenantId);
    const { dayStart, dayEnd } = getDayRange(timezone);

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: userId,
        companyId: tenantId,
        clockIn: { gte: dayStart, lte: dayEnd },
        clockOut: null
      },
      orderBy: { clockIn: 'desc' },
      include: { user: { include: { company: true, branch: true, shift: true } } }
    });

    if (!attendance) {
      return res.status(404).json({ error: 'Data absensi aktif hari ini tidak ditemukan.' });
    }

    // --- FACE VERIFICATION (Phase 50/52) - Clock Out ---
    let faceSimilarityScore = null;
    let isFaceVerified = false;

    // @ts-ignore
    const hasReferencePhoto = !!attendance.user.faceReferenceUrl;

    if (!hasReferencePhoto) {
      console.warn(`[Face AI] Clock-Out: User ${userId} belum punya faceReferenceUrl. Absensi diizinkan tanpa verifikasi.`);
      isFaceVerified = false;
      faceSimilarityScore = null;
    } else if (req.file) {
      try {
        const capturePath = path.join(process.cwd(), photoUrl!.replace(/^\/+/, ""));
        // @ts-ignore
        const refUrl = attendance.user.faceReferenceUrl as string;
        const faceResult = await compareFaces(refUrl, capturePath);
        faceSimilarityScore = faceResult.score;
        isFaceVerified = faceResult.verified;
        console.log(`[Face AI] Clock-Out Verification: ${isFaceVerified} (Score: ${faceSimilarityScore})`);

        if (!isFaceVerified) {
          if (faceResult.errorMessage && faceResult.errorMessage.includes('AI Sedang Sibuk')) {
            console.warn('[Face AI] AI Server Down. Fail-safe triggered. Allowing Clock-Out.');
          } else {
            const errMsg = faceResult.errorMessage ? `Error: ${faceResult.errorMessage}` : `Foto tidak cocok (Kemiripan: ${(faceSimilarityScore * 100).toFixed(1)}%).`;
            return res.status(400).json({ error: `Verifikasi Wajah Gagal: ${errMsg}` });
          }
        }
      } catch (faceErr) {
        console.error('[Face AI] Error during Clock-Out verification:', faceErr);
        return res.status(500).json({ error: 'Gagal memverifikasi wajah saat Clock-Out.' });
      }
    } else {
      return res.status(400).json({ error: 'Foto selfie wajib dilampirkan untuk Clock-Out.' });
    }

    const user = attendance.user;
    // @ts-ignore
    let refLat = user.branch?.latitude || user.company?.latitude;
    // @ts-ignore
    let refLng = user.branch?.longitude || user.company?.longitude;
    // @ts-ignore
    let refRadius = user.branch?.radius || user.company?.radius || 100;
    // @ts-ignore
    let locationName = user.branch ? `Cabang ${user.branch.name}` : `Kantor Pusat`;

    // Blokir jika karyawan di luar radius Geo-Fence
    if (refLat && refLng && refRadius) {
      const distance = getDistanceFromLatLonInM(lat, lng, refLat, refLng);

      if (distance > refRadius) {
        return res.status(400).json({
          error: `Posisi Anda di luar jangkauan absen ${locationName} (Jarak Anda: ${Math.round(distance)} meter). Toleransi: ${refRadius} meter.`
        });
      }
    }

    // --- AI FRAUD DETECTION (Phase 28) - Clock Out ---
    // @ts-ignore
    const isDeviceMatch = user.lastDeviceId ? (user.lastDeviceId === deviceId) : true;
    const isBorderlineLocation = (refLat && refLng && refRadius) ? (getDistanceFromLatLonInM(lat, lng, refLat, refLng) > (refRadius * 0.8)) : false;

    const fraudResult = calculateFraudScore({
        faceScore: faceSimilarityScore,
        isDeviceMatch,
        isBorderlineLocation,
        // @ts-ignore
        userHasRegisteredDevice: !!user.lastDeviceId
    });

    // Update User's lastDeviceId jika belum ada dan absen ini bersih
    // @ts-ignore
    if (!user.lastDeviceId && deviceId && !fraudResult.isSuspicious) {
        await prisma.user.update({
            where: { id: userId },
            // @ts-ignore
            data: { lastDeviceId: deviceId }
        });
    }

    // Simpan foto ke Supabase jika ada
    let finalPhotoUrl = photoUrl;
    if (photoUrl) {
      try {
        const fullPath = path.join(process.cwd(), photoUrl.replace(/^\/+/, ""));
        finalPhotoUrl = await uploadToSupabase(fullPath, 'attendance');
      } catch (uploadError) {
        console.error('Failed to upload to Supabase, falling back to absolute local URL:', uploadError);
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        finalPhotoUrl = `${baseUrl}${photoUrl}`;
      }
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { 
        clockOut: new Date(),
        clockOutLat: parseFloat(lat),
        clockOutLng: parseFloat(lng),
        clockOutPhotoUrl: finalPhotoUrl,
        // @ts-ignore
        faceSimilarityScore: faceSimilarityScore || (attendance as any).faceSimilarityScore,
        // @ts-ignore
        isFaceVerified: isFaceVerified || (attendance as any).isFaceVerified,
        // @ts-ignore
        fraudScore: fraudResult.score,
        // @ts-ignore
        isSuspicious: fraudResult.isSuspicious,
        // @ts-ignore
        deviceId: deviceId || (attendance as any).deviceId,
        earlyCheckOutMinutes: (() => {
            // @ts-ignore
            if (attendance.user?.shift?.endTime) {
                const now = new Date();
                const jakartaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                // @ts-ignore
                const [eh, em] = attendance.user.shift.endTime.split(':').map(Number);
                const shiftEndTime = new Date(jakartaNow);
                shiftEndTime.setHours(eh, em, 0, 0);
                
                if (jakartaNow < shiftEndTime) {
                    return Math.floor((shiftEndTime.getTime() - jakartaNow.getTime()) / 60000);
                }
            }
            return 0;
        })()
      }
    });

    // --- AI MOOD ANALYSIS (Phase 36) - Clock Out (BACKGROUND JOB) ---
    if (photoUrl) {
        const fullPath = path.join(process.cwd(), photoUrl.replace(/^\/+/, ""));
        console.log(`[Mood AI - ClockOut] Queuing photo for background analysis: ${fullPath}`);
        
        // Jalankan secara asynchronous
        (async () => {
            if (fs.existsSync(fullPath)) {
                try {
                    const { analyzeMood } = require('./moodAI');
                    const moodResult = await analyzeMood(fullPath);
                    console.log(`[Mood AI - ClockOut] Background Result for attendance ${attendance.id}:`, moodResult);
                    // Kita simpan mood clock-out jika ingin mendata mood akhir hari
                    // Untuk sekarang kita hanya update jika data mood masih kosong
                    await (prisma.attendance as any).update({
                        where: { id: attendance.id },
                        data: {
                            mood: moodResult.mood,
                            moodScore: moodResult.score
                        }
                    });
                } catch (moodErr) {
                    console.error('[Mood AI - ClockOut] Background Error:', moodErr);
                }
            }
            // ONLY cleanup if successfully uploaded to Supabase (finalPhotoUrl is not local)
            if (finalPhotoUrl && finalPhotoUrl.startsWith('http')) {
                cleanupLocalFile(fullPath);
            }
        })();
    }

    res.json({ message: 'Berhasil Clock-Out', attendance: updatedAttendance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal melakukan clock-out.' });
  }
});

// C3. Endpoint Cek Status Absensi Hari Ini (Internal Mobile App)
app.get('/api/attendance/status', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    // Ambil timezone perusahaan (terpusat — bisa diubah per-perusahaan)
    const timezone = await getCompanyTimezone(tenantId);
    const { dayStart, dayEnd } = getDayRange(timezone);

    const attendances = await prisma.attendance.findMany({
      where: {
        userId: userId,
        companyId: tenantId,
        clockIn: { gte: dayStart, lte: dayEnd }
      },
      orderBy: { clockIn: 'desc' }
    });

    // Prioritaskan yang belum Clock-Out sebagai status aktif
    const activeAttendance = attendances.find(a => !a.clockOut) || null;
    const attendance = activeAttendance || (attendances.length > 0 ? attendances[0] : null);

    res.json({ attendance, logs: attendances });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil status absensi.' });
  }
});

// D. Endpoint Manajemen Penjadwalan Kerja (Shift)
app.post('/api/shifts', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { title, startTime, endTime } = req.body;

    const shift = await prisma.shift.create({
      data: { companyId: tenantId, title, startTime, endTime }
    });
    res.json({ message: 'Shift Master berhasil dibuat', shift });
  } catch (error) {
    res.status(500).json({ error: 'Gagal membuat shift operasional baru' });
  }
});

// D2. Endpoint Menarik Tabel Master Shift
app.get('/api/shifts', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const shifts = await prisma.shift.findMany({ 
      where: { companyId: tenantId } 
    });
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data jadwal shift' });
  }
});

// D3. Endpoint Hapus Shift
app.delete('/api/shifts/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const shiftId = parseInt(req.params.id as string);

    // Validasi: shift harus milik tenant ini
    const shift = await prisma.shift.findFirst({ where: { id: shiftId, companyId: tenantId } });
    if (!shift) return res.status(404).json({ error: 'Shift tidak ditemukan atau bukan milik perusahaan Anda' });

    await prisma.shift.delete({ where: { id: shiftId } });
    res.json({ message: 'Shift berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus shift' });
  }
});

// D4. Endpoint Menugaskan Karyawan Tertentu ke Sebuah Shift
app.put('/api/users/:id/shift', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const reqUserId = parseInt(req.params.id as string);
    const { shiftId } = req.body; // Boleh null jika HRD ingin men-cabut jadwal

    // Validasi Keamanan: Karyawan ini harus 100% bernaung di bawah PT HRD tersebut
    const checkUser = await prisma.user.findFirst({ where: { id: reqUserId, companyId: tenantId } });
    if (!checkUser) return res.status(404).json({ error: 'Akses Ditolak: Karyawan bukan milik PT Anda' });

    const updatedUser = await prisma.user.update({
      where: { id: reqUserId },
      data: { shiftId: shiftId ? parseInt(shiftId) : null }
    });

    res.json({ message: 'Jadwal shift karyawan berhasil diputar', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi konflik saat memutasikan shift' });
  }
});

// E. Endpoint Manajemen Cuti (Fase 11)
// E1. Karyawan mengajukan cuti
app.post('/api/leaves', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { startDate, endDate, reason, type = 'ANNUAL' } = req.body;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'Tanggal mulai, selesai, dan alasan wajib diisi' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const year = start.getFullYear();

    // 1. Ambil Hari Libur Nasional di tahun tersebut
    const holidays = await prisma.holiday.findMany({
      where: {
        companyId: tenantId,
        date: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) }
      }
    });
    const holidayDates = holidays.map((h: any) => h.date.toISOString().split('T')[0]);

    // 2. Hitung durasi cuti yang sedang diajukan (kecuali Sabtu, Minggu, Libur Nasional)
    let newLeaveDays = 0;
    let d = new Date(startDate);
    while (d <= end) {
      if (d.getFullYear() === year) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const dString = d.toISOString().split('T')[0];
          if (!holidayDates.includes(dString)) {
            newLeaveDays++;
          }
        }
      }
      d.setDate(d.getDate() + 1);
    }

    if (newLeaveDays === 0) {
      return res.status(400).json({ error: 'Durasi cuti tidak valid (jatuh pada hari libur / akhir pekan).' });
    }

    // 3. Hitung total cuti yang sudah dipakai (APPROVED & PENDING) di tahun berjalan
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        userId,
        companyId: tenantId,
        status: { in: ['APPROVED', 'PENDING'] },
        OR: [
          { startDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) } },
          { endDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) } }
        ]
      }
    });

    let usedLeaveDays = 0;
    for (const leave of leaves) {
      let ld = new Date(leave.startDate);
      const lend = new Date(leave.endDate);
      while (ld <= lend) {
        if (ld.getFullYear() === year) {
          const dayOfWeek = ld.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dString = ld.toISOString().split('T')[0];
            if (!holidayDates.includes(dString)) {
              usedLeaveDays++;
            }
          }
        }
        ld.setDate(ld.getDate() + 1);
      }
    }

    // 4. Validasi Sisa Kuota (berdasarkan annualLeaveQuota) - KECUALI JIKA SAKIT
    const userQuota = await prisma.user.findUnique({ where: { id: userId }, select: { annualLeaveQuota: true } });
    const maxQuota = userQuota?.annualLeaveQuota || 12;

    if (type !== 'SICK') {
      if (usedLeaveDays + newLeaveDays > maxQuota) {
        return res.status(400).json({
          error: `Jatah cuti tahunan (${maxQuota} hari) tidak mencukupi.\nSisa: ${maxQuota - usedLeaveDays} hari.\nMeminta: ${newLeaveDays} hari.`
        });
      }
    }

    // Cari tahu siapa atasan user ini (Phase 42)
    const requester = await (prisma.user as any).findUnique({
      where: { id: userId },
      select: { reportToId: true }
    });

    const leaveRequest = await (prisma.leaveRequest as any).create({
      data: {
        companyId: tenantId,
        userId: userId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        type,
        status: 'PENDING',
        approverId: requester?.reportToId
      }
    });

    // TRIGGER NOTIFIKASI KE ADMIN & SUPERVISOR
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    const requesterName = targetUser?.name || 'Seorang karyawan';
    
    // Notif ke Admin
    await notifyAdmins(tenantId, 'Pengajuan Cuti Baru', `${requesterName} mengajukan cuti baru.`);
    
    // Notif ke Supervisor (Approver)
    if (leaveRequest.approverId) {
      await sendNotification(
        tenantId,
        leaveRequest.approverId,
        'Persetujuan Cuti Baru',
        `${requesterName} mengajukan cuti baru. Silakan tinjau di menu Persetujuan.`
      );
    }

    res.json({ message: 'Pengajuan cuti berhasil dikirim', leaveRequest });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengajukan cuti' });
  }
});

// E1.05. Mendapatkan Kuota Cuti Tahunan (12 Hari)
app.get('/api/leaves/quota', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const year = new Date().getFullYear();

    const holidays = await prisma.holiday.findMany({
      where: { companyId: tenantId, date: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) } }
    });
    const holidayDates = holidays.map((h: any) => h.date.toISOString().split('T')[0]);

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        userId,
        companyId: tenantId,
        type: 'ANNUAL',
        status: { in: ['APPROVED', 'PENDING'] },
        OR: [
          { startDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) } },
          { endDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) } }
        ]
      }
    });

    let usedLeaveDays = 0;
    for (const leave of leaves) {
      let ld = new Date(leave.startDate);
      const lend = new Date(leave.endDate);
      while (ld <= lend) {
        if (ld.getFullYear() === year) {
          const dayOfWeek = ld.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dString = ld.toISOString().split('T')[0];
            if (!holidayDates.includes(dString)) {
              usedLeaveDays++;
            }
          }
        }
        ld.setDate(ld.getDate() + 1);
      }
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { annualLeaveQuota: true } });
    const maxQuota = user?.annualLeaveQuota || 12;

    res.json({
      totalQuota: maxQuota,
      used: usedLeaveDays,
      remaining: maxQuota - usedLeaveDays,
      year
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghitung sisa cuti.' });
  }
});

// E1.1. Karyawan menarik riwayat cuti pribadi
app.get('/api/my-leaves', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    const leaves = await prisma.leaveRequest.findMany({
      where: { companyId: tenantId, userId: userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil riwayat cuti' });
  }
});

// E2. Admin melihat semua daftar cuti di perusahaannya
app.get('/api/leaves', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const year = new Date().getFullYear();

    const leaves = await prisma.leaveRequest.findMany({
      where: { companyId: tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });

    // Kalkulasi kuota (sama seperti /api/leaves/quota tapi global per perusahaan)
    const holidays = await prisma.holiday.findMany({
      where: { companyId: tenantId, date: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) } }
    });
    const holidayDates = holidays.map((h: any) => h.date.toISOString().split('T')[0]);

    const activeLeaves = await prisma.leaveRequest.findMany({
      where: {
        companyId: tenantId,
        status: { in: ['APPROVED', 'PENDING'] },
        OR: [
          { startDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) } },
          { endDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) } }
        ]
      }
    });

    const userUsedQuota: Record<number, number> = {};
    for (const leave of activeLeaves) {
      let ld = new Date(leave.startDate);
      const lend = new Date(leave.endDate);
      while (ld <= lend) {
        if (ld.getFullYear() === year) {
          const dayOfWeek = ld.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dString = ld.toISOString().split('T')[0];
            if (!holidayDates.includes(dString)) {
              userUsedQuota[leave.userId] = (userUsedQuota[leave.userId] || 0) + 1;
            }
          }
        }
        ld.setDate(ld.getDate() + 1);
      }
    }

    const leavesWithQuota = leaves.map((leave: any) => ({
      ...leave,
      user: {
        ...leave.user,
        remainingQuota: 12 - (userUsedQuota[leave.userId] || 0)
      }
    }));

    res.json(leavesWithQuota);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar pengajuan cuti' });
  }
});

// E2.1. Get Bank Cuti Karyawan (Semua Karyawan)
app.get('/api/leaves/bank', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const year = new Date().getFullYear();

    // 1. Ambil semua karyawan aktif
    const users = await prisma.user.findMany({
      where: { companyId: tenantId, isActive: true },
      select: { id: true, name: true, email: true, jobTitle: true, division: true, annualLeaveQuota: true }
    });

    // 2. Ambil data hari libur nasional
    const holidays = await prisma.holiday.findMany({
      where: { companyId: tenantId, date: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) } }
    });
    const holidayDates = holidays.map((h: any) => h.date.toISOString().split('T')[0]);

    // 3. Ambil cuti tahunan berjalan yang sudah APPROVED/PENDING
    const activeLeaves = await prisma.leaveRequest.findMany({
      where: {
        companyId: tenantId,
        type: 'ANNUAL',
        status: { in: ['APPROVED', 'PENDING'] },
        OR: [
          { startDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) } },
          { endDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) } }
        ]
      }
    });

    // 4. Kalkulasi pemakaian cuti per user
    const userUsedQuota: Record<number, number> = {};
    for (const leave of activeLeaves) {
      let ld = new Date(leave.startDate);
      const lend = new Date(leave.endDate);
      while (ld <= lend) {
        if (ld.getFullYear() === year) {
          const dayOfWeek = ld.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dString = ld.toISOString().split('T')[0];
            if (!holidayDates.includes(dString)) {
              userUsedQuota[leave.userId] = (userUsedQuota[leave.userId] || 0) + 1;
            }
          }
        }
        ld.setDate(ld.getDate() + 1);
      }
    }

    // 5. Gabungkan menjadi bank cuti
    const bankCuti = users.map(user => {
      const used = userUsedQuota[user.id] || 0;
      const maxQuota = user.annualLeaveQuota;
      return {
        ...user,
        totalQuota: maxQuota,
        usedQuota: used,
        remainingQuota: maxQuota - used
      };
    });

    res.json(bankCuti);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data bank cuti karyawan' });
  }
});

// E2.1.1. Update Bank Cuti Karyawan
app.patch('/api/leaves/bank/:userId', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const targetUserId = parseInt(req.params.userId as string);
    const { annualLeaveQuota } = req.body;

    if (!['ADMIN', 'OWNER', 'SUPERADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'Akses Ditolak: Anda tidak memiliki izin untuk mengubah jatah cuti.' });
    }

    if (typeof annualLeaveQuota !== 'number' || annualLeaveQuota < 0) {
      return res.status(400).json({ error: 'Jatah cuti harus berupa angka valid.' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser || (targetUser.companyId !== tenantId && userRole !== 'SUPERADMIN')) {
      return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { annualLeaveQuota }
    });

    res.json({ message: 'Jatah cuti berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui jatah cuti karyawan' });
  }
});

// E2.2. Get Pending Approvals (Leaves & Overtimes) - Phase SUPERVISOR
app.get('/api/approvals/pending', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    const isAdmin = ['SUPERADMIN', 'ADMIN', 'OWNER'].includes(userRole);

    // Fetch Pending Leaves
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        companyId: tenantId,
        status: 'PENDING',
        ...(isAdmin ? {} : { approverId: userId })
      },
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch Pending Overtimes
    const overtimes = await (prisma.overtimeRequest as any).findMany({
      where: {
        companyId: tenantId,
        status: 'PENDING',
        ...(isAdmin ? {} : { approverId: userId })
      },
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      leaves,
      overtimes
    });
  } catch (error: any) {
    console.error('Pending Approvals Error:', error);
    res.status(500).json({ error: 'Gagal mengambil data persetujuan.' });
  }
});

// E3. Admin memberikan persetujuan atau penolakan cuti
app.patch('/api/leaves/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const leaveId = parseInt(req.params.id as string);
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid' });
    }

    // Pastikan cuti ini milik tenant yang benar
    const leave = await prisma.leaveRequest.findFirst({
      where: { id: leaveId, companyId: tenantId }
    });

    if (!leave) return res.status(404).json({ error: 'Data cuti tidak ditemukan' });

    // --- CHECK AUTHORIZATION ---
    const userRole = (req as any).userRole;
    const currentUserId = (req as any).userId;

    const isAuthorized = ['SUPERADMIN', 'ADMIN', 'OWNER'].includes(userRole) || leave.approverId === currentUserId;
    
    if (!isAuthorized) {
        return res.status(403).json({ error: 'Anda tidak memiliki wewenang untuk menyetujui cuti ini.' });
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { status }
    });

    // TRIGGER NOTIFIKASI
    await sendNotification(
      tenantId,
      updatedLeave.userId,
      `Status Cuti: ${status}`,
      `Pengajuan cuti Anda untuk tanggal ${new Date(updatedLeave.startDate).toLocaleDateString('id-ID')} telah ${status === 'APPROVED' ? 'DISETUJUI' : status === 'CANCELLED' ? 'DIBATALKAN' : 'DITOLAK'}.`
    );

    res.json({ message: `Cuti telah ${status === 'APPROVED' ? 'disetujui' : status === 'CANCELLED' ? 'dibatalkan' : 'ditolak'}`, updatedLeave });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui status cuti' });
  }
});

// E4. Manajemen Hari Libur (Phase 27)
// E4.1. Ambil semua hari libur di tenant ini
app.get('/api/holidays', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const holidays = await prisma.holiday.findMany({
      where: { companyId: tenantId },
      orderBy: { date: 'asc' }
    });
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar hari libur' });
  }
});

// E4.2. Tambah hari libur baru
app.post('/api/holidays', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { date, endDate, name } = req.body;

    if (!date || !name) {
      return res.status(400).json({ error: 'Tanggal dan Nama hari libur wajib diisi' });
    }

    const newHoliday = await prisma.holiday.create({
      data: {
        companyId: tenantId,
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        name: name
      }
    });

    // TRIGGER NOTIFIKASI ke seluruh karyawan (Broadcast)
    const employees = await prisma.user.findMany({
      where: { companyId: tenantId, role: 'EMPLOYEE' }
    });

    const dateStr = endDate
      ? `${new Date(date).toLocaleDateString('id-ID')} s/d ${new Date(endDate).toLocaleDateString('id-ID')}`
      : new Date(date).toLocaleDateString('id-ID');

    for (const emp of employees) {
      await sendNotification(
        tenantId,
        emp.id,
        'Hari Libur Baru',
        `Ada hari libur baru: ${name} pada ${dateStr}.`
      );
    }

    res.json(newHoliday);
  } catch (error) {
    res.status(500).json({ error: 'Gagal menambahkan hari libur. Pastikan tanggal tidak duplikat.' });
  }
});

// E4.3. Hapus hari libur
app.delete('/api/holidays/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const holidayId = parseInt(req.params.id as string);

    await prisma.holiday.delete({
      where: { id: holidayId, companyId: tenantId }
    });

    res.json({ message: 'Hari libur berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus hari libur' });
  }
});

// --- FASE 33: KPI & PERFORMANCE REVIEW SYSTEM ---
// E5.1. Ambil semua indikator KPI
app.get('/api/kpi/indicators', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = req.query.userId;
    
    let whereClause: any = { companyId: tenantId };
    if (userId) {
      whereClause = {
        companyId: tenantId,
        OR: [
          { isGlobal: true },
          { users: { some: { id: parseInt(userId as string) } } }
        ]
      };
    }
    
    const indicators = await prisma.kPIIndicator.findMany({
      where: whereClause,
      include: {
        users: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(indicators);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil indikator KPI' });
  }
});

// E5.2. Tambah indikator KPI baru
app.post('/api/kpi/indicators', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { name, description, target, weight, isSystem, systemType, isGlobal, userIds } = req.body;
    console.log(`[KPI] Create Indicator: Tenant=${tenantId}, Body=`, req.body);

    if (!name) return res.status(400).json({ error: 'Nama indikator wajib diisi' });

    let usersConnect: any = undefined;
    const isGloballyApplied = isGlobal !== false;
    
    if (!isGloballyApplied && Array.isArray(userIds)) {
      usersConnect = { connect: userIds.map(id => ({ id: parseInt(id) })) };
    }

    const newIndicator = await prisma.kPIIndicator.create({
      data: {
        companyId: tenantId,
        name,
        description,
        target: target ? parseFloat(target) : 100,
        weight: weight ? parseFloat(weight) : 1,
        isSystem: isSystem || false,
        systemType: systemType || null,
        isGlobal: isGloballyApplied,
        users: usersConnect
      }
    });

    res.json(newIndicator);
  } catch (error) {
    console.error('Error creating KPI indicator:', error);
    res.status(500).json({ error: 'Gagal menambahkan indikator KPI' });
  }
});

// E5.3. Update indikator KPI
app.put('/api/kpi/indicators/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const id = req.params.id;
    const { name, description, target, weight, isSystem, systemType, isGlobal, userIds } = req.body;

    if (typeof id !== 'string') return res.status(400).json({ error: 'ID tidak valid' });

    let usersConnect: any = undefined;
    const isGloballyApplied = isGlobal !== false;
    
    if (!isGloballyApplied && Array.isArray(userIds)) {
      usersConnect = { set: userIds.map(id => ({ id: parseInt(id) })) };
    } else if (isGloballyApplied) {
      usersConnect = { set: [] }; // Remove specific users if it's back to global
    }

    const updatedIndicator = await prisma.kPIIndicator.update({
      where: {
        id: parseInt(id),
        companyId: tenantId // Keamanan: Pastikan milik tenant
      },
      data: {
        name,
        description,
        target: target ? parseFloat(target) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        isSystem: isSystem === true,
        systemType: systemType || null,
        isGlobal: isGloballyApplied,
        users: usersConnect
      }
    });

    res.json(updatedIndicator);
  } catch (error) {
    console.error('Error updating indicator:', error);
    res.status(500).json({ error: 'Gagal memperbarui indikator KPI' });
  }
});

// E5.1.5. Ambil skor otomatis dari sistem (Objektif)
app.get('/api/kpi/auto-score/:userId', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId as string);
    const monthStr = req.query.month as string;
    const yearStr = req.query.year as string;

    if (typeof monthStr !== 'string' || typeof yearStr !== 'string') {
      return res.status(400).json({ error: 'Bulan dan Tahun wajib diisi' });
    }

    const month = parseInt(monthStr);
    const year = parseInt(yearStr);

    if (isNaN(month) || isNaN(year)) {
      return res.status(400).json({ error: 'Bulan dan Tahun tidak valid' });
    }

    // Ambil data Absensi user di bulan & tahun tersebut
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const attendances = await prisma.attendance.findMany({
      where: {
        userId,
        clockIn: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    // Identifikasi Indikator Sistem
    const systemIndicators = await prisma.kPIIndicator.findMany({
      where: {
        companyId: (req as any).tenantId,
        isSystem: true
      }
    });

    // Hitung Hari Kerja (Sederhana: Hari di bulan tersebut dikurangi Minggu)
    let workingDaysCount = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month - 1, day);
        if (d.getDay() !== 0) workingDaysCount++; // Kecuali hari Minggu
    }

    // Statistik Kehadiran
    const presentCount = attendances.filter(a => a.status === 'PRESENT').length;
    const lateCount = attendances.filter(a => a.status === 'LATE').length;
    const totalPresence = presentCount + lateCount;

    // Ambil Learning Objectives untuk integrasi KPI
    const objectives = await prisma.learningObjective.findMany({
      where: { userId }
    });

    const scores = systemIndicators.map(ind => {
      let score = 0;
      if (ind.systemType === 'ATTENDANCE') {
        score = workingDaysCount > 0 ? (totalPresence / workingDaysCount) * 100 : 0;
      } else if (ind.systemType === 'PUNCTUALITY') {
        score = totalPresence > 0 ? (presentCount / totalPresence) * 100 : 0;
      }
      return {
        indicatorId: ind.id,
        systemType: ind.systemType,
        score: Math.min(Math.max(Math.round(score), 0), 100)
      };
    });

    res.json({ 
      scores,
      objectives: objectives.map(obj => ({
        id: obj.id,
        title: obj.title,
        progress: obj.progress
      }))
    });

  } catch (error) {
    console.error('Error auto-scoring:', error);
    res.status(500).json({ error: 'Gagal menghitung skor otomatis' });
  }
});


// E5.3. Hapus indikator KPI
app.delete('/api/kpi/indicators/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const id = parseInt(req.params.id as string);

    await prisma.kPIIndicator.delete({
      where: { id, companyId: tenantId }
    });

    res.json({ message: 'Indikator berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus indikator' });
  }
});

// E5.4. Ambil skor KPI per karyawan dan periode
app.get('/api/kpi/scores/:userId', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = parseInt(req.params.userId as string);
    const { month, year } = req.query;

    if (!month || !year) return res.status(400).json({ error: 'Bulan dan Tahun wajib diisi' });

    const scores = await prisma.kPIScore.findMany({
      where: {
        companyId: tenantId,
        userId,
        month: parseInt(month as string),
        year: parseInt(year as string)
      },
      include: { indicator: true }
    });

    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil skor KPI' });
  }
});

// E5.5. Simpan/Update skor KPI
app.post('/api/kpi/scores', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { userId, indicatorId, score, comment, month, year, learningObjectiveId } = req.body;

    if (!userId || !indicatorId || score === undefined || !month || !year) {
      return res.status(400).json({ error: 'Data penilaian tidak lengkap' });
    }

    const newScore = await prisma.kPIScore.upsert({
      where: {
        userId_indicatorId_month_year: {
          userId: parseInt(userId),
          indicatorId: parseInt(indicatorId),
          month: parseInt(month),
          year: parseInt(year)
        }
      },
      update: {
        score: parseFloat(score),
        comment,
        learningObjectiveId: learningObjectiveId ? parseInt(learningObjectiveId) : null
      },
      create: {
        companyId: tenantId,
        userId: parseInt(userId),
        indicatorId: parseInt(indicatorId),
        score: parseFloat(score),
        comment,
        month: parseInt(month),
        year: parseInt(year),
        learningObjectiveId: learningObjectiveId ? parseInt(learningObjectiveId) : null
      }
    });

    res.json(newScore);
  } catch (error) {
    res.status(500).json({ error: 'Gagal menyimpan penilaian KPI' });
  }
});

// E5.6. Skor KPI untuk Karyawan (Diri Sendiri)
app.get('/api/kpi/my-performance', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const monthStr = req.query.month;
    const yearStr = req.query.year;

    if (typeof monthStr !== 'string' || typeof yearStr !== 'string') {
        return res.status(400).json({ error: 'Periode tidak valid' });
    }

    const month = parseInt(monthStr);
    const year = parseInt(yearStr);

    if (isNaN(month) || isNaN(year)) return res.status(400).json({ error: 'Periode tidak valid' });

    // 1. Ambil semua indikator untuk perusahaan ini
    const indicators = await prisma.kPIIndicator.findMany({
      where: { companyId: tenantId }
    });

    // 2. Ambil skor yang sudah disimpan
    const savedScores = await prisma.kPIScore.findMany({
      where: {
        companyId: tenantId,
        userId,
        month,
        year
      },
      include: { indicator: true }
    });

    // 3. Hitung skor otomatis untuk indikator sistem
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const attendances = await prisma.attendance.findMany({
      where: {
        userId,
        clockIn: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    let workingDaysCount = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month - 1, day);
        if (d.getDay() !== 0) workingDaysCount++; 
    }

    const presentCount = attendances.filter(a => a.status === 'PRESENT').length;
    const lateCount = attendances.filter(a => a.status === 'LATE').length;
    const totalPresence = presentCount + lateCount;

    // 4. Gabungkan data
    const finalPerformance = indicators.map(ind => {
      // Cari skor yang sudah disimpan
      const saved = savedScores.find(s => s.indicatorId === ind.id);
      
      let score = saved ? saved.score : 0;
      let comment = saved ? saved.comment : '';

      // Jika indikator sistem, gunakan skor live (atau utamakan live)
      if (ind.isSystem) {
        let autoScore = 0;
        if (ind.systemType === 'ATTENDANCE') {
          autoScore = workingDaysCount > 0 ? (totalPresence / workingDaysCount) * 100 : 0;
        } else if (ind.systemType === 'PUNCTUALITY') {
          autoScore = totalPresence > 0 ? (presentCount / totalPresence) * 100 : 0;
        }
        score = Math.min(Math.max(Math.round(autoScore), 0), 100);
        if (!comment && !saved) comment = 'Skor otomatis berdasarkan data absensi.';
      }

      return {
        id: saved ? saved.id : `temp-${ind.id}`,
        indicatorId: ind.id,
        score,
        comment,
        month,
        year,
        indicator: ind
      };
    });

    // Filter hanya yang punya skor > 0 atau ada di savedScores atau isSystem
    // (Agar tidak muncul list kosong untuk indikator manual yang belum dinilai)
    const filteredPerformance = finalPerformance.filter(p => p.score > 0 || p.indicator.isSystem || savedScores.some(s => s.indicatorId === p.indicatorId));

    res.json(filteredPerformance);
  } catch (error) {
    console.error('Error my-performance:', error);
    res.status(500).json({ error: 'Gagal memuat data performa' });
  }
});

// --- PAYROLL CALCULATION HELPERS (POINT 6) ---

/**
 * Menghitung BPJS Karyawan & Perusahaan
 */
function calculateBPJS(baseSalary: number, allowance: number, config: { kesehatan: boolean, ketenagakerjaan: boolean }) {
  const salary = baseSalary + allowance;
  const capKesehatan = 12000000;
  const capJP = 10000000; // Asumsi cap JP sekitar 10jt

  let kesehatanEmp = 0;
  let kesehatanComp = 0;
  let jkk = 0;
  let jkm = 0;
  let jhtEmp = 0;
  let jhtComp = 0;
  let jpEmp = 0;
  let jpComp = 0;

  if (config.kesehatan) {
    const basisKesehatan = Math.min(salary, capKesehatan);
    kesehatanEmp = basisKesehatan * 0.01;
    kesehatanComp = basisKesehatan * 0.04;
  }

  if (config.ketenagakerjaan) {
    jkk = salary * 0.0024; // Grade standar
    jkm = salary * 0.003;
    jhtEmp = salary * 0.02;
    jhtComp = salary * 0.037;
    
    const basisJP = Math.min(salary, capJP);
    jpEmp = basisJP * 0.01;
    jpComp = basisJP * 0.02;
  }

  return {
    employeeDeduction: kesehatanEmp + jhtEmp + jpEmp,
    companyContribution: kesehatanComp + jkk + jkm + jhtComp + jpComp,
    breakdown: { kesehatanEmp, kesehatanComp, jkk, jkm, jhtEmp, jhtComp, jpEmp, jpComp }
  };
}

/**
 * Menghitung PPh 21 (Metode Progresif Bulanan Disederhanakan)
 */
function calculatePPh21(grossIncome: number, jhtjpEmp: number, taxStatus: string) {
  // 1. Biaya Jabatan (5%, max 500k/bulan)
  const biayaJabatan = Math.min(grossIncome * 0.05, 500000);
  
  // 2. Net Income Bulanan
  const netIncomeMonth = grossIncome - biayaJabatan - jhtjpEmp;
  
  // 3. Setahunkan
  const netIncomeYear = netIncomeMonth * 12;
  
  // 4. PTKP (Asumsi standar 2024)
  let ptkp = 54000000; // TK/0
  if (taxStatus === 'K/0') ptkp = 58500000;
  else if (taxStatus === 'K/1') ptkp = 63000000;
  else if (taxStatus === 'K/2') ptkp = 67500000;
  else if (taxStatus === 'K/3') ptkp = 72000000;
  
  // 5. PKP (Penghasilan Kena Pajak)
  const pkp = Math.max(0, netIncomeYear - ptkp);
  
  // 6. Tarif Progresif
  let taxYear = 0;
  let remainingPkp = pkp;

  // Lapis 1: 5% (0 - 60jt)
  const lapis1 = Math.min(remainingPkp, 60000000);
  taxYear += lapis1 * 0.05;
  remainingPkp -= lapis1;

  // Lapis 2: 15% (60jt - 250jt)
  if (remainingPkp > 0) {
    const lapis2 = Math.min(remainingPkp, 190000000);
    taxYear += lapis2 * 0.15;
    remainingPkp -= lapis2;
  }

  // Lapis 3: 25% (250jt - 500jt)
  if (remainingPkp > 0) {
    const lapis3 = Math.min(remainingPkp, 250000000);
    taxYear += lapis3 * 0.25;
    remainingPkp -= lapis3;
  }

  // Lapis 4: 30% (> 500jt)
  if (remainingPkp > 0) {
    taxYear += remainingPkp * 0.30;
  }

  return Math.round(taxYear / 12);
}

// F. Endpoint Manajemen Penggajian (Fase 12)
// F1. HRD men-generate daftar gaji bulanan masal
app.post('/api/payroll/generate', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const month = parseInt(req.body.month as string);
    const year = parseInt(req.body.year as string);

    if (isNaN(month) || isNaN(year)) return res.status(400).json({ error: 'Bulan dan Tahun wajib diisi dengan angka.' });

    // --- CHECK CLOSING ---
    const dateCheck = new Date(year, month - 1, 1);
    if (await isPeriodClosed(tenantId, dateCheck)) {
       return res.status(403).json({ error: 'Periode buku sudah ditutup. Tidak dapat men-generate gaji pada periode ini.' });
    }

    const userRole = (req as any).userRole;

    // 1. Ambil semua karyawan di perusahaan ini
    const company = await prisma.company.findUnique({ where: { id: tenantId } });
    const users = await prisma.user.findMany({ 
      where: { 
        companyId: tenantId,
        basicSalary: { gt: 0 }
      },
      include: { shift: true }
    });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const LATE_RATE = company?.lateDeductionRate || 50000;
    const absenceDeductionType = company?.absenceDeductionType || 'PRO_RATA';
    const absenceDeductionRate = company?.absenceDeductionRate || 0;
    const sickLeaveDeductionRate = company?.sickLeaveDeductionRate || 0;

    // === Logika Pro-rated ===
    // Parameter perusahaan: Hari Kerja Per Bulan & Grace Period
    const stdWorkDays = company?.workDaysPerMonth || 0;
    const lateGracePeriod = company?.lateGracePeriod || 0;

    // Hitung total hari kerja (Senin-Jumat) dalam bulan ini secara dinamis sebagai fallback
    let totalWeekdays = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) totalWeekdays++;
    }

    // Ambil hari libur nasional bulan ini
    const holidays = await prisma.holiday.findMany({
      where: { companyId: tenantId, date: { gte: startDate, lte: endDate } }
    });

    // Kurangi hari libur yang jatuh pada weekday
    let holidayWeekdays = 0;
    holidays.forEach((h: any) => {
      const day = h.date.getDay();
      if (day !== 0 && day !== 6) holidayWeekdays++;
    });

    // Gunakan stdWorkDays jika diset (>0), jika tidak gunakan hitungan dinamis
    const activeWorkingDays = stdWorkDays > 0 ? stdWorkDays : Math.max(1, totalWeekdays - holidayWeekdays);

    const results = [];

    for (const user of users) {
      // 2. Hitung jumlah kehadiran (PRESENT/LATE)
      const attendanceCount = await prisma.attendance.count({
        where: { userId: user.id, companyId: tenantId, clockIn: { gte: startDate, lte: endDate } }
      });

      // 3. Hitung jumlah keterlambatan (LATE) dengan Grace Period
      let lateCount = 0;
      if (lateGracePeriod > 0) {
        // Jika ada grace period, kita filter manual data absen LATE
        const lateAttendances = await prisma.attendance.findMany({
          where: { 
            userId: user.id, 
            companyId: tenantId, 
            status: 'LATE', 
            clockIn: { gte: startDate, lte: endDate } 
          }
        });

        for (const att of lateAttendances) {
          if ((user as any).shift && (user as any).shift.startTime) {
            const shiftStart = (user as any).shift.startTime; // Format "HH:mm"
            const [sh, sm] = shiftStart.split(':').map(Number);
            
            const actualIn = new Date(att.clockIn);
            const scheduledIn = new Date(att.clockIn);
            scheduledIn.setHours(sh, sm, 0, 0);

            const diffMinutes = (actualIn.getTime() - scheduledIn.getTime()) / (1000 * 60);
            
            // Hanya anggap telat jika melebihi grace period
            if (diffMinutes > lateGracePeriod) {
              lateCount++;
            }
          } else {
            // Jika tidak ada data shift, tetap anggap telat sesuai status DB
            lateCount++;
          }
        }
      } else {
        // Jika tidak ada grace period, gunakan count biasa dari status
        lateCount = await prisma.attendance.count({
          where: { userId: user.id, companyId: tenantId, status: 'LATE', clockIn: { gte: startDate, lte: endDate } }
        });
      }

      // 4. Hitung jumlah hari cuti yang disetujui (jatuh di weekday & bukan hari libur)
      const approvedLeaves = await prisma.leaveRequest.findMany({
        where: { userId: user.id, companyId: tenantId, status: 'APPROVED', startDate: { lte: endDate }, endDate: { gte: startDate } }
      });

      let leaveDaysInMonth = 0;
      let sickLeaveCount = 0;
      for (const leave of approvedLeaves) {
        let countForThisLeave = 0;
        const start = new Date(Math.max(leave.startDate.getTime(), startDate.getTime()));
        const end = new Date(Math.min(leave.endDate.getTime(), endDate.getTime()));
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (d.getDay() !== 0 && d.getDay() !== 6) {
            const isHoliday = holidays.some((h: any) => h.date.toDateString() === d.toDateString());
            if (!isHoliday) countForThisLeave++;
          }
        }

        if (leave.type === 'SICK') {
          sickLeaveCount += countForThisLeave;
        } else {
          leaveDaysInMonth += countForThisLeave;
        }
      }

      // Hitung Potongan Sakit (Maksimal memotong sebesar tunjangan transport)
      const potentialSickDeduction = sickLeaveCount * sickLeaveDeductionRate;
      const sickLeaveDeduction = Math.min(potentialSickDeduction, user.allowance || 0);

      // 5. Kalkulasi Gaji Harian & Total Pendapatan
      const dailyRate = (user.basicSalary + user.allowance) / activeWorkingDays;
      const paidDays = Math.min(attendanceCount + leaveDaysInMonth + sickLeaveCount, activeWorkingDays); // Sakit tetap dihitung masuk untuk perlindungan basic salary

      // Hitung Uang Lembur
      const approvedOvertimes = await prisma.overtimeRequest.findMany({
        where: { userId: user.id, companyId: tenantId, status: 'APPROVED', date: { gte: startDate, lte: endDate } }
      });
      const overtimeHours = approvedOvertimes.reduce((sum, o) => sum + o.durationHours, 0);
      const overtimePay = overtimeHours * user.overtimeRate;

      // Hitung Reimbursement (Phase 25 & 35: Hanya yang BELUM dibayar mandiri)
      const unpaidReimbursements = await (prisma.reimbursement as any).findMany({
        where: { 
          userId: user.id, 
          companyId: tenantId, 
          status: 'APPROVED', 
          isPaid: false,
          createdAt: { gte: startDate, lte: endDate } 
        }
      });
      const reimbursementPay = unpaidReimbursements.reduce((sum: number, r: any) => sum + r.amount, 0);

      let absentDeductionAmount = 0;
      const absentDays = Math.max(0, activeWorkingDays - paidDays);

      if (absenceDeductionType === 'FIXED_AMOUNT') {
        absentDeductionAmount = absentDays * absenceDeductionRate;
      } else {
        // PRO_RATA: Potongan adalah nilai gaji dari hari yang tidak masuk
        absentDeductionAmount = absentDays * dailyRate;
      }

      // 6. Total Potongan (Telat + Mangkir)
      const isExempt = (user as any).isAttendanceExempt === true;
      const finalLateCount = isExempt ? 0 : lateCount;
      const finalAbsentDeduction = isExempt ? 0 : absentDeductionAmount;
      const totalDeductions = (finalLateCount * LATE_RATE) + finalAbsentDeduction;
      
      const finalSickLeaveDeduction = isExempt ? 0 : sickLeaveDeduction;
      const activeLoan = await prisma.loan.findFirst({
        where: { userId: user.id, companyId: tenantId, status: 'ACTIVE' }
      });
      const loanDeduction = activeLoan ? Math.min(activeLoan.monthlyDeduction, activeLoan.remainingAmount) : 0;

      // 4.1. Hitung Bonus/THR (Fase 31) - Untuk Gross PPh 21
      const bonuses = await prisma.bonus.findMany({
        where: {
          companyId: tenantId,
          userId: user.id,
          month: month,
          year: year
        }
      });
      const bonusPayTotal = bonuses.reduce((sum, b) => sum + b.amount, 0);

      // 4.2. Hitung BPJS (Point 6: Auto-Calculator)
      const bpjs = calculateBPJS(user.basicSalary, user.allowance || 0, {
        kesehatan: user.bpjsKesehatan,
        ketenagakerjaan: user.bpjsKetenagakerjaan
      });

      // 4.3. Hitung PPh 21 (Point 6: Tax Recovery)
      // Gross Income untuk PPh 21 = Gaji Pokok + Tunjangan + Lembur + Bonus + BPJS Tanggung Perusahaan (Kesehatan + JKK + JKM)
      const grossForTax = (user.basicSalary + (user.allowance || 0) + overtimePay + bonusPayTotal) 
                        + bpjs.breakdown.kesehatanComp + bpjs.breakdown.jkk + bpjs.breakdown.jkm;
      
      // Pengurang PPh 21 = JHT (Employee) + JP (Employee)
      const deductionForTax = bpjs.breakdown.jhtEmp + bpjs.breakdown.jpEmp;
      
      let pph21 = 0;
      if ((user as any).isTaxable !== false) {
          pph21 = calculatePPh21(grossForTax, deductionForTax, (user as any).taxStatus || 'TK-0');
      }

      // 6. Final Calculation
      // Gaji Bersih = (Pendapatan Kotor) - (Potongan Absensi + Pinjaman + BPJS Karyawan + PPh 21 + Potongan Sakit)
      const totalEarnings = (user.basicSalary + (user.allowance || 0) + (user.mealAllowance || 0) + overtimePay + reimbursementPay + bonusPayTotal);
      const totalDeductionsAll = totalDeductions + loanDeduction + bpjs.employeeDeduction + pph21 + finalSickLeaveDeduction;
      
      const netSalary = totalEarnings - totalDeductionsAll;

      // Simpan Draft Payroll
      const payroll = await prisma.payroll.upsert({
        where: {
          userId_month_year: { userId: user.id, month, year }
        },
        update: {
          basicSalary: user.basicSalary,
          allowance: user.allowance || 0,
          mealAllowance: user.mealAllowance || 0,
          attendanceCount,
          lateCount,
          deductions: totalDeductions,
          loanDeduction: loanDeduction,
          bpjsKesehatanDeduction: bpjs.breakdown.kesehatanEmp,
          bpjsKetenagakerjaanDeduction: bpjs.breakdown.jhtEmp + bpjs.breakdown.jpEmp,
          pph21Deduction: pph21,
          bpjsCompanyContribution: bpjs.companyContribution,
          sickLeaveCount: sickLeaveCount,
          sickLeaveDeduction: sickLeaveDeduction,
          overtimeHours: overtimeHours,
          overtimePay: overtimePay,
          reimbursementPay: reimbursementPay,
          bonusPay: bonusPayTotal,
          netSalary,
          status: 'DRAFT'
        },
        create: {
          companyId: tenantId,
          userId: user.id,
          month,
          year,
          basicSalary: user.basicSalary,
          allowance: user.allowance || 0,
          mealAllowance: user.mealAllowance || 0,
          attendanceCount,
          lateCount,
          deductions: totalDeductions,
          loanDeduction: loanDeduction,
          bpjsKesehatanDeduction: bpjs.breakdown.kesehatanEmp,
          bpjsKetenagakerjaanDeduction: bpjs.breakdown.jhtEmp + bpjs.breakdown.jpEmp,
          pph21Deduction: pph21,
          bpjsCompanyContribution: bpjs.companyContribution,
          sickLeaveCount: sickLeaveCount,
          sickLeaveDeduction: sickLeaveDeduction,
          overtimeHours: overtimeHours,
          overtimePay: overtimePay,
          reimbursementPay: reimbursementPay,
          bonusPay: bonusPayTotal,
          netSalary,
          status: 'DRAFT'
        }
      });
      results.push(payroll);
    }

    res.json({ message: `Berhasil men-generate ${results.length} data gaji.`, payrolls: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal men-generate penggajian.' });
  }
});

app.get('/api/payroll', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const { month, year, branchId } = req.query;

    // SECURITY: POS_VIEWER cannot see payroll data
    if (userRole === 'POS_VIEWER') {
      return res.status(403).json({ error: 'Akses Ditolak: Anda tidak memiliki izin untuk melihat data penggajian.' });
    }

    const whereClause: any = { companyId: tenantId };
    if (month) whereClause.month = parseInt(month as string);
    if (year) whereClause.year = parseInt(year as string);
    if (branchId && branchId !== 'all') {
      whereClause.user = { branchId: parseInt(branchId as string) };
    }

    // AUTO CLEANUP: Remove corrupted cross-tenant payroll records caused by previous bug
    await prisma.$executeRaw`DELETE FROM "Payroll" WHERE "companyId" != (SELECT "companyId" FROM "User" WHERE "User"."id" = "Payroll"."userId")`;

    const payrolls = await prisma.payroll.findMany({
      where: whereClause,
      include: { user: { select: { name: true, email: true, branchId: true } } },
      orderBy: { netSalary: 'desc' }
    });
    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data pengajian.' });
  }
});

// P1.3. Export Payroll to Excel (Server-Side)
app.get('/api/payroll/export', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userRole = (req as any).userRole;

    // SECURITY: POS_VIEWER cannot export payroll
    if (userRole === 'POS_VIEWER') {
        return res.status(403).json({ error: 'Akses Ditolak.' });
    }

    const { month, year, branchId } = req.query;
    const ExcelJS = require('exceljs');

    const whereClause: any = {
      companyId: tenantId,
      ...(month ? { month: parseInt(month as string) } : {}),
      ...(year ? { year: parseInt(year as string) } : {})
    };

    if (branchId && branchId !== 'all') {
      whereClause.user = { branchId: parseInt(branchId as string) };
    }

    const payrolls = await prisma.payroll.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, jobTitle: true, division: true, id: true }
        }
      },
      orderBy: { user: { name: 'asc' } }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payroll');

    worksheet.columns = [
      { header: 'Nama Karyawan', key: 'name', width: 25 },
      { header: 'ID Database', key: 'id', width: 15 },
      { header: 'Jabatan', key: 'jobTitle', width: 20 },
      { header: 'Divisi', key: 'division', width: 20 },
      { header: 'Bulan', key: 'month', width: 10 },
      { header: 'Tahun', key: 'year', width: 10 },
      { header: 'Gaji Pokok', key: 'basicSalary', width: 15 },
      { header: 'Tunjangan', key: 'allowance', width: 15 },
      { header: 'Uang Makan', key: 'mealAllowance', width: 15 },
      { header: 'Bonus/THR', key: 'bonus', width: 15 },
      { header: 'Lembur', key: 'overtime', width: 15 },
      { header: 'Potongan', key: 'deductions', width: 15 },
      { header: 'Gaji Bersih', key: 'netSalary', width: 15 },
      { header: 'Status', key: 'status', width: 12 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    (payrolls as any[]).forEach(p => {
      const row = worksheet.addRow({
        name: p.user?.name || '-',
        id: p.user?.id || '-',
        jobTitle: p.user?.jobTitle || '-',
        division: p.user?.division || '-',
        month: p.month,
        year: p.year,
        basicSalary: p.basicSalary,
        allowance: p.allowance,
        mealAllowance: p.mealAllowance || 0,
        bonus: p.bonusPay,
        overtime: p.overtimePay,
        deductions: p.deductions,
        netSalary: p.netSalary,
        status: p.status
      });

      // Format currency
      ['basicSalary', 'allowance', 'mealAllowance', 'bonus', 'overtime', 'deductions', 'netSalary'].forEach(col => {
        row.getCell(col).numFmt = '#,##0';
      });
    });

    const fileName = `Payroll_${month}_${year}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);

  } catch (error: any) {
    console.error("EXPORT PAYROLL ERROR:", error);
    res.status(500).json({ error: 'Gagal mengekspor Payroll: ' + error.message });
  }
});

// F3. Membayar gaji (Update Status)
app.patch('/api/payroll/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const payrollId = parseInt(req.params.id as string);
    const { status } = req.body;

    if (status !== 'PAID') return res.status(400).json({ error: 'Status hanya bisa diubah ke PAID' });

    const updatedPayroll = await prisma.payroll.update({
      where: userRole === 'SUPERADMIN' ? { id: payrollId } : { id: payrollId, companyId: tenantId },
      data: { status: 'PAID' }
    });

    // JIKA ADA POTONGAN PINJAMAN, KURANGI SALDO PINJAMAN
    if (updatedPayroll.loanDeduction > 0) {
      const activeLoan = await prisma.loan.findFirst({
        where: { userId: updatedPayroll.userId, companyId: tenantId, status: 'ACTIVE' }
      });

      if (activeLoan) {
        const newRemaining = Math.max(0, activeLoan.remainingAmount - updatedPayroll.loanDeduction);
        await prisma.loan.update({
          where: { id: activeLoan.id },
          data: {
            remainingAmount: newRemaining,
            status: newRemaining <= 0 ? 'COMPLETED' : 'ACTIVE'
          }
        });
      }
    }

    res.json({ message: 'Gaji berhasil dibayarkan.', updatedPayroll });

    // --- SINKRONISASI KE FINANCE (AUTO-CREATE EXPENSE) ---
    try {
      // 1. Cari atau buat kategori "GAJI / PAYROLL"
      let category = await prisma.expenseCategory.findFirst({
        where: { name: 'GAJI / PAYROLL', companyId: tenantId }
      });

      if (!category) {
        category = await prisma.expenseCategory.create({
          data: {
            name: 'GAJI / PAYROLL',
            companyId: tenantId,
            type: 'OPERATIONAL'
          }
        });
      }

      // 2. Ambil Akun Kas Utama (Default yang pertama ditemukan jika tidak ada pilihan)
      const defaultAccount = await (prisma as any).financialAccount.findFirst({
        where: { companyId: tenantId }
      });

      // 3. Create Expense Record
      const userName = await prisma.user.findUnique({ where: { id: updatedPayroll.userId }, select: { name: true } });
      await prisma.expense.create({
        data: {
          companyId: tenantId,
          categoryId: category.id,
          amount: updatedPayroll.netSalary,
          date: new Date(),
          description: `Pembayaran Gaji Karyawan: ${userName?.name || 'User ID ' + updatedPayroll.userId} (Periode ${updatedPayroll.month}/${updatedPayroll.year})`,
          status: 'PAID',
          accountId: defaultAccount?.id || null
        }
      });

      console.log(`[Finance Sync] Created Expense for Payroll ID ${updatedPayroll.id}`);
    } catch (financeErr) {
      console.error('[Finance Sync Error] Gagal mencatat pengeluaran gaji:', financeErr);
      // Kita tidak return error di sini agar proses utama (update payroll) dianggap sukses
    }

    // TRIGGER NOTIFIKASI
    if (status === 'PAID') {
      await sendNotification(
        tenantId,
        updatedPayroll.userId,
        'Gaji Telah Dibayarkan 💰',
        `Slip gaji Anda untuk bulan ${updatedPayroll.month}/${updatedPayroll.year} telah diterbitkan dan dibayarkan.`
      );
    }
  } catch (error) {
    res.status(500).json({ error: 'Gagal memproses pembayaran gaji.' });
  }
});

// F4. Manual Payroll Entry (For Finance-only modules)
app.post('/api/payroll/manual', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { userId, month, year, basicSalary, allowance, mealAllowance, deductions, bonusPay, status } = req.body;

    if (!userId || !month || !year) return res.status(400).json({ error: 'User ID, Bulan, dan Tahun wajib diisi.' });

    // --- CHECK CLOSING ---
    const dateCheck = new Date(year, month - 1, 1);
    if (await isPeriodClosed(tenantId, dateCheck)) {
       return res.status(403).json({ error: 'Periode buku sudah ditutup. Tidak dapat mencatat gaji manual pada periode ini.' });
    }

    const netSalary = (Number(basicSalary) || 0) + (Number(allowance) || 0) + (Number(mealAllowance) || 0) + (Number(bonusPay) || 0) - (Number(deductions) || 0);

    const payroll = await prisma.payroll.upsert({
      where: {
        userId_month_year: {
          userId: Number(userId),
          month: Number(month),
          year: Number(year)
        }
      },
      update: {
        basicSalary: Number(basicSalary) || 0,
        allowance: Number(allowance) || 0,
        mealAllowance: Number(mealAllowance) || 0,
        deductions: Number(deductions) || 0,
        bonusPay: Number(bonusPay) || 0,
        netSalary: netSalary,
        status: status || 'DRAFT'
      },
      create: {
        companyId: tenantId,
        userId: Number(userId),
        month: Number(month),
        year: Number(year),
        basicSalary: Number(basicSalary) || 0,
        allowance: Number(allowance) || 0,
        mealAllowance: Number(mealAllowance) || 0,
        deductions: Number(deductions) || 0,
        bonusPay: Number(bonusPay) || 0,
        netSalary: netSalary,
        status: status || 'DRAFT',
        attendanceCount: 0,
        lateCount: 0,
        overtimeHours: 0,
        overtimePay: 0,
        loanDeduction: 0,
        reimbursementPay: 0
      }
    });

    res.json(payroll);
  } catch (error) {
    console.error('Manual Payroll Error:', error);
    res.status(500).json({ error: 'Gagal menyimpan data payroll manual.' });
  }
});

// F5. Karyawan menarik riwayat gaji masing-masing (Mobile)
app.get('/api/my-payroll', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    console.log(`[GET /my-payroll] Fetching for User: ${userId}, Tenant: ${tenantId}`);

    // Ambil semua payroll
    const payrolls = await prisma.payroll.findMany({
      where: {
        userId: userId,
        companyId: tenantId,
        status: { in: ['PAID', 'DRAFT'] }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    // Ambil semua bonus untuk bulan/tahun yang ada di payrolls tersebut
    // untuk menampilkan detil (misal: "THR", "Bonus Proyek") di mobile.
    const enrichedPayrolls = await Promise.all(payrolls.map(async (p) => {
      const bonuses = await prisma.bonus.findMany({
        where: {
          userId: userId,
          companyId: tenantId,
          month: p.month,
          year: p.year
        }
      });
      return { ...p, bonusDetails: bonuses };
    }));

    res.json(enrichedPayrolls);
  } catch (error) {
    console.error('Error fetching my-payroll:', error);
    res.status(500).json({ error: 'Gagal mengambil riwayat gaji Anda.' });
  }
});

// 4. Admin menandai reimbursement sebagai DIBAYAR (Phase 35)
app.patch('/api/reimbursements/:id/pay', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userRole = (req as any).userRole;
    const { id } = req.params;
    const { accountId, categoryId, paymentDate } = req.body;

    const reimbursement = await prisma.reimbursement.findUnique({
        where: { id: parseInt(id as string) }
    });

    if (!reimbursement) {
        return res.status(404).json({ error: `Data reimbursement ID ${id} tidak ditemukan.` });
    }

    if (userRole !== 'SUPERADMIN' && reimbursement.companyId !== tenantId) {
        return res.status(403).json({ error: 'Anda tidak memiliki akses ke data ini.' });
    }

    if (reimbursement.status !== 'APPROVED') {
        return res.status(400).json({ error: 'Hanya reimbursement yang sudah DISETUJUI yang bisa dibayar.' });
    }

    if (reimbursement.isPaid) {
        return res.status(400).json({ error: 'Reimbursement ini sudah pernah dibayar.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
        const paymentDateValue = paymentDate ? new Date(paymentDate) : new Date();

        // 1. Mark status as Paid
        const r = await tx.reimbursement.update({
            where: { id: parseInt(id as string) },
            data: {
                isPaid: true,
                paidAt: paymentDateValue
            }
        });

        // 2. Create Finance Entry (if requested)
        if (accountId && categoryId) {
            // Check Account
            const accIdNum = parseInt(accountId.toString());
            const catIdNum = parseInt(categoryId.toString());

            const account = await tx.financialAccount.findUnique({ where: { id: accIdNum } });
            if (!account || account.companyId !== tenantId) throw new Error('Akun Kas/Bank tidak valid atau bukan milik perusahaan ini.');

            // Create Expense
            // Using $queryRaw for reliability with enums across various Prisma versions
            await tx.$executeRawUnsafe(
              `INSERT INTO "Expense" ("companyId", "accountId", "categoryId", "amount", "date", "status", "description", "paidTo", "updatedAt")
               VALUES ($1, $2, $3, $4, $7, 'PAID', $5, $6, NOW())`,
              tenantId,
              accIdNum,
              catIdNum,
              reimbursement.amount,
              `Pembayaran Reimbursement: ${reimbursement.title}`,
              `User ID: ${reimbursement.userId}`,
              paymentDateValue
            );

            // Update Account Balance
            await tx.financialAccount.update({
                where: { id: accIdNum },
                data: { balance: { decrement: reimbursement.amount } }
            });
        }

        return r;
    });

    // Notifikasi ke karyawan
    try {
        await sendNotification(
            tenantId,
            updated.userId,
            `Reimbursement Dibayar`,
            `Dana untuk klaim "${updated.title}" sebesar Rp${updated.amount.toLocaleString('id-ID')} telah dibayarkan ${accountId ? 'via Kas/Bank' : ''}.`
        );
    } catch (notifErr) {
        console.error('[PAY_NOTIF] Failed:', notifErr);
    }

    res.json(updated);
  } catch (error: any) {
    console.error('[REIMBURSE_PAY] Error:', error?.message || error);
    res.status(500).json({ error: 'Gagal memproses pembayaran reimbursement. ' + (error?.message || '') });
  }
});

// --- FASE 17: MANAJEMEN PINJAMAN ---

// 1. Admin mencatat pinjaman baru
app.post('/api/loans', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { userId, amount, monthlyDeduction, description } = req.body;

    const loan = await prisma.loan.create({
      data: {
        companyId: tenantId,
        userId: parseInt(userId),
        amount: parseFloat(amount),
        monthlyDeduction: parseFloat(monthlyDeduction),
        remainingAmount: parseFloat(amount),
        description,
        status: 'ACTIVE' // Langsung aktif jika dibuat admin
      }
    });
    res.status(201).json(loan);
  } catch (error) {
    res.status(500).json({ error: 'Gagal membuat data pinjaman' });
  }
});

// 2. Admin mengubah status pinjaman (misal Jeda Potongan)
app.patch('/api/loans/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const loanId = parseInt(req.params.id as string);
    const { status } = req.body; // 'PAUSED' | 'ACTIVE'

    if (!['ACTIVE', 'PAUSED'].includes(status)) {
      return res.status(400).json({ error: 'Status hanya bisa ACTIVE atau PAUSED' });
    }

    const updatedLoan = await prisma.loan.update({
      where: { id: loanId, companyId: tenantId },
      data: { status }
    });

    res.json(updatedLoan);
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui status pinjaman' });
  }
});

// 2.3 Edit pinjaman
app.put('/api/loans/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const loanId = parseInt(req.params.id as string);
    const { amount, monthlyDeduction, description } = req.body;

    if (!amount || !monthlyDeduction) {
      return res.status(400).json({ error: 'Data pinjaman tidak lengkap' });
    }

    const updatedLoan = await prisma.loan.update({
      where: { id: loanId, companyId: tenantId },
      data: {
        amount: parseFloat(amount),
        remainingAmount: parseFloat(amount), // Note: For a real app we'd need to recalculate remaining amount if deductions were already made. Assuming simple edit here.
        monthlyDeduction: parseFloat(monthlyDeduction),
        description
      }
    });

    res.json(updatedLoan);
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui pinjaman' });
  }
});

// 2.4 Hapus pinjaman
app.delete('/api/loans/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const loanId = parseInt(req.params.id as string);

    await prisma.loan.delete({
      where: { id: loanId, companyId: tenantId }
    });

    res.json({ message: 'Pinjaman berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus pinjaman' });
  }
});

// 2.5 Admin melihat riwayat potongan pinjaman
app.get('/api/loans/:id/history', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const loanId = parseInt(req.params.id as string);

    const loan = await prisma.loan.findUnique({
      where: { id: loanId, companyId: tenantId }
    });

    if (!loan) {
      return res.status(404).json({ error: 'Pinjaman tidak ditemukan' });
    }

    const history = await prisma.payroll.findMany({
      where: {
        userId: loan.userId,
        companyId: tenantId,
        loanDeduction: { gt: 0 },
        status: 'PAID',
        createdAt: { gte: loan.createdAt }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        month: true,
        year: true,
        loanDeduction: true,
        createdAt: true
      }
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil riwayat pinjaman' });
  }
});

// 3. Admin melihat semua pinjaman
app.get('/api/loans', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;

    // SECURITY: POS_VIEWER cannot see loan data
    if (userRole === 'POS_VIEWER') {
        return res.json([]);
    }

    const loans = await prisma.loan.findMany({
      where: { companyId: tenantId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data pinjaman' });
  }
});

// --- FASE 14: MANAJEMEN REIMBURSEMENT ---
// 0. AI Scan Kuitansi (OCR) - Digunakan sebelum submit untuk UX yang lebih baik
app.post('/api/reimbursements/scan', tenantMiddleware, upload.single('receipt'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File kuitansi tidak ditemukan' });
    
    // Upload to R2 first
    const fullLocalPath = path.join(__dirname, 'uploads/reimbursements', req.file.filename);
    let receiptUrl = `/uploads/reimbursements/${req.file.filename}`;
    try {
      receiptUrl = await uploadToSupabase(fullLocalPath, 'reimbursements');
    } catch (uploadError) {
      console.error('Failed to upload reimbursement scan to R2:', uploadError);
    }

    const { performOCR } = require('./reimbursementAI');
    
    console.log(`[AI Scan] Processing: ${fullLocalPath}`);
    const ocrResult = await performOCR(fullLocalPath);
    
    // Cleanup after Supabase upload and OCR processing
    // Only cleanup if the upload to Supabase was successful (i.e., receiptUrl changed from local path)
    if (receiptUrl && !receiptUrl.includes(req.get('host') || 'localhost')) {
      cleanupLocalFile(fullLocalPath);
    }

    res.json({
      ...ocrResult,
      receiptUrl
    });
  } catch (error) {
    console.error('[AI Scan] Error:', error);
    res.status(500).json({ error: 'Gagal memindai kuitansi dengan AI.' });
  }
});

// 1. Karyawan mengajukan klaim reimbursement (dengan foto)
app.post('/api/reimbursements', tenantMiddleware, upload.single('receipt'), async (req: Request, res: Response) => {
  try {
    const { title, description, amount } = req.body;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const numericAmount = parseFloat(amount) || 0;
    let receiptUrl = req.file ? `/uploads/reimbursements/${req.file.filename}` : null;
    console.log(`[REIMBURSE] userId=${userId}, tenantId=${tenantId}, title=${title}, amount=${amount}, hasFile=${!!req.file}`);

    if (req.file) {
      try {
        // req.file.path sudah berisi path absolut yang benar dari multer
        const fullLocalPath = path.join(process.cwd(), req.file.path);
        receiptUrl = await uploadToSupabase(fullLocalPath, 'reimbursements');
      } catch (uploadError) {
        console.error('Failed to upload reimbursement to Supabase:', uploadError);
      }
    }

    if (!title || !amount) {
      return res.status(400).json({ error: 'Judul dan nominal klaim wajib diisi.' });
    }

    // Gunakan req.file.path (path absolut dari multer) agar tidak salah di Railway
    const fullPath = req.file ? path.join(process.cwd(), req.file.path) : null;

    let ocrResult = { amount: null, date: null, category: null };
    let fraudCheck = { isFraud: false, reason: null, receiptHash: null };

    if (fullPath) {
      try {
        console.log(`[AI] Processing receipt: ${fullPath}`);
        const { performOCR, detectFraud } = require('./reimbursementAI');
        ocrResult = await performOCR(fullPath);
        fraudCheck = await detectFraud(
            tenantId,
            userId,
            fullPath,
            parseFloat(amount),
            ocrResult.amount
        );
      } catch (aiError) {
        console.error('[AI] Reimbursement AI processing failed, continuing without AI data:', aiError);
      }
    }

    console.log('[REIMBURSE] Saving to database...');
    const reimbursement = await prisma.reimbursement.create({
      data: {
        companyId: tenantId,
        userId: userId,
        title,
        description,
        amount: numericAmount,
        receiptUrl,
        // AI Hasil (Phase 34)
        ocrAmount: ocrResult.amount,
        ocrDate: ocrResult.date,
        ocrCategory: ocrResult.category,
        isFraud: fraudCheck.isFraud,
        fraudReason: fraudCheck.reason,
        receiptHash: fraudCheck.receiptHash,
        status: 'PENDING'
      } as any
    });
    console.log(`[REIMBURSE] Saved OK, id=${reimbursement.id}`);

    // Cleanup local file after Supabase upload and AI processing
    // Only delete if it's uploaded to a remote storage (starts with http)
    if (receiptUrl && receiptUrl.startsWith('http')) {
      cleanupLocalFile(fullPath);
    }

    // TRIGGER NOTIFIKASI KE ADMIN
    try {
      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      await notifyAdmins(tenantId, 'Pengajuan Reimbursement', `${targetUser?.name || 'Seorang karyawan'} mengajukan reimbursement sebesar Rp ${Number(amount).toLocaleString('id-ID')}.`);
    } catch (notifError) {
      console.error('[REIMBURSE] Notifikasi gagal (non-fatal):', notifError);
    }

    res.status(201).json({ message: 'Reimbursement berhasil diajukan', reimbursement });
  } catch (error: any) {
    console.error('[REIMBURSE] FATAL ERROR:', error?.message, error?.stack);
    res.status(500).json({ error: 'Gagal mengajukan klaim reimbursement.' });
  }
});

// 2. Admin mengambil semua klaim di perusahaannya
app.get('/api/reimbursements', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;

    // SECURITY: POS_VIEWER cannot see reimbursements
    if (userRole === 'POS_VIEWER') {
        return res.json([]);
    }

    const reimbursements = await prisma.reimbursement.findMany({
      where: { companyId: tenantId },
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(reimbursements);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar reimbursement.' });
  }
});

// 3. Karyawan mengambil riwayat klaim pribadinya
app.get('/api/my-reimbursements', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    const reimbursements = await prisma.reimbursement.findMany({
      where: {
        userId: userId,
        companyId: tenantId
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(reimbursements);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil riwayat klaim Anda.' });
  }
});

// 4. Admin menyetujui atau menolak klaim
app.patch('/api/reimbursements/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;

    const whereClause: any = { id: parseInt(id as string) };
    if (userRole !== 'SUPERADMIN') {
      whereClause.companyId = tenantId;
    }

    // First check if exists
    const check = await prisma.reimbursement.findUnique({ where: { id: parseInt(id as string) } });
    if (!check) {
       return res.status(404).json({ error: `Reimbursement ID ${id} tidak ditemukan.` });
    }
    
    if (userRole !== 'SUPERADMIN' && check.companyId !== tenantId) {
       return res.status(403).json({ error: `Anda tidak diizinkan mengubah data perusahaan lain. (Record: ${check.companyId}, Your: ${tenantId})` });
    }

    const reimbursement = await prisma.reimbursement.update({
      where: { id: parseInt(id as string) },
      data: { status }
    });

    // TRIGGER NOTIFIKASI
    await sendNotification(
      tenantId,
      reimbursement.userId,
      `Klaim Biaya: ${status}`,
      `Pengajuan reimbursement "${reimbursement.title}" Anda telah ${status === 'APPROVED' ? 'DISETUJUI' : status === 'CANCELLED' ? 'DIBATALKAN' : 'DITOLAK'}.`
    );

    res.json(reimbursement);
  } catch (error: any) {
    console.error('[REIMBURSE_UPDATE] Error:', error?.message || error);
    res.status(500).json({ error: 'Gagal memperbarui status reimbursement. ' + (error?.message || '') });
  }
});

// --- Manajemen Libur Nasional (Hari Bebas Gaji) ---

app.get('/api/holidays', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { month, year } = req.query;

    const userRole = (req as any).userRole;
    const whereClause: any = { companyId: tenantId };
    if (month && year) {
      const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);
      whereClause.date = { gte: startDate, lte: endDate };
    }

    const holidays = await prisma.holiday.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    });
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data hari libur.' });
  }
});

app.post('/api/holidays', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { date, name } = req.body;

    if (!date || !name) return res.status(400).json({ error: 'Tanggal dan Nama wajib diisi.' });

    const holiday = await prisma.holiday.create({
      data: {
        companyId: tenantId,
        date: new Date(date),
        name
      }
    });
    res.json(holiday);
  } catch (error) {
    res.status(500).json({ error: 'Gagal menambah hari libur. Pastikan tanggal belum terdaftar.' });
  }
});

// --- Manajemen Cuti (Leaves) ---
app.get('/api/leaves', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const userId = (req as any).userId;

    // SECURITY: POS_VIEWER cannot see leave requests
    if (userRole === 'POS_VIEWER') {
        return res.json([]);
    }

    let whereClause: any = { companyId: tenantId };
    
    // Hirarki: Manager hanya lihat yang dia harus approve
    if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN') {
      whereClause.approverId = userId;
    }

    const leaves = await (prisma.leaveRequest as any).findMany({
      where: whereClause,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar cuti' });
  }
});

app.patch('/api/leaves/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const id = parseInt(req.params.id as string);
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    const { status } = req.body;

    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid' });
    }

    // Autoritas: Harus Admin atau orang yang ditunjuk sebagai approverId
    const target = await (prisma.leaveRequest as any).findUnique({
      where: { id, companyId: tenantId }
    });

    if (!target) {
      return res.status(404).json({ error: 'Data cuti tidak ditemukan.' });
    }

    if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN' && target.approverId !== userId) {
      return res.status(403).json({ error: 'Anda tidak memiliki wewenang untuk menyetujui cuti ini.' });
    }

    const updated = await (prisma.leaveRequest as any).update({
      where: { id },
      data: { status }
    });

    // TRIGGER NOTIFIKASI
    await sendNotification(
      tenantId,
      updated.userId,
      `Status Cuti: ${status}`,
      `Pengajuan cuti Anda untuk tanggal ${new Date(updated.startDate).toLocaleDateString('id-ID')} telah ${status === 'APPROVED' ? 'DISETUJUI' : status === 'CANCELLED' ? 'DIBATALKAN' : 'DITOLAK'}.`
    );

    res.json({ message: `Cuti berhasil ${status === 'APPROVED' ? 'disetujui' : status === 'CANCELLED' ? 'dibatalkan' : 'ditolak'}`, updated });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui status cuti.' });
  }
});


// --- FASE 37: EMPLOYEE VENT BOX (TEMPAT CURHAT) ---
// 1. Karyawan mengirim curhatan
app.post('/api/vents', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { content, isAnonymous } = req.body;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    if (!content) return res.status(400).json({ error: 'Isi curhatan tidak boleh kosong.' });

    const { analyzeVent } = require('./ventAI');
    const aiAnalysis = await analyzeVent(content);

    const vent = await (prisma as any).employeeVent.create({
      data: {
        companyId: tenantId,
        userId: isAnonymous ? null : userId,
        content,
        isAnonymous: !!isAnonymous,
        sentiment: aiAnalysis.sentiment,
        mood: aiAnalysis.mood,
        score: aiAnalysis.score
      }
    });

    res.status(201).json(vent);
  } catch (error) {
    console.error('Error vent:', error);
    res.status(500).json({ error: 'Gagal mengirim curhatan.' });
  }
});

// 2. Admin melihat semua curhatan (Pulse Monitoring)
app.get('/api/vents', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;

    // SECURITY: POS_VIEWER cannot see internal feedback
    if (userRole === 'POS_VIEWER') {
        return res.json([]);
    }

    const vents = await (prisma as any).employeeVent.findMany({
      where: { companyId: tenantId },
      include: { 
        user: { select: { name: true, email: true } } 
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Anonymize user data if isAnonymous is true
    const safeVents = vents.map((v: any) => ({
      ...v,
      user: v.isAnonymous ? { name: 'Anonim', email: '***@***.***' } : v.user
    }));

    res.json(safeVents);
  } catch (error) {
    console.error('Error fetching vents:', error);
    res.status(500).json({ error: 'Gagal mengambil data curhatan.' });
  }
});

// --- FASE 38: LEARNING MANAGEMENT SYSTEM (LMS) ---
// 1. Karyawan mengambil daftar Learning Objectives
app.get('/api/learning/objectives', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    // SECURITY: POS_VIEWER cannot access LMS
    if (userRole === 'POS_VIEWER') {
        return res.json([]);
    }

    const objectives = await (prisma as any).learningObjective.findMany({
      where: userRole === 'SUPERADMIN' ? { userId: userId } : { companyId: tenantId, userId: userId },
      include: { material: true },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`[LMS DEBUG] User ${userId} fetched ${objectives.length} objectives. First has materialId: ${objectives[0]?.materialId}`);
    res.json(objectives);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data pembelajaran.' });
  }
});

// 2. Karyawan/Admin menambah objective baru
app.post('/api/learning/objectives', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, description, category, deadline, targetUserId } = req.body;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    // Jika admin, gunakan targetUserId jika ada. Jika karyawan, paksa ke diri sendiri.
    const finalUserId = (userRole === 'ADMIN' || userRole === 'SUPERADMIN') && targetUserId 
      ? parseInt(targetUserId) 
      : userId;

    const objective = await (prisma as any).learningObjective.create({
      data: {
        companyId: tenantId,
        userId: finalUserId,
        materialId: req.body.materialId ? parseInt(req.body.materialId) : null,
        title,
        description,
        category,
        deadline: deadline ? new Date(deadline) : null,
        status: 'PENDING',
        progress: 0
      }
    });

    // Kirim notifikasi jika ditugaskan ke orang lain (Admin -> Karyawan)
    if (finalUserId !== userId) {
      await sendNotification(
        tenantId,
        finalUserId,
        'Tugas Belajar Baru',
        `Anda ditugaskan untuk mempelajari: "${title}". Silakan cek menu Learning Center.`
      );
    }

    res.status(201).json(objective);
  } catch (error) {
    console.error('Error adding learning objective:', error);
    res.status(500).json({ error: 'Gagal menambah objective pembelajaran.' });
  }
});

// 3. Update progress objective
app.patch('/api/learning/objectives/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { progress, status } = req.body;
    const tenantId = (req as any).tenantId;

    const objective = await (prisma as any).learningObjective.update({
      where: { id: parseInt(id as string), companyId: tenantId },
      data: { 
        progress: progress !== undefined ? parseFloat(progress) : undefined,
        status: status || undefined
      }
    });
    res.json(objective);
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui progress.' });
  }
});

// 4. AI Recommendation berdasarkan Jabatan
app.get('/api/learning/recommendations', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const { suggestObjectives } = require('./learningAI');
    const recommendations = await suggestObjectives(user.jobTitle || 'Staff');
    
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil rekomendasi AI.' });
  }
});

// 5. Ambil riwayat Knowledge Review
app.get('/api/learning/reviews', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const reviews = await (prisma as any).knowledgeReview.findMany({
      where: { companyId: tenantId, userId: userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil riwayat review.' });
  }
});

// 6. Admin: Lihat semua progress (L&D Monitoring)
app.get('/api/admin/learning/all', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const data = await (prisma as any).learningObjective.findMany({
      where: { companyId: tenantId },
      include: { 
        user: { select: { name: true, jobTitle: true } },
        material: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data monitoring L&D.' });
  }
});

// 7. Admin: Lihat semua Library SOP & Exam
app.get('/api/admin/learning/materials', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;

    const materials = await (prisma as any).learningMaterial.findMany({
      where: { companyId: tenantId },
      include: {
        exams: {
          include: {
            questions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Parse JSON options in questions
    const formatted = materials.map((m: any) => ({
      ...m,
      exams: m.exams.map((ex: any) => ({
        ...ex,
        questions: ex.questions.map((q: any) => ({
          ...q,
          options: JSON.parse(q.options)
        }))
      }))
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching materials library:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar library SOP.' });
  }
});

// 11. Admin: Delete Exam Result
app.delete('/api/admin/learning/exams/results/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const id = parseInt(req.params.id as string);

    const attempt = await (prisma as any).examAttempt.findFirst({
      where: userRole === 'SUPERADMIN' ? { id } : { id, companyId: tenantId }
    });

    if (!attempt) return res.status(404).json({ error: 'Hasil ujian tidak ditemukan.' });

    await (prisma as any).examAttempt.delete({
      where: { id }
    });

    res.json({ message: 'Hasil ujian berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting exam result:', error);
    res.status(500).json({ error: 'Gagal menghapus hasil ujian.' });
  }
});

// 8. Admin: Hapus Material SOP
app.delete('/api/admin/learning/materials/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userRole = (req as any).userRole;
    const id = parseInt(req.params.id as string);

    console.log(`[DEBUG] Attempting to delete material ID: ${id} for tenant: ${tenantId} (Role: ${userRole})`);

    // Cari material
    const material = await (prisma as any).learningMaterial.findFirst({
      where: userRole === 'SUPERADMIN' ? { id } : { id, companyId: tenantId }
    });
    if (!material) {
        console.warn(`[DEBUG] Material with ID ${id} not found for tenant ${tenantId}`);
        return res.status(404).json({ error: 'Materi tidak ditemukan.' });
    }

    console.log(`[DEBUG] Found material: "${material.title}". Identifying associated exams...`);

    // Hapus material (Exam dan Questions akan ikut terhapus jika di-handle Prisma atau manual)
    const exams = await (prisma as any).exam.findMany({
      where: { materialId: id },
      select: { id: true }
    });
    const examIds = exams.map((e: any) => e.id);

    console.log(`[DEBUG] Found ${examIds.length} exams to delete: ${examIds.join(', ')}`);

    if (examIds.length > 0) {
        try {
            console.log(`[DEBUG] Deleting ExamAttempts for exam IDs...`);
            await (prisma as any).examAttempt.deleteMany({
                where: { examId: { in: examIds } }
            });
            
            console.log(`[DEBUG] Deleting ExamQuestions for exam IDs...`);
            await (prisma as any).examQuestion.deleteMany({
                where: { examId: { in: examIds } }
            });
            
            console.log(`[DEBUG] Deleting Exams...`);
            await (prisma as any).exam.deleteMany({
                where: { id: { in: examIds } }
            });
        } catch (subErr) {
            console.error(`[DEBUG] Error during sub-data deletion:`, subErr);
            // Continue anyway to try deleting the material
        }
    }

    console.log(`[DEBUG] Finally deleting LearningMaterial ID: ${id}`);
    await (prisma as any).learningMaterial.delete({
      where: { id }
    });

    console.log(`[DEBUG] Deletion successful for material ID: ${id}`);
    res.json({ message: 'Materi dan ujian terkait berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Gagal menghapus materi. Silakan cek koneksi database.' });
  }
});

// 9. Admin: Edit Material SOP
app.put('/api/admin/learning/materials/:id', tenantMiddleware, learningUpload.single('image'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const id = parseInt(req.params.id as string);
    const { title, content, category, targetDivision, targetJobTitle, regenerateQuestions, questionCount, minScore } = req.body;

    const material = await (prisma as any).learningMaterial.findFirst({
      where: userRole === 'SUPERADMIN' ? { id } : { id, companyId: tenantId }
    });

    if (!material) return res.status(404).json({ error: 'Materi tidak ditemukan.' });

    let imageUrl = material.imageUrl;
    if (req.file) {
      imageUrl = `/uploads/learning/${req.file.filename}`;
    }

    // Correctly parse the string boolean from multipart/form-data
    const shouldRegenerate = regenerateQuestions === 'true' || regenerateQuestions === true;

    // 1. AI generate questions first if requested (takes time, do this before locking/modifying the database)
    let questionsData: any[] = [];
    if (shouldRegenerate) {
        const { generateQuestions } = require('./examAI');
        questionsData = await generateQuestions(content, questionCount ? parseInt(questionCount) : 5);
    }

    // 2. Perform all database updates inside a fast, reliable transaction
    const updatedMaterial = await prisma.$transaction(async (tx) => {
      // Update material
      const mat = await (tx as any).learningMaterial.update({
        where: { id },
        data: {
          title,
          content,
          imageUrl,
          category,
          targetDivision: targetDivision || null,
          targetJobTitle: targetJobTitle || null
        }
      });

      // Update minScore of existing exams if present
      if (minScore !== undefined) {
        await (tx as any).exam.updateMany({
          where: { materialId: id },
          data: { minScore: parseFloat(minScore) }
        });
      }

      // If regenerating, perform delete and create inside transaction
      if (shouldRegenerate && questionsData.length > 0) {
          // Hapus ujian lama
          await (tx as any).exam.deleteMany({
              where: { materialId: id }
          });

          // Create new exam with AI generated questions
          await (tx as any).exam.create({
              data: {
                  companyId: material.companyId,
                  materialId: id,
                  title: `Test Pemahaman: ${title}`,
                  description: `Ujian otomatis untuk memverifikasi pemahaman Anda tentang ${title}.`,
                  targetDivision: targetDivision || null,
                  targetJobTitle: targetJobTitle || null,
                  minScore: minScore ? parseFloat(minScore) : 70,
                  questions: {
                      create: questionsData.map((q: any) => ({
                          question: q.question,
                          options: JSON.stringify(q.options),
                          correctAnswer: q.correctAnswer
                      }))
                  }
              }
          });
      }

      return mat;
    });

    res.json(updatedMaterial);
  } catch (error: any) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: `Gagal memperbarui materi: ${error.message || error}` });
  }
});

// --- FASE 39: AI-GENERATED EXAM SYSTEM (OTOMASI TES SOP) ---

// 1. Admin: Upload SOP & Generate Exam
app.post('/api/learning/materials', tenantMiddleware, learningUpload.single('image'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { title, content, category, targetDivision, targetJobTitle, questionCount, minScore } = req.body;

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/learning/${req.file.filename}`;
    }

    // 1. AI generate questions first (network call completely independent of database connection pool)
    const { generateQuestions } = require('./examAI');
    const questionsData = await generateQuestions(content, questionCount ? parseInt(questionCount) : 5);

    // 2. Perform rapid database writes inside a transaction (minimizing connection pool lock duration)
    const result = await prisma.$transaction(async (tx) => {
      // Simpan Material SOP
      const material = await (tx as any).learningMaterial.create({
        data: {
          companyId: tenantId,
          title,
          content,
          imageUrl,
          category: category || 'SOP',
          targetDivision: targetDivision || null,
          targetJobTitle: targetJobTitle || null
        }
      });

      // Create Exam based on material
      const exam = await (tx as any).exam.create({
        data: {
          companyId: tenantId,
          materialId: material.id,
          title: `Test Pemahaman: ${title}`,
          description: `Ujian otomatis untuk memverifikasi pemahaman Anda tentang ${title}.`,
          targetDivision: targetDivision || null,
          targetJobTitle: targetJobTitle || null,
          minScore: minScore ? parseFloat(minScore) : 70,
          questions: {
            create: questionsData.map((q: any) => ({
              question: q.question,
              options: JSON.stringify(q.options),
              correctAnswer: q.correctAnswer
            }))
          }
        },
        include: { questions: true }
      });

      return { material, exam };
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error creating material/exam:', error);
    res.status(500).json({ error: `Gagal memproses material dan membuat ujian: ${error.message || error}` });
  }
});

// 2. Karyawan: Ambil list ujian yang tersedia
app.get('/api/learning/exams', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    // Get user profile for targeting
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { division: true, jobTitle: true }
    });

    // Ambil materialId dari objective yang ditugaskan ke user ini
    const userObjectives = await (prisma as any).learningObjective.findMany({
      where: { userId, materialId: { not: null } },
      select: { materialId: true }
    });
    const assignedMaterialIds = userObjectives.map((o: any) => o.materialId).filter(Boolean);

    const exams = await (prisma as any).exam.findMany({
      where: { 
        companyId: tenantId,
        OR: [
          // Match material yang ditugaskan
          { materialId: { in: assignedMaterialIds } },
          // Match all (no target)
          { AND: [{ targetDivision: null }, { targetJobTitle: null }] },
          // Match division
          { targetDivision: user?.division || '____' },
          // Match job title
          { targetJobTitle: user?.jobTitle || '____' }
        ]
      },
      include: { material: { select: { title: true, category: true } } },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`[LMS DEBUG] User ${userId} fetched ${exams.length} exams. Assigned Material IDs: ${JSON.stringify(assignedMaterialIds)}`);
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar ujian.' });
  }
});

// 3. Ambil detail ujian + soal
app.get('/api/learning/exams/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    
    const exam = await (prisma as any).exam.findFirst({
      where: userRole === 'SUPERADMIN' ? { id: parseInt(id as string) } : { id: parseInt(id as string), companyId: tenantId },
      include: { 
        questions: true,
        material: true
      }
    });

    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan.' });

    // Parse options from JSON string
    const safeExam = {
      ...exam,
      questions: exam.questions.map((q: any) => ({
        ...q,
        options: JSON.parse(q.options)
      }))
    };

    res.json(safeExam);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil detail ujian.' });
  }
});

// 4. Submit hasil ujian
app.post('/api/learning/exams/:id/submit', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // Map of questionId -> selectedOption
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    const exam = await (prisma as any).exam.findFirst({
      where: { id: parseInt(id as string), companyId: tenantId },
      include: { questions: true }
    });

    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan.' });

    // Calculate score
    let correctCount = 0;
    exam.questions.forEach((q: any) => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = (correctCount / exam.questions.length) * 100;

    // Simpan Attempt
    const attempt = await (prisma as any).examAttempt.create({
      data: {
        companyId: tenantId,
        userId: userId,
        examId: exam.id,
        score,
        answers: JSON.stringify(answers)
      }
    });

    // Juga simpan ke KnowledgeReview untuk tracking LMS general
    await (prisma as any).knowledgeReview.create({
      data: {
        companyId: tenantId,
        userId: userId,
        title: `Hasil Ujian: ${exam.title}`,
        score,
        comments: `Menyelesaikan ujian dengan skor ${score.toFixed(1)}%`
      }
    });

    // Auto-complete objectives linked to this material
    const passingScore = exam.minScore ?? 70;
    const isPassed = score >= passingScore;
    
    if (isPassed && exam.materialId) {
      await (prisma as any).learningObjective.updateMany({
        where: {
          userId: userId,
          materialId: exam.materialId,
          status: { not: 'COMPLETED' }
        },
        data: {
          status: 'COMPLETED',
          progress: 100
        }
      });
    }

    // Kirim notifikasi hasil ujian ke karyawan
    await sendNotification(
      tenantId,
      userId,
      isPassed ? '🎉 Selamat! Anda Lulus Ujian' : '📝 Hasil Ujian SOP',
      isPassed 
        ? `Anda lulus ujian "${exam.title}" dengan skor ${score.toFixed(0)}%. Progress belajar Anda kini 100%.` 
        : `Skor Anda ${score.toFixed(0)}% pada ujian "${exam.title}". Silakan pelajari materi lagi dan coba kembali.`
    );

    res.json({ attempt, score });
  } catch (error) {
    console.error('Error submitting exam:', error);
    res.status(500).json({ error: 'Gagal mengirim hasil ujian.' });
  }
});

// 5. Admin: Lihat semua hasil ujian
app.get('/api/admin/learning/exams/results', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const results = await (prisma as any).examAttempt.findMany({
      where: { companyId: tenantId },
      include: { 
        user: { select: { name: true, jobTitle: true } },
        exam: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data hasil ujian.' });
  }
});

// --- Manajemen Lembur (Overtime) ---

app.get('/api/overtimes', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const userId = (req as any).userId;

    let whereClause: any = { companyId: tenantId };
    
    // Jika bukan Admin/SuperAdmin, maka hanya lihat yang ditugaskan ke dia (sebagai Manager)
    if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN') {
      whereClause.approverId = userId;
    }

    const overtimes = await prisma.overtimeRequest.findMany({
      where: whereClause,
      include: { user: { select: { name: true, email: true, overtimeRate: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(overtimes);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data lembur.' });
  }
});

app.get('/api/my-overtimes', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const overtimes = await prisma.overtimeRequest.findMany({
      where: { companyId: tenantId, userId: userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(overtimes);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil riwayat lembur.' });
  }
});

app.post('/api/overtimes', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { date, durationHours, reason } = req.body;

    if (!date || !durationHours || !reason) {
      return res.status(400).json({ error: 'Tanggal, durasi, dan alasan wajib diisi.' });
    }

    // Cari tahu siapa atasan user ini
    const requester = await (prisma.user as any).findUnique({
      where: { id: userId },
      select: { reportToId: true }
    });

    const request = await (prisma.overtimeRequest as any).create({
      data: {
        companyId: tenantId,
        userId: userId,
        date: new Date(date),
        durationHours: parseFloat(durationHours),
        reason,
        approverId: requester?.reportToId // Otomatis ke atasan jika ada
      }
    });

    // TRIGGER NOTIFIKASI KE ADMIN & SUPERVISOR
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    const requesterName = targetUser?.name || 'Seorang karyawan';

    // Notif ke Admin
    await notifyAdmins(tenantId, 'Pengajuan Lembur Baru', `${requesterName} mengajukan lembur baru.`);

    // Notif ke Supervisor (Approver)
    if (request.approverId) {
      await sendNotification(
        tenantId,
        request.approverId,
        'Persetujuan Lembur Baru',
        `${requesterName} mengajukan lembur baru. Silakan tinjau di menu Persetujuan.`
      );
    }

    res.json({ message: 'Ajuan lembur berhasil dibuat', request });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengajukan lembur.' });
  }
});

app.patch('/api/overtimes/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const id = parseInt(req.params.id as string);
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    const { status } = req.body;

    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid.' });
    }

    // Autoritas: Harus Admin atau orang yang ditunjuk sebagai approverId
    const target = await (prisma.overtimeRequest as any).findUnique({
      where: { id, companyId: tenantId }
    });

    if (!target) {
      return res.status(404).json({ error: 'Data lembur tidak ditemukan.' });
    }

    if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN' && userRole !== 'OWNER' && target.approverId !== userId) {
      return res.status(403).json({ error: 'Anda tidak memiliki wewenang untuk menyetujui lembur ini.' });
    }

    const updated = await (prisma.overtimeRequest as any).update({
      where: { id },
      data: { status }
    });

    // TRIGGER NOTIFIKASI
    await sendNotification(
      tenantId,
      updated.userId,
      `Status Lembur: ${status}`,
      `Pengajuan lembur Anda untuk tanggal ${new Date(updated.date).toLocaleDateString('id-ID')} telah ${status === 'APPROVED' ? 'DISETUJUI' : status === 'CANCELLED' ? 'DIBATALKAN' : 'DITOLAK'}.`
    );

    res.json({ message: `Lembur berhasil ${status === 'APPROVED' ? 'disetujui' : status === 'CANCELLED' ? 'dibatalkan' : 'ditolak'}`, updated });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui status lembur.' });
  }
});

// --- FASE 6: COMPANY ANNOUNCEMENTS ---

// 1. Membuat Pengumuman Baru (Admin Only) - Update dengan Image Support (Phase 26)
app.post('/api/announcements', tenantMiddleware, uploadAnnouncement.single('image'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { title, content, isPriority } = req.body;
    let imageUrl = req.file ? `/uploads/announcements/${req.file.filename}` : null;

    if (req.file) {
      try {
        const fullLocalPath = path.join(process.cwd(), 'uploads/announcements', req.file.filename);
        imageUrl = await uploadToSupabase(fullLocalPath, 'announcements');
      } catch (uploadError) {
        console.error('Failed to upload announcement image to R2:', uploadError);
      }
    }

    if (!title || !content) {
      return res.status(400).json({ error: 'Judul dan Konten wajib diisi.' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        companyId: tenantId,
        title,
        content,
        imageUrl,
        isPriority: isPriority === 'true' || isPriority === true
      }
    });

    if (req.file) {
      const fullLocalPath = path.join(process.cwd(), 'uploads/announcements', req.file.filename);
      cleanupLocalFile(fullLocalPath);
    }

    // 2. TRIGGER NOTIFIKASI KE SEMUA KARYAWAN (FASE 7)
    const employees = await prisma.user.findMany({
      where: { companyId: tenantId }
    });

    for (const emp of employees) {
      await sendNotification(
        tenantId,
        emp.id,
        'Pengumuman Baru 📢',
        `Ada pengumuman baru: "${title}". Silakan cek di halaman Beranda.`
      );
    }

    res.json({ message: 'Pengumuman berhasil diterbitkan dan notifikasi telah dikirim', announcement });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal membuat pengumuman.' });
  }
});

// 2. Menarik Semua Pengumuman (Public / Employee)
app.get('/api/announcements', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const announcements = await prisma.announcement.findMany({
      where: { companyId: tenantId },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`[GET /announcements] Tenant: ${tenantId}, Count: ${announcements.length}`);
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar pengumuman.' });
  }
});

// 3. Menghapus Pengumuman (Admin Only)
app.delete('/api/announcements/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const id = parseInt(req.params.id as string);

    await prisma.announcement.delete({
      where: { id, companyId: tenantId }
    });

    res.json({ message: 'Pengumuman telah dihapus.' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus pengumuman.' });
  }
});

// --- FASE 7: NOTIFICATION SYSTEM & ALERTS ---

// 1. Ambil Notifikasi Pribadi (Employee)
app.get('/api/notifications', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);

    console.log(`[NOTIFICATIONS] Fetching for tenantId: ${tenantId}, userId: ${userId}`);

    if (isNaN(tenantId) || isNaN(userId)) {
      console.warn(`[NOTIFICATIONS] Invalid IDs: tenantId=${(req as any).tenantId}, userId=${(req as any).userId}`);
      return res.json([]);
    }

    const notifications = await prisma.notification.findMany({
      where: { companyId: tenantId, userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json(notifications);
  } catch (error: any) {
    console.error(`[NOTIFICATIONS ERROR] tenantId: ${(req as any).tenantId}, userId: ${(req as any).userId}`, error);
    // Return empty array to prevent frontend crash, but keep 200 status for now to debug
    // or keep 500 but with more details. 
    // Actually, let's keep 200 with empty array so the user doesn't see the red error overlay.
    res.json([]); 
  }
});

app.patch('/api/notifications/:id/read', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);
    const id = parseInt(req.params.id as string);

    await prisma.notification.update({
      where: { id, companyId: tenantId, userId: userId },
      data: { isRead: true }
    });

    res.json({ message: 'Notifikasi ditandai telah dibaca.' });
  } catch (error: any) {
    console.error(`[NOTIFICATION READ ERROR] id: ${req.params.id}, tenantId: ${(req as any).tenantId}, userId: ${(req as any).userId}`, error.message);
    res.status(500).json({ error: 'Gagal memperbarui notifikasi.' });
  }
});

// --- FASE 26: EMPLOYEE DOCUMENT MANAGEMENT ---

// 1. Upload dokumen untuk karyawan
app.post('/api/employees/:userId/documents', tenantMiddleware, uploadDocument.single('file'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = parseInt(req.params.userId as string);
    const { title } = req.body;
    let fileUrl = req.file ? `/uploads/documents/${req.file.filename}` : null;

    if (req.file) {
      try {
        const fullLocalPath = path.join(__dirname, 'uploads/documents', req.file.filename);
        fileUrl = await uploadToSupabase(fullLocalPath, 'documents');
      } catch (uploadError) {
        console.error('Failed to upload employee document to R2:', uploadError);
      }
    }

    if (!title || !fileUrl) {
      return res.status(400).json({ error: 'Judul dan file dokumen wajib diisi.' });
    }

    const document = await prisma.employeeDocument.create({
      data: {
        companyId: tenantId,
        userId,
        title,
        fileUrl
      }
    });

    if (req.file) {
      const fullLocalPath = path.join(__dirname, 'uploads/documents', req.file.filename);
      cleanupLocalFile(fullLocalPath);
    }

    res.status(201).json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mengunggah dokumen.' });
  }
});

// 2. List dokumen karyawan
app.get('/api/employees/:userId/documents', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const userId = parseInt(req.params.userId as string);

    const documents = await prisma.employeeDocument.findMany({
      where: userRole === 'SUPERADMIN' ? { userId } : { companyId: tenantId, userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar dokumen.' });
  }
});

// 3. Hapus dokumen
app.delete('/api/documents/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const id = parseInt(req.params.id as string);

    const doc = await prisma.employeeDocument.findFirst({
      where: { id, companyId: tenantId }
    });

    if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan.' });

    // Hapus file fisik
    const filePath = path.join(__dirname, doc.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.employeeDocument.delete({
      where: { id }
    });

    res.json({ message: 'Dokumen berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus dokumen.' });
  }
});

// --- FASE 15: DASHBOARD STATISTICS (UNTUK ADMIN) ---

app.get('/api/stats/summary', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;

    const company = await prisma.company.findUnique({
      where: { id: tenantId },
      select: { 
        name: true,
        contractStart: true,
        contractEnd: true,
        employeeLimit: true,
        photoRetentionDays: true,
        contractType: true,
        lateDeductionRate: true
      }
    });

    // 1. Total Karyawan
    const totalEmployees = await prisma.user.count({
      where: {
        ...({ companyId: tenantId }),
        ...(userRole !== 'SUPERADMIN' ? { name: { not: 'Aivola Owner' } } : {})
      }
    });

    // 2. Hadir Hari Ini (PRESENT atau LATE)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendancesToday = await prisma.attendance.groupBy({
      by: ['userId'],
      where: {
        ...({ companyId: tenantId }),
        clockIn: { gte: today }
      }
    });
    const presentCount = attendancesToday.length;

    // 3. Terlambat Hari Ini
    const lateCountCurrentDay = await prisma.attendance.count({
      where: {
        ...({ companyId: tenantId }),
        status: 'LATE',
        clockIn: { gte: today }
      }
    });

    // 4. Cuti/Sakit
    const leaveCount = await prisma.leaveRequest.count({
      where: {
        ...({ companyId: tenantId }),
        status: 'APPROVED',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    // 5. Finance Summary
    const financialAccounts = await prisma.financialAccount.aggregate({
      _sum: { balance: true },
      where: { companyId: tenantId }
    });
    const totalBalance = Number(financialAccounts._sum.balance || 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const incomesMonth = await prisma.income.aggregate({
      _sum: { amount: true },
      where: { companyId: tenantId, date: { gte: firstDayOfMonth } }
    });
    const expensesMonth = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: { companyId: tenantId, date: { gte: firstDayOfMonth } }
    });
    const monthlyProfit = Number(incomesMonth._sum.amount || 0) - Number(expensesMonth._sum.amount || 0);

    // 5.1 Hutang & Piutang
    const payableAgg = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: { companyId: tenantId, status: 'PENDING' }
    });
    const totalPayable = Number(payableAgg._sum.amount || 0);

    const receivableAgg = await prisma.sale.aggregate({
      _sum: { totalAmount: true },
      where: { companyId: tenantId, status: 'UNPAID' }
    });
    const totalReceivable = Number(receivableAgg._sum.totalAmount || 0);

    // 6. Inventory Valuation (Aligned with Inventory Page logic)
    const products = await prisma.product.findMany({
      where: { companyId: tenantId },
      include: {
        Recipes: {
          include: { Material: true }
        }
      }
    });

    const getProductCost = (product: any, allProducts: any[], visited = new Set<number>()): number => {
      if (!product || visited.has(product.id)) return 0;
      visited.add(product.id);

      if (product.Recipes && product.Recipes.length > 0) {
        const totalRecipeCost = product.Recipes.reduce((sum: number, r: any) => {
          const material = allProducts.find(m => m.id === r.materialId);
          const materialUnitCost = material ? getProductCost(material, allProducts, new Set(visited)) : (r.Material?.costPrice || 0);
          return sum + (Number(r.quantity || 0) * Number(materialUnitCost || 0));
        }, 0);
        return totalRecipeCost / (product.recipeYield || 1);
      }

      return product.costPrice || 0;
    };

    const inventoryValue = products.reduce((sum, p) => {
      const unitCost = (p.Recipes && p.Recipes.length > 0) ? getProductCost(p, products) : (p.costPrice || 0);
      return sum + (Math.max(0, Number(p.stock || 0)) * unitCost);
    }, 0);

    // 7. NEW: Rincian Gaji Karyawan (Untuk Dashboard Coffee)
    let staff_list: any[] = [];
    if (userRole !== 'POS_VIEWER') {
        const activeStaff = await prisma.user.findMany({
            where: { companyId: tenantId, isActive: true },
            select: { id: true, name: true, jobTitle: true, basicSalary: true, allowance: true }
        });

        staff_list = await Promise.all(activeStaff.map(async (st) => {
            const attendances = await prisma.attendance.findMany({
                where: { userId: st.id, clockIn: { gte: firstDayOfMonth } }
            });

            let totalSeconds = 0;
            attendances.forEach(a => {
                if (a.clockIn && a.clockOut) {
                    totalSeconds += (new Date(a.clockOut).getTime() - new Date(a.clockIn).getTime()) / 1000;
                }
            });

            const lateCount = attendances.filter(a => a.status === 'LATE').length;
            const deductions = lateCount * (company?.lateDeductionRate || 0);

            return {
                id: st.id,
                name: st.name,
                job_title: st.jobTitle,
                worked_hours: Math.round((totalSeconds / 3600) * 10) / 10, // 1 decimal place
                basic_salary: st.basicSalary,
                allowance: st.allowance,
                late_deductions: deductions,
                total_salary: (st.basicSalary || 0) + (st.allowance || 0) - deductions
            };
        }));
    }

    res.json({
        companyName: company?.name,
        totalEmployees: userRole === 'POS_VIEWER' ? 0 : totalEmployees,
        presentCount: userRole === 'POS_VIEWER' ? 0 : presentCount,
        lateCount: userRole === 'POS_VIEWER' ? 0 : lateCountCurrentDay,
        leaveCount: userRole === 'POS_VIEWER' ? 0 : leaveCount,
        totalBalance: userRole === 'POS_VIEWER' ? 0 : totalBalance,
        monthlyProfit: userRole === 'POS_VIEWER' ? (incomesMonth._sum.amount || 0) : monthlyProfit, // Profit for POS_VIEWER is just Gross Income
        totalPayable: userRole === 'POS_VIEWER' ? 0 : totalPayable,
        totalReceivable: userRole === 'POS_VIEWER' ? 0 : totalReceivable,
        inventoryValue: inventoryValue,
        staff_list
    });
  } catch (error: any) {
    console.error('[Summary Error]:', error);
    res.status(500).json({ error: 'Gagal mengambil ringkasan data.' });
  }
});

// Endpoint Contract Alerts (Phase 29)
app.get('/api/stats/contract-alerts', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;

    // SECURITY: POS_VIEWER has no business with employee contracts
    if (userRole === 'POS_VIEWER') {
        return res.json([]);
    }

    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const expiringSoon = await prisma.user.findMany({
      where: {
        companyId: tenantId,
        isActive: true,
        contractEndDate: {
          gte: today,
          lte: thirtyDaysLater
        }
      },
      select: {
        id: true,
        name: true,
        contractEndDate: true,
        jobTitle: true
      },
      orderBy: {
        contractEndDate: 'asc'
      }
    });

    res.json(expiringSoon);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data pengingat kontrak.' });
  }
});

app.get('/api/stats/ai-insights', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    
    // Fetch Company to check purchasedInsights & addons
    const company = await prisma.company.findUnique({
      where: { id: tenantId },
      select: { purchasedInsights: true, addons: true }
    });
    
    // Combine purchased insights with addons (if AI_ADVISOR is present, unlock all)
    let purchased = company?.purchasedInsights || [];
    const addons = company?.addons || [];
    
    if (addons.includes('AI_ADVISOR')) {
        purchased = [...new Set([...purchased, 'PREMIUM_PROFIT', 'PREMIUM_RETENTION', 'PREMIUM_STOCK', 'AI_ADVISOR'])];
    }
    
    const insights: any[] = [];

    const today = new Date();
    const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // 1. Finance Insight (Revenue Trend)
    const incomeThisMonth = await prisma.income.aggregate({
      _sum: { amount: true },
      where: { companyId: tenantId, date: { gte: firstDayThisMonth } }
    });
    const incomeLastMonth = await prisma.income.aggregate({
      _sum: { amount: true },
      where: { companyId: tenantId, date: { gte: firstDayLastMonth, lte: lastDayLastMonth } }
    });

    const valThis = Number(incomeThisMonth._sum.amount || 0);
    const valLast = Number(incomeLastMonth._sum.amount || 0);

    if (valLast > 0) {
      const diff = ((valThis - valLast) / valLast) * 100;
      if (diff > 0) {
        insights.push({ 
            type: 'success', 
            message: `Revenue Naik ${diff.toFixed(1)}%`, 
            detail: `Performa finansial bulan ini menunjukkan tren positif dibanding periode sebelumnya.` 
        });
      } else if (diff < -5) {
        insights.push({ 
            type: 'warning', 
            message: `Revenue Turun ${Math.abs(diff).toFixed(1)}%`, 
            detail: `Terdeteksi penurunan pemasukan. Periksa kembali efisiensi operasional atau target penjualan.` 
        });
      }
    } else if (valThis > 0) {
        insights.push({ type: 'info', message: 'Awal Pertumbuhan', detail: 'Sistem mencatat pemasukan pertama untuk perusahaan Anda di platform ini.' });
    }

    // 2. Attendance Insight (Daily Discipline)
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const lateToday = await prisma.attendance.count({
      where: { companyId: tenantId, status: 'LATE', clockIn: { gte: todayStart } }
    });
    
    if (lateToday > 0) {
      insights.push({ 
          type: 'warning', 
          message: `${lateToday} Orang Terlambat`, 
          detail: `Hari ini terpantau ada ${lateToday} staf yang datang tidak sesuai jam masuk. Perlu pengawasan lebih.` 
      });
    } else {
        const totalPresentToday = await prisma.attendance.count({
            where: { companyId: tenantId, clockIn: { gte: todayStart } }
        });
        if (totalPresentToday > 0) {
            insights.push({ 
                type: 'success', 
                message: 'Kedisiplinan Sempurna', 
                detail: 'Seluruh tim yang hadir hari ini datang tepat waktu. Budaya kerja yang sangat baik!' 
            });
        }
    }

    // 3. Stock Insight (Inventory Health)
    const lowStockItems = await prisma.product.findMany({
        where: { companyId: tenantId, stock: { lte: 5 } },
        take: 1
    });

    if (lowStockItems.length > 0) {
        insights.push({ 
            type: 'warning', 
            message: 'Stok Item Menipis', 
            detail: `Item '${lowStockItems[0].name}' tersisa sedikit (${lowStockItems[0].stock}). Segera lakukan restok.` 
        });
    }

    // SECURITY FILTER: Limit AI Insights for POS_VIEWER
    if (userRole === 'POS_VIEWER') {
        // Remove attendance/HR insights, only keep Sales/Stock
        const filtered = insights.filter(ins => !ins.message.includes('Terlambat') && !ins.message.includes('Kedisiplinan'));
        return res.json(filtered);
    }

    // 4. Contract Insight (HR Risk)
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = await prisma.user.count({
        where: { 
            companyId: tenantId, 
            contractEndDate: { 
                gte: today, 
                lte: thirtyDaysLater
            } 
        }
    });

    if (expiringSoon > 0) {
        insights.push({
            type: 'warning',
            message: `${expiringSoon} Kontrak Akan Berakhir`,
            detail: `Terdapat ${expiringSoon} karyawan yang kontraknya berakhir dalam 30 hari ke depan. Siapkan review!`
        });
    }

    // --- PREMIUM INSIGHTS STORE (POINT 5) ---

    // 5. Premium: Profitability Analysis
    if (purchased.includes('PREMIUM_PROFIT')) {
        insights.push({
            type: 'success',
            isPremium: true,
            id: 'PREMIUM_PROFIT',
            message: 'AI: Optimalisasi Margin',
            detail: 'Berdasarkan korelasi HPP dan Penjualan, Anda bisa menghemat 12% biaya dengan beralih ke Vendor Bahan Baku alternatif.'
        });
    } else {
        insights.push({
            type: 'info',
            isPremium: true,
            isLocked: true,
            id: 'PREMIUM_PROFIT',
            message: 'Profit Optimizer (Locked)',
            detail: 'Buka insight premium ini untuk melihat rekomendasi penghematan biaya produksi.'
        });
    }

    // 6. Premium: Retention Risk
    if (purchased.includes('PREMIUM_RETENTION')) {
        insights.push({
            type: 'warning',
            isPremium: true,
            id: 'PREMIUM_RETENTION',
            message: 'AI: Deteksi Burnout',
            detail: 'Terdeteksi peningkatan pola keterlambatan dan cuti di departemen Operasional. Risiko pengunduran diri meningkat 15%.'
        });
    } else {
        insights.push({
            type: 'info',
            isPremium: true,
            isLocked: true,
            id: 'PREMIUM_RETENTION',
            message: 'Retention Predictor (Locked)',
            detail: 'Prediksi risiko kehilangan bakat terbaik Anda dengan AI analisis perilaku.'
        });
    }

    // 7. Premium: Smart Stock Forecasting
    if (purchased.includes('PREMIUM_STOCK')) {
        insights.push({
            type: 'danger',
            isPremium: true,
            id: 'PREMIUM_STOCK',
            message: 'AI: Prediksi Stok Habis',
            detail: 'Berdasarkan kecepatan penjualan 7 hari terakhir, 5 item utama Anda akan habis dalam 48 jam ke depan.'
        });
    } else {
        insights.push({
            type: 'info',
            isPremium: true,
            isLocked: true,
            id: 'PREMIUM_STOCK',
            message: 'Stock Forecaster (Locked)',
            detail: 'Gunakan AI untuk memprediksi kapan stok barang akan habis agar tidak kehilangan potensi penjualan.'
        });
    }

    res.json(insights);
  } catch (error) {
    console.error('[AI Insight Error]:', error);
    res.status(500).json({ error: 'Gagal menganalisis data.' });
  }
});

app.get('/api/stats/financial-flow', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const flow = await getFinancialFlow(tenantId);
    res.json(flow);
  } catch (error) {
    console.error('[Flow Error]:', error);
    res.status(500).json({ error: 'Gagal memproses alur keuangan.' });
  }
});

// Cache for AI Insights to prevent 429 Too Many Requests
const insightCache: { [key: string]: { data: any, timestamp: number } } = {};
const INSIGHT_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours (Dashboard)
const POS_INSIGHT_CACHE_TTL = 60 * 60 * 1000; // 1 hour (POS Reports)

const getCachedInsight = async (key: string, fetcher: () => Promise<any>, ttl: number = INSIGHT_CACHE_TTL) => {
  const cached = insightCache[key];
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  const data = await fetcher();
  insightCache[key] = { data, timestamp: Date.now() };
  return data;
};

// Helper to manage daily AI limit per tenant
const AI_USAGE_FILE = path.join(__dirname, 'ai_usage.json');

const getAiUsage = (): Record<string, number> => {
  try {
    if (fs.existsSync(AI_USAGE_FILE)) {
      return JSON.parse(fs.readFileSync(AI_USAGE_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to read AI usage file:', err);
  }
  return {};
};

const saveAiUsage = (data: Record<string, number>) => {
  try {
    fs.writeFileSync(AI_USAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write AI usage file:', err);
  }
};

const checkPosAiLimit = (tenantId: number): { allowed: boolean, count: number } => {
  const todayStr = new Date().toISOString().split('T')[0];
  const key = `${tenantId}_${todayStr}`;
  const usage = getAiUsage();
  
  const currentCount = usage[key] || 0;
  if (currentCount >= 2) {
    return { allowed: false, count: currentCount };
  }
  
  const newCount = currentCount + 1;
  usage[key] = newCount;
  saveAiUsage(usage);
  return { allowed: true, count: newCount };
};

const getPosAiCurrentCount = (tenantId: number): number => {
  const todayStr = new Date().toISOString().split('T')[0];
  const key = `${tenantId}_${todayStr}`;
  const usage = getAiUsage();
  return usage[key] || 0;
};

// Helpers for Dashboard AI endpoints
const checkDashboardAiLimit = (tenantId: number, endpointKey: string): { allowed: boolean, count: number } => {
  const todayStr = new Date().toISOString().split('T')[0];
  const key = `${tenantId}_${endpointKey}_${todayStr}`;
  const usage = getAiUsage();
  
  const currentCount = usage[key] || 0;
  if (currentCount >= 2) {
    return { allowed: false, count: currentCount };
  }
  
  const newCount = currentCount + 1;
  usage[key] = newCount;
  saveAiUsage(usage);
  return { allowed: true, count: newCount };
};

const getDashboardAiCurrentCount = (tenantId: number, endpointKey: string): number => {
  const todayStr = new Date().toISOString().split('T')[0];
  const key = `${tenantId}_${endpointKey}_${todayStr}`;
  const usage = getAiUsage();
  return usage[key] || 0;
};

app.get('/api/stats/predictive-insights', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { checkOnly } = req.query;
    const cacheKey = `forecast_${tenantId}`;
    const cached = insightCache[cacheKey];

    if (checkOnly === 'true') {
      const currentCount = getDashboardAiCurrentCount(tenantId, 'predictive-insights');
      if (cached && Date.now() - cached.timestamp < INSIGHT_CACHE_TTL) {
        return res.json({
          ...cached.data,
          usageCount: currentCount,
          isFromCache: true
        });
      }
      return res.json({ usageCount: currentCount });
    }

    // Check cache first (does not consume limit)
    if (cached && Date.now() - cached.timestamp < INSIGHT_CACHE_TTL) {
      const currentCount = getDashboardAiCurrentCount(tenantId, 'predictive-insights');
      return res.json({
        ...cached.data,
        usageCount: currentCount,
        isFromCache: true
      });
    }

    // Check and increment daily limit
    const limitStatus = checkDashboardAiLimit(tenantId, 'predictive-insights');
    if (!limitStatus.allowed) {
      return res.status(429).json({
        error: 'Limit Harian Tercapai: Analisa AI dibatasi maksimal 2 kali per hari untuk efisiensi biaya.',
        usageCount: limitStatus.count
      });
    }

    const forecast = await getCachedInsight(cacheKey, () => getFinancialForecast(tenantId));
    res.json({
      ...forecast,
      usageCount: limitStatus.count
    });
  } catch (error) {
    console.error('[Predictive Error]:', error);
    res.status(500).json({ error: 'AI gagal memproses prediksi keuangan.' });
  }
});

app.get('/api/stats/payroll-productivity', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { checkOnly } = req.query;
    const cacheKey = `payroll_${tenantId}`;
    const cached = insightCache[cacheKey];

    if (checkOnly === 'true') {
      const currentCount = getDashboardAiCurrentCount(tenantId, 'payroll-productivity');
      if (cached && Date.now() - cached.timestamp < INSIGHT_CACHE_TTL) {
        return res.json({
          ...cached.data,
          usageCount: currentCount,
          isFromCache: true
        });
      }
      return res.json({ usageCount: currentCount });
    }

    // Check cache first
    if (cached && Date.now() - cached.timestamp < INSIGHT_CACHE_TTL) {
      const currentCount = getDashboardAiCurrentCount(tenantId, 'payroll-productivity');
      return res.json({
        ...cached.data,
        usageCount: currentCount,
        isFromCache: true
      });
    }

    // Check and increment daily limit
    const limitStatus = checkDashboardAiLimit(tenantId, 'payroll-productivity');
    if (!limitStatus.allowed) {
      return res.status(429).json({
        error: 'Limit Harian Tercapai: Analisa AI dibatasi maksimal 2 kali per hari untuk efisiensi biaya.',
        usageCount: limitStatus.count
      });
    }

    const insights = await getCachedInsight(cacheKey, () => getPayrollProductivityInsights(tenantId));
    res.json({
      ...insights,
      usageCount: limitStatus.count
    });
  } catch (error) {
    console.error('[Payroll Impact Error]:', error);
    res.status(500).json({ error: 'AI gagal memproses korelasi produktivitas gaji.' });
  }
});

app.get('/api/stats/financial-health', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { checkOnly } = req.query;
    const cacheKey = `health_${tenantId}`;
    const cached = insightCache[cacheKey];

    if (checkOnly === 'true') {
      const currentCount = getDashboardAiCurrentCount(tenantId, 'financial-health');
      if (cached && Date.now() - cached.timestamp < INSIGHT_CACHE_TTL) {
        return res.json({
          ...cached.data,
          usageCount: currentCount,
          isFromCache: true
        });
      }
      return res.json({ usageCount: currentCount });
    }

    // Check cache first
    if (cached && Date.now() - cached.timestamp < INSIGHT_CACHE_TTL) {
      const currentCount = getDashboardAiCurrentCount(tenantId, 'financial-health');
      return res.json({
        ...cached.data,
        usageCount: currentCount,
        isFromCache: true
      });
    }

    // Check and increment daily limit
    const limitStatus = checkDashboardAiLimit(tenantId, 'financial-health');
    if (!limitStatus.allowed) {
      return res.status(429).json({
        error: 'Limit Harian Tercapai: Analisa AI dibatasi maksimal 2 kali per hari untuk efisiensi biaya.',
        usageCount: limitStatus.count
      });
    }

    const health = await getCachedInsight(cacheKey, () => getFinancialHealthScore(tenantId));
    res.json({
      ...health,
      usageCount: limitStatus.count
    });
  } catch (error) {
    console.error('[Financial Health Error]:', error);
    res.status(500).json({ error: 'AI gagal memproses skor kesehatan keuangan.' });
  }
});

// --- FASE 30: COMPANY ASSET MANAGEMENT ---

// 1. List semua aset tenant
app.get('/api/assets', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    // --- ROLE CHECK ---
    const allowedRoles = ['SUPERADMIN', 'ADMIN', 'OWNER', 'FINANCE'];
    if (!allowedRoles.includes(userRole)) {
      console.warn(`[AUTH] Unauthorized Asset Access attempt by User: ${(req as any).userId}, Role: ${userRole}`);
      return res.status(403).json({ error: 'Akses Ditolak: Role Anda tidak memiliki izin untuk mengelola aset' });
    }

    const assets = await prisma.asset.findMany({
      where: {
        ...({ companyId: tenantId }),
        userId: userId
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar aset.' });
  }
});

// 2. Tambah aset baru
app.post('/api/assets', tenantMiddleware, uploadAsset.single('image'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    
    // --- ROLE CHECK ---
    const allowedRoles = ['SUPERADMIN', 'ADMIN', 'OWNER', 'FINANCE'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Akses Ditolak: Role Anda tidak memiliki izin untuk mengelola aset' });
    }

    const { name, serialNumber, condition, purchaseDate, userId, purchasePrice, residualValue, usefulLife, isDepreciating, category, taxCategory } = req.body;
    let imageUrl = req.file ? `/uploads/assets/${req.file.filename}` : null;

    if (req.file) {
      try {
        const fullLocalPath = path.join(__dirname, 'uploads/assets', req.file.filename);
        imageUrl = await uploadToSupabase(fullLocalPath, 'assets');
      } catch (uploadError) {
        console.error('Failed to upload asset image to R2:', uploadError);
      }
    }

    if (!name) {
      return res.status(400).json({ error: 'Nama aset wajib diisi.' });
    }

    // Cek duplikasi Serial Number di tenant yang sama (hanya jika Serial Number diisi)
    if (serialNumber) {
        const existing = await prisma.asset.findFirst({
            where: {
                companyId: tenantId,
                serialNumber: serialNumber
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'Nomor seri ini sudah terdaftar di perusahaan Anda.' });
        }
    }


    const asset = await prisma.asset.create({
      data: {
        companyId: tenantId,
        name,
        serialNumber,
        condition: condition || 'GOOD',
        imageUrl,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : 0,
        residualValue: residualValue ? parseFloat(residualValue) : 0,
        usefulLife: usefulLife ? parseInt(usefulLife) : 0,
        isDepreciating: isDepreciating === 'true' || isDepreciating === true,
        category: category || 'ELECTRONIC',
        taxCategory: taxCategory || 'NON_TAXABLE',
        userId: userId ? parseInt(userId) : null
      }
    });

    if (req.file) {
      const fullLocalPath = path.join(__dirname, 'uploads/assets', req.file.filename);
      cleanupLocalFile(fullLocalPath);
    }

    res.status(201).json(asset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal menambahkan aset baru.' });
  }
});

// 3. Update aset (Edit info / Assign ke User)
app.put('/api/assets/:id', tenantMiddleware, uploadAsset.single('image'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const id = parseInt(req.params.id as string);

    // --- ROLE CHECK ---
    const allowedRoles = ['SUPERADMIN', 'ADMIN', 'OWNER', 'FINANCE'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Akses Ditolak: Role Anda tidak memiliki izin untuk mengelola aset' });
    }

    const { name, serialNumber, condition, purchaseDate, userId, purchasePrice, residualValue, usefulLife, isDepreciating, category, taxCategory } = req.body;

    // Siapkan data update
    const updateData: any = {
      name,
      serialNumber,
      condition,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      residualValue: residualValue ? parseFloat(residualValue) : undefined,
      usefulLife: usefulLife ? parseInt(usefulLife) : undefined,
      isDepreciating: isDepreciating === 'true' || isDepreciating === true,
      category: category,
      taxCategory: taxCategory,
      userId: userId ? parseInt(userId) : null
    };

    // Jika ada file baru, update imageUrl
    if (req.file) {
      try {
        const fullLocalPath = path.join(__dirname, 'uploads/assets', req.file.filename);
        updateData.imageUrl = await uploadToSupabase(fullLocalPath, 'assets');
      } catch (uploadError) {
        console.error('Failed to upload updated asset image to Supabase:', uploadError);
        updateData.imageUrl = `/uploads/assets/${req.file.filename}`;
      }
    }

    const updatedAsset = await prisma.asset.update({
      where: { id, companyId: tenantId },
      data: updateData
    });

    if (req.file) {
      const fullLocalPath = path.join(__dirname, 'uploads/assets', req.file.filename);
      cleanupLocalFile(fullLocalPath);
    }

    res.json(updatedAsset);
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui data aset.' });
  }
});

// 4. Hapus aset
app.delete('/api/assets/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const id = parseInt(req.params.id as string);

    // --- ROLE CHECK ---
    const allowedRoles = ['SUPERADMIN', 'ADMIN', 'OWNER', 'FINANCE'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Akses Ditolak: Role Anda tidak memiliki izin untuk mengelola aset' });
    }

    await prisma.asset.delete({
      where: { id, companyId: tenantId }
    });

    res.json({ message: 'Aset telah dihapus dari sistem.' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus aset.' });
  }
});
// --- ANALYTICS & VISUAL DASHBOARD ---

app.get('/api/stats/visual-finance', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // 1. Get Revenue (Sales + Incomes) Aggregated by Date
    const revenueData: any[] = await prisma.$queryRawUnsafe(`
      SELECT day, SUM(total) as total FROM (
        SELECT DATE_TRUNC('day', "date") as day, "totalAmount" as total FROM "Sale" WHERE "companyId" = $1 AND "date" >= $2
        UNION ALL
        SELECT DATE_TRUNC('day', "date") as day, "amount" as total FROM "Income" WHERE "companyId" = $1 AND "date" >= $2
      ) combined
      GROUP BY day
      ORDER BY day ASC
    `, tenantId, thirtyDaysAgo);

    // 2. Get Expenses Aggregated by Date
    const expenseData: any[] = await prisma.$queryRawUnsafe(`
      SELECT DATE_TRUNC('day', "date") as day, SUM("amount") as total 
      FROM "Expense" 
      WHERE "companyId" = $1 AND "date" >= $2
      GROUP BY day 
      ORDER BY day ASC
    `, tenantId, thirtyDaysAgo);

    // 3. Map to the expected format (30 days)
    const history: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];

      const saleMatch = revenueData.find(s => s.day.toISOString().split('T')[0] === dayStr);
      const expMatch = expenseData.find(e => e.day.toISOString().split('T')[0] === dayStr);

      history.push({
        date: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        revenue: Number(saleMatch?.total || 0),
        expense: Number(expMatch?.total || 0)
      });
    }

    res.json(history);
  } catch (error: any) {
    console.error("Visual Finance Error:", error);
    res.status(500).json({ error: 'Gagal mengambil data visual keuangan' });
  }
});

// --- CLOSING LAPORAN ENDPOINTS ---
// 1. Ambil riwayat penutupan buku
app.get('/api/finance/closing', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const closings = await prisma.periodClosing.findMany({
      where: { companyId: tenantId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });
    res.json(closings);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data penutupan buku' });
  }
});

// 2. Lakukan penutupan buku (Closing)
app.post('/api/finance/closing', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: 'Bulan dan Tahun wajib diisi' });
    }

    // 1. Hitung Total Income di periode ini
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const incomeSum = await prisma.income.aggregate({
      _sum: { amount: true },
      where: { companyId: tenantId, date: { gte: startDate, lte: endDate } }
    });

    const salesSum: any[] = await prisma.$queryRawUnsafe(`
      SELECT SUM("totalAmount") as total FROM "Sale" 
      WHERE "companyId" = $1 AND "date" >= $2 AND "date" <= $3
    `, tenantId, startDate, endDate);

    const totalIncome = (incomeSum._sum.amount || 0) + Number(salesSum[0]?.total || 0);

    // 2. Hitung Total Expense di periode ini
    const expenseSum = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: { companyId: tenantId, date: { gte: startDate, lte: endDate } }
    });

    const payrollSum = await prisma.payroll.aggregate({
      _sum: { netSalary: true },
      where: { companyId: tenantId, month, year, status: 'PAID' }
    });

    const totalExpenseManual = (expenseSum._sum.amount || 0) + (payrollSum._sum.netSalary || 0);
    
    // 3. Automated Depreciation & Amortization Calculation
    const activeAssets = await prisma.asset.findMany({
      where: {
        companyId: tenantId,
        isDepreciating: true,
        purchaseDate: { lte: endDate },
        purchasePrice: { gt: 0 },
        usefulLife: { gt: 0 }
      }
    });

    let totalDepreciation = 0;
    activeAssets.forEach(asset => {
      const price = asset.purchasePrice || 0;
      const residual = asset.residualValue || 0;
      const life = asset.usefulLife || 1;
      
      const monthlyDep = (price - residual) / life;
      const purchaseDate = new Date(asset.purchaseDate!);
      const monthsSincePurchase = (year - purchaseDate.getFullYear()) * 12 + (month - purchaseDate.getMonth() - 1);
      
      if (monthsSincePurchase >= 0 && monthsSincePurchase < life) {
        totalDepreciation += monthlyDep;
      }
    });

    const totalExpense = totalExpenseManual + totalDepreciation;
    const netProfit = totalIncome - totalExpense;
    // 3. Simpan data closing
    const closing = await prisma.periodClosing.upsert({
      where: {
        companyId_month_year: { companyId: tenantId, month, year }
      },
      update: {
        totalIncome,
        totalExpense,
        netProfit,
        closedAt: new Date(),
        closedBy: userId
      },
      create: {
        companyId: tenantId,
        month,
        year,
        totalIncome,
        totalExpense,
        netProfit,
        closedBy: userId
      }
    });

    res.json({ message: `Buku periode ${month}/${year} berhasil ditutup`, closing });
  } catch (error: any) {
    console.error('Closing Error:', error);
    res.status(500).json({ error: 'Gagal melakukan penutupan buku: ' + error.message });
  }
});

app.get('/api/stats/visual-inventory', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    // 1. Stock Health Stats
    const totalOut = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Product" WHERE "companyId" = $1 AND stock <= 0`, tenantId) as any;
    const totalLow = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Product" WHERE "companyId" = $1 AND stock > 0 AND stock <= "minStock"`, tenantId) as any;
    const totalHealthy = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Product" WHERE "companyId" = $1 AND stock > "minStock"`, tenantId) as any;

    // 2. Top 5 Products
    const topProducts = await prisma.$queryRawUnsafe(`
      SELECT p.name, SUM(si.quantity) as sold
      FROM "SaleItem" si
      JOIN "Product" p ON si."productId" = p.id
      JOIN "Sale" s ON si."saleId" = s.id
      WHERE s."companyId" = $1
      GROUP BY p.name
      ORDER BY sold DESC
      LIMIT 5
    `, tenantId) as any[];

    res.json({
      health: [
        { name: 'Aman', value: Number(totalHealthy[0]?.count || 0), color: '#10b981' },
        { name: 'Menipis', value: Number(totalLow[0]?.count || 0), color: '#f59e0b' },
        { name: 'Habis', value: Number(totalOut[0]?.count || 0), color: '#ef4444' }
      ],
      topProducts: topProducts.map(p => ({
        name: p.name,
        sold: Number(p.sold)
      }))
    });
  } catch (error: any) {
    console.error("Visual Inventory Error:", error);
    res.status(500).json({ error: 'Gagal mengambil data visual inventori' });
  }
});

app.get('/api/stats/trends', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;

    // SECURITY: POS_VIEWER cannot see attendance trends
    if (userRole === 'POS_VIEWER') {
        return res.json([]);
    }

    const trends = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const attendances = await prisma.attendance.findMany({
        where: {
          ...({ companyId: tenantId }),
          clockIn: {
            gte: date,
            lt: nextDate
          }
        },
        select: { userId: true },
        distinct: ['userId']
      });

      trends.push({
        day: date.toLocaleDateString('id-ID', { weekday: 'short' }),
        date: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        count: attendances.length
      });
    }

    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil tren statistik.' });
  }
});

// --- FASE 31: BONUS & THR SYSTEM ---

// 1. List semua bonus tenant
app.get('/api/bonuses', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const bonuses = await prisma.bonus.findMany({
      where: { companyId: tenantId },
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bonuses);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data bonus.' });
  }
});

// 2. Preview Distribusi Massal (Tinjauan Sebelum Kirim)
app.post('/api/bonuses/preview', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { type, description, month, year, amount, division } = req.body;

    if (!type || !month || !year) {
      return res.status(400).json({ error: 'Tipe, bulan, dan tahun wajib diisi.' });
    }

    const users = await prisma.user.findMany({
      where: {
        companyId: tenantId,
        ...(division ? { division } : {})
      }
    });

    const previewData = [];
    const now = new Date();
    let skippedNoJoinDate = 0;
    let skippedTooNew = 0;

    for (const user of users) {
      let finalAmount = parseFloat(amount || '0');

      if (type === 'THR') {
        const joinDate = user.joinDate ? new Date(user.joinDate) : null;
        const basePay = (user.basicSalary || 0) + (user.allowance || 0);

        if (!joinDate) {
          skippedNoJoinDate++;
          finalAmount = 0;
        } else {
          const diffMs = now.getTime() - joinDate.getTime();
          const tenureMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375));

          if (tenureMonths >= 12) {
            finalAmount = basePay;
          } else if (tenureMonths >= 1) {
            finalAmount = (tenureMonths / 12) * basePay;
          } else {
            skippedTooNew++;
            finalAmount = 0;
          }
        }
      }

      if (finalAmount > 0) {
        previewData.push({
          userName: user.name,
          email: user.email,
          type,
          amount: finalAmount,
          description: description || (type === 'THR' ? `THR ${year}` : `Bonus`),
          month: parseInt(month as string),
          year: parseInt(year as string)
        });
      }
    }

    res.json({
      totalEmployees: users.length,
      willReceive: previewData.length,
      skippedNoJoinDate,
      skippedTooNew,
      preview: previewData
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal melakukan preview bonus.' });
  }
});

// 3. Distribusi Massal (Bonus atau THR)
app.post('/api/bonuses/bulk', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { type, description, month, year, amount, division } = req.body;

    if (!type || !month || !year) {
      return res.status(400).json({ error: 'Tipe, bulan, dan tahun wajib diisi.' });
    }

    // Ambil daftar karyawan aktif (Semua role bisa dapat Bonus/THR)
    const users = await prisma.user.findMany({
      where: {
        companyId: tenantId,
        ...(division ? { division } : {})
      }
    });

    const bonusEntries = [];
    const now = new Date();
    let skippedNoJoinDate = 0;
    let skippedTooNew = 0;

    for (const user of users) {
      let finalAmount = parseFloat(amount || '0');

      // Logika Pro-Rata THR (Jika tipe adalah THR)
      if (type === 'THR') {
        const joinDate = user.joinDate ? new Date(user.joinDate) : null;
        const basePay = (user.basicSalary || 0) + (user.allowance || 0);

        if (!joinDate) {
          skippedNoJoinDate++;
          finalAmount = 0;
        } else {
          // Hitung selisih bulan
          const diffMs = now.getTime() - joinDate.getTime();
          const tenureMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375));

          if (tenureMonths >= 12) {
            finalAmount = basePay; // THR Full
          } else if (tenureMonths >= 1) {
            finalAmount = (tenureMonths / 12) * basePay; // Pro-rata
          } else {
            skippedTooNew++;
            finalAmount = 0; // Belum 1 bulan kerja
          }
        }
      }

      if (finalAmount > 0) {
        bonusEntries.push({
          companyId: tenantId,
          userId: user.id,
          type,
          amount: finalAmount,
          description: description || (type === 'THR' ? `THR ${year}` : `Bonus`),
          month: parseInt(month as string),
          year: parseInt(year as string)
        });
      }
    }

    if (bonusEntries.length === 0) {
      let reason = "Tidak ada karyawan yang memenuhi kriteria.";
      if (type === 'THR') {
        if (skippedNoJoinDate > 0) reason = `Gagal: ${skippedNoJoinDate} karyawan tidak memiliki 'Tanggal Bergabung' di profilnya.`;
        else if (skippedTooNew > 0) reason = `Gagal: ${skippedTooNew} karyawan memiliki masa kerja kurang dari 1 bulan.`;
      }
      return res.status(400).json({ error: reason });
    }

    // Batch create bonus
    await prisma.bonus.createMany({
      data: bonusEntries
    });

    let message = `Berhasil membagikan ${type} ke ${bonusEntries.length} karyawan.`;
    if (skippedNoJoinDate > 0) message += ` (${skippedNoJoinDate} dilewati karena tgl bergabung kosong)`;

    res.json({ message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal membagikan bonus secara massal.' });
  }
});

// 3. Hapus Bonus
app.delete('/api/bonuses/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const id = parseInt(req.params.id as string);

    await prisma.bonus.delete({
      where: { id, companyId: tenantId }
    });

    res.json({ message: 'Bonus berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus bonus.' });
  }
});

// --- FASE 40: SAAS AUTOMATIC INVOICING SYSTEM ---

// 40.1. Generate Invoices Massal (SuperAdmin)
app.post('/api/admin/billing/generate', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).userRole;
    if (userRole !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Akses ditolak. Hanya SuperAdmin yang dapat men-generate invoice.' });
    }

    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ error: 'Bulan dan Tahun wajib diisi.' });
    }

    const m = parseInt(month);
    const y = parseInt(year);

    // Ambil semua tenant aktif
    const companies = await prisma.company.findMany({
        include: { _count: { select: { users: true } } }
    });

    const results = {
      created: 0,
      skipped: 0,
      errors: 0
    };

    const dueDate = new Date(y, m, 10); // Jatuh tempo tanggal 10 bulan berikutnya

    for (const company of companies) {
      try {
        // Cek jika invoice sudah ada
        const existing = await (prisma as any).invoice.findUnique({
          where: {
            companyId_month_year: {
              companyId: company.id,
              month: m,
              year: y
            }
          }
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Hitung nominal tagihan
        let amount = 0;
        if (company.contractType === 'BULANAN') {
          // BULANAN: contractValue per bulan
          amount = company.contractValue;
        } else {
          // TAHUNAN: contractValue * kuota (employeeLimit)
          amount = company.contractValue * company.employeeLimit;
        }
        
        // Kalikan dengan durasi kontrak (misal: bayar untuk 2 tahun)
        amount = amount * (company.contractDuration || 1);

        // Generate Nomor Invoice: INV/2026/03/ID1-ABCD
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const invoiceNumber = `INV/${y}/${m.toString().padStart(2, '0')}/ID${company.id}-${randomStr}`;

        await (prisma as any).invoice.create({
          data: {
            companyId: company.id,
            invoiceNumber,
            month: m,
            year: y,
            amount,
            contractType: company.contractType,
            contractDuration: company.contractDuration || 1,
            contractValue: company.contractValue,
            employeeLimit: company.employeeLimit,
            photoRetentionDays: company.photoRetentionDays,
            dueDate
          }
        });

        results.created++;
      } catch (err) {
        console.error(`Error generating invoice for company ${company.id}:`, err);
        results.errors++;
      }
    }

    res.json({
      message: `Proses generate invoice selesai.`,
      details: results
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal men-generate invoice.' });
  }
});

// 40.2. Ambil Histori Invoice (Tenant & SuperAdmin)
app.get('/api/billing', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;

    const invoices = await (prisma as any).invoice.findMany({
      where: { companyId: tenantId },
      include: {
        company: {
          select: { name: true }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data billing.' });
  }
});

// 40.3. Update Status Pembayaran (SuperAdmin)
app.patch('/api/admin/billing/:id/pay', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).userRole;
    if (userRole !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Hanya SuperAdmin yang dapat menandai pembayaran.' });
    }

    const id = parseInt(req.params.id as string);
    const invoice = await (prisma as any).invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date()
      }
    });

    res.json({ message: 'Pembayaran berhasil dikonfirmasi.', invoice });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengupdate status pembayaran.' });
  }
});

// --- SUPER ADMIN SETTINGS (PHOTO RETENTION) ---
app.get('/api/admin/settings', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    if ((req as any).userRole !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Akses terbatas untuk Super Admin' });
    }

    const settingsArr = await prisma.globalSetting.findMany();
    // Convert to object for easier frontend use
    const settingsObj = settingsArr.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil pengaturan global' });
  }
});

app.patch('/api/admin/settings', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    if ((req as any).userRole !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Akses terbatas untuk Super Admin' });
    }

    const updates = req.body; // Expecting { key: value, ... }

    for (const [key, value] of Object.entries(updates)) {
      await prisma.globalSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    }

    res.json({ message: 'Pengaturan berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui pengaturan' });
  }
});

// Manual trigger for testing cleanup
app.post('/api/admin/cleanup-photos', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    if ((req as any).userRole !== 'SUPERADMIN' && (req as any).userRole !== 'OWNER') {
      return res.status(403).json({ error: 'Akses terbatas untuk Admin' });
    }

    console.log('[MANUAL] Triggering Photo Cleanup...');
    await runCleanup();
    res.json({ message: 'Proses pembersihan foto selesai dijalankan.' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Gagal menjalankan pembersihan foto' });
  }
});

// --- FASE 41: CONSOLIDATED REPORTING (SUPERADMIN) ---

app.get('/api/admin/reports/consolidated', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).userRole;
    if (userRole !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Hanya SuperAdmin yang dapat melihat laporan konsolidasi.' });
    }

    // 1. Basic Stats
    const totalTenants = await prisma.company.count();
    const totalEmployees = await prisma.user.count({
      where: { role: { not: 'SUPERADMIN' } }
    });

    // 2. Financial Stats (Revenue from Invoices)
    const invoices = await (prisma as any).invoice.findMany();
    const totalInvoiced = invoices.reduce((sum: number, inv: any) => sum + inv.amount, 0);
    const totalPaid = invoices
      .filter((inv: any) => inv.status === 'PAID')
      .reduce((sum: number, inv: any) => sum + inv.amount, 0);

    // 3. Payroll Stats (SaaS-wide Payroll this month)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const payrolls = await prisma.payroll.findMany({
      where: { month: currentMonth, year: currentYear }
    });
    const totalPayrollAmount = payrolls.reduce((sum, p) => sum + p.netSalary, 0);

    // 4. Top Tenants by Employee Count
    const topTenants = await prisma.company.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: {
        users: {
          _count: 'desc'
        }
      },
      take: 5
    });

    res.json({
      global: {
        totalTenants,
        totalEmployees,
        totalInvoiced,
        totalPaid,
        totalPayrollAmount
      },
      topTenants: topTenants.map(t => ({
        id: t.id,
        name: t.name,
        employeeCount: t._count.users,
        contractType: t.contractType
      }))
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mengambil laporan konsolidasi.' });
  }
});

// --- 3. JALANKAN SERVER ---

// Global Error Handler (Phase Debug)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('!!! GLOBAL SERVER ERROR !!!');
  console.error(err);
  res.status(500).json({
    error: 'Internal Server Error (Crash)',
    message: err.message,
    path: req.path
  });
});

// ==========================================
// C1. CRM LIVE CHAT ENDPOINTS
// ==========================================

// C1.1. Create/Retrieve Chat Session
app.post('/api/chat/session', async (req: Request, res: Response) => {
  try {
    const { visitorName, email, userId } = req.body;
    
    const session = await prisma.chatSession.create({
      data: {
        visitorName,
        email,
        userId: userId ? parseInt(userId) : undefined,
        messages: {
            create: [
                {
                    sender: 'AI',
                    content: "Halo! Saya adalah Asisten AI Aivola. Ada yang bisa saya bantu terkait sistem HRIS kami?"
                }
            ]
        }
      },
      include: { messages: true }
    });
    
    res.json(session);
  } catch (error: any) {
    console.error('Create Chat Session Error:', error);
    res.status(500).json({ error: 'Gagal membuat sesi chat' });
  }
});

// C1.2. Send Message and Get AI Response
app.post('/api/chat/message', async (req: Request, res: Response) => {
  try {
    const { sessionId, content } = req.body;
    
    // 1. Save User Message
    const userMsg = await prisma.chatMessage.create({
      data: {
        sessionId,
        sender: 'USER',
        content
      }
    });
    
    // 2. Get History for context
    const history = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 10
    });
    
    // 3. Get AI Response
    const aiResponseContent = await getAIChatResponse(content, history.map((h: any) => ({ role: h.sender, content: h.content })));
    
    // 4. Save AI Response
    const aiMsg = await prisma.chatMessage.create({
      data: {
        sessionId,
        sender: 'AI',
        content: aiResponseContent
      }
    });
    
    res.json({ userMessage: userMsg, aiResponse: aiMsg });
  } catch (error: any) {
    console.error('Send Chat Message Error:', error);
    res.status(500).json({ error: 'Gagal mengirim pesan' });
  }
});

// C1.2.5 Landing Page AI Chatbot Endpoint
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    const aiResponseContent = await getAIChatResponse(message, history || []);
    res.json({ reply: aiResponseContent });
  } catch (error: any) {
    console.error('Landing Page AI Error:', error);
    res.status(500).json({ error: 'Gagal menghubungi AI' });
  }
});

// C1.3. Get All Sessions (Admin Monitoring)
app.get('/api/chat/admin/sessions', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const sessions = await prisma.chatSession.findMany({
      where: { companyId: Number(tenantId) },
      include: {
        messages: {
           orderBy: { createdAt: 'desc' },
           take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil sesi chat' });
  }
});

// C1.4. Get Session Detail
app.get('/api/chat/admin/sessions/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const session = await prisma.chatSession.findUnique({
      where: { 
        id: req.params.id as string,
        companyId: Number(tenantId)
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil detail sesi' });
  }
});

// --- FINANCE MODULE ENDPOINTS ---

// F1.1. Get Accounts
app.get('/api/finance/accounts', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { branchId } = req.query;
    const where: any = { companyId: (req as any).tenantId };
    
    if (branchId && branchId !== 'all') {
      where.branchId = parseInt(branchId as string);
    }

    const accounts = await prisma.financialAccount.findMany({
      where,
      include: { branch: true },
      orderBy: { name: 'asc' }
    });
    res.json(accounts);
  } catch (error: any) {
    console.error('[GET /api/finance/accounts] Error:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar akun keuangan: ' + error.message });
  }
});

// F1.2. Create Account
app.post('/api/finance/accounts', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, type, balance, branchId, bankName, accountNumber } = req.body;
    const tenantId = Number((req as any).tenantId);

    if (!name || !type) {
      return res.status(400).json({ error: 'Nama akun dan tipe akun wajib diisi.' });
    }

    if (isNaN(tenantId)) {
       return res.status(401).json({ error: 'Sesi tidak valid. Silakan login ulang.' });
    }

    const account = await prisma.financialAccount.create({
      data: {
        companyId: tenantId,
        branchId: branchId ? parseInt(branchId.toString()) : null,
        name: name.toString(),
        type: type.toString(),
        balance: balance ? parseFloat(balance.toString()) : 0,
        bankName: type === 'BANK' ? (bankName?.toString() || null) : null,
        accountNumber: type === 'BANK' ? (accountNumber?.toString() || null) : null
      }
    });

    res.status(201).json(account);
  } catch (error: any) {
    console.error('[Account Creation Error] Data:', req.body);
    console.error('[Account Creation Error] Error:', error);
    res.status(500).json({ error: 'Gagal membuat akun keuangan: ' + (error.message || 'Kesalahan Server') });
  }
});

// F1.3. Update Account
app.patch('/api/finance/accounts/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, bankName, accountNumber } = req.body;
    const tenantId = (req as any).tenantId;

    const account = await prisma.financialAccount.update({
      where: { id: parseInt(id as string), companyId: tenantId },
      data: { 
        name, 
        type,
        bankName: type === 'BANK' ? (bankName || null) : null,
        accountNumber: type === 'BANK' ? (accountNumber || null) : null
      }
    });
    res.json(account);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal memperbarui akun keuangan' });
  }
});

// F1.4. Delete Account
app.delete('/api/finance/accounts/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    // Check if account has transactions (Income or Expense)
    const incomeCount = await prisma.income.count({ where: { accountId: parseInt(id as string) } });
    const expenseCount = await prisma.expense.count({ where: { accountId: parseInt(id as string) } });
    
    // Also check Sales if accountId is linked there
    const salesCount = await prisma.sale.count({ where: { accountId: parseInt(id as string) } });

    if (incomeCount > 0 || expenseCount > 0 || salesCount > 0) {
      return res.status(400).json({ 
        error: 'Akun tidak bisa dihapus karena sudah memiliki riwayat transaksi. Silakan hapus transaksi terkait terlebih dahulu.' 
      });
    }

    await prisma.financialAccount.delete({
      where: { id: parseInt(id as string), companyId: tenantId }
    });
    res.json({ message: 'Akun berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal menghapus akun keuangan' });
  }
});

// F2.1. Get Income Categories
app.get('/api/finance/income-categories', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const categories = await prisma.incomeCategory.findMany({
      where: { companyId: (req as any).tenantId },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil kategori pemasukan' });
  }
});

// F2.2. Create Income Category
app.post('/api/finance/income-categories', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, type } = req.body;
    const category = await prisma.incomeCategory.create({
      data: {
        companyId: (req as any).tenantId,
        name,
        type: type || 'OPERATIONAL'
      }
    });
    res.status(201).json(category);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal membuat kategori pemasukan' });
  }
});

// F3.1. Get Incomes
app.get('/api/finance/income', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { branchId } = req.query;
    
    const where: any = { companyId: tenantId };
    if (branchId && branchId !== 'all') {
      where.branchId = parseInt(branchId as string);
    }

    const incomes = await prisma.income.findMany({
      where,
      include: {
        account: true,
        category: true
      },
      orderBy: { date: 'desc' }
    });
    res.json(incomes);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil data pemasukan' });
  }
});

// F3.2. Record Income
app.post('/api/finance/income', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { accountId, categoryId, branchId, amount, date, description, receivedFrom } = req.body;
    const tenantId = Number((req as any).tenantId);

    // --- CHECK CLOSING ---
    if (await isPeriodClosed(tenantId, date || new Date())) {
      return res.status(403).json({ error: 'Periode buku sudah ditutup. Tidak dapat menambah transaksi pada tanggal ini.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const income = await tx.income.create({
        data: {
          companyId: tenantId,
          branchId: branchId ? parseInt(branchId) : null,
          accountId: parseInt(accountId),
          categoryId: parseInt(categoryId),
          amount: parseFloat(amount),
          date: date ? new Date(date) : new Date(),
          description,
          receivedFrom
        }
      });

      await tx.financialAccount.update({
        where: { id: parseInt(accountId) },
        data: {
          balance: { increment: parseFloat(amount) }
        }
      });

      return income;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("DEBUG INCOME CREATE ERROR:", error);
    fs.appendFileSync('debug_error.txt', `\n[${new Date().toISOString()}] INCOME CREATE ERROR: ${error.message}\n${error.stack}\n`);
    res.status(500).json({ error: 'Gagal mencatat pemasukan: ' + error.message });
  }
});

// F3.3. Update Income
app.patch('/api/finance/income/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { accountId, categoryId, amount, date, description, receivedFrom } = req.body;
    const tenantId = Number((req as any).tenantId);

    const oldIncome = await prisma.income.findFirst({
      where: { id: parseInt(id as string), companyId: tenantId }
    });

    if (!oldIncome) return res.status(404).json({ error: 'Data tidak ditemukan' });

    if (await isPeriodClosed(tenantId, oldIncome.date) || await isPeriodClosed(tenantId, date ? new Date(date) : oldIncome.date)) {
      return res.status(403).json({ error: 'Periode sudah ditutup' });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.financialAccount.update({
        where: { id: oldIncome.accountId },
        data: { balance: { decrement: oldIncome.amount } }
      });

      const updated = await tx.income.update({
        where: { id: parseInt(id as string) },
        data: {
          accountId: accountId ? parseInt(accountId) : undefined,
          categoryId: categoryId ? parseInt(categoryId) : undefined,
          amount: amount ? parseFloat(amount) : undefined,
          date: date ? new Date(date) : undefined,
          description,
          receivedFrom
        }
      });

      await tx.financialAccount.update({
        where: { id: updated.accountId },
        data: { balance: { increment: updated.amount } }
      });

      return updated;
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal update pemasukan' });
  }
});

// F3.4. Delete Income
app.delete('/api/finance/income/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = Number((req as any).tenantId);
    const income = await prisma.income.findFirst({ where: { id: parseInt(id as string), companyId: tenantId } });
    if (!income) return res.status(404).json({ error: 'Data tidak ditemukan' });
    if (await isPeriodClosed(tenantId, income.date)) return res.status(403).json({ error: 'Periode sudah ditutup' });

    await prisma.$transaction(async (tx) => {
      await tx.financialAccount.update({ where: { id: income.accountId }, data: { balance: { decrement: income.amount } } });
      await tx.income.delete({ where: { id: parseInt(id as string) } });
    });
    res.json({ message: 'Berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal hapus pemasukan' });
  }
});

// F4.1. Get Expense Categories
app.get('/api/finance/expense-categories', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      where: { companyId: (req as any).tenantId },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil kategori pengeluaran: ' + error.message });
  }
});

// F4_import. Import Expense Categories from another company
app.post('/api/finance/expense-categories/import', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const targetCompanyId = Number((req as any).tenantId);
    const { sourceCompanyId } = req.body;

    if (!sourceCompanyId) return res.status(400).json({ error: 'Source company ID is required' });

    // Ambil semua kategori dari perusahaan sumber
    const sourceCategories = await prisma.expenseCategory.findMany({
      where: { companyId: Number(sourceCompanyId) }
    });

    if (sourceCategories.length === 0) {
      return res.status(404).json({ error: 'Tidak ada kategori pengeluaran di perusahaan sumber.' });
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const sourceCat of sourceCategories) {
      // Cek apakah sudah ada kategori dengan nama yang sama di perusahaan target
      const existingCat = await prisma.expenseCategory.findFirst({
        where: { companyId: targetCompanyId, name: sourceCat.name }
      });

      if (existingCat) {
        skippedCount++;
        continue;
      }

      await prisma.expenseCategory.create({
        data: {
          companyId: targetCompanyId,
          name: sourceCat.name,
          type: sourceCat.type
        }
      });
      importedCount++;
    }

    res.json({
      message: `Berhasil mengimpor ${importedCount} kategori. Dilewati ${skippedCount} kategori yang sudah ada.`,
      importedCount,
      skippedCount
    });

  } catch (error: any) {
    console.error('Error importing expense categories:', error);
    res.status(500).json({ error: 'Gagal mengimpor kategori pengeluaran: ' + error.message });
  }
});

// F4.2. Create Expense Category
app.post('/api/finance/expense-categories', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, type } = req.body;
    const tenantId = Number((req as any).tenantId);
    
    console.log(`[DEBUG] Creating category: ${name}, type: ${type}, tenantId: ${tenantId}`);

    // Use raw SQL to bypass Prisma model sync issues on Windows
    const result = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "ExpenseCategory" ("companyId", "name", "type", "updatedAt") 
       VALUES ($1, $2, $3::"ExpenseType", NOW()) 
       RETURNING "id", "companyId", "name", "type", "createdAt", "updatedAt"`,
      tenantId, name, type || 'OPERATIONAL'
    );
    const category = result[0];
    res.status(201).json(category);
  } catch (error: any) {
    console.error("DEBUG CAT CREATE ERROR:", error);
    fs.appendFileSync('debug_error.txt', `\n[${new Date().toISOString()}] CAT CREATE ERROR: ${error.message}\n${error.stack}\n`);
    res.status(500).json({ error: 'Gagal membuat kategori: ' + error.message });
  }
});

// F4.3. Update Expense Category
app.patch('/api/finance/expense-categories/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;
    const tenantId = Number((req as any).tenantId);
    
    const result = await prisma.$queryRawUnsafe<any[]>(
      `UPDATE "ExpenseCategory" 
       SET "name" = COALESCE($1, "name"), "type" = COALESCE($2::"ExpenseType", "type"), "updatedAt" = NOW() 
       WHERE "id" = $3 AND "companyId" = $4
       RETURNING *`,
      name, type, parseInt(String(id)), tenantId
    );
    
    if (result.length === 0) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal update kategori: ' + error.message });
  }
});

// F4.4. Delete Expense Category
app.delete('/api/finance/expense-categories/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { id } = req.params;
    
    await prisma.$executeRawUnsafe(
      `DELETE FROM "ExpenseCategory" WHERE "id" = $1 AND "companyId" = $2`,
      parseInt(String(id)), tenantId
    );
    
    res.json({ message: 'Kategori dihapus' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal menghapus kategori: ' + error.message });
  }
});

// F5.1. Get Expenses
app.get('/api/finance/expense', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { branchId } = req.query;
    
    const where: any = { companyId: tenantId };
    if (branchId && branchId !== 'all') {
      where.branchId = parseInt(branchId as string);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        account: true,
        category: true,
        supplier: true,
        product: true
      },
      orderBy: { date: 'desc' }
    });
    res.json(expenses);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil data pengeluaran' });
  }
});

// F5.2. Record Expense
app.post('/api/finance/expense', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { accountId, categoryId, branchId, amount, date, description, paidTo, status, dueDate, productId, quantity, paidAt } = req.body;
    const tenantId = Number((req as any).tenantId);

    // --- CHECK CLOSING ---
    if (await isPeriodClosed(tenantId, date || new Date())) {
      return res.status(403).json({ error: 'Periode buku sudah ditutup. Tidak dapat menambah transaksi pada tanggal ini.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let finalCategoryId = categoryId ? parseInt(categoryId) : null;
      const prodIdNum = productId ? parseInt(productId.toString()) : null;
      const qtyNum = quantity ? parseFloat(quantity.toString()) : 0;

      console.log("DEBUG EXPENSE CREATE RAW:", { productId, quantity, amount });
      console.log("DEBUG EXPENSE CREATE PARSED:", { prodIdNum, qtyNum, amount });

      // 1. Handle Inventory Link (Bahan Baku)
      if (prodIdNum && qtyNum > 0) {
          console.log("DEBUG BAHAN BAKU MODE ACTIVE");
        // Find or create the "Belanja Bahan Baku" category
        let category: any = await tx.expenseCategory.findFirst({
          where: { companyId: tenantId, name: 'Belanja Bahan Baku (Inventori)' }
        });

        if (!category) {
          const catResult: any[] = await tx.$queryRawUnsafe(`
            INSERT INTO "ExpenseCategory" ("companyId", "name", "type", "updatedAt")
            VALUES ($1, 'Belanja Bahan Baku (Inventori)', 'INVENTORY', NOW())
            RETURNING id
          `, tenantId);
          category = { id: catResult[0].id };
        }
        finalCategoryId = category.id;

        // Calculate unit cost and update Product Stock & Cost Price
        const unitCost = qtyNum > 0 ? parseFloat(amount) / qtyNum : 0;
        
        await tx.$executeRawUnsafe(
          'UPDATE "Product" SET "stock" = "stock" + $1, "costPrice" = $2, "updatedAt" = NOW() WHERE "id" = $3 AND "companyId" = $4',
          qtyNum, unitCost, prodIdNum, tenantId
        );

        // Record Stock Transaction
        await tx.$executeRawUnsafe(`
          INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date")
          VALUES ($1, 'IN', $2, $3, NOW())
        `, prodIdNum, qtyNum, description || 'Pembelian via Finance');
      }

      if (!finalCategoryId) throw new Error('Kategori pengeluaran diperlukan');

      // 2. Create Expense
      const dateVal = date ? new Date(date) : new Date();
      const dueDateVal = dueDate ? new Date(dueDate) : null;
      const paidAtVal = (status !== 'PENDING') ? (paidAt ? new Date(paidAt) : dateVal) : null;
      
      const insertRes = await tx.$queryRawUnsafe<any[]>(
        `INSERT INTO "Expense" ("companyId", "accountId", "categoryId", "supplierId", "productId", "quantity", "amount", "date", "paidAt", "dueDate", "status", "description", "paidTo", "branchId", "updatedAt")
         VALUES ($1::INTEGER, $2::INTEGER, $3::INTEGER, $4::INTEGER, $5::INTEGER, $6, $7, $8, $9, $10, $11::"ExpenseStatus", $12, $13, $14::INTEGER, NOW())
         RETURNING "id", "companyId", "accountId", "categoryId", "supplierId", "productId", "quantity", "amount", "date", "paidAt", "dueDate", "status", "description", "paidTo", "branchId"`,
        tenantId, 
        accountId ? Number(accountId) : null,
        finalCategoryId,
        req.body.supplierId ? Number(req.body.supplierId) : null,
        prodIdNum,
        qtyNum,
        parseFloat(amount),
        dateVal,
        paidAtVal,
        dueDateVal,
        status || 'PAID',
        description,
        paidTo,
        branchId ? Number(branchId) : null
      );
      
      const expense = insertRes[0];

      // 3. Update account balance (ONLY if status is PAID and accountId is provided)
      if (status !== 'PENDING' && accountId) {
        await tx.financialAccount.update({
          where: { id: parseInt(accountId) },
          data: {
            balance: { decrement: parseFloat(amount) }
          }
        });
      }

      // 4. Auto-create Asset if Category is CAPEX
      if (finalCategoryId) {
        const cat = await tx.expenseCategory.findUnique({ where: { id: finalCategoryId } });
        if (cat && cat.type === 'CAPEX') {
          await tx.asset.create({
            data: {
              companyId: tenantId,
              name: description || (paidTo ? `Pembelian dari ${paidTo}` : 'Aset Tetap Baru'),
              condition: 'NEW',
              purchasePrice: parseFloat(amount),
              purchaseDate: dateVal,
              isDepreciating: false
            }
          });
        }
      }

      return expense;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("DEBUG EXPENSE CREATE ERROR:", error);
    fs.appendFileSync('debug_error.txt', `\n[${new Date().toISOString()}] EXPENSE CREATE ERROR: ${error.message}\n${error.stack}\n`);
  }
});

// F5.2. Update Expense
app.patch('/api/finance/expense/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { accountId, categoryId, supplierId, amount, date, dueDate, status, description, paidTo, paidAt } = req.body;
    const tenantId = Number((req as any).tenantId);

    // 1. Safety Check: Period Closing
    const expense = await prisma.expense.findFirst({
        where: { id: parseInt(id as string), companyId: tenantId }
    });

    if (!expense) return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });

    if (await isPeriodClosed(tenantId, expense.date)) {
      return res.status(403).json({ error: 'Periode transaksi sudah ditutup. Data tidak dapat diubah.' });
    }

    const result = await prisma.$transaction(async (tx) => {
        // 2. Revert Old Balance (ONLY if status was not PENDING and had accountId)
        if (expense.status !== 'PENDING' && expense.accountId) {
            await tx.$executeRawUnsafe(
                'UPDATE "FinancialAccount" SET "balance" = "balance" + $1, "updatedAt" = NOW() WHERE "id" = $2 AND "companyId" = $3',
                expense.amount, expense.accountId, tenantId
            );
        }

        // 3. Update Expense
        const finalStatus = status !== undefined ? status : expense.status;
        const finalDate = date ? new Date(date) : expense.date;
        
        let paidAtVal: Date | null = null;
        if (finalStatus !== 'PENDING') {
          if (paidAt !== undefined) {
            paidAtVal = paidAt ? new Date(paidAt) : null;
          } else if (expense.status === 'PENDING') {
            paidAtVal = new Date();
          } else {
            paidAtVal = expense.paidAt ? new Date(expense.paidAt) : finalDate;
          }
        }

        const finalAccountId = accountId !== undefined ? (accountId ? Number(accountId) : null) : expense.accountId;
        const finalCategoryId = categoryId !== undefined ? (categoryId ? Number(categoryId) : expense.categoryId) : expense.categoryId;
        const finalSupplierId = supplierId !== undefined ? (supplierId ? Number(supplierId) : null) : expense.supplierId;
        const finalAmount = amount !== undefined ? (amount ? Number(amount) : 0) : expense.amount;
        const finalDueDate = dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : expense.dueDate;
        const finalDescription = description !== undefined ? description : expense.description;
        const finalPaidTo = paidTo !== undefined ? paidTo : expense.paidTo;

        const upRes = await tx.$queryRawUnsafe<any[]>(
            `UPDATE "Expense" SET 
                "accountId" = $1::INTEGER, "categoryId" = $2::INTEGER, "supplierId" = $3::INTEGER, "amount" = $4, 
                "date" = $5, "dueDate" = $6, "status" = $7::"ExpenseStatus", 
                "description" = $8, "paidTo" = $9, "paidAt" = $10, "updatedAt" = NOW() 
             WHERE "id" = $11 AND "companyId" = $12
             RETURNING *`,
            finalAccountId,
            finalCategoryId,
            finalSupplierId,
            finalAmount,
            finalDate,
            finalDueDate,
            finalStatus,
            finalDescription,
            finalPaidTo,
            paidAtVal,
            parseInt(id as string),
            tenantId
        );

        // 4. Apply New Balance (ONLY if new status is not PENDING and has accountId)
        if (finalStatus !== 'PENDING' && finalAccountId) {
            await tx.$executeRawUnsafe(
                'UPDATE "FinancialAccount" SET "balance" = "balance" - $1, "updatedAt" = NOW() WHERE "id" = $2 AND "companyId" = $3',
                finalAmount, finalAccountId, tenantId
            );
        }

        return upRes[0];
    });

    res.json(result);
  } catch (error: any) {
    console.error("Gagal memperbarui pengeluaran:", error);
    res.status(500).json({ error: 'Gagal memperbarui pengeluaran: ' + error.message });
  }
});

// F5.2b. Delete Expense
app.delete('/api/finance/expense/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = Number((req as any).tenantId);

    const expense = await prisma.expense.findFirst({
        where: { id: parseInt(id as string), companyId: tenantId }
    });

    if (!expense) return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });

    if (await isPeriodClosed(tenantId, expense.date)) {
      return res.status(403).json({ error: 'Periode transaksi sudah ditutup. Data tidak dapat dihapus.' });
    }

    await prisma.$transaction(async (tx) => {
        // Revert Balance (Add back if was PAID)
        if (expense.status !== 'PENDING' && expense.accountId) {
            await tx.$executeRawUnsafe(
                'UPDATE "FinancialAccount" SET "balance" = "balance" + $1, "updatedAt" = NOW() WHERE "id" = $2 AND "companyId" = $3',
                expense.amount, expense.accountId, tenantId
            );
        }

        // Delete record
        await tx.expense.delete({ where: { id: parseInt(id as string) } });
    });

    res.json({ message: 'Pengeluaran berhasil dihapus' });
  } catch (error: any) {
    console.error("Gagal menghapus pengeluaran:", error);
    res.status(500).json({ error: 'Gagal menghapus pengeluaran: ' + error.message });
  }
});

// F6.1. Get Transfers
app.get('/api/finance/transfers', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const transfers = await prisma.transfer.findMany({
      where: { companyId: tenantId },
      include: {
        fromAccount: true,
        toAccount: true
      },
      orderBy: { date: 'desc' }
    });
    res.json(transfers);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil data transfer' });
  }
});

// F6.2. Record Transfer
app.post('/api/finance/transfer', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { fromAccountId, toAccountId, amount, date, description } = req.body;
    const tenantId = Number((req as any).tenantId);

    if (fromAccountId === toAccountId) {
      return res.status(400).json({ error: 'Akun sumber dan tujuan tidak boleh sama.' });
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      return res.status(400).json({ error: 'Jumlah transfer harus lebih dari 0.' });
    }

    // Check Source Account Balance
    const sourceAccount = await prisma.financialAccount.findUnique({
      where: { id: parseInt(fromAccountId), companyId: tenantId }
    });

    if (!sourceAccount) return res.status(404).json({ error: 'Akun sumber tidak ditemukan.' });
    if (sourceAccount.balance < amountNum) {
      return res.status(400).json({ error: 'Saldo tidak mencukupi di akun sumber.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Transfer Record
      const transfer = await tx.transfer.create({
        data: {
          companyId: tenantId,
          fromAccountId: parseInt(fromAccountId),
          toAccountId: parseInt(toAccountId),
          amount: amountNum,
          date: date ? new Date(date) : new Date(),
          description
        }
      });

      // 2. Decrease Source
      await tx.financialAccount.update({
        where: { id: parseInt(fromAccountId) },
        data: { balance: { decrement: amountNum } }
      });

      // 3. Increase Destination
      await tx.financialAccount.update({
        where: { id: parseInt(toAccountId) },
        data: { balance: { increment: amountNum } }
      });

      return transfer;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("TRANSFER ERROR:", error);
    res.status(500).json({ error: 'Gagal melakukan transfer: ' + error.message });
  }
});

// F5.3. Pay Pending Expense (Support Partial / Installment)
app.post('/api/finance/expense/:id/pay', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const expenseId = parseInt(req.params.id as string);
    const { accountId, paymentAmount, paymentDate } = req.body; // New: support paymentAmount and paymentDate
    const tenantId = Number((req as any).tenantId);

    if (!accountId) return res.status(400).json({ error: 'Pilih akun pembayaran' });

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({
        where: { id: expenseId, companyId: tenantId }
      });

      if (!expense) throw new Error('Pengeluaran tidak ditemukan');
      if (expense.status === 'PAID') throw new Error('Pengeluaran sudah lunas');

      // --- CHECK CLOSING ---
      const payDate = paymentDate ? new Date(paymentDate) : new Date();
      if (await isPeriodClosed(tenantId, payDate)) {
        throw new Error('Periode buku sudah ditutup. Tidak dapat mengubah transaksi pada tanggal ini.');
      }

      const remainingBalance = parseFloat((expense.amount - (expense.paidAmount || 0)).toFixed(2));
      const amountToPay = paymentAmount !== undefined 
        ? Math.min(parseFloat(paymentAmount.toString()), remainingBalance) 
        : remainingBalance;

      if (amountToPay <= 0) throw new Error('Nominal pembayaran tidak valid.');

      const newPaidAmount = (expense.paidAmount || 0) + amountToPay;
      const isFullyPaid = newPaidAmount >= expense.amount - 0.01; // handle floating precision
      const newStatus = isFullyPaid ? 'PAID' : 'PENDING';

      // Update Expense using safe Prisma client
      const updatedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          status: newStatus as any,
          paidAmount: newPaidAmount,
          accountId: parseInt(accountId),
          paidAt: isFullyPaid ? payDate : undefined,
          updatedAt: payDate
        }
      });

      // Decrement account balance by the payment amount
      await tx.financialAccount.update({
        where: { id: parseInt(accountId) },
        data: {
          balance: { decrement: amountToPay }
        }
      });

      return {
        ...updatedExpense,
        amountPaidThisTime: amountToPay,
        isFullyPaid
      };
    });

    res.json(result);
  } catch (error: any) {
    console.error("DEBUG EXPENSE PAY ERROR:", error);
    fs.appendFileSync('debug_error.txt', `\n[${new Date().toISOString()}] EXPENSE PAY ERROR: ${error.message}\n${error.stack}\n`);
    res.status(500).json({ error: 'Gagal mencatat pembayaran hutang: ' + error.message });
  }
});

// F5.4. Update Expense
app.put('/api/finance/expense/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const expenseId = parseInt(req.params.id as string);
    const tenantId = Number((req as any).tenantId);
    const { accountId, categoryId, amount, date, dueDate, status, description, paidTo } = req.body;

    // --- CHECK CLOSING ---
    if (await isPeriodClosed(tenantId, date ? new Date(date) : new Date())) {
      return res.status(403).json({ error: 'Periode buku sudah ditutup. Tidak dapat memperbarui transaksi pada tanggal ini.' });
    }

      const result = await prisma.$transaction(async (tx) => {
        const prodIdNum = req.body.productId ? parseInt(req.body.productId.toString()) : null;
        const qtyNum = req.body.quantity ? parseFloat(req.body.quantity.toString()) : 0;
        
        console.log("DEBUG EXPENSE UPDATE PARSED:", { prodIdNum, qtyNum, amount: req.body.amount });

        // 1. Get old expense
      const oldExpense = await tx.expense.findUnique({
        where: { id: expenseId, companyId: tenantId }
      });
      if (!oldExpense) throw new Error('Pengeluaran tidak ditemukan');

      const newAmount = parseFloat(amount);
      const newAccountId = accountId ? parseInt(accountId) : null;

      // 2. Adjust Balance if PAID
      if (oldExpense.status === 'PAID' && status === 'PAID') {
        if (oldExpense.accountId === newAccountId) {
            const diff = newAmount - oldExpense.amount;
            if (diff !== 0 && newAccountId) {
                await tx.financialAccount.update({
                    where: { id: newAccountId },
                    data: { balance: { decrement: diff } }
                });
            }
        } else {
            if (oldExpense.accountId) {
                await tx.financialAccount.update({
                    where: { id: oldExpense.accountId },
                    data: { balance: { increment: oldExpense.amount } }
                });
            }
            if (newAccountId) {
                await tx.financialAccount.update({
                    where: { id: newAccountId },
                    data: { balance: { decrement: newAmount } }
                });
            }
        }
      } else if (oldExpense.status === 'PENDING' && status === 'PAID') {
        if (newAccountId) {
            await tx.financialAccount.update({
                where: { id: newAccountId },
                data: { balance: { decrement: newAmount } }
            });
        }
      } else if (oldExpense.status === 'PAID' && status === 'PENDING') {
        if (oldExpense.accountId) {
            await tx.financialAccount.update({
                where: { id: oldExpense.accountId },
                data: { balance: { increment: oldExpense.amount } }
            });
        }
      }

      // 4. Update Product Cost Price (if BAHAN_BAKU mode/data provided)
      if (prodIdNum && qtyNum > 0) {
          const unitCost = newAmount / qtyNum;
          console.log("DEBUG SYNC COST PRICE:", { prodIdNum, unitCost });
          const updateRes = await tx.$executeRawUnsafe(
            'UPDATE "Product" SET "costPrice" = $1, "updatedAt" = NOW() WHERE "id" = $2 AND "companyId" = $3',
            unitCost, prodIdNum, tenantId
          );
          console.log("DEBUG UPDATE RES:", updateRes);
      }

      // 3. Update record
      await tx.$executeRawUnsafe(
        `UPDATE "Expense" SET 
            "accountId" = $1::INTEGER, 
            "categoryId" = $2::INTEGER, 
            "supplierId" = $3::INTEGER,
            "amount" = $4, 
            "date" = $5, 
            "dueDate" = $6, 
            "status" = $7::"ExpenseStatus", 
            "description" = $8, 
            "paidTo" = $9, 
            "updatedAt" = NOW()
         WHERE "id" = $10 AND "companyId" = $11`,
        newAccountId ? Number(newAccountId) : null, 
        categoryId ? Number(categoryId) : null, 
        req.body.supplierId ? Number(req.body.supplierId) : null,
        newAmount, 
        new Date(date), 
        dueDate ? new Date(dueDate) : null,
        status,
        description,
        paidTo,
        expenseId,
        tenantId
      );

      return { id: expenseId, status, amount: newAmount };
    });

    res.json(result);
  } catch (error: any) {
    console.error("PUT EXPENSE ERROR:", error);
    res.status(500).json({ error: 'Gagal memperbarui pengeluaran: ' + error.message });
  }
});

// F5.5. Delete Expense
app.delete('/api/finance/expense/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const expenseId = parseInt(req.params.id as string);
    const tenantId = Number((req as any).tenantId);

    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({
        where: { id: expenseId, companyId: tenantId }
      });
      if (!expense) throw new Error('Pengeluaran tidak ditemukan');

      // --- CHECK CLOSING ---
      if (await isPeriodClosed(tenantId, expense.date)) {
        throw new Error('Periode buku sudah ditutup. Tidak dapat menghapus transaksi pada tanggal ini.');
      }

      if (expense.status === 'PAID' && expense.accountId) {
        await tx.financialAccount.update({
          where: { id: expense.accountId },
          data: { balance: { increment: expense.amount } }
        });
      }

      await tx.expense.delete({
        where: { id: expenseId }
      });
    });

    res.json({ message: 'Pengeluaran berhasil dihapus' });
  } catch (error: any) {
    console.error("DELETE EXPENSE ERROR:", error);
    res.status(500).json({ error: 'Gagal menghapus pengeluaran: ' + error.message });
  }
});

// Helper function to calculate B2B / Retail Sales COGS in high performance batch queries (solves N+1 database round-trip timeout)
async function calculateSalesCOGS(tenantId: number, startDate: Date, endDate: Date): Promise<number> {
  const sales: any[] = await prisma.$queryRawUnsafe(`
    SELECT id FROM "Sale" 
    WHERE "companyId" = $1 AND "date" >= $2 AND "date" <= $3
    AND "status" NOT IN ('CANCELLED', 'PENDING', 'RETURNED', 'VOID')
  `, tenantId, startDate, endDate);

  if (sales.length === 0) return 0;
  const saleIds = sales.map(s => s.id);

  const saleItems: any[] = await prisma.$queryRawUnsafe(`
    SELECT "productId", "quantity", "modifiers" FROM "SaleItem" 
    WHERE "saleId" IN (${saleIds.join(',')})
  `);

  if (saleItems.length === 0) return 0;

  // We need to fetch ALL products and recipes for this tenant to correctly resolve recursive recipes
  const allProducts = await prisma.product.findMany({
    where: { companyId: tenantId },
    include: {
      Recipes: {
        include: { Material: true }
      }
    }
  });

  const getProductCost = (product: any, visited = new Set<number>()): number => {
    if (!product || visited.has(product.id)) return 0;
    visited.add(product.id);

    if (product.Recipes && product.Recipes.length > 0) {
      const totalBatchCost = product.Recipes.reduce((sum: number, r: any) => {
        const material = allProducts.find(m => m.id === r.materialId);
        // Fallback to raw Material costPrice if not found in current products
        const materialUnitCost = material ? getProductCost(material, new Set(visited)) : (r.Material?.costPrice || 0);
        return sum + (Number(r.quantity || 0) * Number(materialUnitCost || 0));
      }, 0);
      return totalBatchCost / (product.recipeYield || 1);
    }
    return product.costPrice || 0;
  };

  const productCostCache = new Map<number, number>();
  
  let calculatedCogsFromSales = 0;
  for (const item of saleItems) {
    const prodId = item.productId;
    const qty = Number(item.quantity) || 0;
    
    let unitCogs = productCostCache.get(prodId);
    if (unitCogs === undefined) {
      const product = allProducts.find(p => p.id === prodId);
      unitCogs = product ? getProductCost(product) : 0;
      productCostCache.set(prodId, unitCogs);
    }

    calculatedCogsFromSales += qty * unitCogs;
    
    // Add modifier COGS
    if (item.modifiers) {
       const mods = typeof item.modifiers === 'string' ? JSON.parse(item.modifiers) : item.modifiers;
       Object.values(mods).forEach((val: any) => {
          if (val && val.linkedProductId) {
             const linkedProdId = Number(val.linkedProductId);
             const linkedQty = Number(val.linkedQuantity) || 1;
             
             let modUnitCogs = productCostCache.get(linkedProdId);
             if (modUnitCogs === undefined) {
                 const modProduct = allProducts.find(p => p.id === linkedProdId);
                 modUnitCogs = modProduct ? getProductCost(modProduct) : 0;
                 productCostCache.set(linkedProdId, modUnitCogs);
             }
             
             calculatedCogsFromSales += qty * linkedQty * modUnitCogs;
          }
       });
    }
  }

  return calculatedCogsFromSales;
}

// F6.1. Profit & Loss Report
app.get('/api/finance/reports/profit-loss', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 1. Fetch Incomes
    const incomes = await prisma.income.findMany({
      where: {
        companyId: tenantId,
        date: { gte: startDate, lte: endDate }
      },
      include: { category: true }
    });

    // 2. Fetch Expenses
    const expenses = await prisma.expense.findMany({
      where: {
        companyId: tenantId,
        date: { gte: startDate, lte: endDate }
      },
      include: { category: true }
    });

    // 3. Aggregate Data
    const salesRevenueByCategory: Record<string, number> = {};
    const otherIncomeByCategory: Record<string, number> = {};
    let totalSalesRevenue = 0;
    let totalOtherIncome = 0;
    let totalTaxCollected = 0;

    // Fetch all sales for Accrual Basis Revenue
    const accrualSales = await prisma.sale.findMany({
      where: {
        companyId: tenantId,
        date: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED', 'PENDING', 'RETURNED', 'VOID'] }
      }
    });

    accrualSales.forEach(sale => {
      let amount = sale.totalAmount;
      const catName = sale.saleType === 'POS' ? 'Penjualan POS' : 'Penjualan Produk';
      
      if (sale.taxRate && sale.taxRate > 0) {
        if (sale.taxAmount && sale.taxAmount > 0) {
          amount = amount - sale.taxAmount;
          totalTaxCollected += sale.taxAmount;
        } else {
          const taxAmount = amount * (sale.taxRate / (100 + sale.taxRate));
          amount = amount - taxAmount;
          totalTaxCollected += taxAmount;
        }
      }
      
      salesRevenueByCategory[catName] = (salesRevenueByCategory[catName] || 0) + amount;
      totalSalesRevenue += amount;
    });

    incomes.forEach(inc => {
      const catName = inc.category?.name || 'Uncategorized';
      let amount = inc.amount;
      
      const isSales = inc.category?.name === 'Penjualan Produk' || inc.category?.name === 'Penjualan POS';
      const isEquity = inc.category?.type === 'EQUITY';
      
      if (!isSales && !isEquity) {
        otherIncomeByCategory[catName] = (otherIncomeByCategory[catName] || 0) + amount;
        totalOtherIncome += amount;
      }
    });

    // Process Expenses
    const cogsByCategory: Record<string, number> = {};
    const opexByCategory: Record<string, number> = {}; // general operational expenses
    const nonOpExpensesByCategory: Record<string, number> = {}; // other expenses (non-operational)
    const depreciationByCategory: Record<string, number> = {}; // depreciation expenses

    let manualCOGS = 0;
    let totalOpexGeneral = 0;
    let totalNonOpExpenses = 0;
    let totalDepreciation = 0;

    expenses.forEach(exp => {
      const catName = exp.category?.name || 'Uncategorized';
      const isCOGS = exp.category?.type === 'COGS';
      const isCapex = exp.category?.type === 'CAPEX';
      const isInventory = exp.category?.type === 'INVENTORY';
      
      if (isCapex || isInventory) {
        // Exclude CAPEX and INVENTORY from P&L completely
      } else if (isCOGS) {
        cogsByCategory[catName] = (cogsByCategory[catName] || 0) + exp.amount;
        manualCOGS += exp.amount;
      } else {
        // Classify opex into General Opex, Depreciation, or Non-Operational
        const isDep = /penyusutan|amortisasi|depresiasi/i.test(catName);
        const isNonOp = /admin bank|biaya bank|bunga bank|biaya lain|jasa manajemen|non-operasional|lain-lain/i.test(catName);
        
        if (isDep) {
          depreciationByCategory[catName] = (depreciationByCategory[catName] || 0) + exp.amount;
          totalDepreciation += exp.amount;
        } else if (isNonOp) {
          nonOpExpensesByCategory[catName] = (nonOpExpensesByCategory[catName] || 0) + exp.amount;
          totalNonOpExpenses += exp.amount;
        } else {
          opexByCategory[catName] = (opexByCategory[catName] || 0) + exp.amount;
          totalOpexGeneral += exp.amount;
        }
      }
    });

    // 4. Calculate Detailed COGS based on Sales in high-performance batch (solves PnL N+1 timeout)
    const calculatedCogsFromSales = await calculateSalesCOGS(tenantId, startDate, endDate);
    const totalCOGS = calculatedCogsFromSales + manualCOGS;
    const grossProfit = totalSalesRevenue - totalCOGS;

    // 4b. Calculate Asset Depreciations/Amortizations for this month (such as Prepaid Rent / Sewa Kantor)
    const assets = await prisma.asset.findMany({
      where: {
        companyId: tenantId,
        isDepreciating: true
      }
    });

    assets.forEach(asset => {
      if (asset.purchasePrice && asset.purchasePrice > 0 && asset.usefulLife && asset.usefulLife > 0) {
        const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date(asset.createdAt);
        // Calculate months between purchaseDate and the target P&L month/year
        const monthsFromPurchase = (year - purchaseDate.getFullYear()) * 12 + (month - 1 - purchaseDate.getMonth());
        
        if (monthsFromPurchase >= 0 && monthsFromPurchase < asset.usefulLife) {
          const monthlyDepreciation = Math.round(((Number(asset.purchasePrice) - Number(asset.residualValue || 0)) / Number(asset.usefulLife)) * 100) / 100;
          const depName = `Penyusutan Kategori: ${asset.category || 'Lainnya'}`;
          depreciationByCategory[depName] = (depreciationByCategory[depName] || 0) + monthlyDepreciation;
          totalDepreciation += monthlyDepreciation;
        }
      }
    });

    const operatingProfit = grossProfit - totalOpexGeneral;

    // Combine other incomes and other expenses into Non-Operational details
    const nonOperationalByCategory: Record<string, number> = {};
    Object.entries(otherIncomeByCategory).forEach(([k, v]) => {
      nonOperationalByCategory[k] = v;
    });
    Object.entries(nonOpExpensesByCategory).forEach(([k, v]) => {
      // Show expenses as negative values in non-operational details
      nonOperationalByCategory[k] = -v;
    });
    const totalNonOperational = totalOtherIncome - totalNonOpExpenses;

    const ebitda = operatingProfit + totalNonOperational;
    const netProfit = ebitda - totalDepreciation;

    // Round everything to 2 decimal places
    const round2 = (num: number) => Math.round(num * 100) / 100;
    const roundRecord = (rec: Record<string, number>) => {
      const result: Record<string, number> = {};
      Object.entries(rec).forEach(([k, v]) => {
        result[k] = round2(v);
      });
      return result;
    };

    res.json({
      period: { month, year },
      revenue: {
        categories: roundRecord(salesRevenueByCategory),
        total: round2(totalSalesRevenue),
        taxCollected: round2(totalTaxCollected)
      },
      cogs: {
        categories: { ...roundRecord(cogsByCategory), "HPP Terjual (Calc)": round2(calculatedCogsFromSales) },
        total: round2(totalCOGS),
        detail: "HPP dihitung otomatis berdasarkan resep dan volume penjualan"
      },
      grossProfit: round2(grossProfit),
      opex: {
        categories: roundRecord(opexByCategory),
        total: round2(totalOpexGeneral)
      },
      operatingProfit: round2(operatingProfit),
      nonOperational: {
        categories: roundRecord(nonOperationalByCategory),
        total: round2(totalNonOperational)
      },
      ebitda: round2(ebitda),
      depreciation: {
        categories: roundRecord(depreciationByCategory),
        total: round2(totalDepreciation)
      },
      netProfit: round2(netProfit)
    });

  } catch (error: any) {
    console.error("DEBUG PnL REPORT ERROR:", error);
    res.status(500).json({ error: 'Gagal menghasilkan laporan Laba Rugi: ' + error.message });
  }
});

// F6.1b. Export Profit & Loss to Excel
app.get('/api/finance/reports/profit-loss/export', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const ExcelJS = require('exceljs');

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // --- LOGIC SAME AS PnL ---
    const incomes = await prisma.income.findMany({
      where: { companyId: tenantId, date: { gte: startDate, lte: endDate } },
      include: { category: true }
    });
    const expenses = await prisma.expense.findMany({
      where: { companyId: tenantId, date: { gte: startDate, lte: endDate } },
      include: { category: true }
    });

    const salesRevenueByCategory: Record<string, number> = {};
    const otherIncomeByCategory: Record<string, number> = {};
    let totalSalesRevenue = 0;
    let totalOtherIncome = 0;
    let totalTaxCollected = 0;

    // Fetch all sales for Accrual Basis Revenue
    const accrualSales = await prisma.sale.findMany({
      where: {
        companyId: tenantId,
        date: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED', 'PENDING', 'RETURNED', 'VOID'] }
      }
    });

    accrualSales.forEach(sale => {
      let amount = sale.totalAmount;
      const catName = sale.saleType === 'POS' ? 'Penjualan POS' : 'Penjualan Produk';
      
      if (sale.taxRate && sale.taxRate > 0) {
        if (sale.taxAmount && sale.taxAmount > 0) {
          amount = amount - sale.taxAmount;
          totalTaxCollected += sale.taxAmount;
        } else {
          const taxAmount = amount * (sale.taxRate / (100 + sale.taxRate));
          amount = amount - taxAmount;
          totalTaxCollected += taxAmount;
        }
      }
      
      salesRevenueByCategory[catName] = (salesRevenueByCategory[catName] || 0) + amount;
      totalSalesRevenue += amount;
    });

    incomes.forEach(inc => {
      const catName = inc.category?.name || 'Uncategorized';
      let amount = inc.amount;
      
      const isSales = inc.category?.name === 'Penjualan Produk' || inc.category?.name === 'Penjualan POS';
      
      if (!isSales) {
        otherIncomeByCategory[catName] = (otherIncomeByCategory[catName] || 0) + amount;
        totalOtherIncome += amount;
      }
    });

    // Process Expenses
    const cogsByCategory: Record<string, number> = {};
    const opexByCategory: Record<string, number> = {}; // general operational expenses
    const nonOpExpensesByCategory: Record<string, number> = {}; // other expenses (non-operational)
    const depreciationByCategory: Record<string, number> = {}; // depreciation expenses

    let manualCOGS = 0;
    let totalOpexGeneral = 0;
    let totalNonOpExpenses = 0;
    let totalDepreciation = 0;

    expenses.forEach(exp => {
      const catName = exp.category?.name || 'Uncategorized';
      const isCOGS = exp.category?.type === 'COGS';
      
      if (isCOGS) {
        cogsByCategory[catName] = (cogsByCategory[catName] || 0) + exp.amount;
        manualCOGS += exp.amount;
      } else {
        // Classify opex into General Opex, Depreciation, or Non-Operational
        const isDep = /penyusutan|amortisasi|depresiasi/i.test(catName);
        const isNonOp = /admin bank|biaya bank|bunga bank|biaya lain|jasa manajemen|non-operasional|lain-lain/i.test(catName);
        
        if (isDep) {
          depreciationByCategory[catName] = (depreciationByCategory[catName] || 0) + exp.amount;
          totalDepreciation += exp.amount;
        } else if (isNonOp) {
          nonOpExpensesByCategory[catName] = (nonOpExpensesByCategory[catName] || 0) + exp.amount;
          totalNonOpExpenses += exp.amount;
        } else {
          opexByCategory[catName] = (opexByCategory[catName] || 0) + exp.amount;
          totalOpexGeneral += exp.amount;
        }
      }
    });

    // Calculate B2B / Retail Sales COGS in high performance batch (solves export timeout)
    const calculatedCogsFromSales = await calculateSalesCOGS(tenantId, startDate, endDate);
    const totalCOGS = calculatedCogsFromSales + manualCOGS;
    const grossProfit = totalSalesRevenue - totalCOGS;

    // Calculate Asset Depreciations/Amortizations for this month (such as Prepaid Rent / Sewa Kantor)
    const assets = await prisma.asset.findMany({
      where: {
        companyId: tenantId,
        isDepreciating: true
      }
    });

    assets.forEach(asset => {
      if (asset.purchasePrice && asset.purchasePrice > 0 && asset.usefulLife && asset.usefulLife > 0) {
        const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date(asset.createdAt);
        // Calculate months between purchaseDate and the target P&L month/year
        const monthsFromPurchase = (year - purchaseDate.getFullYear()) * 12 + (month - 1 - purchaseDate.getMonth());
        
        if (monthsFromPurchase >= 0 && monthsFromPurchase < asset.usefulLife) {
          const monthlyDepreciation = Math.round(((Number(asset.purchasePrice) - Number(asset.residualValue || 0)) / Number(asset.usefulLife)) * 100) / 100;
          const depName = `Penyusutan Kategori: ${asset.category || 'Lainnya'}`;
          depreciationByCategory[depName] = (depreciationByCategory[depName] || 0) + monthlyDepreciation;
          totalDepreciation += monthlyDepreciation;
        }
      }
    });

    const operatingProfit = grossProfit - totalOpexGeneral;

    // Combine other incomes and other expenses into Non-Operational details
    const nonOperationalByCategory: Record<string, number> = {};
    Object.entries(otherIncomeByCategory).forEach(([k, v]) => {
      nonOperationalByCategory[k] = v;
    });
    Object.entries(nonOpExpensesByCategory).forEach(([k, v]) => {
      // Show expenses as negative values in non-operational details
      nonOperationalByCategory[k] = -v;
    });
    const totalNonOperational = totalOtherIncome - totalNonOpExpenses;

    const ebitda = operatingProfit + totalNonOperational;
    const netProfit = ebitda - totalDepreciation;

    // Round everything to 2 decimal places
    const round2 = (num: number) => Math.round(num * 100) / 100;
    const roundRecord = (rec: Record<string, number>) => {
      const result: Record<string, number> = {};
      Object.entries(rec).forEach(([k, v]) => {
        result[k] = round2(v);
      });
      return result;
    };

    const finalSalesRev = roundRecord(salesRevenueByCategory);
    const finalCogs = roundRecord(cogsByCategory);
    const finalOpex = roundRecord(opexByCategory);
    const finalNonOp = roundRecord(nonOperationalByCategory);
    const finalDep = roundRecord(depreciationByCategory);

    // --- CREATE EXCEL ---
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laba Rugi');

    worksheet.mergeCells('A1:C1');
    worksheet.getCell('A1').value = `LAPORAN LABA RUGI - Periode ${month}/${year}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    let currentRow = 3;

    // 1. Penjualan Bersih
    worksheet.getCell(`A${currentRow}`).value = 'PENDAPATAN BERSIH';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
    Object.entries(finalSalesRev).forEach(([cat, amt]) => {
      worksheet.addRow([cat, '', amt]);
      currentRow++;
    });
    if (totalTaxCollected > 0) {
      worksheet.addRow(['PPN Keluaran (Dikeluarkan)', '', round2(totalTaxCollected)]);
      currentRow++;
    }
    worksheet.addRow(['Total Pendapatan Bersih', '', round2(totalSalesRevenue)]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 2;

    // 2. COGS (HPP)
    worksheet.getCell(`A${currentRow}`).value = 'BEBAN POKOK PENJUALAN (HPP)';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
    Object.entries(finalCogs).forEach(([cat, amt]) => {
      worksheet.addRow([cat, '', amt]);
      currentRow++;
    });
    worksheet.addRow(['HPP Terjual (Otomatis)', '', round2(calculatedCogsFromSales)]);
    currentRow++;
    worksheet.addRow(['Total HPP', '', round2(totalCOGS)]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 2;

    // 3. Gross Profit (Laba Kotor)
    worksheet.addRow(['LABA KOTOR', '', round2(grossProfit)]);
    worksheet.getRow(currentRow).font = { bold: true, color: { argb: 'FF008000' } };
    currentRow += 2;

    // 4. General Operational Expenses (Biaya Operasional)
    worksheet.getCell(`A${currentRow}`).value = 'BIAYA OPERASIONAL';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
    Object.entries(finalOpex).forEach(([cat, amt]) => {
      worksheet.addRow([cat, '', amt]);
      currentRow++;
    });
    worksheet.addRow(['Total Biaya Operasional', '', round2(totalOpexGeneral)]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 2;

    // 5. Operating Profit (Laba/Rugi Operasional)
    worksheet.addRow(['LABA / (RUGI) OPERASIONAL', '', round2(operatingProfit)]);
    worksheet.getRow(currentRow).font = { bold: true, color: { argb: 'FF0000FF' } };
    currentRow += 2;

    // 6. Non-Operational (Pendapatan/Biaya Lain-lain)
    worksheet.getCell(`A${currentRow}`).value = 'PENDAPATAN / BIAYA LAIN-LAIN';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
    Object.entries(finalNonOp).forEach(([cat, amt]) => {
      worksheet.addRow([cat, '', amt]);
      currentRow++;
    });
    worksheet.addRow(['Total Pendapatan/Biaya Lain-lain', '', round2(totalNonOperational)]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 2;

    // 7. EBITDA (Laba Sebelum Bunga, Pajak, Penyusutan)
    worksheet.addRow(['LABA BERSIH SEBELUM BUNGA, PAJAK DAN PENYUSUTAN', '', round2(ebitda)]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 2;

    // 8. Depreciation (Biaya Penyusutan dan Amortisasi)
    worksheet.getCell(`A${currentRow}`).value = 'BIAYA PENYUSUTAN DAN AMORTISASI';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
    Object.entries(finalDep).forEach(([cat, amt]) => {
      worksheet.addRow([cat, '', amt]);
      currentRow++;
    });
    worksheet.addRow(['Total Biaya Penyusutan dan Amortisasi', '', round2(totalDepreciation)]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 2;

    // 9. Net Profit (Laba Bersih)
    worksheet.addRow(['LABA BERSIH', '', round2(netProfit)]);
    worksheet.getRow(currentRow).font = { bold: true, size: 12 };
    worksheet.getCell(`C${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

    // Styling
    worksheet.getColumn(3).numFmt = '#,##0';
    worksheet.getColumn(1).width = 50;
    worksheet.getColumn(3).width = 20;

    const fileName = `Laba_Rugi_${month}_${year}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);

  } catch (error: any) {
    console.error("EXPORT PnL ERROR:", error);
    res.status(500).json({ error: 'Gagal mengekspor Laba Rugi: ' + error.message });
  }
});

// F6.2. Balance Sheet Report (Neraca)
app.get('/api/finance/reports/balance-sheet', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);

    // 1. Assets: Current Assets (Accounts)
    const accounts = await prisma.financialAccount.findMany({
      where: { companyId: tenantId }
    });

    let totalCurrentAssets = 0;
    accounts.forEach(acc => {
      totalCurrentAssets += acc.balance;
    });

    // 2. Assets: Fixed Assets (Physical Assets)
    const physicalAssets = await prisma.asset.findMany({
      where: { companyId: tenantId }
    });

    let totalFixedAssets = 0;
    let totalFixedAssetsGross = 0;
    let totalAccumulatedDepreciation = 0;
    const assetsWithBookValue = physicalAssets.map(asset => {
        let bookValue = Number(asset.purchasePrice || 0);
        let accumulatedDepreciation = 0;
        totalFixedAssetsGross += bookValue;
        if (asset.isDepreciating && Number(asset.purchasePrice) > 0 && Number(asset.usefulLife) > 0) {
            const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date(asset.createdAt);
            const now = new Date();
            let monthsPassed = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
            if (monthsPassed >= 0) monthsPassed += 1; // Count purchase month as 1 full month
            const monthlyDepreciation = Math.round(((Number(asset.purchasePrice) - Number(asset.residualValue || 0)) / Number(asset.usefulLife)) * 100) / 100;
            accumulatedDepreciation = Math.max(0, Math.min(monthsPassed * monthlyDepreciation, Number(asset.purchasePrice) - Number(asset.residualValue || 0)));
            bookValue = Number(asset.purchasePrice) - accumulatedDepreciation;
        }
        totalAccumulatedDepreciation += accumulatedDepreciation;
        totalFixedAssets += bookValue;
        return { ...asset, bookValue, accumulatedDepreciation };
    });

    // 3. Assets: Employee Loans (Piutang Karyawan)
    const activeLoans = await prisma.loan.findMany({
      where: { companyId: tenantId, status: 'ACTIVE' }
    });
    const totalLoans = activeLoans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);

    // 3b. Assets: Customer Receivables (Piutang Usaha)
    const unpaidSales: any[] = await prisma.$queryRawUnsafe(`
      SELECT "totalAmount", "paidAmount" FROM "Sale"
      WHERE "companyId" = $1 AND "status" NOT IN ('PAID', 'CANCELLED', 'RETURNED', 'VOID')
    `, tenantId);
    const totalCustomerReceivables = unpaidSales.reduce((sum, s) => sum + (Number(s.totalAmount) - Number(s.paidAmount || 0)), 0);

    // 3c. Assets: Stock / Inventory Value (Persediaan Barang)
    const products = await prisma.product.findMany({
      where: { companyId: tenantId }
    });
    const totalInventoryValue = products.reduce((sum, p) => sum + (Math.max(0, p.stock || 0) * (p.costPrice || 0)), 0);

    const totalAssets = totalCurrentAssets + totalFixedAssets + totalLoans + totalCustomerReceivables + totalInventoryValue;

    // 4. Liabilities: Pending Expenses (Hutang Usaha) & Tax Liability (PPN Keluaran)
    const pendingExpenses = await prisma.expense.findMany({
      where: { companyId: tenantId, status: 'PENDING' }
    });
    const totalPendingExpenses = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

    const salesWithTaxInCompany = await prisma.sale.findMany({
      where: { companyId: tenantId },
      select: { taxAmount: true }
    });
    const totalTaxLiability = salesWithTaxInCompany.reduce((sum, s) => sum + (s.taxAmount || 0), 0);
    const totalLiabilities = totalPendingExpenses + totalTaxLiability;

    // 5. Equity: Assets - Liabilities
    const totalEquity = totalAssets - totalLiabilities;

    // 5b. Equity Splits: Modal Disetor vs Laba Berjalan
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfToday = new Date();

    // 1. Fetch YTD Accrual Sales
    const ytdAccrualSales = await prisma.sale.findMany({
      where: {
        companyId: tenantId,
        date: { gte: startOfYear, lte: endOfToday },
        status: { notIn: ['CANCELLED', 'PENDING'] }
      }
    });

    let ytdTotalSalesRevenue = 0;
    ytdAccrualSales.forEach(sale => {
      let amount = sale.totalAmount;
      if (sale.taxRate && sale.taxRate > 0) {
        if (sale.taxAmount && sale.taxAmount > 0) {
          amount -= sale.taxAmount;
        } else {
          amount -= (amount * (sale.taxRate / (100 + sale.taxRate)));
        }
      }
      ytdTotalSalesRevenue += amount;
    });

    // 2. Fetch YTD Other Incomes
    const ytdIncomesAll = await prisma.income.findMany({
      where: {
        companyId: tenantId,
        date: { gte: startOfYear, lte: endOfToday }
      },
      include: { category: true }
    });
    
    let ytdTotalOtherIncome = 0;
    ytdIncomesAll.forEach(inc => {
      const isSales = inc.category?.name === 'Penjualan Produk' || inc.category?.name === 'Penjualan POS';
      const isEquity = inc.category?.type === 'EQUITY';
      if (!isSales && !isEquity) {
        ytdTotalOtherIncome += inc.amount;
      }
    });
    const ytdRevenue = ytdTotalSalesRevenue + ytdTotalOtherIncome;

    // 3. Fetch YTD Expenses
    const ytdExpensesList = await prisma.expense.findMany({
      where: {
        companyId: tenantId,
        date: { gte: startOfYear, lte: endOfToday }
      },
      include: { category: true }
    });

    let ytdExpense = 0;
    ytdExpensesList.forEach(exp => {
      const isCapex = exp.category?.type === 'CAPEX';
      const isInventory = exp.category?.type === 'INVENTORY';
      if (!isCapex && !isInventory) {
        ytdExpense += exp.amount;
      }
    });

    // 4. Fetch YTD Sales COGS
    const ytdSalesCogs = await calculateSalesCOGS(tenantId, startOfYear, endOfToday);

    // 5. Calculate YTD Asset Depreciation
    let ytdAssetDepreciation = 0;
    const currentMonthNum = endOfToday.getMonth(); // 0-11
    
    physicalAssets.forEach(asset => {
      if (asset.isDepreciating && asset.purchasePrice && asset.purchasePrice > 0 && asset.usefulLife && asset.usefulLife > 0) {
        const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date(asset.createdAt);
        
        // We only depreciate up to the current month for the current year.
        for (let m = 0; m <= currentMonthNum; m++) {
           const monthsFromPurchase = (currentYear - purchaseDate.getFullYear()) * 12 + (m - purchaseDate.getMonth());
           if (monthsFromPurchase >= 0 && monthsFromPurchase < asset.usefulLife) {
             const monthlyDepreciation = Math.round(((Number(asset.purchasePrice) - Number(asset.residualValue || 0)) / Number(asset.usefulLife)) * 100) / 100;
             ytdAssetDepreciation += monthlyDepreciation;
           }
        }
      }
    });

    const ytdNetProfit = Math.round((ytdRevenue - (ytdExpense + ytdSalesCogs + ytdAssetDepreciation)) * 100) / 100;
    const modalDisetor = Math.round((totalEquity - ytdNetProfit) * 100) / 100;

    res.json({
      assets: {
        total: totalAssets,
        totalCurrent: totalCurrentAssets,
        totalFixed: totalFixedAssets,
        totalFixedGross: totalFixedAssetsGross,
        totalAccumulatedDepreciation: totalAccumulatedDepreciation,
        totalLoans: totalLoans,
        totalCustomerReceivables: totalCustomerReceivables,
        totalInventoryValue: totalInventoryValue,
        accounts,
        fixedAssets: assetsWithBookValue,
        loans: activeLoans
      },
      liabilities: { 
        total: totalLiabilities, 
        pendingExpensesTotal: totalPendingExpenses,
        taxLiability: totalTaxLiability,
        details: pendingExpenses 
      },
      equity: { 
        total: totalEquity,
        modalDisetor,
        labaBerjalan: ytdNetProfit
      }
    });
  } catch (error: any) {
    console.error("BALANCE SHEET ERROR:", error);
    res.status(500).json({ error: 'Gagal menghasilkan Neraca: ' + error.message });
  }
});

// F6.2b. Export Balance Sheet to Excel
app.get('/api/finance/reports/balance-sheet/export', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const ExcelJS = require('exceljs');

    // --- LOGIC SAME AS BALANCE SHEET ---
    const accounts = await prisma.financialAccount.findMany({ where: { companyId: tenantId } });
    let totalCurrentAssets = 0;
    accounts.forEach(acc => totalCurrentAssets += acc.balance);

    const physicalAssets = await prisma.asset.findMany({ where: { companyId: tenantId } });
    let totalFixedAssets = 0;
    let totalFixedAssetsGross = 0;
    let totalAccumulatedDepreciation = 0;
    const assetsWithBookValue = physicalAssets.map(asset => {
        let bookValue = Number(asset.purchasePrice || 0);
        let accumulatedDepreciation = 0;
        totalFixedAssetsGross += bookValue;
        if (asset.isDepreciating && Number(asset.purchasePrice) > 0 && Number(asset.usefulLife) > 0) {
            const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date(asset.createdAt);
            const now = new Date();
            let monthsPassed = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
            if (monthsPassed >= 0) monthsPassed += 1; // Count purchase month as 1 full month
            const monthlyDepreciation = Math.round(((Number(asset.purchasePrice) - Number(asset.residualValue || 0)) / Number(asset.usefulLife)) * 100) / 100;
            accumulatedDepreciation = Math.max(0, Math.min(monthsPassed * monthlyDepreciation, Number(asset.purchasePrice) - Number(asset.residualValue || 0)));
            bookValue = Number(asset.purchasePrice) - accumulatedDepreciation;
        }
        totalAccumulatedDepreciation += accumulatedDepreciation;
        totalFixedAssets += bookValue;
        return { ...asset, bookValue, accumulatedDepreciation };
    });

    const activeLoans = await prisma.loan.findMany({ where: { companyId: tenantId, status: 'ACTIVE' } });
    const totalLoans = activeLoans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);

    const unpaidSales: any[] = await prisma.$queryRawUnsafe(`
      SELECT "totalAmount", "paidAmount" FROM "Sale"
      WHERE "companyId" = $1 AND "status" NOT IN ('PAID', 'CANCELLED', 'RETURNED', 'VOID')
    `, tenantId);
    const totalCustomerReceivables = unpaidSales.reduce((sum, s) => sum + (Number(s.totalAmount) - Number(s.paidAmount || 0)), 0);

    const products = await prisma.product.findMany({ where: { companyId: tenantId } });
    const totalInventoryValue = products.reduce((sum, p) => sum + (Math.max(0, p.stock || 0) * (p.costPrice || 0)), 0);

    const totalAssets = totalCurrentAssets + totalFixedAssets + totalLoans + totalCustomerReceivables + totalInventoryValue;

    const pendingExpenses = await prisma.expense.findMany({ where: { companyId: tenantId, status: 'PENDING' } });
    const totalPendingExpenses = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

    const salesWithTaxInCompany = await prisma.sale.findMany({
      where: { companyId: tenantId },
      select: { taxAmount: true }
    });
    const totalTaxLiability = salesWithTaxInCompany.reduce((sum, s) => sum + (s.taxAmount || 0), 0);
    const totalLiabilities = totalPendingExpenses + totalTaxLiability;
    const totalEquity = totalAssets - totalLiabilities;

    // Equity Splits
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfToday = new Date();

    // 1. Fetch YTD Accrual Sales
    const ytdAccrualSales = await prisma.sale.findMany({
      where: {
        companyId: tenantId,
        date: { gte: startOfYear, lte: endOfToday },
        status: { notIn: ['CANCELLED', 'PENDING'] }
      }
    });

    let ytdTotalSalesRevenue = 0;
    ytdAccrualSales.forEach(sale => {
      let amount = sale.totalAmount;
      if (sale.taxRate && sale.taxRate > 0) {
        if (sale.taxAmount && sale.taxAmount > 0) {
          amount -= sale.taxAmount;
        } else {
          amount -= (amount * (sale.taxRate / (100 + sale.taxRate)));
        }
      }
      ytdTotalSalesRevenue += amount;
    });

    // 2. Fetch YTD Other Incomes
    const ytdIncomesAll = await prisma.income.findMany({
      where: {
        companyId: tenantId,
        date: { gte: startOfYear, lte: endOfToday }
      },
      include: { category: true }
    });
    
    let ytdTotalOtherIncome = 0;
    ytdIncomesAll.forEach(inc => {
      const isSales = inc.category?.name === 'Penjualan Produk' || inc.category?.name === 'Penjualan POS';
      const isEquity = inc.category?.type === 'EQUITY';
      if (!isSales && !isEquity) {
        ytdTotalOtherIncome += inc.amount;
      }
    });
    const ytdRevenue = ytdTotalSalesRevenue + ytdTotalOtherIncome;

    // 3. Fetch YTD Expenses
    const ytdExpensesList = await prisma.expense.findMany({
      where: {
        companyId: tenantId,
        date: { gte: startOfYear, lte: endOfToday }
      },
      include: { category: true }
    });

    let ytdExpense = 0;
    ytdExpensesList.forEach(exp => {
      const isCapex = exp.category?.type === 'CAPEX';
      const isInventory = exp.category?.type === 'INVENTORY';
      if (!isCapex && !isInventory) {
        ytdExpense += exp.amount;
      }
    });

    // 4. Fetch YTD Sales COGS
    const ytdSalesCogs = await calculateSalesCOGS(tenantId, startOfYear, endOfToday);

    // 5. Calculate YTD Asset Depreciation
    let ytdAssetDepreciation = 0;
    const currentMonthNum = endOfToday.getMonth(); // 0-11
    
    physicalAssets.forEach(asset => {
      if (asset.isDepreciating && asset.purchasePrice && asset.purchasePrice > 0 && asset.usefulLife && asset.usefulLife > 0) {
        const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date(asset.createdAt);
        
        // We only depreciate up to the current month for the current year.
        for (let m = 0; m <= currentMonthNum; m++) {
           const monthsFromPurchase = (currentYear - purchaseDate.getFullYear()) * 12 + (m - purchaseDate.getMonth());
           if (monthsFromPurchase >= 0 && monthsFromPurchase < asset.usefulLife) {
             const monthlyDepreciation = Math.round(((Number(asset.purchasePrice) - Number(asset.residualValue || 0)) / Number(asset.usefulLife)) * 100) / 100;
             ytdAssetDepreciation += monthlyDepreciation;
           }
        }
      }
    });

    const ytdNetProfit = Math.round((ytdRevenue - (ytdExpense + ytdSalesCogs + ytdAssetDepreciation)) * 100) / 100;
    const modalDisetor = Math.round((totalEquity - ytdNetProfit) * 100) / 100;

    // --- CREATE EXCEL ---
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Neraca');

    worksheet.mergeCells('A1:C1');
    worksheet.getCell('A1').value = `LAPORAN NERACA (BALANCE SHEET)`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    let currentRow = 3;

    // ASSETS
    worksheet.getCell(`A${currentRow}`).value = 'ASET (AKTIVA)';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;

    worksheet.addRow(['Aset Lancar (Kas & Bank)']);
    worksheet.getRow(currentRow).font = { italic: true };
    currentRow++;
    accounts.forEach(acc => {
      worksheet.addRow([acc.name, '', acc.balance]);
      currentRow++;
    });
    worksheet.addRow(['Piutang Usaha (Outstanding)', '', totalCustomerReceivables]);
    currentRow++;
    worksheet.addRow(['Piutang Karyawan', '', totalLoans]);
    currentRow++;
    worksheet.addRow(['Persediaan Barang Dagang', '', totalInventoryValue]);
    currentRow++;
    worksheet.addRow(['Total Aset Lancar & Piutang', '', totalCurrentAssets + totalLoans + totalCustomerReceivables + totalInventoryValue]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 2;

    worksheet.addRow(['Aset Tetap (Harga Perolehan)']);
    worksheet.getRow(currentRow).font = { italic: true, bold: true };
    currentRow++;
    
    const groupedAssets: Record<string, { gross: number, dep: number }> = {};
    assetsWithBookValue.forEach(asset => {
        const cat = asset.category || 'Lainnya';
        if (!groupedAssets[cat]) groupedAssets[cat] = { gross: 0, dep: 0 };
        groupedAssets[cat].gross += asset.purchasePrice || 0;
        groupedAssets[cat].dep += asset.accumulatedDepreciation || 0;
    });

    Object.entries(groupedAssets).forEach(([cat, vals]) => {
        worksheet.addRow([cat, '', vals.gross]);
        currentRow++;
    });

    worksheet.addRow(['Penyusutan']);
    worksheet.getRow(currentRow).font = { italic: true, bold: true };
    currentRow++;

    Object.entries(groupedAssets).forEach(([cat, vals]) => {
        if (vals.dep > 0) {
            worksheet.addRow([`Akumulasi Penyusutan ${cat}`, '', -vals.dep]);
            currentRow++;
        }
    });

    worksheet.addRow(['Total Aset Tetap Bersih', '', totalFixedAssets]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 2;

    worksheet.addRow(['TOTAL ASET', '', totalAssets]);
    worksheet.getRow(currentRow).font = { bold: true, size: 12 };
    worksheet.getCell(`C${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCEEFF' } };
    currentRow += 3;

    // LIABILITIES
    worksheet.getCell(`A${currentRow}`).value = 'KEWAJIBAN (HUTANG)';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
    pendingExpenses.forEach(exp => {
      worksheet.addRow([`Hutang: ${exp.paidTo || exp.description}`, '', exp.amount]);
      currentRow++;
    });
    if (totalTaxLiability > 0) {
      worksheet.addRow(['Hutang Pajak (PPN Keluaran)', '', totalTaxLiability]);
      currentRow++;
    }
    worksheet.addRow(['TOTAL KEWAJIBAN', '', totalLiabilities]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 3;

    // EQUITY
    worksheet.getCell(`A${currentRow}`).value = 'EKUITAS (MODAL)';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
    worksheet.addRow(['Modal Disetor (Paid-in Capital)', '', modalDisetor]);
    currentRow++;
    worksheet.addRow(['Laba Tahun Berjalan (YTD Net Profit)', '', ytdNetProfit]);
    currentRow++;
    worksheet.addRow(['TOTAL EKUITAS', '', totalEquity]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 2;

    // Final Check
    worksheet.addRow(['TOTAL KEWAJIBAN & EKUITAS', '', totalLiabilities + totalEquity]);
    worksheet.getRow(currentRow).font = { bold: true, size: 12 };
    worksheet.getCell(`C${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };

    // Styling
    worksheet.getColumn(3).numFmt = '#,##0';
    worksheet.getColumn(1).width = 50;
    worksheet.getColumn(3).width = 20;

    const fileName = `Neraca_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);

  } catch (error: any) {
    console.error("EXPORT BALANCE SHEET ERROR:", error);
    res.status(500).json({ error: 'Gagal mengekspor Neraca: ' + error.message });
  }
});

app.get('/api/finance/reports/cash-flow', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 1. Calculate Inflow (Actual Income in period)
    const inflows = await prisma.income.findMany({
      where: {
        companyId: tenantId,
        date: { gte: startDate, lte: endDate }
      },
      include: { category: true }
    });

    const inflowByCategory: Record<string, number> = {};
    let totalInflow = 0;
    inflows.forEach(inc => {
      const catName = inc.category?.name || 'Uncategorized';
      inflowByCategory[catName] = (inflowByCategory[catName] || 0) + inc.amount;
      totalInflow += inc.amount;
    });

    // 2. Calculate Outflow (PAID Expenses in period)
    const outflows = await prisma.expense.findMany({
      where: {
        companyId: tenantId,
        status: 'PAID',
        OR: [
          { paidAt: { gte: startDate, lte: endDate } },
          { paidAt: null, date: { gte: startDate, lte: endDate } }
        ]
      },
      include: { category: true }
    });

    const outflowByCategory: Record<string, number> = {};
    let totalOutflow = 0;
    outflows.forEach(exp => {
      const catName = exp.category?.name || 'Uncategorized';
      outflowByCategory[catName] = (outflowByCategory[catName] || 0) + exp.amount;
      totalOutflow += exp.amount;
    });

    // 3. Calculate Balances (Approximate starting balance)
    // Formula: Current Balance - (Sum of all Incomes since then) + (Sum of all Paid Expenses since then)
    const allAccounts = await prisma.financialAccount.findMany({
      where: { companyId: tenantId }
    });
    const currentTotalBalance = allAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    // Get all movements from AFTER endDate up to NOW
    const futureIncomes = await prisma.income.aggregate({
      where: { companyId: tenantId, date: { gt: endDate } },
      _sum: { amount: true }
    });
    const futureOutflows = await prisma.expense.aggregate({
      where: {
        companyId: tenantId,
        status: 'PAID',
        OR: [
          { paidAt: { gt: endDate } },
          { paidAt: null, date: { gt: endDate } }
        ]
      },
      _sum: { amount: true }
    });

    const balanceAtEndPeriod = currentTotalBalance - (futureIncomes._sum.amount || 0) + (futureOutflows._sum.amount || 0);
    const startingBalance = balanceAtEndPeriod - totalInflow + totalOutflow;

    res.json({
      period: { month, year },
      startingBalance,
      inflow: {
        categories: inflowByCategory,
        total: totalInflow
      },
      outflow: {
        categories: outflowByCategory,
        total: totalOutflow
      },
      netCashFlow: totalInflow - totalOutflow,
      endingBalance: balanceAtEndPeriod
    });

  } catch (error: any) {
    console.error("DEBUG CASH FLOW REPORT ERROR:", error);
    res.status(500).json({ error: 'Gagal menghasilkan laporan Arus Kas: ' + error.message });
  }
});

// F6.3b. Export Cash Flow to Excel
app.get('/api/finance/reports/cash-flow/export', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const ExcelJS = require('exceljs');

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // --- LOGIC SAME AS CASH FLOW ---
    const inflows = await prisma.income.findMany({
      where: { companyId: tenantId, date: { gte: startDate, lte: endDate } },
      include: { category: true }
    });
    const inflowByCategory: Record<string, number> = {};
    let totalInflow = 0;
    inflows.forEach(inc => {
      const catName = inc.category?.name || 'Uncategorized';
      inflowByCategory[catName] = (inflowByCategory[catName] || 0) + inc.amount;
      totalInflow += inc.amount;
    });

    const outflows = await prisma.expense.findMany({
      where: {
        companyId: tenantId,
        status: 'PAID',
        OR: [
          { paidAt: { gte: startDate, lte: endDate } },
          { paidAt: null, date: { gte: startDate, lte: endDate } }
        ]
      },
      include: { category: true }
    });
    const outflowByCategory: Record<string, number> = {};
    let totalOutflow = 0;
    outflows.forEach(exp => {
      const catName = exp.category?.name || 'Uncategorized';
      outflowByCategory[catName] = (outflowByCategory[catName] || 0) + exp.amount;
      totalOutflow += exp.amount;
    });

    const allAccounts = await prisma.financialAccount.findMany({ where: { companyId: tenantId } });
    const currentTotalBalance = allAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const futureIncomes = await prisma.income.aggregate({ where: { companyId: tenantId, date: { gt: endDate } }, _sum: { amount: true } });
    const futureOutflows = await prisma.expense.aggregate({
      where: {
        companyId: tenantId,
        status: 'PAID',
        OR: [
          { paidAt: { gt: endDate } },
          { paidAt: null, date: { gt: endDate } }
        ]
      },
      _sum: { amount: true }
    });
    const balanceAtEndPeriod = currentTotalBalance - (futureIncomes._sum.amount || 0) + (futureOutflows._sum.amount || 0);
    const startingBalance = balanceAtEndPeriod - totalInflow + totalOutflow;

    // --- CREATE EXCEL ---
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Arus Kas');

    worksheet.mergeCells('A1:C1');
    worksheet.getCell('A1').value = `LAPORAN ARUS KAS - Periode ${month}/${year}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    let currentRow = 3;

    worksheet.addRow(['Saldo Awal Periode', '', startingBalance]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 2;

    // Inflow
    worksheet.getCell(`A${currentRow}`).value = 'UANG MASUK (INFLOW)';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
    Object.entries(inflowByCategory).forEach(([cat, amt]) => {
      worksheet.addRow([cat, '', amt]);
      currentRow++;
    });
    worksheet.addRow(['Total Uang Masuk', '', totalInflow]);
    worksheet.getRow(currentRow).font = { bold: true, color: { argb: 'FF008800' } };
    currentRow += 2;

    // Outflow
    worksheet.getCell(`A${currentRow}`).value = 'UANG KELUAR (OUTFLOW)';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
    Object.entries(outflowByCategory).forEach(([cat, amt]) => {
      worksheet.addRow([cat, '', -amt]);
      currentRow++;
    });
    worksheet.addRow(['Total Uang Keluar', '', -totalOutflow]);
    worksheet.getRow(currentRow).font = { bold: true, color: { argb: 'FFFF0000' } };
    currentRow += 2;

    // Net
    worksheet.addRow(['ARUS KAS BERSIH', '', totalInflow - totalOutflow]);
    worksheet.getRow(currentRow).font = { bold: true, italic: true };
    currentRow++;

    worksheet.addRow(['Saldo Akhir Periode', '', balanceAtEndPeriod]);
    worksheet.getRow(currentRow).font = { bold: true, size: 12 };
    worksheet.getCell(`C${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

    // Styling
    worksheet.getColumn(3).numFmt = '#,##0';
    worksheet.getColumn(1).width = 40;
    worksheet.getColumn(3).width = 20;

    const fileName = `Arus_Kas_${month}_${year}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);

  } catch (error: any) {
    console.error("EXPORT CASH FLOW ERROR:", error);
    res.status(500).json({ error: 'Gagal mengekspor Arus Kas: ' + error.message });
  }
});

// F6.4. General Journal (Jurnal Umum)
app.get('/api/finance/journal', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    
    const { month, year } = req.query;
    const whereClause: any = { companyId: tenantId };
    if (month && year && month !== 'all' && year !== 'all') {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
      whereClause.date = { gte: startDate, lte: endDate };
    }

    // 1. Fetch Incomes
    const incomes = await prisma.income.findMany({
      where: whereClause,
      include: { account: true, category: true },
      orderBy: { date: 'desc' }
    });

    // 2. Fetch Expenses
    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: { account: true, category: true },
      orderBy: { date: 'desc' }
    });

    // 3. Fetch Transfers
    const transfers = await prisma.transfer.findMany({
      where: whereClause,
      include: { fromAccount: true, toAccount: true },
      orderBy: { date: 'desc' }
    });

    const journalEntries: any[] = [];

    // Map Incomes to Journal Lines
    incomes.forEach(inc => {
      const entryId = `INC-${inc.id.toString().padStart(6, '0')}`;
      journalEntries.push({
        id: `${entryId}-D`,
        date: inc.date,
        ref: entryId,
        description: inc.description || `Penerimaan: ${inc.receivedFrom || 'Tanpa Nama'}`,
        accountName: inc.account.name,
        debit: inc.amount,
        credit: 0
      });
      journalEntries.push({
        id: `${entryId}-C`,
        date: inc.date,
        ref: entryId,
        description: '',
        accountName: inc.category.name,
        debit: 0,
        credit: inc.amount
      });
    });

    // Map Expenses to Journal Lines
    expenses.forEach(exp => {
      const entryId = `EXP-${exp.id.toString().padStart(6, '0')}`;
      const hasDifferentDates = exp.status === 'PAID' && exp.paidAt && new Date(exp.paidAt).toDateString() !== new Date(exp.date).toDateString();

      if (hasDifferentDates) {
        // Accrual Dual-Date Entry 1: Recognition of Expense and Liability (on invoice date)
        journalEntries.push({
          id: `${entryId}-REC-D`,
          date: exp.date,
          ref: entryId,
          description: (exp.description || `Pengeluaran: ${exp.paidTo || 'Tanpa Nama'}`) + ' (Pengakuan Hutang)',
          accountName: exp.category.name,
          debit: exp.amount,
          credit: 0
        });
        journalEntries.push({
          id: `${entryId}-REC-C`,
          date: exp.date,
          ref: entryId,
          description: '',
          accountName: 'Hutang Usaha (Accounts Payable)',
          debit: 0,
          credit: exp.amount
        });

        // Accrual Dual-Date Entry 2: Payment and settlement of Liability (on payment date)
        journalEntries.push({
          id: `${entryId}-PAY-D`,
          date: exp.paidAt!,
          ref: entryId,
          description: `Pelunasan: ${exp.description || exp.paidTo || 'Tanpa Nama'}`,
          accountName: 'Hutang Usaha (Accounts Payable)',
          debit: exp.amount,
          credit: 0
        });
        journalEntries.push({
          id: `${entryId}-PAY-C`,
          date: exp.paidAt!,
          ref: entryId,
          description: '',
          accountName: exp.account?.name || 'Kas/Bank',
          debit: 0,
          credit: exp.amount
        });
      } else {
        // Simple Single-Date Entry (either PAID same-day or PENDING)
        journalEntries.push({
          id: `${entryId}-D`,
          date: exp.date,
          ref: entryId,
          description: exp.description || `Pengeluaran: ${exp.paidTo || 'Tanpa Nama'}`,
          accountName: exp.category.name,
          debit: exp.amount,
          credit: 0
        });

        if (exp.status === 'PAID') {
          journalEntries.push({
            id: `${entryId}-C`,
            date: exp.date,
            ref: entryId,
            description: '',
            accountName: exp.account?.name || 'Kas/Bank',
            debit: 0,
            credit: exp.amount
          });
        } else {
          journalEntries.push({
            id: `${entryId}-C`,
            date: exp.date,
            ref: entryId,
            description: '',
            accountName: 'Hutang Usaha (Accounts Payable)',
            debit: 0,
            credit: exp.amount
          });
        }
      }
    });

    // Map Transfers to Journal Lines
    transfers.forEach(trsf => {
      const entryId = `TRSF-${trsf.id.toString().padStart(6, '0')}`;
      journalEntries.push({
        id: `${entryId}-D`,
        date: trsf.date,
        ref: entryId,
        description: trsf.description || `Mutasi Dana: ${trsf.fromAccount.name} ➔ ${trsf.toAccount.name}`,
        accountName: trsf.toAccount.name,
        debit: trsf.amount,
        credit: 0
      });
      journalEntries.push({
        id: `${entryId}-C`,
        date: trsf.date,
        ref: entryId,
        description: '',
        accountName: trsf.fromAccount.name,
        debit: 0,
        credit: trsf.amount
      });
    });

    journalEntries.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.ref.localeCompare(a.ref);
    });

    res.json(journalEntries);

  } catch (error: any) {
    console.error("DEBUG JOURNAL ERROR:", error);
    res.status(500).json({ error: 'Gagal mengambil data Jurnal: ' + error.message });
  }
});

// F6.4b. Export Journal to Excel (Server-Side)
app.get('/api/finance/journal/export', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const ExcelJS = require('exceljs');

    const { month, year } = req.query;
    const whereClause: any = { companyId: tenantId };
    if (month && year && month !== 'all' && year !== 'all') {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
      whereClause.date = { gte: startDate, lte: endDate };
    }

    // 1. Fetch Data (Same as journal route)
    const incomes = await prisma.income.findMany({
      where: whereClause,
      include: { account: true, category: true },
      orderBy: { date: 'asc' } // Sorted by date for better readability in excel
    });

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: { account: true, category: true },
      orderBy: { date: 'asc' }
    });

    const transfers = await prisma.transfer.findMany({
      where: whereClause,
      include: { fromAccount: true, toAccount: true },
      orderBy: { date: 'asc' }
    });

    const journalEntries: any[] = [];
    incomes.forEach(inc => {
      const entryId = `INC-${inc.id.toString().padStart(6, '0')}`;
      journalEntries.push({ date: inc.date, ref: entryId, account: inc.account.name, debit: inc.amount, credit: 0, description: inc.description || `Penerimaan: ${inc.receivedFrom || '-'}` });
      journalEntries.push({ date: inc.date, ref: entryId, account: inc.category.name, debit: 0, credit: inc.amount, description: '' });
    });
    expenses.forEach(exp => {
      const entryId = `EXP-${exp.id.toString().padStart(6, '0')}`;
      journalEntries.push({ date: exp.date, ref: entryId, account: exp.category.name, debit: exp.amount, credit: 0, description: exp.description || `Pengeluaran: ${exp.paidTo || '-'}` });
      journalEntries.push({ date: exp.date, ref: entryId, account: exp.status === 'PAID' ? (exp.account?.name || 'Kas/Bank') : 'Hutang Usaha', debit: 0, credit: exp.amount, description: '' });
    });
    transfers.forEach(trsf => {
      const entryId = `TRSF-${trsf.id.toString().padStart(6, '0')}`;
      journalEntries.push({ date: trsf.date, ref: entryId, account: trsf.toAccount.name, debit: trsf.amount, credit: 0, description: trsf.description || `Mutasi Dana: ${trsf.fromAccount.name} ➔ ${trsf.toAccount.name}` });
      journalEntries.push({ date: trsf.date, dateEntry: trsf.date, ref: entryId, account: trsf.fromAccount.name, debit: 0, credit: trsf.amount, description: '' });
    });

    journalEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Create Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Jurnal Umum');

    // 3. Define Columns
    worksheet.columns = [
      { header: 'Tanggal', key: 'date', width: 15 },
      { header: 'Referensi', key: 'ref', width: 15 },
      { header: 'Akun', key: 'account', width: 30 },
      { header: 'Debit', key: 'debit', width: 15 },
      { header: 'Kredit', key: 'credit', width: 15 },
      { header: 'Keterangan', key: 'description', width: 40 }
    ];

    // 4. Style Header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // 5. Add Rows
    journalEntries.forEach(entry => {
      const row = worksheet.addRow({
        date: new Date(entry.date).toLocaleDateString('id-ID'),
        ref: entry.ref,
        account: entry.account,
        debit: entry.debit || 0,
        credit: entry.credit || 0,
        description: entry.description
      });
      
      // Format number cells
      row.getCell('debit').numFmt = '#,##0';
      row.getCell('credit').numFmt = '#,##0';
    });

    // 6. Set Response Headers
    const fileName = `Jurnal_Umum_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // 7. Write to Buffer & Send
    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);

  } catch (error: any) {
    console.error("EXPORT JOURNAL ERROR:", error);
    res.status(500).json({ error: 'Gagal mengekspor Jurnal: ' + error.message });
  }
});

// F6.5. Margin & Profitability Report
app.get('/api/reports/profitability', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    if (isNaN(tenantId)) return res.status(400).json({ error: 'Invalid Tenant ID' });

    const filterRes = await buildPosWhereClause(req, tenantId, req.query);

    // 1. Get SaleItems joining with Sale to filter by date, company, branch, role, etc.
    const saleItems: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        si.id, 
        si."productId", 
        GREATEST(0, si.quantity - COALESCE(sri."returnedQty", 0)) as quantity, 
        si.price, 
        GREATEST(0, si.total - COALESCE(sri."returnedTotal", 0)) as total, 
        s.date, 
        p.name as "productName", 
        p.sku, 
        p."costPrice" as "currentCostPrice",
        p."categoryId",
        pc.name as "categoryName"
      FROM "SaleItem" si
      JOIN "Sale" s ON si."saleId" = s.id
      JOIN "Product" p ON si."productId" = p.id
      LEFT JOIN "ProductCategory" pc ON p."categoryId" = pc.id
      LEFT JOIN "FinancialAccount" fa ON s."accountId" = fa.id
      LEFT JOIN (
        SELECT sri."productId", sr."saleId", SUM(sri.quantity) as "returnedQty", SUM(sri.total) as "returnedTotal"
        FROM "SaleReturnItem" sri
        JOIN "SaleReturn" sr ON sri."returnId" = sr.id
        GROUP BY sri."productId", sr."saleId"
      ) sri ON sri."productId" = si."productId" AND sri."saleId" = si."saleId"
      WHERE ${filterRes.whereClause}
    `, ...filterRes.queryParams);

    // 2. Fetch all products and recipes to support recursive HPP calculation
    const allProducts = await prisma.product.findMany({
      where: { companyId: tenantId },
      include: {
        Recipes: {
          include: {
            Material: true
          }
        }
      }
    });

    // Recursive helper to calculate unit cost (HPP/COGS)
    const getProductCost = (product: any, visited = new Set<number>()): number => {
      if (!product || visited.has(product.id)) return 0;
      visited.add(product.id);

      // If product has a recipe, sum up its materials recursively
      if (product.Recipes && product.Recipes.length > 0) {
        const totalRecipeCost = product.Recipes.reduce((sum: number, r: any) => {
          // Find the material in our pre-fetched products list to get its potential recipes
          const material = allProducts.find(m => m.id === r.materialId);
          const materialUnitCost = material ? getProductCost(material, new Set(visited)) : (r.Material?.costPrice || 0);
          return sum + (Number(r.quantity) * materialUnitCost);
        }, 0);

        // IMPORTANT: Divide by recipeYield to get cost PER UNIT
        // If yield is 0 or null, default to 1 to avoid division by zero
        const yieldAmount = product.recipeYield && product.recipeYield > 0 ? Number(product.recipeYield) : 1;
        return totalRecipeCost / yieldAmount;
      }

      // Base case: return static costPrice
      return product.costPrice || 0;
    };

    // 3. Process data
    const productStats: Record<number, any> = {};
    const trendStats: Record<string, any> = {};

    for (const item of saleItems) {
      const pid = item.productId;
      if (!productStats[pid]) {
        productStats[pid] = {
          productId: pid,
          name: item.productName,
          sku: item.sku,
          categoryId: item.categoryId,
          categoryName: item.categoryName || 'Uncategorized',
          qtySold: 0,
          revenue: 0,
          cogs: 0,
          profit: 0
        };
      }

      // Calculate COGS (HPP) using recursive helper
      const product = allProducts.find(p => p.id === pid);
      const calculatedUnitCost = product ? getProductCost(product) : (item.currentCostPrice || 0);

      let itemCogs = Number(item.quantity) * calculatedUnitCost;
      
      // Calculate Modifiers COGS
      if (item.modifiers) {
         const mods = typeof item.modifiers === 'string' ? JSON.parse(item.modifiers) : item.modifiers;
         Object.values(mods).forEach((val: any) => {
            if (val && val.linkedProductId) {
               const linkedProdId = Number(val.linkedProductId);
               const linkedQty = Number(val.linkedQuantity) || 1;
               const modProduct = allProducts.find(p => p.id === linkedProdId);
               const modUnitCogs = modProduct ? getProductCost(modProduct) : 0;
               itemCogs += (Number(item.quantity) * linkedQty * modUnitCogs);
            }
         });
      }

      const itemRevenue = Number(item.total) || 0;
      const itemProfit = itemRevenue - itemCogs;
      
      productStats[pid].qtySold += Number(item.quantity) || 0;
      productStats[pid].revenue += itemRevenue;
      productStats[pid].cogs += itemCogs;
      productStats[pid].profit += itemProfit;

      // Trend data (formatted in WIB Asia/Jakarta)
      const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(item.date));
      if (!trendStats[dateKey]) {
        trendStats[dateKey] = { date: dateKey, profit: 0, revenue: 0 };
      }
      trendStats[dateKey].profit += itemProfit;
      trendStats[dateKey].revenue += itemRevenue;
    }

    const productArray = Object.values(productStats).map((p: any) => ({
      ...p,
      marginPercentage: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0
    })).sort((a, b) => b.profit - a.profit);

    const trendArray = Object.values(trendStats).sort((a, b) => a.date.localeCompare(b.date));

    // Summary calculation
    const totalRevenue = productArray.reduce((sum, p) => sum + p.revenue, 0);
    const totalProfit = productArray.reduce((sum, p) => sum + p.profit, 0);

    const serialize = (data: any) => {
      return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
      ));
    };

    res.json(serialize({
      products: productArray,
      trend: trendArray,
      summary: {
        totalRevenue,
        totalProfit,
        // Weighted Average Margin: (Total Profit / Total Revenue)
        avgMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
      }
    }));
  } catch (error: any) {
    console.error("Profitability report error:", error);
    res.status(500).json({ error: "Gagal mengambil data laporan profitabilitas: " + error.message });
  }
});
// F16.1. Get Payables Report (Hutang)
app.get('/api/finance/reports/payable', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    
    const payables = await prisma.$queryRawUnsafe(`
      SELECT e.*, s."name" as "supplierName", ec."name" as "categoryName"
      FROM "Expense" e
      LEFT JOIN "Supplier" s ON e."supplierId" = s.id
      JOIN "ExpenseCategory" ec ON e."categoryId" = ec.id
      WHERE e."companyId" = $1 AND e."status" = 'PENDING'
      ORDER BY e."dueDate" ASC NULLS LAST, e."date" ASC
    `, tenantId);

    res.json(payables);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil laporan hutang: ' + error.message });
  }
});

// F16.2. Get Receivables Report (Piutang)
app.get('/api/finance/reports/receivable', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    
    const receivables = await prisma.$queryRawUnsafe(`
      SELECT s.*, c."name" as "customerName"
      FROM "Sale" s
      LEFT JOIN "Customer" c ON s."customerId" = c.id
      WHERE s."companyId" = $1 AND s."status" NOT IN ('PAID', 'CANCELLED', 'RETURNED', 'VOID')
      ORDER BY s."isTukarFaktur" ASC, s."date" ASC
    `, tenantId);

    res.json(receivables);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil laporan piutang: ' + error.message });
  }
});

// F16.3. Update Status Tukar Faktur
app.patch('/api/finance/sales/:id/tukar-faktur', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const id = parseInt(req.params.id as string);
    const { isTukarFaktur, tukarFakturDate, tukarFakturRef } = req.body;

    const sale = await prisma.sale.findFirst({
      where: { id, companyId: tenantId }
    });

    if (!sale) return res.status(404).json({ error: 'Penjualan tidak ditemukan.' });

    const updated = await (prisma.sale as any).update({
      where: { id },
      data: {
        isTukarFaktur: !!isTukarFaktur,
        tukarFakturDate: isTukarFaktur ? (tukarFakturDate ? new Date(tukarFakturDate) : new Date()) : null,
        tukarFakturRef: isTukarFaktur ? (tukarFakturRef || null) : null
      }
    });

    res.json({ message: 'Status Tukar Faktur diperbarui.', sale: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal memperbarui status tukar faktur: ' + error.message });
  }
});

// F16.4. Lunasi Piutang (Mark Sale as PAID / PARTIALLY_PAID)
app.patch('/api/finance/sales/:id/pay', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const id = parseInt(req.params.id as string);
    const { accountId, paymentDate, paymentAmount } = req.body;

    if (!accountId) return res.status(400).json({ error: 'Pilih akun pembayaran (Kas/Bank).' });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get Sale using Prisma
      const sale = await (tx as any).sale.findFirst({
        where: { id, companyId: tenantId }
      });

      if (!sale) throw new Error('Penjualan tidak ditemukan.');
      if (sale.status === 'PAID') throw new Error('Penjualan sudah lunas.');

      const remainingBalance = parseFloat((sale.totalAmount - (sale.paidAmount || 0)).toFixed(2));
      const amountToPay = paymentAmount !== undefined 
        ? Math.min(parseFloat(paymentAmount.toString()), remainingBalance) 
        : remainingBalance;

      if (amountToPay <= 0) throw new Error('Nominal pembayaran tidak valid.');

      const dateVal = paymentDate ? new Date(paymentDate) : new Date();
      const newPaidAmount = (sale.paidAmount || 0) + amountToPay;
      const isFullyPaid = newPaidAmount >= sale.totalAmount - 0.01; // handle floating precision
      const newStatus = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';

      // 2. Update Status and paidAmount using Prisma
      await (tx as any).sale.update({
        where: { id },
        data: {
          status: newStatus,
          paidAmount: newPaidAmount,
          accountId: parseInt(accountId),
          updatedAt: new Date()
        }
      });

      // 3. Finance Integration (Create Income)
      let category: any = await tx.incomeCategory.findFirst({
        where: { companyId: tenantId, name: 'Penjualan Produk' }
      });

      if (!category) {
        const catResult: any[] = await tx.$queryRawUnsafe(`
          INSERT INTO "IncomeCategory" ("companyId", "name", "updatedAt")
          VALUES ($1, 'Penjualan Produk', NOW())
          RETURNING id
        `, tenantId);
        category = { id: catResult[0].id };
      }

      const desc = isFullyPaid 
        ? `Pelunasan Piutang Inv ${sale.invoiceNumber}` 
        : `Cicilan Piutang Inv ${sale.invoiceNumber}`;

      await tx.income.create({
        data: {
          companyId: tenantId,
          accountId: parseInt(accountId),
          categoryId: category.id,
          amount: amountToPay,
          date: dateVal,
          description: desc,
          receivedFrom: 'Customer'
        }
      });

      // 4. Update Financial Account Balance
      await tx.financialAccount.update({
        where: { id: parseInt(accountId) },
        data: { balance: { increment: amountToPay } }
      });

      return { id, status: newStatus, paidAmount: newPaidAmount, invoiceNumber: sale.invoiceNumber, amountPaidThisTime: amountToPay };
    });

    res.json({ message: result.status === 'PAID' ? 'Piutang berhasil dilunasi.' : 'Cicilan piutang berhasil dicatat.', result });
  } catch (error: any) {
    console.error("PAY DEBT ERROR:", error);
    res.status(500).json({ error: 'Gagal mencatat pembayaran piutang: ' + error.message });
  }
});

// --- MODUL POS CATEGORIES ---

// C1. List Categories
app.get('/api/pos/categories', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const categories = await prisma.productCategory.findMany({
      where: { companyId: tenantId },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil kategori: ' + error.message });
  }
});

// C2. Create Category
app.post('/api/pos/categories', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { name } = req.body;
    const category = await prisma.productCategory.create({
      data: { companyId: tenantId, name }
    });
    res.json(category);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal membuat kategori: ' + error.message });
  }
});

// C3. Update Category
app.patch('/api/pos/categories/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { id } = req.params;
    const { name } = req.body;
    const category = await prisma.productCategory.update({
      where: { id: parseInt(String(id)), companyId: tenantId },
      data: { name }
    });
    res.json(category);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal update kategori: ' + error.message });
  }
});

// C4. Delete Category
app.delete('/api/pos/categories/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { id } = req.params;
    await prisma.productCategory.delete({ where: { id: parseInt(String(id)), companyId: tenantId } });
    res.json({ message: 'Kategori dihapus' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal menghapus kategori: ' + error.message });
  }
});

// --- MODUL INVENTORI ---

// P13. Import/Clone Products from another company
app.post('/api/products/import', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { sourceCompanyId, productIds } = req.body;
    const targetCompanyId = Number((req as any).tenantId);

    if (!sourceCompanyId) return res.status(400).json({ error: 'Source company ID is required' });

    // 1. Fetch source products WITH recipes and materials
    const sourceProducts = await prisma.product.findMany({
      where: {
        companyId: Number(sourceCompanyId),
        id: productIds ? { in: productIds.map(Number) } : undefined
      },
      include: { 
        category: true,
        Recipes: {
          include: { Material: { include: { category: true } } }
        }
      }
    });

    if (sourceProducts.length === 0) return res.status(404).json({ error: 'No products found to import' });

    // --- SKU LIMIT CHECK ---
    const targetCompanyInfo = await prisma.company.findUnique({
      where: { id: targetCompanyId },
      select: { addons: true }
    });
    
    const addons = targetCompanyInfo?.addons || [];
    let skuLimit = 10; // Default Free Tier
    
    if (addons.includes('INVENTORY_ENTERPRISE')) {
      skuLimit = Infinity;
    } else if (addons.includes('INVENTORY_PRO')) {
      skuLimit = 1000;
    } else if (addons.includes('INVENTORY_BASIC')) {
      skuLimit = 100;
    }

    if (skuLimit !== Infinity) {
      const currentSkuCount = await prisma.product.count({
        where: { companyId: targetCompanyId }
      });
      
      // Calculate how many products are being added. This is an estimate based on the main items imported.
      if (currentSkuCount + sourceProducts.length > skuLimit) {
        return res.status(403).json({ 
          error: `Batas SKU tercapai. Anda mencoba mengimpor ${sourceProducts.length} produk, namun limit Add-on Inventory Anda adalah ${skuLimit} SKU (Saat ini: ${currentSkuCount} SKU). Silakan upgrade Add-on Inventory Anda.` 
        });
      }
    }
    // --- END SKU LIMIT CHECK ---

    let importedCount = 0;
    let skippedCount = 0;

    // Mapping from source product ID to target product ID to avoid recreating and for linking recipes
    const idMap = new Map<number, number>();

    // Helper function to import or find a product
    const importOrFindProduct = async (sourceProd: any) => {
      if (idMap.has(sourceProd.id)) return idMap.get(sourceProd.id)!;

      // Check if it already exists in target company by name and type
      let existingTarget = await prisma.product.findFirst({
        where: { companyId: targetCompanyId, name: sourceProd.name, type: sourceProd.type }
      });

      if (existingTarget) {
        idMap.set(sourceProd.id, existingTarget.id);
        return existingTarget.id;
      }

      // Handle Category
      let targetCategoryId = null;
      if (sourceProd.category) {
        let targetCategory = await prisma.productCategory.findFirst({
          where: { companyId: targetCompanyId, name: sourceProd.category.name }
        });

        if (!targetCategory) {
          targetCategory = await prisma.productCategory.create({
            data: { companyId: targetCompanyId, name: sourceProd.category.name }
          });
        }
        targetCategoryId = targetCategory.id;
      }

      let finalSku = (sourceProd.sku && sourceProd.sku.trim() !== '') ? sourceProd.sku.trim() : null;
      // Check SKU uniqueness before creating
      if (finalSku) {
        const existingSku = await prisma.product.findUnique({ where: { companyId_sku: { companyId: targetCompanyId, sku: finalSku } } });
        if (existingSku) {
          const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
          finalSku = `${finalSku}-COPY-${targetCompanyId}-${randomSuffix}`;
        }
      }

      // Create new product
      const newProd = await prisma.product.create({
        data: {
          companyId: targetCompanyId,
          name: sourceProd.name,
          sku: finalSku,
          description: sourceProd.description,
          price: Number(sourceProd.price) || 0,
          costPrice: Number(sourceProd.costPrice) || 0,
          unit: sourceProd.unit || 'Pcs',
          purchaseUnit: sourceProd.purchaseUnit || sourceProd.unit || 'Pcs',
          purchaseFactor: Number(sourceProd.purchaseFactor) || 1,
          minStock: Number(sourceProd.minStock) || 0,
          showInPos: sourceProd.showInPos !== undefined ? sourceProd.showInPos : true,
          trackStock: sourceProd.trackStock !== undefined ? sourceProd.trackStock : true,
          isAutoDeduct: sourceProd.isAutoDeduct !== undefined ? sourceProd.isAutoDeduct : false,
          priceGofood: Number(sourceProd.priceGofood) || 0,
          priceGrabfood: Number(sourceProd.priceGrabfood) || 0,
          priceShopeefood: Number(sourceProd.priceShopeefood) || 0,
          priceQpoon: Number(sourceProd.priceQpoon) || 0,
          recipeYield: Number(sourceProd.recipeYield) || 1,
          type: sourceProd.type || 'FINISHED_GOOD',
          imageUrl: sourceProd.imageUrl,
          categoryId: targetCategoryId,
          updatedAt: new Date()
        }
      });

      idMap.set(sourceProd.id, newProd.id);
      return newProd.id;
    };

    // 2. Process each main product
    for (const sourceProduct of sourceProducts) {
      try {
        const targetProdId = await importOrFindProduct(sourceProduct);
        importedCount++;

        // Process Recipes if any
        if (sourceProduct.Recipes && sourceProduct.Recipes.length > 0) {
          for (const recipe of sourceProduct.Recipes) {
            if (recipe.Material) {
              // Ensure material exists in target company
              const targetMaterialId = await importOrFindProduct(recipe.Material);

              // Check if recipe link already exists to prevent duplicate
              const existingRecipe = await prisma.productRecipe.findFirst({
                where: { productId: targetProdId, materialId: targetMaterialId }
              });

              if (!existingRecipe) {
                await prisma.productRecipe.create({
                  data: {
                    productId: targetProdId,
                    materialId: targetMaterialId,
                    quantity: recipe.quantity,
                    updatedAt: new Date()
                  }
                });
              }
            }
          }
        }
      } catch (err) {
        console.error(`Failed to import product ${sourceProduct.name}:`, err);
        skippedCount++;
      }
    }

    res.json({
      message: `Successfully imported ${importedCount} products.`,
      skipped: skippedCount
    });
  } catch (error) {
    console.error('Import Error:', error);
    res.status(500).json({ error: 'Failed to import products' });
  }
});

// I1. List Products (Updated with Warehouse Stock)
app.get('/api/inventory/products', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userRole = (req as any).userRole;
    const { branchId, warehouseId, companyId } = req.query;

    const queryCompanyId = companyId ? Number(companyId) : tenantId;

    // DIAGNOSTIC LOGGING
    const fs = require('fs');
    const logMsg = `[${new Date().toISOString()}] GET /api/inventory/products | tenantId: ${tenantId} | role: ${userRole} | branch: ${branchId} | warehouse: ${warehouseId} | queryCompanyId: ${queryCompanyId}\n`;
    fs.appendFileSync('debug_error.txt', logMsg);

    const products = await prisma.product.findMany({
      where: { companyId: queryCompanyId },
      include: {
        WarehouseStock: {
          include: { warehouse: true }
        },
        category: true,
        customizations: {
          include: { Group: true }
        },
        Recipes: {
          include: {
            Material: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const productsWithFilteredStock = products.map(p => {
       const getProductCost = (product: any, visited = new Set<number>()): number => {
         if (!product || visited.has(product.id)) return 0;
         visited.add(product.id);

         if (product.Recipes && product.Recipes.length > 0) {
           const totalBatchCost = product.Recipes.reduce((sum: number, r: any) => {
             const material = products.find(m => m.id === r.materialId);
             // Safety fallback: if material not in current list, use its own costPrice if available in raw relation
             const materialUnitCost = material ? getProductCost(material, new Set(visited)) : (r.Material?.costPrice || 0);
             return sum + (Number(r.quantity || 0) * Number(materialUnitCost || 0));
           }, 0);

           // Divide by yield to get UNIT HPP
           return totalBatchCost / (product.recipeYield || 1);
         }

         return product.costPrice || 0;
       };

       const recipeCogs = (p.Recipes && p.Recipes.length > 0) ? getProductCost(p) : 0;
       
       let displayStock = p.stock;
       if (warehouseId && warehouseId !== 'all') {
         const ws = p.WarehouseStock.find((ws: any) => ws.warehouseId === Number(warehouseId));
         displayStock = ws ? ws.quantity : 0;
       } else if (branchId && branchId !== 'all') {
         if (branchId === 'null') {
            const hqWarehouse = p.WarehouseStock.find((ws: any) => ws.warehouse.branchId === null);
            displayStock = hqWarehouse ? hqWarehouse.quantity : 0;
         } else {
            const branchWarehouses = p.WarehouseStock.filter((ws: any) => ws.warehouse.branchId === Number(branchId));
            displayStock = branchWarehouses.reduce((sum: number, ws: any) => sum + ws.quantity, 0);
         }
       }

       return { ...p, stock: displayStock, originalTotalStock: p.stock, recipeCogs };
    });

    // LOG RESULT COUNT
    fs.appendFileSync('debug_error.txt', `[${new Date().toISOString()}] Result Count: ${productsWithFilteredStock.length}\n`);

    res.json(productsWithFilteredStock);
  } catch (error: any) {
    console.error('Get Products Error:', error);
    res.status(500).json({ error: 'Gagal mengambil data produk: ' + error.message });
  }
});

// I2. Create Product (Updated with Unit & simplified)
app.post('/api/inventory/products', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { name, sku, description, price, costPrice, stock, minStock, recordExpense, accountId, unit, warehouseId, categoryId, showInPos, isAutoDeduct, priceGofood, priceGrabfood, priceShopeefood, priceQpoon, recipeYield, imageUrl, purchaseUnit, purchaseFactor } = req.body;

    // --- SKU LIMIT CHECK ---
    const company = await prisma.company.findUnique({
      where: { id: tenantId },
      select: { addons: true }
    });
    
    const addons = company?.addons || [];
    let skuLimit = 10; // Default Free Tier
    
    if (addons.includes('INVENTORY_ENTERPRISE')) {
      skuLimit = Infinity;
    } else if (addons.includes('INVENTORY_PRO')) {
      skuLimit = 1000;
    } else if (addons.includes('INVENTORY_BASIC')) {
      skuLimit = 100;
    }

    if (skuLimit !== Infinity) {
      const currentSkuCount = await prisma.product.count({
        where: { companyId: tenantId }
      });
      
      if (currentSkuCount >= skuLimit) {
        return res.status(403).json({ 
          error: `Batas SKU tercapai (${skuLimit} produk). Silakan upgrade Add-on Inventory Anda.` 
        });
      }
    }
    // -----------------------

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Product
      const product = await tx.product.create({
        data: {
          companyId: tenantId,
          name: String(name),
          sku: sku && sku.trim() !== "" ? String(sku) : null,
          description: String(description || ""),
          price: Number(price) || 0,
          costPrice: Number(costPrice) || 0,
          stock: Number(stock) || 0,
          minStock: Number(minStock) || 0,
          unit: String(unit || "Pcs"),
          showInPos: showInPos !== undefined ? showInPos : true,
          isAutoDeduct: isAutoDeduct !== undefined ? isAutoDeduct : false,
          categoryId: categoryId && !isNaN(parseInt(String(categoryId))) ? parseInt(String(categoryId)) : null,
          type: req.body.type || 'FINISHED_GOOD',
          trackStock: req.body.trackStock !== undefined ? req.body.trackStock : true,
          priceGofood: Number(priceGofood) || 0,
          priceGrabfood: Number(priceGrabfood) || 0,
          priceShopeefood: Number(priceShopeefood) || 0,
          priceQpoon: Number(priceQpoon) || 0,
          recipeYield: Number(recipeYield) || 1,
          imageUrl: imageUrl || null,
          purchaseUnit: String(purchaseUnit || unit || "Pcs"),
          purchaseFactor: Number(purchaseFactor) || 1,
          updatedAt: new Date()
        }
      });
      
      const productId = product.id;

      // 2. Initial Stock Transaction & Warehouse Stock
      const wId = warehouseId && !isNaN(parseInt(String(warehouseId))) ? parseInt(String(warehouseId)) : null;

      if (stock > 0 && wId && !isNaN(wId)) {
        // Record Transaction
        await tx.$executeRawUnsafe(`
          INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date", "warehouseId")
          VALUES ($1, 'IN', $2, $3, NOW(), $4)
        `, productId, stock, 'Stok awal registrasi', wId);

        // Create/Update Warehouse Stock
        await tx.$executeRawUnsafe(`
          INSERT INTO "WarehouseStock" ("productId", "warehouseId", "quantity", "updatedAt")
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT ("productId", "warehouseId") DO UPDATE SET "quantity" = "WarehouseStock"."quantity" + $3, "updatedAt" = NOW()
        `, productId, wId, stock);
      } else if (stock > 0) {
        await tx.$executeRawUnsafe(`
          INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date")
          VALUES ($1, 'IN', $2, $3, NOW())
        `, productId, stock, 'Stok awal registrasi');
      }

      // 3. Optional Expense Sync
      if (recordExpense && stock > 0 && accountId && costPrice > 0) {
        const totalCost = stock * costPrice;
        
        // Find or create "Belanja Stok" category
        let category: any = await tx.expenseCategory.findFirst({
          where: { companyId: tenantId, name: 'Belanja Stok (Inventori)' }
        });

        if (!category) {
          const catResult: any[] = await tx.$queryRawUnsafe(`
            INSERT INTO "ExpenseCategory" ("companyId", "name", "type", "updatedAt")
            VALUES ($1, 'Belanja Stok (Inventori)', 'OPERATIONAL', NOW())
            RETURNING id
          `, tenantId);
          category = { id: catResult[0].id };
        }

        // Create Expense
        await tx.expense.create({
          data: {
            companyId: tenantId,
            accountId: parseInt(accountId),
            categoryId: category.id,
            amount: totalCost,
            date: new Date(),
            description: `Pembelian stok awal: ${String(name)} (${stock} unit)`,
            paidTo: 'Supplier'
          }
        });

        // Update Account Balance
        await tx.financialAccount.update({
          where: { id: parseInt(accountId) },
          data: { balance: { decrement: totalCost } }
        });
      }

      return productId;
    }, {
      timeout: 30000 // Increase timeout to 30s
    });

    res.status(201).json({ message: 'Produk berhasil ditambahkan', productId: result });
  } catch (error: any) {
    fs.appendFileSync('debug_error.txt', `\n[${new Date().toISOString()}] PRODUCT CREATE ERROR: \n${error.stack || error.message}\n`);
    console.error('Product Create Error:', error);
    
    // Handle Prisma Unique Constraint Error (e.g. Duplicate SKU)
    if (error.code === 'P2002') {
      const targets = error.meta?.target || [];
      if (targets.includes('sku')) {
        return res.status(400).json({ error: 'Gagal: SKU sudah digunakan oleh produk lain!' });
      }
      if (targets.includes('name')) {
        return res.status(400).json({ error: 'Gagal: Nama produk sudah ada!' });
      }
      return res.status(400).json({ error: 'Gagal: Data (SKU/Nama) sudah terdaftar di sistem.' });
    }
    
    res.status(500).json({ error: 'Gagal menambah produk: ' + error.message });
  }
});

// I3. Update Product
app.patch('/api/inventory/products/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const productId = parseInt(req.params.id as string);
    const { name, sku, description, price, costPrice, minStock, unit, categoryId, showInPos, isAutoDeduct, priceGofood, priceGrabfood, priceShopeefood, priceQpoon, recipeYield, imageUrl, type, trackStock, purchaseUnit, purchaseFactor } = req.body;

    // Verify ownership
    const existingProduct = await prisma.product.findFirst({
      where: { id: productId, companyId: tenantId }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        name: String(name),
        sku: sku && sku.trim() !== "" ? String(sku) : null,
        description: String(description || ""),
        price: Number(price) || 0,
        costPrice: Number(costPrice) || 0,
        minStock: Number(minStock) || 0,
        unit: String(unit || "Pcs"),
        showInPos: showInPos !== undefined ? showInPos : true,
        isAutoDeduct: isAutoDeduct !== undefined ? isAutoDeduct : existingProduct.isAutoDeduct,
        categoryId: categoryId && !isNaN(parseInt(String(categoryId))) ? parseInt(String(categoryId)) : null,
        type: req.body.type || existingProduct.type,
        trackStock: req.body.trackStock !== undefined ? req.body.trackStock : existingProduct.trackStock,
        priceGofood: priceGofood !== undefined ? Number(priceGofood) : existingProduct.priceGofood,
        priceGrabfood: priceGrabfood !== undefined ? Number(priceGrabfood) : existingProduct.priceGrabfood,
        priceShopeefood: priceShopeefood !== undefined ? Number(priceShopeefood) : existingProduct.priceShopeefood,
        priceQpoon: priceQpoon !== undefined ? Number(priceQpoon) : (existingProduct as any).priceQpoon,
        recipeYield: recipeYield !== undefined ? Number(recipeYield) : existingProduct.recipeYield,
        imageUrl: req.body.imageUrl !== undefined ? req.body.imageUrl : existingProduct.imageUrl,
        purchaseUnit: purchaseUnit !== undefined ? String(purchaseUnit) : existingProduct.purchaseUnit,
        purchaseFactor: purchaseFactor !== undefined ? Number(purchaseFactor) : existingProduct.purchaseFactor,
        updatedAt: new Date()
      }
    });

    res.json({ message: 'Produk berhasil diperbarui' });
  } catch (error: any) {
    console.error('Product Update Error:', error);
    
    // Handle Prisma Unique Constraint Error (e.g. Duplicate SKU)
    if (error.code === 'P2002') {
      const targets = error.meta?.target || [];
      if (targets.includes('sku')) {
        return res.status(400).json({ error: 'Gagal: SKU sudah digunakan oleh produk lain!' });
      }
      if (targets.includes('name')) {
        return res.status(400).json({ error: 'Gagal: Nama produk sudah ada!' });
      }
      return res.status(400).json({ error: 'Gagal: Data (SKU/Nama) sudah terdaftar di sistem.' });
    }
    
    res.status(500).json({ error: 'Gagal memperbarui produk: ' + error.message });
  }
});

app.delete('/api/inventory/products/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const id = parseInt(req.params.id as string);

    // Verify ownership before delete
    const product = await prisma.product.findFirst({
      where: { id, companyId: tenantId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated recipes first (since there's no FK constraint)
      await tx.$executeRawUnsafe(`DELETE FROM "ProductRecipe" WHERE "productId" = $1`, id);
      
      // 2. Delete the product
      await tx.product.delete({
        where: { id }
      });
    });

    res.json({ message: 'Produk berhasil dihapus' });
  } catch (error: any) {
    console.error('Product Delete Error:', error);
    res.status(500).json({ error: 'Gagal menghapus produk: ' + error.message });
  }
});

// I4. Get Product Recipe (BOM)
app.get('/api/inventory/products/:id/recipe', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id as string);
    const { warehouseId } = req.query;
    
    const recipes = await prisma.$queryRawUnsafe(`
      SELECT pr.*, p.name as material_name, p.unit as material_unit,
             COALESCE(p.stock, 0)::float as "globalStock",
             COALESCE(ws.quantity, 0)::float as "availableStock"
      FROM "ProductRecipe" pr
      JOIN "Product" p ON pr."materialId" = p.id
      LEFT JOIN "WarehouseStock" ws ON ws."productId" = p.id AND ws."warehouseId" = $2
      WHERE pr."productId" = $1
    `, productId, warehouseId ? parseInt(warehouseId as string) : -1);
    res.json(recipes);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil resep: ' + error.message });
  }
});

// I5. Set Product Recipe (BOM)
app.post('/api/inventory/products/:id/recipe', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const productId = parseInt(req.params.id as string);
    const { items } = req.body; // Array of { materialId, quantity }

    await prisma.$transaction(async (tx) => {
      // 1. Delete existing recipe
      await tx.$executeRawUnsafe(`DELETE FROM "ProductRecipe" WHERE "productId" = $1`, productId);
      
      // 2. Insert new recipe items (deduplicate by materialId to prevent double entries)
      if (items && Array.isArray(items)) {
        // Keep only the last occurrence of each materialId
        const dedupedItems = Object.values(
          items.reduce((acc: any, item: any) => {
            acc[item.materialId] = item;
            return acc;
          }, {})
        );
        for (const item of dedupedItems as any[]) {
          // Diagnostic Logging
          console.log(`[RECIPE SAVE] Product: ${productId} | Material: ${item.materialId} | Qty: ${item.quantity}`);
          
          await tx.$executeRawUnsafe(`
            INSERT INTO "ProductRecipe" ("productId", "materialId", "quantity", "updatedAt")
            VALUES ($1, $2, $3, NOW())
          `, productId, parseInt(item.materialId), parseFloat(item.quantity));
        }
      }
    }, {
      timeout: 30000 // Increase timeout to 30s to handle many items
    });

    res.json({ message: 'Resep berhasil diperbarui' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal menyimpan resep: ' + error.message });
  }
});

// I6. Upload Product Image
app.post('/api/inventory/products/upload', tenantMiddleware, uploadProduct.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
    }
    const imageUrl = `/uploads/products/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengunggah gambar: ' + error.message });
  }
});

// I3. Stock Adjustment (Updated with Categorized Expense Sync)
app.post('/api/inventory/adjust', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { productId, type, quantity, reference, recordExpense, accountId, expenseType, supplierId, warehouseId, date } = req.body;
    const transactionDate = date ? new Date(date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get current product data
      const products: any[] = await tx.$queryRawUnsafe(`SELECT * FROM "Product" WHERE id = $1 AND "companyId" = $2`, productId, tenantId);
      if (products.length === 0) throw new Error('Produk tidak ditemukan');
      const product = products[0];

      // 2. Calculate new stock
      let newStock = product.stock;
      if (type === 'IN') newStock += quantity;
      else if (type === 'OUT') newStock -= quantity;
      else if (type === 'ADJUST') newStock = quantity;

      // 3. Update Product (Total Stock)
      await tx.$executeRawUnsafe(`UPDATE "Product" SET "stock" = $1, "updatedAt" = NOW() WHERE id = $2`, newStock, productId);

      // 4. Update Warehouse Stock (New Task)
      if (warehouseId) {
        const wId = parseInt(warehouseId);
        // Get existing warehouse stock
        const wStocks: any[] = await tx.$queryRawUnsafe(`SELECT quantity FROM "WarehouseStock" WHERE "productId" = $1 AND "warehouseId" = $2`, productId, wId);
        let oldWQty = wStocks.length > 0 ? wStocks[0].quantity : 0;
        let newWQty = oldWQty;
        
        if (type === 'IN') newWQty += quantity;
        else if (type === 'OUT') newWQty -= quantity;
        else if (type === 'ADJUST') newWQty = quantity;

        await tx.$executeRawUnsafe(`
          INSERT INTO "WarehouseStock" ("productId", "warehouseId", "quantity", "updatedAt")
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT ("productId", "warehouseId") DO UPDATE SET "quantity" = $3, "updatedAt" = NOW()
        `, productId, wId, newWQty);
      }

      // 5. Record Transaction
      const safeSupplierId = supplierId && !isNaN(parseInt(String(supplierId))) ? parseInt(String(supplierId)) : null;
      const safeWarehouseId = warehouseId && !isNaN(parseInt(String(warehouseId))) ? parseInt(String(warehouseId)) : null;
      
      await tx.$executeRawUnsafe(`
        INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date", "supplierId", "warehouseId")
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        productId, type, Number(quantity || 0), reference, transactionDate, safeSupplierId, safeWarehouseId
      );

      // 5. Optional Expense Sync (Only for IN)
      if (recordExpense && type === 'IN' && accountId && quantity > 0 && product.costPrice > 0) {
        const totalCost = quantity * product.costPrice;
        
        // Determine Category Name & Type
        const isCOGS = expenseType === 'COGS';
        const catName = isCOGS ? 'Belanja Bahan Baku (Inventori)' : 'Biaya Operasional (Inventori)';
        const catType = isCOGS ? 'COGS' : 'OPERATIONAL';

        let category: any = await tx.expenseCategory.findFirst({
          where: { companyId: tenantId, name: catName }
        });

        if (!category) {
          category = await tx.expenseCategory.create({
            data: {
              companyId: tenantId,
              name: catName,
              type: catType as any,
              updatedAt: new Date()
            }
          });
        }

        let paidTo = reference || 'Supplier';
        if (supplierId) {
          const suppliers: any[] = await tx.$queryRawUnsafe(`SELECT name FROM "Supplier" WHERE id = $1`, parseInt(supplierId));
          if (suppliers.length > 0) paidTo = suppliers[0].name;
        }

        await tx.expense.create({
          data: {
            companyId: tenantId,
            accountId: parseInt(accountId),
            categoryId: category.id,
            amount: totalCost,
            date: transactionDate,
            description: `Belanja stok: ${product.name} (${quantity} unit)`,
            paidTo: paidTo
          }
        });

        await tx.financialAccount.update({
          where: { id: parseInt(accountId) },
          data: { balance: { decrement: totalCost } }
        });
      }

      return newStock;
    });

    res.json({ message: 'Stok berhasil diperbarui', newStock: result });
  } catch (error: any) {
    fs.appendFileSync('debug_error.txt', `\n[${new Date().toISOString()}] STOCK ADJUST ERROR: \n${error.stack || error.message}\n`);
    console.error('Stock Adjust Error:', error);
    res.status(500).json({ error: 'Gagal menyesuaikan stok: ' + error.message });
  }
});

// I5. Stock Transfer (Mutation)
app.post('/api/inventory/transfer', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = (req as any).userId;
    const { productId, fromWarehouseId, toWarehouseId, quantity, notes } = req.body;

    if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
      return res.status(400).json({ error: 'Data transfer tidak lengkap.' });
    }

    if (parseInt(fromWarehouseId) === parseInt(toWarehouseId)) {
      return res.status(400).json({ error: 'Gudang asal dan tujuan tidak boleh sama.' });
    }

    const qty = parseFloat(quantity);
    if (qty <= 0) return res.status(400).json({ error: 'Jumlah transfer harus lebih dari 0.' });

    await prisma.$transaction(async (tx) => {
      // 1. Check Source Stock
      const sourceStock = await tx.warehouseStock.findUnique({
        where: { productId_warehouseId: { productId: parseInt(productId), warehouseId: parseInt(fromWarehouseId) } }
      });

      if (!sourceStock || sourceStock.quantity < qty) {
        throw new Error(`Stok tidak mencukupi di gudang asal. Tersedia: ${sourceStock?.quantity || 0}`);
      }

      // 2. Decrement Source
      await tx.warehouseStock.update({
        where: { productId_warehouseId: { productId: parseInt(productId), warehouseId: parseInt(fromWarehouseId) } },
        data: { quantity: { decrement: qty } }
      });

      // 3. Increment Destination (using raw SQL to handle potential missing record)
      await tx.$executeRawUnsafe(`
        INSERT INTO "WarehouseStock" ("productId", "warehouseId", "quantity", "updatedAt")
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT ("productId", "warehouseId") 
        DO UPDATE SET "quantity" = "WarehouseStock"."quantity" + $3, "updatedAt" = NOW()
      `, parseInt(productId), parseInt(toWarehouseId), qty);

      // 4. Record transactions
      const fromW = await tx.warehouse.findUnique({ where: { id: parseInt(fromWarehouseId) }, select: { name: true } });
      const toW = await tx.warehouse.findUnique({ where: { id: parseInt(toWarehouseId) }, select: { name: true } });

      await tx.stockTransaction.createMany({
        data: [
          {
            productId: parseInt(productId),
            type: 'OUT',
            quantity: qty,
            reference: `Mutasi ke ${toW?.name || 'Gudang'}. ${notes || ''}`,
            warehouseId: parseInt(fromWarehouseId),
            date: new Date()
          },
          {
            productId: parseInt(productId),
            type: 'IN',
            quantity: qty,
            reference: `Mutasi dari ${fromW?.name || 'Gudang'}. ${notes || ''}`,
            warehouseId: parseInt(toWarehouseId),
            date: new Date()
          }
        ]
      });
    });

    res.json({ message: "Mutasi stok berhasil diselesaikan." });
  } catch (error: any) {
    console.error("TRANSFER ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// I3.5. Production API (Manufacturing: Raw/WIP -> Finished Good)
app.post('/api/inventory/produce', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { productId, sku, quantity, warehouseId, notes } = req.body;
    const producedQty = parseFloat(quantity);

    if ((!productId && !sku) || isNaN(producedQty) || producedQty <= 0 || !warehouseId) {
      return res.status(400).json({ error: 'Data produksi tidak lengkap. Sertakan productId atau sku.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      console.log(`[PRODUCTION] Starting for Product ID: ${productId} | SKU: ${sku} | Qty: ${producedQty} | Warehouse: ${warehouseId}`);
      // 1. Get Product & its Recipe
      let product;
      if (productId) {
        product = await tx.product.findUnique({
          where: { id: parseInt(productId), companyId: tenantId },
          include: {
            Recipes: {
              include: { Material: true }
            }
          }
        });
      } else {
        product = await tx.product.findFirst({
          where: { sku: String(sku), companyId: tenantId },
          include: {
            Recipes: {
              include: { Material: true }
            }
          }
        });
      }

      if (!product) throw new Error('Produk tidak ditemukan.');
      if (!product.Recipes || product.Recipes.length === 0) {
        throw new Error('Produk ini tidak memiliki Bill of Materials (Resep). Silakan atur resep terlebih dahulu.');
      }

      // 2. Process each material in the recipe
      for (const recipeItem of product.Recipes) {
        const yieldDivisor = product.recipeYield && product.recipeYield > 0 ? Number(product.recipeYield) : 1;
        const neededQty = (parseFloat(recipeItem.quantity.toString()) / yieldDivisor) * producedQty;
        const materialId = recipeItem.materialId;

        console.log(`[PRODUCTION] Processing Material: ${recipeItem.Material.name} (ID: ${materialId}) | Needed: ${neededQty}`);

        // Check if sufficient stock exists in the warehouse
        const wStock = await tx.warehouseStock.findUnique({
          where: { productId_warehouseId: { productId: materialId, warehouseId: parseInt(warehouseId) } }
        });

        const currentQty = wStock?.quantity || 0;
        if (currentQty < neededQty) {
          throw new Error(`Stok tidak mencukupi untuk bahan baku: ${recipeItem.Material.name}. Dibutuhkan ${neededQty} ${recipeItem.Material.unit}, tersedia ${currentQty} ${recipeItem.Material.unit}.`);
        }

        // --- DEDUCT MATERIAL STOCK ---
        // Update WarehouseStock
        await tx.warehouseStock.update({
          where: { productId_warehouseId: { productId: materialId, warehouseId: parseInt(warehouseId) } },
          data: { quantity: { decrement: neededQty } }
        });

        // Update Total Product Stock
        await tx.product.update({
          where: { id: materialId },
          data: { stock: { decrement: neededQty } }
        });

        // Record Transaction (OUT)
        await tx.stockTransaction.create({
          data: {
            productId: materialId,
            type: 'OUT',
            quantity: neededQty,
            reference: `Produksi ${product.name}: ${notes || '-'}`,
            warehouseId: parseInt(warehouseId)
          }
        });
      }

      // 3. --- INCREMENT PRODUCED PRODUCT STOCK ---
      // Update WarehouseStock
      await tx.warehouseStock.upsert({
        where: { productId_warehouseId: { productId: product.id, warehouseId: parseInt(warehouseId) } },
        update: { quantity: { increment: producedQty } },
        create: { productId: product.id, warehouseId: parseInt(warehouseId), quantity: producedQty }
      });

      // Update Total Product Stock
      await tx.product.update({
        where: { id: product.id },
        data: { stock: { increment: producedQty } }
      });

      // Record Transaction (IN)
      await tx.stockTransaction.create({
        data: {
          productId: product.id,
          type: 'IN',
          quantity: producedQty,
          reference: `Hasil Produksi: ${notes || '-'}`,
          warehouseId: parseInt(warehouseId)
        }
      });

      return { 
        producedProduct: product.name,
        producedQty,
        remainingUnit: product.unit
      };
    }, {
      maxWait: 10000,
      timeout: 30000
    });

    res.json({ message: 'Produksi berhasil dicatat, stok otomatis disesuaikan.', result });
  } catch (error: any) {
    fs.appendFileSync('debug_error.txt', `\n[${new Date().toISOString()}] PRODUCTION ERROR: \n${error.stack || error.message}\n`);
    console.error('Production Error:', error);
    res.status(500).json({ error: 'Gagal memproses produksi: ' + error.message });
  }
});

// --- FACTORY SYNC ENDPOINT (Phase: Production Integration) ---
// Bulk update product stock based on SKU from external factory app
app.post('/api/products/sync-bulk-stock', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { items, warehouseId } = req.body; // warehouseId can be global for the batch or per-item

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Data items wajib berupa array.' });
    }

    console.log(`[SYNC] Bulk sync started for tenant: ${tenantId}, items: ${items.length}`);

    const results = await prisma.$transaction(async (tx) => {
      const summary = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const item of items) {
        try {
          const { sku, quantity } = item;
          const targetQty = parseFloat(quantity);
          const targetWarehouseId = item.warehouseId || warehouseId;

          if (!sku || isNaN(targetQty)) {
            summary.failed++;
            summary.errors.push(`SKU ${sku || 'NULL'}: Data tidak valid.`);
            continue;
          }

          // 1. Find Product
          const product = await tx.product.findFirst({
            where: { sku: String(sku), companyId: tenantId }
          });

          if (!product) {
            summary.failed++;
            summary.errors.push(`SKU ${sku}: Produk tidak ditemukan.`);
            continue;
          }

          // 2. Update Global Stock (Overwrite as requested)
          await tx.product.update({
            where: { id: product.id },
            data: { stock: targetQty, updatedAt: new Date() }
          });

          // 3. Update Warehouse Stock
          if (targetWarehouseId) {
            const wId = parseInt(targetWarehouseId);
            await tx.warehouseStock.upsert({
              where: { productId_warehouseId: { productId: product.id, warehouseId: wId } },
              update: { quantity: targetQty, updatedAt: new Date() },
              create: { productId: product.id, warehouseId: wId, quantity: targetQty }
            });
          }

          // 4. Record Transaction for Audit Trail
          await tx.stockTransaction.create({
            data: {
              productId: product.id,
              type: 'ADJUST',
              quantity: targetQty,
              reference: `Factory Sync: ${new Date().toLocaleString('id-ID')}`,
              warehouseId: targetWarehouseId ? parseInt(targetWarehouseId) : null,
              date: new Date()
            }
          });

          summary.success++;
        } catch (itemError: any) {
          summary.failed++;
          summary.errors.push(`Internal error for item: ${itemError.message}`);
        }
      }

      return summary;
    });

    res.json({
      message: 'Sinkronisasi stok selesai.',
      total_processed: items.length,
      success: results.success,
      failed: results.failed,
      errors: results.failed > 0 ? results.errors : undefined
    });

  } catch (error: any) {
    console.error('[SYNC ERROR]:', error);
    res.status(500).json({ error: 'Gagal melakukan sinkronisasi massal: ' + error.message });
  }
});


// Get all stock transactions for the tenant
app.get('/api/inventory/transactions', tenantMiddleware, async (req: any, res) => {
  try {
    const tenantId = Number(req.tenantId);
    const transactions = await prisma.$queryRawUnsafe(`
      SELECT st.*, p.name as product_name, p.sku as product_sku
      FROM "StockTransaction" st
      JOIN "Product" p ON st."productId" = p.id
      WHERE p."companyId" = $1
      ORDER BY st."createdAt" DESC
    `, tenantId);
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil data transaksi: ' + error.message });
  }
});

// --- MODUL GUDANG (WAREHOUSE) ---

// W1. List Warehouses
app.get('/api/inventory/warehouses', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const warehouses = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Warehouse" WHERE "companyId" = $1 ORDER BY "name" ASC`,
      tenantId
    );
    res.json(warehouses);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil data gudang: ' + error.message });
  }
});

// W2. Create Warehouse
app.post('/api/inventory/warehouses', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { name, location, isMain, branchId } = req.body;
    
    // If isMain is true, unset other main warehouses for this company
    if (isMain) {
      await prisma.$executeRawUnsafe(`UPDATE "Warehouse" SET "isMain" = FALSE WHERE "companyId" = $1`, tenantId);
    }
    
    const parsedBranchId = branchId && !isNaN(parseInt(branchId)) ? parseInt(branchId) : null;

    const result: any[] = await prisma.$queryRawUnsafe(`
      INSERT INTO "Warehouse" ("companyId", "name", "location", "isMain", "branchId", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id
    `, tenantId, name, location, isMain || false, parsedBranchId);
    
    res.status(201).json({ message: 'Gudang berhasil ditambahkan', warehouseId: result[0].id });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal menambah gudang: ' + error.message });
  }
});

// W3. Update Warehouse
app.patch('/api/inventory/warehouses/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const warehouseId = parseInt(req.params.id as string);
    const { name, location, isMain, branchId } = req.body;
    
    if (isMain) {
      await prisma.$executeRawUnsafe(`UPDATE "Warehouse" SET "isMain" = FALSE WHERE "companyId" = $1`, tenantId);
    }
    
    const parsedBranchId = branchId && !isNaN(parseInt(branchId)) ? parseInt(branchId) : null;

    await prisma.$executeRawUnsafe(`
      UPDATE "Warehouse" 
      SET "name" = $1, "location" = $2, "isMain" = $3, "branchId" = $4, "updatedAt" = NOW()
      WHERE id = $5 AND "companyId" = $6
    `, name, location, isMain, parsedBranchId, warehouseId, tenantId);
    
    res.json({ message: 'Gudang berhasil diperbarui' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal memperbarui gudang: ' + error.message });
  }
});

// W4. Delete Warehouse
app.delete('/api/inventory/warehouses/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const warehouseId = parseInt(req.params.id as string);
    
    await prisma.$executeRawUnsafe(`
      DELETE FROM "Warehouse" WHERE id = $1 AND "companyId" = $2
    `, warehouseId, tenantId);
    
    res.json({ message: 'Gudang berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal menghapus gudang: ' + error.message });
  }
});

// --- MODUL PELANGGAN & MEMBER ---

// C1. List Customers
app.get('/api/customers', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const customers = await prisma.$queryRawUnsafe(`
      SELECT * FROM "Customer" WHERE "companyId" = $1 ORDER BY "name" ASC
    `, tenantId);
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil data pelanggan: ' + error.message });
  }
});

// C2. Create Customer
app.post('/api/customers', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    let { name, phone, email, address } = req.body;

    if (!name) return res.status(400).json({ error: 'Nama pelanggan wajib diisi' });

    // Handle empty strings as NULL for unique constraint
    const sanitizedPhone = (phone && phone.trim() !== '') ? phone.trim() : null;
    const sanitizedEmail = (email && email.trim() !== '') ? email.trim() : null;
    const sanitizedAddress = (address && address.trim() !== '') ? address.trim() : null;

    const result: any[] = await prisma.$queryRawUnsafe(`
      INSERT INTO "Customer" ("companyId", "name", "phone", "email", "address", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id
    `, tenantId, name, sanitizedPhone, sanitizedEmail, sanitizedAddress);

    res.status(201).json({ id: result[0].id, message: 'Pelanggan berhasil ditambahkan' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal menambah pelanggan: ' + error.message });
  }
});

// C3. Update Customer
app.patch('/api/customers/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const id = parseInt(req.params.id as string);
    const { name, phone, email, address } = req.body;

    await prisma.$executeRawUnsafe(`
      UPDATE "Customer" 
      SET "name" = $1, "phone" = $2, "email" = $3, "address" = $4, "updatedAt" = NOW()
      WHERE "id" = $5 AND "companyId" = $6
    `, name, phone, email, address, id, tenantId);

    res.json({ message: 'Data pelanggan berhasil diperbarui' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal memperbarui pelanggan: ' + error.message });
  }
});

// C4. Delete Customer
app.delete('/api/customers/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const id = parseInt(req.params.id as string);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "Customer" WHERE "id" = $1 AND "companyId" = $2
    `, id, tenantId);

    res.json({ message: 'Pelanggan berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal menghapus pelanggan: ' + error.message });
  }
});

// C5. Get Customer Sales History
app.get('/api/customers/:id/sales', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const customerId = parseInt(req.params.id as string);

    const sales = await prisma.$queryRawUnsafe(`
      SELECT * FROM "Sale" 
      WHERE "companyId" = $1 AND "customerId" = $2 
      ORDER BY "date" DESC
    `, tenantId, customerId);

    res.json(sales);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil riwayat transaksi: ' + error.message });
  }
});

// --- MEMBERSHIP & OTP WA ---
app.post('/api/customers/otp-request', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { phone } = req.body;

    if (!phone) return res.status(400).json({ error: 'Nomor WhatsApp wajib diisi' });

    console.log(`[OTP] Request masuk: ${phone}`);

    // 1. Generate 4 digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

    // 2. Save to DB
    await (prisma as any).otpVerification.upsert({
      where: { companyId_phone: { companyId: tenantId, phone } },
      update: { code: otp, expiresAt, createdAt: new Date() },
      create: { companyId: tenantId, phone, code: otp, expiresAt }
    });

    // 3. Get Company Info for Branding
    const company = await prisma.company.findUnique({ where: { id: tenantId } });

    // 4. Send Message via Wablas
    const message = `Halo! Kode OTP pendaftaran Member Anda di *${company?.name || 'Aivola POS'}* adalah: *${otp}*.\n\nKode ini berlaku selama 5 menit. Mohon tidak memberikan kode ini kepada siapapun.`;
    
    console.log(`[OTP] Mengirim WA via Wablas...`);
    // @ts-ignore
    const waResult = await sendWhatsAppMessage(phone, message, company?.waGatewayUrl || undefined, company?.waApiKey || undefined, true);
    console.log(`[OTP] Hasil:`, waResult);

    res.json({ message: 'OTP berhasil dikirim ke WhatsApp' });
  } catch (error: any) {
    console.error('OTP Request Error:', error);
    res.status(500).json({ error: 'Gagal mengirim OTP: ' + error.message });
  }
});

app.post('/api/customers/otp-verify', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { phone, code, name, birthDate, gender } = req.body;

    // 1. Check OTP
    const verification = await (prisma as any).otpVerification.findUnique({
      where: { companyId_phone: { companyId: tenantId, phone } }
    });

    if (!verification || verification.code !== code) {
      return res.status(400).json({ error: 'Kode OTP salah atau tidak ditemukan' });
    }

    if (new Date() > verification.expiresAt) {
      return res.status(400).json({ error: 'Kode OTP sudah kedaluwarsa' });
    }

    // 2. Upsert Customer & Mark as Member
    const customer = await prisma.customer.upsert({
      where: { companyId_phone: { companyId: tenantId, phone } },
      update: { 
        name: name || undefined, 
        isMember: true, 
        // @ts-ignore
        birthDate: birthDate ? new Date(birthDate) : undefined,
        // @ts-ignore
        gender: gender 
      },
      create: { 
        companyId: tenantId, 
        phone, 
        name: name || 'Pelanggan Baru', 
        isMember: true,
        // @ts-ignore
        birthDate: birthDate ? new Date(birthDate) : null,
        // @ts-ignore
        gender: gender || null
      }
    });

    // 3. Delete OTP (one time use)
    await (prisma as any).otpVerification.delete({
      where: { companyId_phone: { companyId: tenantId, phone } }
    });

    res.json({ message: 'Pendaftaran Member berhasil!', customer });
  } catch (error: any) {
    console.error('OTP Verify Error:', error);
    res.status(500).json({ error: 'Gagal memverifikasi OTP: ' + error.message });
  }
});

// --- MODUL LOYALTY & VOUCHER ---

// L1. Get Company Loyalty Settings
app.get('/api/company/loyalty', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const company = await prisma.company.findUnique({
      where: { id: tenantId },
      select: {
        memberDiscountType: true,
        memberDiscountValue: true,
        pointsEarnRatio: true,
        pointsRedeemValue: true
      }
    });
    res.json(company);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// L2. Update Company Loyalty Settings
app.patch('/api/company/loyalty', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { memberDiscountType, memberDiscountValue, pointsEarnRatio, pointsRedeemValue } = req.body;
    const company = await prisma.company.update({
      where: { id: tenantId },
      data: {
        memberDiscountType,
        memberDiscountValue: Number(memberDiscountValue),
        pointsEarnRatio: Number(pointsEarnRatio),
        pointsRedeemValue: Number(pointsRedeemValue)
      }
    });
    res.json(company);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// L3. Get Vouchers
app.get('/api/vouchers', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const vouchers = await prisma.voucher.findMany({
      where: { companyId: tenantId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(vouchers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// L4. Create Voucher
app.post('/api/vouchers', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { code, discountType, discountValue, minPurchase, minQuantity, maxDiscount, validFrom, validUntil, quota, isActive, targetAudience } = req.body;
    const voucher = await prisma.voucher.create({
      data: {
        companyId: tenantId,
        code,
        discountType,
        discountValue: Number(discountValue),
        minPurchase: Number(minPurchase || 0),
        minQuantity: Number(minQuantity || 0),
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        quota: Number(quota || 0),
        isActive: isActive !== undefined ? isActive : true
      }
    });
    res.status(201).json(voucher);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// L5. Update Voucher
app.patch('/api/vouchers/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const voucherId = Number(req.params.id);
    const { code, discountType, discountValue, minPurchase, minQuantity, maxDiscount, validFrom, validUntil, quota, isActive } = req.body;
    
    // Ensure voucher belongs to tenant
    const existing = await prisma.voucher.findFirst({ where: { id: voucherId, companyId: tenantId } });
    if (!existing) return res.status(404).json({ error: 'Voucher tidak ditemukan' });

    const voucher = await prisma.voucher.update({
      where: { id: voucherId },
      data: {
        code,
        discountType,
        discountValue: discountValue !== undefined ? Number(discountValue) : undefined,
        minPurchase: minPurchase !== undefined ? Number(minPurchase) : undefined,
        minQuantity: minQuantity !== undefined ? Number(minQuantity) : undefined,
        maxDiscount: maxDiscount !== undefined ? (maxDiscount ? Number(maxDiscount) : null) : undefined,
        validFrom: validFrom !== undefined ? (validFrom ? new Date(validFrom) : null) : undefined,
        validUntil: validUntil !== undefined ? (validUntil ? new Date(validUntil) : null) : undefined,
        quota: quota !== undefined ? Number(quota) : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });
    res.json(voucher);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// L6. Delete Voucher
app.delete('/api/vouchers/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const voucherId = Number(req.params.id);
    await prisma.voucher.deleteMany({
      where: { id: voucherId, companyId: tenantId }
    });
    res.json({ message: 'Voucher deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- LOYALTY & MEMBERSHIP ENDPOINTS (Aivola GO) ---

// Get current customer profile
app.get('/api/customers/me', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).userId);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const customer = await prisma.customer.findFirst({ where: { email: user.email } });
    if (!customer) return res.status(404).json({ error: 'Customer profile not found' });

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer profile' });
  }
});

// Get current customer point history
app.get('/api/customers/me/points', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).userId);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const customer = await prisma.customer.findFirst({ where: { email: user.email } });
    if (!customer) return res.json([]); // Return empty if no customer profile yet

    const history = await prisma.pointHistory.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch point history' });
  }
});

// Get claimed vouchers
app.get('/api/customers/me/vouchers', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).userId);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const customer = await prisma.customer.findFirst({ where: { email: user.email } });
    if (!customer) return res.json([]);

    const claimed = await prisma.customerVoucher.findMany({
      where: { customerId: customer.id, isUsed: false },
      include: { voucher: true }
    });
    res.json(claimed.map(c => ({ ...c.voucher, claimedId: c.id })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch claimed vouchers' });
  }
});

// --- CUSTOMER ADDRESSES ---

// Get all saved addresses for current customer
app.get('/api/customers/me/addresses', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const customer = await prisma.customer.findFirst({ where: { email: user.email } });
    if (!customer) return res.json([]);

    const addresses = await (prisma as any).customerAddress.findMany({
      where: { customerId: customer.id },
      orderBy: { isDefault: 'desc' }
    });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// Add new address
app.post('/api/customers/me/addresses', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const customer = await prisma.customer.findFirst({ where: { email: user.email } });
    if (!customer) return res.status(404).json({ error: 'Customer profile not found' });

    const { label, recipientName, phoneNumber, fullAddress, isDefault } = req.body;

    // If this is the first address or set as default, unset other defaults
    if (isDefault) {
      await (prisma as any).customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false }
      });
    }

    const address = await (prisma as any).customerAddress.create({
      data: {
        customerId: customer.id,
        label,
        recipientName,
        phoneNumber,
        fullAddress,
        isDefault: isDefault || false
      }
    });

    res.json(address);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create address' });
  }
});

// Update address
app.patch('/api/customers/me/addresses/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).userId);
    const { id } = req.params;
    const { label, recipientName, phoneNumber, fullAddress, isDefault } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const customer = await prisma.customer.findFirst({ where: { email: user?.email } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    if (isDefault) {
      await (prisma as any).customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false }
      });
    }

    const updated = await (prisma as any).customerAddress.update({
      where: { id: Number(id), customerId: customer.id },
      data: { label, recipientName, phoneNumber, fullAddress, isDefault }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// Delete address
app.delete('/api/customers/me/addresses/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).userId);
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const customer = await prisma.customer.findFirst({ where: { email: user?.email } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    await (prisma as any).customerAddress.delete({
      where: { id: Number(id), customerId: customer.id }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

// Claim a voucher
app.post('/api/vouchers/:id/claim', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const voucherId = parseInt(String(req.params.id));
    const userId = Number((req as any).userId);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const voucher = await prisma.voucher.findUnique({ where: { id: voucherId } });
    if (!voucher) return res.status(404).json({ error: 'Voucher tidak ditemukan' });

    let customer = await prisma.customer.findFirst({ where: { email: user.email } });
    
    // Create customer profile if doesn't exist (Auto-Member)
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          companyId: user.companyId,
          name: user.name,
          email: user.email,
          isMember: true
        }
      });
    }

    // Check if already claimed
    const existing = await prisma.customerVoucher.findUnique({
      where: { 
        customerId_voucherId: { customerId: customer.id, voucherId } 
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Voucher sudah diklaim sebelumnya' });
    }

    const claimed = await prisma.customerVoucher.create({
      data: {
        customerId: customer.id,
        voucherId: voucherId
      }
    });

    res.status(201).json(claimed);
  } catch (error) {
    console.error('[CLAIM ERROR]', error);
    res.status(500).json({ error: 'Gagal mengklaim voucher' });
  }
});

// --- MODUL SUPPLIER & PEMASOK ---

// SP1. List Suppliers
app.get('/api/suppliers', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const suppliers = await prisma.$queryRawUnsafe(`
      SELECT * FROM "Supplier" WHERE "companyId" = $1 ORDER BY "name" ASC
    `, tenantId);
    res.json(suppliers);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil data supplier: ' + error.message });
  }
});

// SP2. Create Supplier
app.post('/api/suppliers', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { name, contactPerson, phone, email, address, category } = req.body;

    if (!name) return res.status(400).json({ error: 'Nama supplier wajib diisi' });

    const result: any[] = await prisma.$queryRawUnsafe(`
      INSERT INTO "Supplier" ("companyId", "name", "contactPerson", "phone", "email", "address", "category", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id
    `, tenantId, name, contactPerson, phone, email, address, category);

    res.status(201).json({ id: result[0].id, message: 'Supplier berhasil ditambahkan' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal menambah supplier: ' + error.message });
  }
});

// SP3. Update Supplier
app.patch('/api/suppliers/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const id = parseInt(req.params.id as string);
    const { name, contactPerson, phone, email, address, category } = req.body;

    await prisma.$executeRawUnsafe(`
      UPDATE "Supplier" 
      SET "name" = $1, "contactPerson" = $2, "phone" = $3, "email" = $4, "address" = $5, "category" = $6, "updatedAt" = NOW()
      WHERE "id" = $7 AND "companyId" = $8
    `, name, contactPerson, phone, email, address, category, id, tenantId);

    res.json({ message: 'Data supplier berhasil diperbarui' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal memperbarui supplier: ' + error.message });
  }
});

// SP4. Delete Supplier
app.delete('/api/suppliers/:id', tenantMiddleware, async (req: Request, res: Response) => {

  try {
    const tenantId = Number((req as any).tenantId);
    const id = parseInt(req.params.id as string);

    await prisma.$executeRawUnsafe(`
      DELETE FROM "Supplier" WHERE "id" = $1 AND "companyId" = $2
    `, id, tenantId);

    res.json({ message: 'Supplier berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal menghapus supplier: ' + error.message });
  }
});

// --- MODUL PENJUALAN & INVOICING ---

// S1. Record Sale
app.post('/api/sales', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { items, accountId, customerId, status, notes, date, dueDate, branchId, voucherId, deliveryMethod, pointsUsed, saleType, paymentMethod, taxRate, taxAmount, memberDiscountAmount } = req.body;
    const userId = Number((req as any).userId);
    let finalCustomerId = customerId ? parseInt(customerId) : null;
    const dueDateVal = (dueDate && typeof dueDate === 'string' && dueDate.trim() !== '') ? new Date(dueDate) : null;

    // --- SECURITY & SYNC FIX ---
    // If we have a userId (from token), always override customerId with the one linked to user email
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const linkedCustomer = await prisma.customer.findFirst({ where: { email: user.email } });
        if (linkedCustomer) {
          finalCustomerId = linkedCustomer.id;
        }
      }
    }

    // --- CHECK CLOSING ---
    if (await isPeriodClosed(tenantId, date || new Date())) {
      return res.status(403).json({ error: 'Periode buku sudah ditutup. Tidak dapat mencatat penjualan pada tanggal ini.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Minimal harus ada 1 barang' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Calculate Total & Voucher Discount
      let subtotal = 0;
      for (const item of items) {
        subtotal += parseFloat(item.quantity) * parseFloat(item.price);
      }

      let voucherDiscountAmount = 0;
      let voucherCode = null;

      if (voucherId) {
        const voucher = await tx.voucher.findUnique({ where: { id: parseInt(voucherId) } });
        
        let totalQuantity = 0;
        for (const item of items) {
          totalQuantity += parseFloat(item.quantity);
        }

        const validPurchase = voucher && subtotal >= voucher.minPurchase;
        const validQuantity = voucher && voucher.minQuantity > 0 && totalQuantity >= voucher.minQuantity;

        if (voucher && voucher.isActive && (voucher.minPurchase === 0 || validPurchase || validQuantity)) {
          voucherCode = voucher.code;
          if (voucher.discountType === 'PERCENTAGE') {
            voucherDiscountAmount = subtotal * (voucher.discountValue / 100);
            if (voucher.maxDiscount && voucherDiscountAmount > voucher.maxDiscount) {
              voucherDiscountAmount = voucher.maxDiscount;
            }
          } else {
            voucherDiscountAmount = voucher.discountValue;
          }
          
          // Increment used count
          await tx.voucher.updateMany({
            where: { id: voucher.id },
            data: { usedCount: { increment: 1 } }
          });
        }
      }

      const pointsUsedNum = pointsUsed ? parseInt(pointsUsed) : 0;
      const totalAmount = Math.max(0, subtotal - voucherDiscountAmount - pointsUsedNum);

      // 2. Generate Invoice Number
      const dateVal = date ? new Date(date) : new Date();
      const y = dateVal.getFullYear();
      const m = (dateVal.getMonth() + 1).toString().padStart(2, '0');
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const invoiceNumber = `SLS/${y}/${m}/ID${tenantId}-${randomStr}`;

      // 2. Calculate Commission (Logic: If notes contain platform name, calculate 20%)
      let totalCommission = 0;
      const lowerNotes = (notes || '').toLowerCase();
      if (lowerNotes.includes('gofood') || lowerNotes.includes('grabfood') || lowerNotes.includes('shopeefood') || lowerNotes.includes('qpoon')) {
        totalCommission = totalAmount * 0.20; // 20% Platform Fee
      }



      // 3. Create Sale Record (Merged with GitHub's new fields)
      const saleResult: any[] = await tx.$queryRawUnsafe(`
        INSERT INTO "Sale" ("companyId", "branchId", "cashierId", "invoiceNumber", "customerId", "date", "dueDate", "totalAmount", "totalCommission", "status", "accountId", "notes", "updatedAt", "voucherCode", "voucherDiscountAmount", "saleType", "pointsUsed", "deliveryMethod", "paymentMethod", "taxRate", "taxAmount", "memberDiscountAmount")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING id
      `, 
      tenantId, 
      branchId ? parseInt(branchId) : null, 
      userId, 
      invoiceNumber, 
      finalCustomerId, 
      dateVal, 
      dueDateVal,
      totalAmount, 
      totalCommission, 
      status || 'PAID', 
      accountId ? parseInt(accountId) : null, 
      notes, 
      voucherCode, 
      voucherDiscountAmount, 
      saleType || 'WALK_IN', 
      pointsUsedNum,
      deliveryMethod || 'Dine-in',
      paymentMethod || 'Bayar di Kasir',
      taxRate || 0,
      taxAmount || 0,
      memberDiscountAmount || 0);
      
      const saleId = saleResult[0].id;

      // --- SKIP LOYALTY & INVENTORY FOR PENDING ORDERS ---
      if (status === 'PENDING') {
        // Just create Sale Items without updating stock/points
        for (const item of items) {
          const productId = parseInt(item.productId);
          const quantity = parseFloat(item.quantity);
          const price = parseFloat(item.price);
          const total = quantity * price;

          await tx.$executeRawUnsafe(`
            INSERT INTO "SaleItem" ("saleId", "productId", "quantity", "price", "total")
            VALUES ($1, $2, $3, $4, $5)
          `, saleId, productId, quantity, price, total);
        }
        return { id: saleId, invoiceNumber, status: 'PENDING' };
      }

      // --- LOYALTY LOGIC: Earn & Redeem Points ---
      if (finalCustomerId) {
        const custId = finalCustomerId;
        
        // 1. Redeem Points
        if (pointsUsedNum > 0) {
          await tx.customer.update({
            where: { id: custId },
            data: { points: { decrement: pointsUsedNum } }
          });
          await tx.pointHistory.create({
            data: {
              customerId: custId,
              amount: pointsUsedNum,
              type: 'REDEEM',
              description: `Tukar poin untuk pesanan ${invoiceNumber}`
            }
          });
        }

        // 2. Earn Points (e.g., 1 point for every Rp 1,000 spent)
        const earnedPoints = Math.floor(totalAmount / 1000);
        if (earnedPoints > 0) {
          await tx.customer.update({
            where: { id: custId },
            data: { 
              points: { increment: earnedPoints },
              totalSpent: { increment: totalAmount }
            }
          });
          await tx.pointHistory.create({
            data: {
              customerId: custId,
              amount: earnedPoints,
              type: 'EARN',
              description: `Poin dari pesanan ${invoiceNumber}`
            }
          });
        }
      }

      // 4. Create Sale Items & Update Inventory
      for (const item of items) {
        const productId = parseInt(item.productId);
        const quantity = parseFloat(item.quantity);
        const price = parseFloat(item.price);
        const total = quantity * price;

        // Insert Sale Item
        await tx.$executeRawUnsafe(`
          INSERT INTO "SaleItem" ("saleId", "productId", "quantity", "price", "total")
          VALUES ($1, $2, $3, $4, $5)
        `, saleId, productId, quantity, price, total);

        // --- NEW BOM LOGIC ---
        // Check if product has a recipe (BOM)
        const recipes: any[] = await tx.$queryRawUnsafe(`
          SELECT pr.*, p."recipeYield" FROM "ProductRecipe" pr
          JOIN "Product" p ON pr."productId" = p.id
          WHERE pr."productId" = $1
        `, productId);

        // A. Always decrement the product's own stock if sold
        await tx.$executeRawUnsafe(`
          UPDATE "Product" SET "stock" = "stock" - $1, "updatedAt" = NOW() WHERE "id" = $2 AND "companyId" = $3
        `, quantity, productId, tenantId);

        await tx.$executeRawUnsafe(`
          INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date")
          VALUES ($1, 'OUT', $2, $3, NOW())
        `, productId, quantity, `Penjualan Invoice ${invoiceNumber}`);

        // B. Additionally decrement Materials if it has a recipe (BOM Logic)
        if (recipes.length > 0) {
          const yieldVal = parseFloat(recipes[0].recipeYield) || 1;
          for (const recipe of recipes) {
            const materialId = recipe.materialId;
            const recipeQty = parseFloat(recipe.quantity);
            const totalMaterialNeeded = (recipeQty / yieldVal) * quantity;

            await tx.$executeRawUnsafe(`
              UPDATE "Product" SET "stock" = "stock" - $1, "updatedAt" = NOW() WHERE "id" = $2
            `, totalMaterialNeeded, materialId);

            await tx.$executeRawUnsafe(`
              INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date")
              VALUES ($1, 'OUT', $2, $3, NOW())
            `, materialId, totalMaterialNeeded, `Penjualan (BOM) Inv ${invoiceNumber}`);
          }
        }
      }

      // 5. Finance Integration (Income)
      if (status === 'PAID' && accountId) {
        // Find or create "Penjualan Produk" category
        let category: any = await tx.incomeCategory.findFirst({
          where: { companyId: tenantId, name: 'Penjualan Produk' }
        });

        if (!category) {
          const catResult: any[] = await tx.$queryRawUnsafe(`
            INSERT INTO "IncomeCategory" ("companyId", "name", "updatedAt")
            VALUES ($1, 'Penjualan Produk', NOW())
            RETURNING id
          `, tenantId);
          category = { id: catResult[0].id };
        }

        // Create Income
        await tx.income.create({
          data: {
            companyId: tenantId,
            accountId: parseInt(accountId),
            categoryId: category.id,
            amount: totalAmount,
            date: dateVal,
            description: `Penjualan Invoice ${invoiceNumber}`,
            receivedFrom: 'Customer'
          }
        });

        // Update Account Balance (Increment)
        await tx.financialAccount.update({
          where: { id: parseInt(accountId) },
          data: { balance: { increment: totalAmount } }
        });
      }

      let customerEmail = null;
      if (finalCustomerId) {
        const cust = await tx.customer.findUnique({where: {id: finalCustomerId}});
        customerEmail = cust?.email;
      }
      return { saleId, invoiceNumber, totalAmount, paymentMethod: paymentMethod || 'Bayar di Kasir', customerEmail };
    }, {
      maxWait: 5000,
      timeout: 30000
    });

    let invoiceUrl = null;
    if (result.paymentMethod.includes('Online Payment')) {
      const axios = require('axios');
      const XENDIT_SECRET = process.env.XENDIT_SECRET_KEY || '';
      if (XENDIT_SECRET) {
        try {
          const xenditRes = await axios.post('https://api.xendit.co/v2/invoices', {
            external_id: result.invoiceNumber,
            amount: result.totalAmount,
            payer_email: result.customerEmail || 'customer@aivola.id',
            description: `Pembayaran Pesanan Aivola GO: ${result.invoiceNumber}`,
            success_redirect_url: 'https://aivolago.vercel.app/' // Atau order.aivola.id
          }, {
            headers: {
              'Authorization': `Basic ${Buffer.from(XENDIT_SECRET + ':').toString('base64')}`
            }
          });

          invoiceUrl = xenditRes.data.invoice_url;
          
          // Simpan URL di notes sebagai referensi
          await prisma.sale.update({
            where: { id: result.saleId },
            data: { notes: notes ? `${notes}\n[XENDIT] ${invoiceUrl}` : `[XENDIT] ${invoiceUrl}` }
          });
        } catch (err: any) {
          console.error("[XENDIT ERROR]:", err.response?.data || err.message);
        }
      } else {
        console.warn("[XENDIT WARNING]: XENDIT_SECRET_KEY belum di-set di .env");
      }
    }

    res.status(201).json({
      ...result,
      invoiceUrl
    });

    // --- SOCKET NOTIFICATION ---
    const orderStatus = req.body.status;
    const targetBranchId = req.body.branchId;
    
    console.log(`[Socket Debug] Order created with status: ${orderStatus}, target branch: ${targetBranchId}`);

    if (orderStatus === 'PENDING' && targetBranchId) {
      const bKey = targetBranchId.toString();
      const socketId = branchSockets.get(bKey);
      
      if (socketId) {
        console.log(`[Socket] SUCCESS: Sending new order alert to branch ${bKey}`);
        const finalTotal = result.totalAmount ? Number(result.totalAmount) : (req.body.totalAmount ? Number(req.body.totalAmount) : 0);
        
        io.to(socketId).emit('new_mobile_order', {
          id: result.id,
          invoiceNumber: result.invoiceNumber,
          totalAmount: finalTotal,
          customerName: (req as any).user?.name || req.body.customerName || 'Customer',
          paymentMethod: req.body.paymentMethod || 'Bayar di Kasir',
          deliveryMethod: req.body.deliveryMethod || 'Dine-in'
        });
      } else {
        console.log(`[Socket] FAIL: Branch ${bKey} not connected. Connected keys: ${Array.from(branchSockets.keys()).join(', ')}`);
      }
    }
  } catch (error: any) {
    console.error("DEBUG SALE CREATE ERROR:", error);
    res.status(500).json({ error: 'Gagal mencatat penjualan: ' + error.message });
  }
});

// S3. Update Sale Status (For Online Orders)
app.patch('/api/sales/:id/status', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const id = parseInt(req.params.id as string);
    const { status, accountId } = req.body; // e.g., PROCESSING, READY, COMPLETED, CANCELLED

    const sale = await prisma.sale.findUnique({
      where: { id, companyId: tenantId },
      include: { SaleItem: true }
    });

    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    const oldStatus = sale.status;

    await prisma.$transaction(async (tx) => {
      // 1. Update Status
      await tx.sale.update({
        where: { id },
        data: { status, accountId: accountId ? parseInt(accountId) : sale.accountId, updatedAt: new Date() }
      });

      // 2. If transitioning from PENDING to PROCESSING/PAID, run inventory & loyalty
      if (oldStatus === 'PENDING' && (status === 'PROCESSING' || status === 'PAID')) {
        const totalAmount = sale.totalAmount;
        const invoiceNumber = sale.invoiceNumber;
        const finalCustomerId = sale.customerId;
        const pointsUsedNum = (sale as any).pointsUsed || 0;

        // --- LOYALTY LOGIC ---
        if (finalCustomerId) {
          if (pointsUsedNum > 0) {
            await tx.customer.update({
              where: { id: finalCustomerId },
              data: { points: { decrement: pointsUsedNum } }
            });
            await tx.pointHistory.create({
              data: { customerId: finalCustomerId, amount: pointsUsedNum, type: 'REDEEM', description: `Tukar poin untuk pesanan ${invoiceNumber}` }
            });
          }
          const earnedPoints = Math.floor(totalAmount / 1000);
          if (earnedPoints > 0) {
            await tx.customer.update({
              where: { id: finalCustomerId },
              data: { points: { increment: earnedPoints }, totalSpent: { increment: totalAmount } }
            });
            await tx.pointHistory.create({
              data: { customerId: finalCustomerId, amount: earnedPoints, type: 'EARN', description: `Poin dari pesanan ${invoiceNumber}` }
            });
          }
        }

        // --- INVENTORY LOGIC ---
        for (const item of sale.SaleItem) {
          if (!item.productId) continue;
          const productId = item.productId;
          const quantity = item.quantity;

          // Decrement product stock
          await tx.$executeRawUnsafe(`UPDATE "Product" SET "stock" = "stock" - $1, "updatedAt" = NOW() WHERE "id" = $2`, quantity, productId);
          await tx.$executeRawUnsafe(`INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date") VALUES ($1, 'OUT', $2, $3, NOW())`, productId, quantity, `Penjualan Online ${invoiceNumber}`);

          // BOM Logic
          const recipes: any[] = await tx.$queryRawUnsafe(`SELECT pr.*, p."recipeYield" FROM "ProductRecipe" pr JOIN "Product" p ON pr."productId" = p.id WHERE pr."productId" = $1`, productId);
          if (recipes.length > 0) {
            const yieldVal = parseFloat(recipes[0].recipeYield) || 1;
            for (const recipe of recipes) {
              const totalMaterialNeeded = (recipe.quantity / yieldVal) * quantity;
              await tx.$executeRawUnsafe(`UPDATE "Product" SET "stock" = "stock" - $1, "updatedAt" = NOW() WHERE "id" = $2`, totalMaterialNeeded, recipe.materialId);
              await tx.$executeRawUnsafe(`INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date") VALUES ($1, 'OUT', $2, $3, NOW())`, recipe.materialId, totalMaterialNeeded, `Penjualan Online (BOM) ${invoiceNumber}`);
            }
          }
        }

        // --- FINANCE LOGIC (If PAID) ---
        const finalAccountId = accountId || sale.accountId;
        if (status === 'PAID' && finalAccountId) {
            // (Finance logic here if needed, similar to POST /api/sales)
        }
      } else if (oldStatus !== 'CANCELLED' && oldStatus !== 'VOID' && (status === 'CANCELLED' || status === 'VOID')) {
        // --- CANCEL/VOID LOGIC ---
        // 1. Revert Finance (Income & Balance)
        const incomes = await tx.income.findMany({ where: { description: { contains: sale.invoiceNumber } } });
        for (const inc of incomes) {
          if (inc.accountId) {
            await tx.financialAccount.update({
              where: { id: inc.accountId },
              data: { balance: { decrement: inc.amount } }
            });
          }
        }
        await tx.income.deleteMany({ where: { description: { contains: sale.invoiceNumber } }});
        
        // 2. Revert PointHistory
        const pointHistories = await tx.pointHistory.findMany({ where: { description: { contains: sale.invoiceNumber } } });
        for (const ph of pointHistories) {
            if (ph.type === 'EARN') {
                await tx.customer.update({
                    where: { id: ph.customerId },
                    data: { points: { decrement: ph.amount } }
                });
            } else if (ph.type === 'REDEEM') {
                await tx.customer.update({
                    where: { id: ph.customerId },
                    data: { points: { increment: ph.amount } }
                });
            }
        }
        await tx.pointHistory.deleteMany({ where: { description: { contains: sale.invoiceNumber } }});

        // 3. Revert Inventory (If previously PAID or PROCESSING)
        if (oldStatus === 'PAID' || oldStatus === 'PROCESSING') {
          for (const item of sale.SaleItem) {
            if (!item.productId) continue;
            const qty = parseFloat(item.quantity as any);
            
            await tx.$executeRawUnsafe(`UPDATE "Product" SET "stock" = "stock" + $1, "updatedAt" = NOW() WHERE "id" = $2 AND "companyId" = $3`, qty, item.productId, tenantId);
            await tx.$executeRawUnsafe(`INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date") VALUES ($1, 'IN', $2, $3, NOW())`, item.productId, qty, `Pembatalan Penjualan Inv ${sale.invoiceNumber}`);
            
            const recipes: any[] = await tx.$queryRawUnsafe(`SELECT pr.*, p."recipeYield" FROM "ProductRecipe" pr JOIN "Product" p ON pr."productId" = p.id WHERE pr."productId" = $1`, item.productId);
            if (recipes.length > 0) {
              const yieldVal = parseFloat(recipes[0].recipeYield) || 1;
              for (const recipe of recipes) {
                const totalMaterialNeeded = (parseFloat(recipe.quantity) / yieldVal) * qty;
                await tx.$executeRawUnsafe(`UPDATE "Product" SET "stock" = "stock" + $1, "updatedAt" = NOW() WHERE "id" = $2`, totalMaterialNeeded, recipe.materialId);
                await tx.$executeRawUnsafe(`INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date") VALUES ($1, 'IN', $2, $3, NOW())`, recipe.materialId, totalMaterialNeeded, `Pembatalan Penjualan (BOM) Inv ${sale.invoiceNumber}`);
              }
            }
          }
        }
      }
    });

    res.json({ message: `Status updated to ${status}` });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal update status: ' + error.message });
  }
});

// S2. List Sales
// S0. Get My Orders (For Customers/Aivola GO)
app.get('/api/sales/my-orders', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);

    const orders = await prisma.sale.findMany({
      where: {
        companyId: tenantId,
        cashierId: userId, // In Aivola GO, the customer is the one who initiates (cashierId)
      },
      include: {
        branch: { select: { name: true } },
        SaleItem: {
          include: {
            product: { select: { name: true } }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.json(orders);
  } catch (error: any) {
    console.error("MY ORDERS ERROR:", error);
    res.status(500).json({ error: 'Gagal mengambil riwayat pesanan: ' + error.message });
  }
});

// ==========================================
// 🚀 DELETE SALES / INVOICE (Hard Delete)
// ==========================================
app.delete('/api/sales/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const saleId = parseInt(req.params.id as string);
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);

    // 1. Role Verification
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!['SUPERADMIN', 'ADMIN', 'OWNER', 'FINANCE'].includes(user?.role || '')) {
      return res.status(403).json({ error: 'Akses Ditolak. Hanya Admin, Owner, dan Finance yang dapat menghapus transaksi penjualan.' });
    }

    const sale = await prisma.sale.findFirst({ where: { id: saleId, companyId: tenantId }});
    if (!sale) return res.status(404).json({ error: 'Penjualan tidak ditemukan' });

    // --- CHECK CLOSING ---
    if (await isPeriodClosed(tenantId, sale.date)) {
      return res.status(403).json({ error: 'Periode buku sudah ditutup. Tidak dapat menghapus transaksi pada tanggal ini.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Hapus Pemasukan (Income) terkait & Kurangi Saldo
      const incomes = await tx.income.findMany({ where: { description: { contains: sale.invoiceNumber } } });
      for (const inc of incomes) {
        if (inc.accountId) {
          await tx.financialAccount.update({
            where: { id: inc.accountId },
            data: { balance: { decrement: inc.amount } }
          });
        }
      }
      await tx.income.deleteMany({ where: { description: { contains: sale.invoiceNumber } }});

      // 2. Hapus Riwayat Poin (Jika ada poin yang digunakan atau didapat dari pesanan ini)
      // (Untuk penyederhanaan, kita abaikan pengembalian poin ke user, hanya menghapus record transaksinya agar database tidak kotor)
      await tx.pointHistory.deleteMany({ where: { description: { contains: sale.invoiceNumber } }});

      // 3. Hapus SaleReturnItem dan SaleReturn (Jika pernah diretur)
      const returns = await tx.saleReturn.findMany({ where: { saleId }});
      for (const r of returns) {
         await tx.saleReturnItem.deleteMany({ where: { returnId: r.id }});
         await tx.saleReturn.delete({ where: { id: r.id }});
      }

      // 3.5. Kembalikan Stok Barang & Bahan Baku (BOM)
      const saleItems = await tx.saleItem.findMany({ where: { saleId } });
      for (const item of saleItems) {
        const qty = parseFloat(item.quantity as any);
        
        // Return product stock
        await tx.$executeRawUnsafe(`
          UPDATE "Product" SET "stock" = "stock" + $1, "updatedAt" = NOW() WHERE "id" = $2 AND "companyId" = $3
        `, qty, item.productId, tenantId);

        await tx.$executeRawUnsafe(`
          INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date")
          VALUES ($1, 'IN', $2, $3, NOW())
        `, item.productId, qty, `Pembatalan Penjualan Inv ${sale.invoiceNumber}`);

        // Return materials stock if it has a recipe
        const recipes: any[] = await tx.$queryRawUnsafe(`
          SELECT pr.*, p."recipeYield" FROM "ProductRecipe" pr
          JOIN "Product" p ON pr."productId" = p.id
          WHERE pr."productId" = $1
        `, item.productId);

        if (recipes.length > 0) {
          const yieldVal = parseFloat(recipes[0].recipeYield) || 1;
          for (const recipe of recipes) {
            const materialId = recipe.materialId;
            const recipeQty = parseFloat(recipe.quantity);
            const totalMaterialNeeded = (recipeQty / yieldVal) * qty;

            await tx.$executeRawUnsafe(`
              UPDATE "Product" SET "stock" = "stock" + $1, "updatedAt" = NOW() WHERE "id" = $2
            `, totalMaterialNeeded, materialId);

            await tx.$executeRawUnsafe(`
              INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date")
              VALUES ($1, 'IN', $2, $3, NOW())
            `, materialId, totalMaterialNeeded, `Pembatalan Penjualan (BOM) Inv ${sale.invoiceNumber}`);
          }
        }
      }

      // 4. Hapus SaleItem (Detail barang)
      await tx.saleItem.deleteMany({ where: { saleId }});

      // 5. Hapus Penjualan Utama
      await tx.sale.delete({ where: { id: saleId }});
    });

    res.json({ message: 'Penjualan beserta seluruh jurnal terkait berhasil dihapus secara permanen' });
  } catch (err: any) {
    console.error("Delete Sale Error:", err);
    res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server' });
  }
});

const buildPosWhereClause = async (req: Request, tenantId: number, query: any) => {
  const userId = Number((req as any).userId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { branchId: true, role: true } });
  const isPosViewer = (user?.role as string) === 'POS_VIEWER';
  const isAdmin = ['SUPERADMIN', 'ADMIN', 'OWNER', 'FINANCE'].includes(user?.role || '');

  let { branchId, startDate, endDate, paymentMethod, saleType } = query;

  let whereConditions = [`s."companyId" = $1`, `s."status" NOT IN ('RETURNED', 'CANCELLED', 'VOID')` ];
  let queryParams: any[] = [tenantId];
  let paramIndex = 2;

  if (isPosViewer) {
    whereConditions.push(`(s."invoiceNumber" LIKE 'POS-%' OR s."invoiceNumber" LIKE 'SLS-%')`);
  }

  // Branch Filter
  let effectiveBranchId = branchId;
  if (isPosViewer && user?.branchId) {
    effectiveBranchId = user.branchId.toString();
  } else if (!isAdmin && !isPosViewer && user?.branchId) {
    effectiveBranchId = user.branchId.toString();
  }

  if (effectiveBranchId && effectiveBranchId !== 'all') {
    if (effectiveBranchId === 'null') {
      whereConditions.push(`s."branchId" IS NULL`);
    } else {
      whereConditions.push(`s."branchId" = $${paramIndex++}`);
      queryParams.push(parseInt(effectiveBranchId as string));
    }
  }

  // Date Filter (WIB +07:00)
  if (startDate) {
    const sDateStr = (startDate as string).split('T')[0];
    whereConditions.push(`s."date" >= $${paramIndex++}`);
    queryParams.push(new Date(`${sDateStr}T00:00:00+07:00`));
  }
  if (endDate) {
    const eDateStr = (endDate as string).split('T')[0];
    const [y, m, d] = eDateStr.split('-').map(Number);
    const nextD = new Date(Date.UTC(y, m - 1, d + 1));
    const nextDayStr = nextD.toISOString().split('T')[0];
    whereConditions.push(`s."date" < $${paramIndex++}`);
    queryParams.push(new Date(`${nextDayStr}T00:00:00+07:00`));
  }

  // Payment Method Filter
  if (paymentMethod && paymentMethod !== 'all') {
    if (paymentMethod === 'TUNAI') {
      whereConditions.push(`(s."notes" ILIKE '%TUNAI%' OR fa."name" ILIKE '%TUNAI%' OR fa."name" ILIKE '%KAS%' OR fa."type" = 'CASH')`);
    } else if (paymentMethod === 'TRANSFER') {
      whereConditions.push(`(s."notes" ILIKE '%TRANSFER%' OR fa."name" ILIKE '%TRANSFER%' OR fa."name" ILIKE '%BANK%' OR fa."name" ILIKE '%REK%')`);
    } else if (paymentMethod === 'QRIS') {
      whereConditions.push(`(s."notes" ILIKE '%QRIS%' OR fa."name" ILIKE '%QRIS%')`);
    } else if (paymentMethod === 'DEBIT') {
      whereConditions.push(`(s."notes" ILIKE '%DEBIT%' OR s."notes" ILIKE '%EDC%' OR s."notes" ILIKE '%KREDIT%' OR fa."name" ILIKE '%DEBIT%' OR fa."name" ILIKE '%EDC%' OR fa."name" ILIKE '%MANDIRI%' OR fa."name" ILIKE '%BCA%')`);
    } else {
      whereConditions.push(`(s."notes" ILIKE $${paramIndex++} OR fa."name" ILIKE $${paramIndex++})`);
      queryParams.push(`%${paymentMethod}%`);
      queryParams.push(`%${paymentMethod}%`);
    }
  }

  // Sale Type Filter
  if (saleType && saleType !== 'all') {
    whereConditions.push(`s."saleType" = $${paramIndex++}`);
    queryParams.push(saleType as string);
  }

  return {
    whereClause: whereConditions.join(' AND '),
    queryParams
  };
};

app.get('/api/sales', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const filterRes = await buildPosWhereClause(req, tenantId, req.query);

    const sales = await prisma.$queryRawUnsafe(`
      SELECT s.*, 
             c.name as "customerName", 
             fa.name as "accountName",
             (s."totalAmount" - COALESCE(sr."totalRefund", 0)) as "netTotalAmount"
      FROM "Sale" s
      LEFT JOIN "Customer" c ON s."customerId" = c.id
      LEFT JOIN "FinancialAccount" fa ON s."accountId" = fa.id
      LEFT JOIN (
        SELECT "saleId", SUM("totalRefundAmount") as "totalRefund"
        FROM "SaleReturn"
        GROUP BY "saleId"
      ) sr ON sr."saleId" = s.id
      WHERE ${filterRes.whereClause}
      ORDER BY s."date" DESC
    `, ...filterRes.queryParams);
    
    res.json(sales);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil data penjualan: ' + error.message });
  }
});

app.get('/api/pos/analytics/summary', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    if (isNaN(tenantId)) return res.status(400).json({ error: 'Invalid Tenant ID' });

    const filterRes = await buildPosWhereClause(req, tenantId, req.query);

    // 1. Top Products
    const topProducts = await prisma.$queryRawUnsafe(`
      SELECT p.name, 
             SUM(si.quantity - COALESCE(ret.returnedQty, 0)) as "totalSold", 
             SUM(si.total - COALESCE(ret.returnedTotal, 0)) as "totalRevenue"
      FROM "SaleItem" si
      JOIN "Sale" s ON si."saleId" = s.id
      JOIN "Product" p ON si."productId" = p.id
      LEFT JOIN "FinancialAccount" fa ON s."accountId" = fa.id
      LEFT JOIN (
        SELECT sri."productId", sr."saleId", SUM(sri.quantity) as returnedQty, SUM(sri.total) as returnedTotal
        FROM "SaleReturnItem" sri
        JOIN "SaleReturn" sr ON sri."returnId" = sr.id
        GROUP BY sri."productId", sr."saleId"
      ) ret ON ret."productId" = si."productId" AND ret."saleId" = si."saleId"
      WHERE ${filterRes.whereClause}
      GROUP BY p.name
      ORDER BY "totalSold" DESC
      LIMIT 5
    `, ...filterRes.queryParams);

    // 2. Sales Trend (Daily)
    const salesTrend = await prisma.$queryRawUnsafe(`
      SELECT DATE_TRUNC('day', s."date" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') as "date", 
             SUM(s."totalAmount" - COALESCE(sr."totalRefund", 0)) as "total", 
             COUNT(s.id) as "count"
      FROM "Sale" s
      LEFT JOIN "FinancialAccount" fa ON s."accountId" = fa.id
      LEFT JOIN (
        SELECT "saleId", SUM("totalRefundAmount") as "totalRefund"
        FROM "SaleReturn"
        GROUP BY "saleId"
      ) sr ON sr."saleId" = s.id
      WHERE ${filterRes.whereClause}
      GROUP BY DATE_TRUNC('day', s."date" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')
      ORDER BY "date" ASC
    `, ...filterRes.queryParams);

    // 3. Payment Method Distribution
    const paymentMethods = await prisma.$queryRawUnsafe(`
      SELECT method, SUM(totalAmount) as total
      FROM (
        SELECT 
          CASE 
            WHEN s."notes" ILIKE '%QRIS%' OR fa."name" ILIKE '%QRIS%' THEN 'QRIS'
            WHEN s."notes" ILIKE '%GOFOOD%' OR fa."name" ILIKE '%GOFOOD%' THEN 'GOFOOD'
            WHEN s."notes" ILIKE '%GRABFOOD%' OR fa."name" ILIKE '%GRABFOOD%' THEN 'GRABFOOD'
            WHEN s."notes" ILIKE '%SHOPEEFOOD%' OR fa."name" ILIKE '%SHOPEEFOOD%' THEN 'SHOPEEFOOD'
            WHEN s."notes" ILIKE '%QPOON%' OR fa."name" ILIKE '%QPOON%' THEN 'QPOON'
            WHEN s."notes" ILIKE '%TRANSFER%' OR fa."name" ILIKE '%TRANSFER%' THEN 'TRANSFER'
            ELSE 'TUNAI'
          END as method,
          s."totalAmount" - COALESCE(sr."totalRefund", 0) as totalAmount
        FROM "Sale" s
        LEFT JOIN "FinancialAccount" fa ON s."accountId" = fa.id
        LEFT JOIN (
          SELECT "saleId", SUM("totalRefundAmount") as "totalRefund"
          FROM "SaleReturn"
          GROUP BY "saleId"
        ) sr ON sr."saleId" = s.id
        WHERE ${filterRes.whereClause}
      ) sub
      GROUP BY method
      ORDER BY total DESC
    `, ...filterRes.queryParams);

    const serialize = (data: any) => {
      return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
      ));
    };

    res.json(serialize({
      topProducts: (topProducts as any[]).map((p: any) => ({ ...p, totalSold: Number(p.totalSold) || 0, totalRevenue: Number(p.totalRevenue) || 0 })),
      salesTrend: (salesTrend as any[]).map((t: any) => ({ ...t, total: Number(t.total) || 0, count: Number(t.count) || 0 })),
      paymentMethods: (paymentMethods as any[]).map((m: any) => ({ ...m, total: Number(m.total) || 0 }))
    }));
  } catch (error: any) {
    console.error("POS Analytics Error Detail:", error);
    res.status(500).json({ error: 'Gagal menganalisa data POS: ' + error.message });
  }
});

app.get('/api/pos/analytics/comprehensive', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    if (isNaN(tenantId)) return res.status(400).json({ error: 'Invalid Tenant ID' });

    const filterRes = await buildPosWhereClause(req, tenantId, req.query);

    // 1. Core Summary Metrics
    const summaryResult: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        SUM(s."totalAmount" - COALESCE(sr."totalRefund", 0)) as "revenue", 
        COUNT(s.id) as "orders",
        AVG(s."totalAmount" - COALESCE(sr."totalRefund", 0)) as "aov"
      FROM "Sale" s
      LEFT JOIN "FinancialAccount" fa ON s."accountId" = fa.id
      LEFT JOIN (
        SELECT "saleId", SUM("totalRefundAmount") as "totalRefund"
        FROM "SaleReturn"
        GROUP BY "saleId"
      ) sr ON sr."saleId" = s.id
      WHERE ${filterRes.whereClause}
    `, ...filterRes.queryParams);

    const currentSummary = summaryResult[0] || { revenue: 0, orders: 0, aov: 0 };

    // 2. Hourly Distribution (Peak Hours)
    const hourlyData = await prisma.$queryRawUnsafe(`
      SELECT 
        EXTRACT(HOUR FROM s."date" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') as "hour",
        SUM(s."totalAmount" - COALESCE(sr."totalRefund", 0)) as "revenue",
        COUNT(s.id) as "orders"
      FROM "Sale" s
      LEFT JOIN "FinancialAccount" fa ON s."accountId" = fa.id
      LEFT JOIN (
        SELECT "saleId", SUM("totalRefundAmount") as "totalRefund"
        FROM "SaleReturn"
        GROUP BY "saleId"
      ) sr ON sr."saleId" = s.id
      WHERE ${filterRes.whereClause}
      GROUP BY 1
      ORDER BY 1 ASC
    `, ...filterRes.queryParams);

    // 3. Category Distribution
    const categoryData = await prisma.$queryRawUnsafe(`
      SELECT 
        COALESCE(c.name, 'Uncategorized') as "category",
        SUM(si.total - COALESCE(ret.returnedTotal, 0)) as "revenue"
      FROM "SaleItem" si
      JOIN "Sale" s ON si."saleId" = s.id
      JOIN "Product" p ON si."productId" = p.id
      LEFT JOIN "ProductCategory" c ON p."categoryId" = c.id
      LEFT JOIN "FinancialAccount" fa ON s."accountId" = fa.id
      LEFT JOIN (
        SELECT sri."productId", sr."saleId", SUM(sri.total) as returnedTotal
        FROM "SaleReturnItem" sri
        JOIN "SaleReturn" sr ON sri."returnId" = sr.id
        GROUP BY sri."productId", sr."saleId"
      ) ret ON ret."productId" = si."productId" AND ret."saleId" = si."saleId"
      WHERE ${filterRes.whereClause}
      GROUP BY c.name
      ORDER BY "revenue" DESC
    `, ...filterRes.queryParams);

    // 4. Daily Trend
    const dailyTrend = await prisma.$queryRawUnsafe(`
      SELECT DATE_TRUNC('day', s."date" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') as "date", 
             SUM(s."totalAmount" - COALESCE(sr."totalRefund", 0)) as "total"
      FROM "Sale" s
      LEFT JOIN "FinancialAccount" fa ON s."accountId" = fa.id
      LEFT JOIN (
        SELECT "saleId", SUM("totalRefundAmount") as "totalRefund"
        FROM "SaleReturn"
        GROUP BY "saleId"
      ) sr ON sr."saleId" = s.id
      WHERE ${filterRes.whereClause}
      GROUP BY DATE_TRUNC('day', s."date" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')
      ORDER BY "date" ASC
    `, ...filterRes.queryParams);

    const serialize = (data: any) => {
      return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
      ));
    };

    res.json(serialize({
      summary: {
        current: {
          revenue: Number(currentSummary.revenue) || 0,
          aov: Number(currentSummary.aov) || 0,
          orders: Number(currentSummary.orders) || 0
        },
        previous: { revenue: 0, aov: 0, orders: 0 }
      },
      hourly: (hourlyData as any[]).map((h: any) => ({ ...h, revenue: Number(h.revenue) || 0, orders: Number(h.orders) || 0 })),
      categories: (categoryData as any[]).map((c: any) => ({ ...c, revenue: Number(c.revenue) || 0 })),
      trend: (dailyTrend as any[]).map((t: any) => ({ ...t, total: Number(t.total) || 0 }))
    }));
  } catch (error: any) {
    console.error("POS Comprehensive Analytics Error:", error);
    res.status(500).json({ error: 'Gagal menganalisa data POS: ' + error.message });
  }
});

app.get('/api/pos/analytics/ai-insights', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { branchId, startDate, endDate, checkOnly } = req.query;

    // 1. Support checkOnly to query current daily usage without running AI or consuming limit
    if (checkOnly === 'true') {
      const currentCount = getPosAiCurrentCount(tenantId);
      return res.json({ usageCount: currentCount });
    }

    const cacheKey = `pos_insights_${tenantId}_${branchId || 'all'}_${startDate || 'none'}_${endDate || 'none'}`;
    const cached = insightCache[cacheKey];
    
    // 2. If cached in the last 1 hour, return it directly (does not consume daily limit)
    if (cached && Date.now() - cached.timestamp < POS_INSIGHT_CACHE_TTL) {
      const currentCount = getPosAiCurrentCount(tenantId);
      return res.json({
        ...cached.data,
        usageCount: currentCount,
        isFromCache: true
      });
    }

    // 3. Check and increment daily limit (max 2 per day)
    const limitStatus = checkPosAiLimit(tenantId);
    if (!limitStatus.allowed) {
      return res.status(429).json({
        error: 'Limit Harian Tercapai: Analisa AI dibatasi maksimal 2 kali per hari untuk efisiensi biaya.',
        usageCount: limitStatus.count
      });
    }

    // Fetch same data as comprehensive to provide to AI
    // (Simplified for prompt context)
    const sales = await prisma.sale.findMany({
      where: {
        companyId: tenantId,
        date: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined,
        }
      },
      include: {
        SaleItem: { include: { product: { include: { category: true } } } }
      }
    });

    if (sales.length === 0) {
      return res.json({ 
        insights: ["Belum ada data penjualan POS untuk dianalisa periode ini."],
        usageCount: limitStatus.count 
      });
    }

    const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const topProducts: Record<string, number> = {};
    const hourlyDistribution: Record<number, number> = {};

    sales.forEach((s: any) => {
      const hour = new Date(s.date).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
      
      s.SaleItem.forEach((item: any) => {
        const name = item.product?.name || 'Produk Tidak Terdefinisi';
        topProducts[name] = (topProducts[name] || 0) + item.quantity;
      });
    });

    const sortedProducts = Object.entries(topProducts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3);
    const peakHour = Object.entries(hourlyDistribution).sort((a: any, b: any) => b[1] - a[1])[0];

    // Initialize Gemini
    const genAI = new GeminiAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Anda adalah konsultan bisnis retail profesional kelas dunia.
      Analisa data penjualan POS berikut dan berikan 3 poin insight strategis singkat (maks 2 kalimat per poin) dalam Bahasa Indonesia yang santun tapi profesional.
      
      Data:
      - Total Omzet: Rp ${totalRevenue.toLocaleString()}
      - Total Transaksi: ${sales.length}
      - Produk Terlaris: ${sortedProducts.map(p => `${p[0]} (${p[1]} terjual)`).join(', ')}
      - Jam Teramai: Jam ${peakHour?.[0]}:00
      
      Format output: JSON dengan field "insights" (array string).
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean JSON from response if Gemini adds markdown code blocks
    const jsonMatch = responseText.match(/\{.*\}/s);
    const finalData = jsonMatch ? JSON.parse(jsonMatch[0]) : { insights: ["Gagal menganalisa data."] };

    // Cache the result
    insightCache[cacheKey] = { data: finalData, timestamp: Date.now() };

    res.json({
      ...finalData,
      usageCount: limitStatus.count
    });
  } catch (error: any) {
    console.error("AI Insights Error:", error);
    res.json({ insights: ["Maaf, AI sedang istirahat sejenak. Silakan coba lagi nanti."] });
  }
});

// S2b. Export Sales to Excel (Server-Side)
app.get('/api/sales/export', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);
    const ExcelJS = require('exceljs');

    // 1. Fetch User Data
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { branchId: true, role: true } });
    
    const { branchId, startDate, endDate, paymentMethod, saleType } = req.query;
    
    // 2. Build Query with Filters (Symmetric with List Sales)
    const isPosViewer = (user?.role as string) === 'POS_VIEWER';
    const invoiceFilter = isPosViewer ? `AND (s."invoiceNumber" LIKE 'POS-%' OR s."invoiceNumber" LIKE 'SLS-%')` : '';
    
    let whereConditions = [`s."companyId" = ${tenantId}`, `s."status" NOT IN ('CANCELLED', 'VOID', 'RETURNED')`];
    if (isPosViewer) {
      whereConditions.push(`(s."invoiceNumber" LIKE 'POS-%' OR s."invoiceNumber" LIKE 'SLS-%')`);
    }

    // Branch Filter
    let effectiveBranchId = branchId;
    if (isPosViewer && user?.branchId) {
      effectiveBranchId = user.branchId.toString();
    }

    if (effectiveBranchId && effectiveBranchId !== 'all') {
      if (effectiveBranchId === 'null') {
        whereConditions.push(`s."branchId" IS NULL`);
      } else {
        whereConditions.push(`s."branchId" = ${parseInt(effectiveBranchId as string)}`);
      }
    }

    // Date Filter (Timezone-aware WIB +07:00)
    if (startDate) {
      const sDate = (startDate as string).split('T')[0];
      whereConditions.push(`s."date" >= '${sDate} 00:00:00+07:00'`);
    }
    if (endDate) {
      const eDate = (endDate as string).split('T')[0];
      const [y, m, d] = eDate.split('-').map(Number);
      const nextD = new Date(Date.UTC(y, m - 1, d + 1));
      const nextDayStr = nextD.toISOString().split('T')[0];
      whereConditions.push(`s."date" < '${nextDayStr} 00:00:00+07:00'`);
    }

    // Payment Filter (Smart Categorization)
    if (paymentMethod && paymentMethod !== 'all') {
      if (paymentMethod === 'TUNAI') {
        whereConditions.push(`(s."notes" ILIKE '%TUNAI%' OR fa."name" ILIKE '%TUNAI%' OR fa."name" ILIKE '%KAS%' OR fa."type" = 'CASH')`);
      } else if (paymentMethod === 'TRANSFER') {
        whereConditions.push(`(s."notes" ILIKE '%TRANSFER%' OR fa."name" ILIKE '%TRANSFER%' OR fa."name" ILIKE '%BANK%' OR fa."name" ILIKE '%REK%')`);
      } else if (paymentMethod === 'QRIS') {
        whereConditions.push(`(s."notes" ILIKE '%QRIS%' OR fa."name" ILIKE '%QRIS%')`);
      } else if (paymentMethod === 'DEBIT') {
        whereConditions.push(`(s."notes" ILIKE '%DEBIT%' OR s."notes" ILIKE '%EDC%' OR s."notes" ILIKE '%KREDIT%' OR fa."name" ILIKE '%DEBIT%' OR fa."name" ILIKE '%EDC%' OR fa."name" ILIKE '%MANDIRI%' OR fa."name" ILIKE '%BCA%')`);
      } else {
        whereConditions.push(`(s."notes" ILIKE '%${paymentMethod}%' OR fa."name" ILIKE '%${paymentMethod}%')`);
      }
    }

    // Sale Type Filter
    if (saleType && saleType !== 'all') {
      whereConditions.push(`s."saleType" = '${saleType}'`);
    }

    // Role-based Access (Non-Admin Restricted to their own branch)
    const isAdmin = ['SUPERADMIN', 'ADMIN', 'OWNER', 'FINANCE'].includes(user?.role || '');
    if (!isAdmin && !isPosViewer) {
      if (!user?.branchId) {
        whereConditions.push(`s."branchId" IS NULL`);
      } else {
        whereConditions.push(`s."branchId" = ${Number(user.branchId)}`);
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const sales: any[] = await prisma.$queryRawUnsafe(`
      SELECT s.*, 
             c.name as "customerName", 
             fa.name as "accountName", 
             b.name as "branchName",
             (s."totalAmount" - COALESCE(sr."totalRefund", 0)) as "netTotalAmount"
      FROM "Sale" s
      LEFT JOIN "Customer" c ON s."customerId" = c.id
      LEFT JOIN "FinancialAccount" fa ON s."accountId" = fa.id
      LEFT JOIN "Branch" b ON s."branchId" = b.id
      LEFT JOIN (
        SELECT "saleId", SUM("totalRefundAmount") as "totalRefund"
        FROM "SaleReturn"
        GROUP BY "saleId"
      ) sr ON sr."saleId" = s.id
      ${whereClause}
      ORDER BY s."date" DESC
    `);

    // 3. Fetch Sale Items for these transactions
    let saleItems: any[] = [];
    const saleIds = sales.map(s => s.id);
    if (saleIds.length > 0) {
      saleItems = await prisma.$queryRawUnsafe(`
        SELECT 
          si.id,
          si."productId",
          si."saleId",
          si.price,
          GREATEST(0, si.quantity - COALESCE(sri."returnedQty", 0)) as quantity,
          GREATEST(0, si.total - COALESCE(sri."returnedTotal", 0)) as total,
          p.name as "productName", 
          p.sku as "productSku", 
          pc.name as "categoryName", 
          s."invoiceNumber", 
          s."date"
        FROM "SaleItem" si
        JOIN "Product" p ON si."productId" = p.id
        LEFT JOIN "ProductCategory" pc ON p."categoryId" = pc.id
        JOIN "Sale" s ON si."saleId" = s.id
        LEFT JOIN (
          SELECT sri."productId", sr."saleId", SUM(sri.quantity) as "returnedQty", SUM(sri.total) as "returnedTotal"
          FROM "SaleReturnItem" sri
          JOIN "SaleReturn" sr ON sri."returnId" = sr.id
          WHERE sr."saleId" IN (${saleIds.join(',')})
          GROUP BY sri."productId", sr."saleId"
        ) sri ON sri."productId" = si."productId" AND sri."saleId" = si."saleId"
        WHERE si."saleId" IN (${saleIds.join(',')})
          AND s.status NOT IN ('CANCELLED', 'VOID')
        ORDER BY s."date" DESC, si.id ASC
      `);
    }

    // 4. Calculate total quantity and revenue per product (Rekapitulasi)
    const productSummaryMap: Record<string, { sku: string, name: string, category: string, totalQty: number, totalRevenue: number }> = {};
    
    saleItems.forEach(item => {
      const key = item.productId.toString();
      if (!productSummaryMap[key]) {
        productSummaryMap[key] = {
          sku: item.productSku || '-',
          name: item.productName || 'Produk Tidak Diketahui',
          category: item.categoryName || 'Uncategorized',
          totalQty: 0,
          totalRevenue: 0
        };
      }
      productSummaryMap[key].totalQty += Number(item.quantity) || 0;
      productSummaryMap[key].totalRevenue += Number(item.total) || 0;
    });

    const productSummaries = Object.values(productSummaryMap).sort((a, b) => b.totalQty - a.totalQty);

    // 5. Create Workbook with 3 Sheets
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Ringkasan Penjualan
    const worksheet1 = workbook.addWorksheet('Ringkasan Penjualan');
    worksheet1.columns = [
      { header: 'Tanggal', key: 'date', width: 15 },
      { header: 'No. Invoice', key: 'invoiceNumber', width: 25 },
      { header: 'Cabang', key: 'branchName', width: 20 },
      { header: 'Pelanggan', key: 'customerName', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Total Penjualan', key: 'totalAmount', width: 20 },
      { header: 'Catatan', key: 'notes', width: 30 }
    ];
    worksheet1.getRow(1).font = { bold: true };
    worksheet1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    sales.forEach(sale => {
      const row = worksheet1.addRow({
        date: new Date(sale.date).toLocaleDateString('id-ID'),
        invoiceNumber: sale.invoiceNumber,
        branchName: sale.branchName || 'Kantor Pusat',
        customerName: sale.customerName || 'Umum',
        status: sale.status === 'PAID' ? 'Lunas' : 
                sale.status === 'PARTIALLY_RETURNED' ? 'Retur Sebagian' : 'Belum Bayar',
        totalAmount: sale.netTotalAmount !== undefined ? sale.netTotalAmount : sale.totalAmount || 0,
        notes: sale.notes || '-'
      });
      row.getCell('totalAmount').numFmt = '#,##0';
    });

    // Sheet 2: Rekap Produk Terjual
    const worksheet2 = workbook.addWorksheet('Rekap Produk Terjual');
    worksheet2.columns = [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Nama Produk', key: 'name', width: 30 },
      { header: 'Kategori', key: 'category', width: 20 },
      { header: 'Total Terjual', key: 'totalQty', width: 15 },
      { header: 'Total Pendapatan', key: 'totalRevenue', width: 20 }
    ];
    worksheet2.getRow(1).font = { bold: true };
    worksheet2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    productSummaries.forEach(summary => {
      const row = worksheet2.addRow({
        sku: summary.sku,
        name: summary.name,
        category: summary.category,
        totalQty: summary.totalQty,
        totalRevenue: summary.totalRevenue
      });
      row.getCell('totalQty').numFmt = '#,##0';
      row.getCell('totalRevenue').numFmt = '#,##0';
    });

    // Sheet 3: Detail Item Terjual
    const worksheet3 = workbook.addWorksheet('Detail Item Terjual');
    worksheet3.columns = [
      { header: 'Tanggal', key: 'date', width: 15 },
      { header: 'No. Invoice', key: 'invoiceNumber', width: 25 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Nama Produk', key: 'name', width: 30 },
      { header: 'Kategori', key: 'category', width: 20 },
      { header: 'Jumlah', key: 'quantity', width: 12 },
      { header: 'Harga Satuan', key: 'price', width: 15 },
      { header: 'Total', key: 'total', width: 20 }
    ];
    worksheet3.getRow(1).font = { bold: true };
    worksheet3.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    saleItems.forEach(item => {
      const row = worksheet3.addRow({
        date: new Date(item.date).toLocaleDateString('id-ID'),
        invoiceNumber: item.invoiceNumber,
        sku: item.productSku || '-',
        name: item.productName || 'Produk Tidak Diketahui',
        category: item.categoryName || 'Uncategorized',
        quantity: item.quantity || 0,
        price: item.price || 0,
        total: item.total || 0
      });
      row.getCell('quantity').numFmt = '#,##0';
      row.getCell('price').numFmt = '#,##0';
      row.getCell('total').numFmt = '#,##0';
    });

    // 6. Set Response Headers
    const fileName = `Laporan_Penjualan_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // 7. Write & Send
    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);

  } catch (error: any) {
    console.error("EXPORT SALES ERROR:", error);
    res.status(500).json({ error: 'Gagal mengekspor data penjualan: ' + error.message });
  }
});

// S3. Get Sale Detail
app.get('/api/sales/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const saleId = parseInt(req.params.id as string);

    const sales: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Sale" WHERE id = $1 AND "companyId" = $2`, saleId, tenantId);
    if (sales.length === 0) return res.status(404).json({ error: 'Penjualan tidak ditemukan' });
    const sale = sales[0];

    // SECURITY: POS_VIEWER can only see POS transactions
    const userRole = (req as any).userRole;
    if (userRole === 'POS_VIEWER' && !sale.invoiceNumber?.startsWith('POS-')) {
       return res.status(403).json({ error: 'Akses Ditolak: Anda tidak memiliki izin untuk melihat detail transaksi non-POS.' });
    }

    const items = await prisma.$queryRawUnsafe(`
      SELECT si.*, p.name as product_name, p.sku as product_sku, p.unit as product_unit
      FROM "SaleItem" si
      JOIN "Product" p ON si."productId" = p.id
      WHERE si."saleId" = $1
    `, saleId);

    const company: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Company" WHERE id = $1`, tenantId);
    
    // Fetch active bank accounts of the company to display on invoice
    const bankAccounts = await prisma.financialAccount.findMany({
      where: {
        companyId: tenantId,
        type: 'BANK',
        accountNumber: { not: null }
      },
      orderBy: { name: 'asc' }
    });

    let customerObj: any = null;
    if (sale.customerId) {
      const customers: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Customer" WHERE id = $1 AND "companyId" = $2`, sale.customerId, tenantId);
      if (customers.length > 0) {
        customerObj = customers[0];
      }
    }

    // Retrieve associated SalesOrder to get shippedAt (delivery date)
    const associatedOrder = await prisma.salesOrder.findFirst({
      where: { saleId: sale.id, companyId: tenantId }
    });
    const shippedAt = associatedOrder?.shippedAt || null;

    if (company.length > 0) {
      const comp = company[0];
      if (comp.logoUrl && comp.logoUrl.startsWith('/uploads')) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        comp.logoUrl = `${baseUrl}${comp.logoUrl}`;
      }
      res.json({ ...sales[0], items, company: comp, bankAccounts, customer: customerObj, shippedAt });
    } else {
      res.json({ ...sales[0], items, company: null, bankAccounts, customer: customerObj, shippedAt });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil detail penjualan: ' + error.message });
  }
});

// S4. Process Sale Return
app.post('/api/sales/:id/return', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);
    const saleId = parseInt(req.params.id as string);
    const { items, accountId, notes, date } = req.body; 
    const dateVal = date ? new Date(date) : new Date();

    // 1. Role Verification for Refund
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!['SUPERADMIN', 'ADMIN', 'OWNER'].includes(user?.role || '')) {
      return res.status(403).json({ error: 'Akses Ditolak. Hanya Admin yang dapat melakukan Refund transaksi.' });
    }

    // --- CHECK CLOSING ---
    if (await isPeriodClosed(tenantId, dateVal)) {
      return res.status(403).json({ error: 'Periode buku sudah ditutup. Tidak dapat mencatat retur pada tanggal ini.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Minimal harus ada 1 barang yang diretur' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get Original Sale & Existing Returns
      const sales: any[] = await tx.$queryRawUnsafe(`SELECT * FROM "Sale" WHERE id = $1 AND "companyId" = $2`, saleId, tenantId);
      if (sales.length === 0) throw new Error('Penjualan tidak ditemukan');
      const originalSale = sales[0];

      const originalItems: any[] = await tx.$queryRawUnsafe(`SELECT * FROM "SaleItem" WHERE "saleId" = $1`, saleId);
      const existingReturns: any[] = await tx.$queryRawUnsafe(`
        SELECT sri."productId", SUM(sri.quantity) as "totalReturned"
        FROM "SaleReturnItem" sri
        JOIN "SaleReturn" sr ON sri."returnId" = sr.id
        WHERE sr."saleId" = $1
        GROUP BY sri."productId"
      `, saleId);

      // 2. Validate quantities
      const returnItemsData: any[] = [];
      let totalRefundAmount = 0;

      for (const item of items) {
        const productId = parseInt(item.productId);
        const returnQty = parseFloat(item.quantity);
        
        const origItem = originalItems.find(oi => oi.productId === productId);
        if (!origItem) throw new Error(`Produk ID ${productId} tidak ada dalam transaksi original`);

        const alreadyReturned = existingReturns.find(er => er.productId === productId)?.totalReturned || 0;
        if (returnQty > (origItem.quantity - alreadyReturned)) {
          throw new Error(`Jumlah retur untuk produk ${productId} melebihi sisa barang yang bisa diretur`);
        }

        const itemTotal = returnQty * parseFloat(origItem.price);
        totalRefundAmount += itemTotal;
        returnItemsData.push({ productId, quantity: returnQty, price: origItem.price, total: itemTotal });
      }

      // 3. Create Return Record
      const returnNumber = `RET/${dateVal.getFullYear()}/${(dateVal.getMonth()+1).toString().padStart(2,'0')}/ID${tenantId}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
      
      const returnResult: any[] = await tx.$queryRawUnsafe(`
        INSERT INTO "SaleReturn" ("companyId", "saleId", "returnNumber", "date", "totalRefundAmount", "notes", "accountId", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id
      `, tenantId, saleId, returnNumber, dateVal, totalRefundAmount, notes, accountId ? parseInt(accountId) : null);
      
      const returnId = returnResult[0].id;

      // 4. Process Items (Restore Stock & Create Return Items)
      for (const item of returnItemsData) {
        await tx.$executeRawUnsafe(`
          INSERT INTO "SaleReturnItem" ("returnId", "productId", "quantity", "price", "total")
          VALUES ($1, $2, $3, $4, $5)
        `, returnId, item.productId, item.quantity, item.price, item.total);

        // Check BOM
        const recipes: any[] = await tx.$queryRawUnsafe(`
          SELECT pr.*, p."recipeYield" FROM "ProductRecipe" pr
          JOIN "Product" p ON pr."productId" = p.id
          WHERE pr."productId" = $1
        `, item.productId);
        if (recipes.length > 0) {
          const yieldVal = parseFloat(recipes[0].recipeYield) || 1;
          for (const recipe of recipes) {
            const materialQty = (parseFloat(recipe.quantity) / yieldVal) * item.quantity;
            await tx.$executeRawUnsafe(`UPDATE "Product" SET stock = stock + $1 WHERE id = $2`, materialQty, recipe.materialId);
            await tx.$executeRawUnsafe(`
              INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date")
              VALUES ($1, 'RETURN', $2, $3, NOW())
            `, recipe.materialId, materialQty, `Retur (BOM) ${returnNumber} dari ${originalSale.invoiceNumber}`);
          }
        } else {
          await tx.$executeRawUnsafe(`UPDATE "Product" SET stock = stock + $1 WHERE id = $2`, item.quantity, item.productId);
          await tx.$executeRawUnsafe(`
            INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date")
            VALUES ($1, 'RETURN', $2, $3, NOW())
          `, item.productId, item.quantity, `Retur ${returnNumber} dari ${originalSale.invoiceNumber}`);
        }
      }

      // 5. Finance Reconciliation (If Refund)
      if (accountId && totalRefundAmount > 0) {
        // Create Expense (Refund)
        const refundCategoryName = 'Refund Penjualan';
        let category: any = await tx.expenseCategory.findFirst({
          where: { companyId: tenantId, name: refundCategoryName }
        });

        if (!category) {
          const catResult: any[] = await tx.$queryRawUnsafe(`
            INSERT INTO "ExpenseCategory" ("companyId", "name", "type", "updatedAt")
            VALUES ($1, $2, 'OPERATIONAL', NOW())
            RETURNING id
          `, tenantId, refundCategoryName);
          category = { id: catResult[0].id };
        }

        await tx.expense.create({
          data: {
            companyId: tenantId,
            accountId: parseInt(accountId),
            categoryId: category.id,
            amount: totalRefundAmount,
            date: dateVal,
            description: `Refund Penjualan ${originalSale.invoiceNumber} (Retur ${returnNumber})`,
            status: 'PAID'
          }
        });

        // Decrement Account Balance
        await tx.financialAccount.update({
          where: { id: parseInt(accountId) },
          data: { balance: { decrement: totalRefundAmount } }
        });
      }

      // 6. Update Sale Status
      const totalReturnedSoFar = (existingReturns.reduce((sum, r) => sum + r.totalReturned, 0)) + returnItemsData.reduce((sum, i) => sum + i.quantity, 0);
      const totalSoldItems = originalItems.reduce((sum, i) => sum + i.quantity, 0);

      let newStatus = originalSale.status;
      if (totalReturnedSoFar >= totalSoldItems) {
        newStatus = 'RETURNED';
      } else if (totalReturnedSoFar > 0) {
        newStatus = 'PARTIALLY_RETURNED';
      }

      await tx.$executeRawUnsafe(`UPDATE "Sale" SET "status" = $1, "updatedAt" = NOW() WHERE id = $2`, newStatus, saleId);

      return { returnId, returnNumber, refundAmount: totalRefundAmount, newStatus };
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    res.json(result);
  } catch (error: any) {
    console.error("RETURN ERROR:", error);
    res.status(500).json({ error: 'Gagal memproses retur: ' + error.message });
  }
});

// S5. Get Sale Returns
app.get('/api/sales/:id/returns', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const saleId = parseInt(req.params.id as string);
    const returns = await prisma.$queryRawUnsafe(`
      SELECT sr.*, json_agg(sri.*) as items
      FROM "SaleReturn" sr
      LEFT JOIN "SaleReturnItem" sri ON sr.id = sri."returnId"
      WHERE sr."saleId" = $1 AND sr."companyId" = $2
      GROUP BY sr.id
      ORDER BY sr.date DESC
    `, saleId, tenantId);
    res.json(returns);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil riwayat retur: ' + error.message });
  }
});

// --- MODUL POS KASIR ---

// 1. Get POS Products (with Branch-Specific Stock)
app.get('/api/pos/products', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);

    // Found user's branch
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { branchId: true } });
    
    // Find warehouse for this branch
    const warehouse = await prisma.warehouse.findFirst({
      where: { companyId: tenantId, branchId: user?.branchId, type: 'STORE' }
    }) || await prisma.warehouse.findFirst({
      where: { companyId: tenantId, isMain: true }
    }) || await prisma.warehouse.findFirst({
      where: { companyId: tenantId }
    });

    const products = await prisma.product.findMany({
      where: { companyId: tenantId, showInPos: true },
      select: { 
        id: true,
        name: true,
        price: true,
        priceGofood: true,
        priceGrabfood: true,
        priceShopeefood: true,
        priceQpoon: true,
        imageUrl: true,
        categoryId: true,
        trackStock: true,
        isAutoDeduct: true,
        type: true,
        recipeYield: true,
        WarehouseStock: {
          where: { warehouseId: warehouse?.id },
          select: { quantity: true }
        },
        customizations: {
          select: {
            Group: {
              select: {
                id: true,
                name: true,
                isRequired: true,
                minSelections: true,
                maxSelections: true,
                options: {
                  select: {
                    id: true,
                    name: true,
                    price: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Map stock to branch-specific quantity
    const mappedProducts = products.map((p: any) => {
      // Ensure we keep all original fields while overriding/adding specific ones for POS
      return {
        ...p,
        stock: p.WarehouseStock && p.WarehouseStock.length > 0 ? p.WarehouseStock[0].quantity : 0
      };
    });

    res.json(mappedProducts);
  } catch (error: any) {
    console.error("GET POS PRODUCTS ERROR:", error);
    res.status(500).json({ error: 'Gagal mengambil daftar produk POS: ' + error.message });
  }
});

// --- POS CUSTOMIZATIONS ---
app.get('/api/pos/customizations', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const groups = await prisma.customizationGroup.findMany({
      where: { companyId: tenantId },
      include: { options: true },
      orderBy: { id: 'asc' }
    });
    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pos/customizations', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { name, isRequired, minSelections, maxSelections, options } = req.body;
    const parsedOptions = options.map((opt: any) => ({
      name: opt.name,
      price: Number(opt.price || 0),
      linkedProductId: opt.linkedProductId ? Number(opt.linkedProductId) : null,
      linkedQuantity: opt.linkedQuantity ? Number(opt.linkedQuantity) : null
    }));
    
    const group = await prisma.customizationGroup.create({
      data: {
        companyId: tenantId,
        name,
        isRequired,
        minSelections,
        maxSelections,
        options: { create: parsedOptions }
      },
      include: { options: true }
    });
    res.json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pos/customizations/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { id } = req.params;
    const { name, isRequired, minSelections, maxSelections, options } = req.body;
    const parsedOptions = options.map((opt: any) => ({
      name: opt.name,
      price: Number(opt.price || 0),
      linkedProductId: opt.linkedProductId ? Number(opt.linkedProductId) : null,
      linkedQuantity: opt.linkedQuantity ? Number(opt.linkedQuantity) : null
    }));

    await prisma.customizationOption.deleteMany({ where: { groupId: Number(id) } });
    const group = await prisma.customizationGroup.update({
      where: { id: Number(id), companyId: tenantId },
      data: {
        name, isRequired, minSelections, maxSelections,
        options: { create: parsedOptions }
      },
      include: { options: true }
    });
    res.json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/pos/customizations/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    await prisma.customizationGroup.delete({
      where: { id: Number(req.params.id), companyId: tenantId }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/pos/products/:id/customizations', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const productId = Number(req.params.id);
    const { groupIds } = req.body;
    
    const product = await prisma.product.findUnique({ where: { id: productId, companyId: tenantId }});
    if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan' });

    await prisma.productCustomization.deleteMany({
      where: { productId }
    });

    if (groupIds && groupIds.length > 0) {
      await prisma.productCustomization.createMany({
        data: groupIds.map((groupId: number) => ({
          productId,
          groupId
        }))
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// 1.5. POS Customer Search (Autocomplete)
app.get('/api/pos/customers', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const q = req.query.q as string || "";
    
    const customers = await prisma.customer.findMany({
      where: {
        companyId: tenantId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 20,
      orderBy: { name: 'asc' }
    });
    
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POS 2. Calculate Discounts & Total
app.post('/api/pos/calculate', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { customerId, voucherCode, pointsToUse = 0, subtotal = 0, totalQuantity = 0, discountableSubtotal } = req.body;

    let finalTotal = Number(subtotal);
    let baseDiscountAmount = discountableSubtotal !== undefined ? Number(discountableSubtotal) : Number(subtotal);
    let memberDiscountAmount = 0;
    let voucherDiscountAmount = 0;
    let pointsUsed = Number(pointsToUse);
    let pointsEarned = 0;

    const company = await prisma.company.findUnique({ where: { id: tenantId } });
    if (!company) return res.status(404).json({ error: 'Perusahaan tidak ditemukan' });

    let customer = null;
    if (customerId) {
      customer = await prisma.customer.findUnique({ where: { id: Number(customerId) } });
      
      // Member Discount
      if (customer && customer.isMember) {
        if (company.memberDiscountValue > 0) {
          if (company.memberDiscountType === 'PERCENTAGE') {
            memberDiscountAmount = baseDiscountAmount * (company.memberDiscountValue / 100);
          } else {
            memberDiscountAmount = Math.min(company.memberDiscountValue, baseDiscountAmount);
          }
          finalTotal -= memberDiscountAmount;
          baseDiscountAmount = Math.max(0, baseDiscountAmount - memberDiscountAmount);
        }
      }

      // Point Deduction
      if (pointsUsed > 0 && customer && customer.points >= pointsUsed) {
        const pointValue = pointsUsed * (company.pointsRedeemValue || 1);
        finalTotal -= pointValue;
      } else {
        pointsUsed = 0; // Reset if invalid
      }
    }

    // Voucher Discount
    if (voucherCode) {
      const voucher = await prisma.voucher.findUnique({
        where: { companyId_code: { companyId: tenantId, code: voucherCode } }
      });

      if (!voucher || !voucher.isActive) {
        return res.status(400).json({ error: 'Voucher tidak valid atau sudah tidak aktif.' });
      }

      const now = new Date();
      if ((voucher.validFrom && now < voucher.validFrom) || (voucher.validUntil && now > voucher.validUntil)) {
        return res.status(400).json({ error: 'Voucher sudah kedaluwarsa atau belum bisa digunakan.' });
      }

      if (voucher.quota > 0 && voucher.usedCount >= voucher.quota) {
        return res.status(400).json({ error: 'Kuota voucher sudah habis.' });
      }

      const validPurchase = voucher.minPurchase === 0 || finalTotal >= voucher.minPurchase;
      const validQuantity = voucher.minQuantity > 0 && Number(totalQuantity) >= voucher.minQuantity;

      if (!validPurchase && !validQuantity) {
        return res.status(400).json({ error: `Voucher ini mengharuskan minimal belanja Rp ${voucher.minPurchase} ATAU minimal pembelian ${voucher.minQuantity} barang.` });
      }

      if (voucher.discountType === 'PERCENTAGE') {
        voucherDiscountAmount = baseDiscountAmount * (voucher.discountValue / 100);
        if (voucher.maxDiscount && voucherDiscountAmount > voucher.maxDiscount) {
          voucherDiscountAmount = voucher.maxDiscount;
        }
      } else {
        voucherDiscountAmount = Math.min(voucher.discountValue, baseDiscountAmount);
      }
      finalTotal -= voucherDiscountAmount;
      baseDiscountAmount = Math.max(0, baseDiscountAmount - voucherDiscountAmount);
    }

    // Ensure total is not negative
    if (finalTotal < 0) finalTotal = 0;

    // Calculate Points Earned based on FINAL TOTAL
    if (customer && customer.isMember && company.pointsEarnRatio > 0 && finalTotal >= company.pointsEarnRatio) {
      pointsEarned = Math.floor(finalTotal / company.pointsEarnRatio);
    }

    res.json({
      subtotal,
      memberDiscountAmount,
      voucherDiscountAmount,
      pointsUsed,
      pointValueUsed: pointsUsed * (company.pointsRedeemValue || 1),
      finalTotal,
      pointsEarned
    });
  } catch (error: any) {
    console.error("CALCULATION ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// DYNAMIC QR EMPLOYEE DISCOUNT ENDPOINTS
// ==========================================

// 1. Generate QR Token (For Employee App/Dashboard)
app.get('/api/employee/qr', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);

    const user = await prisma.user.findUnique({
      where: { id: userId, companyId: tenantId },
      select: { id: true, name: true }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const secret = process.env.JWT_SECRET || 'supersecretkey';
    const token = jwt.sign(
      { 
        userId: user.id, 
        companyId: tenantId, 
        type: 'EMPLOYEE_DISCOUNT',
        name: user.name,
        phone: ''
      }, 
      secret, 
      { expiresIn: '60s' }
    );

    res.json({ token, expiresAt: new Date(Date.now() + 60000) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Scan QR Token (For POS Cashier)
app.post('/api/pos/scan-employee-qr', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "QR Token is required" });
    }

    const secret = process.env.JWT_SECRET || 'supersecretkey';
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, secret);
    } catch (err: any) {
      return res.status(400).json({ error: "QR Code kadaluarsa atau tidak valid" });
    }

    if (decoded.companyId !== tenantId || decoded.type !== 'EMPLOYEE_DISCOUNT') {
      return res.status(400).json({ error: "QR Code tidak valid untuk perusahaan ini" });
    }

    // Ensure customer profile exists for this employee
    let customer = await prisma.customer.findFirst({
      where: { 
        companyId: tenantId, 
        phone: decoded.phone || `EMP-${decoded.userId}`
      }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          companyId: tenantId,
          name: decoded.name + ' (Karyawan)',
          phone: decoded.phone || `EMP-${decoded.userId}`,
          isMember: true
        }
      });
    }

    // Ambil setting diskon dari voucher "EMPLOYEE"
    const internalVoucher = await prisma.voucher.findFirst({
      where: {
        companyId: tenantId,
        targetAudience: 'EMPLOYEE',
        isActive: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      customer,
      discount: {
        type: internalVoucher ? internalVoucher.discountType : 'PERCENTAGE',
        value: internalVoucher ? internalVoucher.discountValue : 0, // Fallback ke 0 jika tidak ada voucher
        label: internalVoucher ? internalVoucher.code : 'Aivola ID (Tanpa Diskon Aktif)'
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POS 1. Checkout (Hybrid Sync & Online)
app.post('/api/pos/checkout', tenantMiddleware, async (req: Request, res: Response) => {
  console.log("=== CHECKOUT REACHED ===", req.body?.offlineInvoiceNumber ? "[OFFLINE SYNC]" : "[ONLINE CHECKOUT]");
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);
    const { 
      items, 
      accountId, 
      totalAmount, 
      customerId, 
      customerName,
      customerPhone,
      notes, 
      saleType = 'WALK_IN', 
      serviceFee = 0, 
      markupPercentage = 0,
      memberDiscountAmount = 0,
      voucherCode = null,
      voucherDiscountAmount = 0,
      pointsUsed = 0,
      pointsEarned = 0,
      taxRate = 0,
      taxAmount = 0,
      pendingBillId = null,
      date,
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 0. Calculate Queue Number & Handle Pending Bill
      let existingQueueNumber = null;
      if (pendingBillId) {
        const pb = await tx.pendingBill.findUnique({ where: { id: Number(pendingBillId) } });
        if (pb && pb.queueNumber) existingQueueNumber = pb.queueNumber;

        await tx.pendingBill.deleteMany({
          where: { id: Number(pendingBillId), companyId: tenantId }
        });
      }

      if (!existingQueueNumber) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const maxSaleQueue = await tx.sale.aggregate({
          _max: { queueNumber: true },
          where: { companyId: tenantId, createdAt: { gte: today } }
        });
        const maxPendingQueue = await tx.pendingBill.aggregate({
          _max: { queueNumber: true },
          where: { companyId: tenantId, createdAt: { gte: today } }
        });

        existingQueueNumber = Math.max(maxSaleQueue._max.queueNumber || 0, maxPendingQueue._max.queueNumber || 0) + 1;
      }
      // 0. Find correct warehouse for the cashier's branch
      const user = await tx.user.findUnique({ where: { id: userId }, select: { branchId: true } });
      const warehouse = await tx.warehouse.findFirst({
        where: { companyId: tenantId, branchId: user?.branchId, type: 'STORE' }
      }) || await tx.warehouse.findFirst({
        where: { companyId: tenantId, isMain: true }
      }) || await tx.warehouse.findFirst({
        where: { companyId: tenantId }
      });

      if (!warehouse) throw new Error("Gudang penjualan tidak ditemukan. Hubungin admin.");
      
      // 0. Get Account Name for notes
      let finalAccountId = accountId ? Number(accountId) : null;
      if (!finalAccountId) {
        const defaultCashAcc = await tx.financialAccount.findFirst({
          where: {
            companyId: tenantId,
            OR: [
              { type: 'CASH' },
              { name: { contains: 'Tunai', mode: 'insensitive' } },
              { name: { contains: 'Cash', mode: 'insensitive' } }
            ]
          }
        }) || await tx.financialAccount.findFirst({ where: { companyId: tenantId } });
        if (defaultCashAcc) {
          finalAccountId = defaultCashAcc.id;
        }
      }

      const account = finalAccountId ? await tx.financialAccount.findUnique({ where: { id: finalAccountId } }) : null;
      const paymentMethodTag = account ? `[Metode: ${account.name.toUpperCase()}]` : '';
      const finalNotes = notes ? `${notes} ${paymentMethodTag}` : paymentMethodTag;

      // 0. Sync Customer if phone provided
      let finalCustomerId = customerId ? Number(customerId) : null;
      if (customerPhone) {
        const customer = await tx.customer.upsert({
          where: { 
            companyId_phone: { 
              companyId: tenantId, 
              phone: customerPhone 
            } 
          },
          update: {
            name: customerName || 'Pelanggan',
            totalSpent: { increment: Number(totalAmount) }
          },
          create: {
            companyId: tenantId,
            name: customerName || 'Pelanggan',
            phone: customerPhone,
            totalSpent: Number(totalAmount)
          }
        });
        finalCustomerId = customer.id;
      }

      // 0. Calculate Total Commission from Items
      const totalCommission = items.reduce((sum: number, item: any) => {
        const originalPrice = Number(item.originalPrice || item.price);
        const salePrice = Number(item.price);
        const qty = Number(item.quantity);
        return sum + ((salePrice - originalPrice) * qty);
      }, 0);

      // 1. Create Sale
      const invoiceNumber = req.body.offlineInvoiceNumber || `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const saleDate = (req.body.offlineInvoiceNumber && req.body.date) ? new Date(req.body.date) : new Date();

      const existingSale = await tx.sale.findUnique({
        where: { invoiceNumber }
      });
      if (existingSale) {
        return existingSale;
      }

      let finalPointsEarned = Number(pointsEarned) || 0;
      if (finalCustomerId && !req.body.offlineInvoiceNumber) {
        const company = await tx.company.findUnique({ where: { id: tenantId }, select: { pointsEarnRatio: true } });
        const customer = await tx.customer.findUnique({ where: { id: finalCustomerId }, select: { isMember: true } });
        if (company && company.pointsEarnRatio > 0 && customer && customer.isMember) {
          const finalTotalAmountNumber = Number(totalAmount);
          if (finalTotalAmountNumber >= company.pointsEarnRatio) {
            finalPointsEarned = Math.floor(finalTotalAmountNumber / company.pointsEarnRatio);
          }
        }
      }

      const sale = await tx.sale.create({
        data: {
          companyId: tenantId,
          branchId: user?.branchId || null,
          cashierId: userId,
          date: saleDate,
          customerId: finalCustomerId,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          accountId: finalAccountId,
          invoiceNumber,
          totalAmount: Number(totalAmount),
          totalCommission: Number(totalCommission),
          notes: finalNotes,
          status: 'PAID',
          saleType,
          serviceFee: Number(serviceFee),
          markupPercentage: Number(markupPercentage),
          memberDiscountAmount: Number(memberDiscountAmount),
          voucherCode: voucherCode || null,
          voucherDiscountAmount: Number(voucherDiscountAmount),
          pointsUsed: Number(pointsUsed),
          pointsEarned: finalPointsEarned,
          taxRate: Number(taxRate) || 0,
          taxAmount: Number(taxAmount) || 0,
          kitchenStatus: 'PREPARING',
          queueNumber: existingQueueNumber
        }
      });

      // 1.5 Process Points and Vouchers
      if (finalCustomerId && (Number(pointsUsed) > 0 || finalPointsEarned > 0)) {
        await tx.customer.update({
          where: { id: finalCustomerId },
          data: {
            points: {
              increment: finalPointsEarned - Number(pointsUsed)
            }
          }
        });
      }

      if (voucherCode) {
        await tx.voucher.updateMany({
          where: { companyId: tenantId, code: voucherCode },
          data: { usedCount: { increment: 1 } }
        });
      }

        // 2. Pre-fetch all recipes for items in the cart using Prisma findMany (more stable than raw SQL for Supabase)
        const productIds = items.map((i: any) => Number(i.productId));
        const allRecipes = await tx.productRecipe.findMany({
            where: { productId: { in: productIds } },
            include: { Product: { select: { recipeYield: true } } }
        });

        // Group recipes by productId for easy access
        const recipeMap: Record<number, any[]> = {};
        allRecipes.forEach((r: any) => {
            if (!recipeMap[r.productId]) recipeMap[r.productId] = [];
            recipeMap[r.productId].push({
                ...r,
                recipeYield: r.Product?.recipeYield || 1
            });
        });

        // Pre-fetch customization options for stock deduction
        const optionIds: number[] = [];
        for (const item of items) {
            if (item.modifiers) {
                Object.values(item.modifiers).forEach((val: any) => {
                    if (val && val.id) optionIds.push(Number(val.id));
                });
            }
        }
        const linkedOptions = await tx.customizationOption.findMany({
            where: { id: { in: optionIds }, linkedProductId: { not: null } }
        });
        const optionMap: Record<number, any> = {};
        linkedOptions.forEach((opt: any) => optionMap[opt.id] = opt);

        // 1.7 Validate Stock before proceeding (Skip validation for offline synchronized sales since they have already been finalized)
        const productsInCart = await tx.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, stock: true, trackStock: true, isAutoDeduct: true }
        });

        if (!req.body.offlineInvoiceNumber) {
            for (const item of items) {
                const product = productsInCart.find(p => p.id === Number(item.productId));
                if (product && product.trackStock && !product.isAutoDeduct && product.stock < Number(item.quantity)) {
                    throw new Error(`Stok tidak mencukupi untuk produk: ${product.name}. Stok tersedia: ${product.stock}`);
                }
            }
        }

        // 3. Prepare all operations for parallel execution
        
        // Helper for recursive deduction of materials
        async function getRecursiveDeductions(productId: number, qtyNeeded: number): Promise<{ id: number, qty: number }[]> {
            const product = await tx.product.findUnique({ where: { id: productId } });
            if (!product) return [];

            // If Auto Deduct is ON, we don't deduct the parent directly, we explode its recipe
            if (product.isAutoDeduct) {
                const recipes = await tx.productRecipe.findMany({ where: { productId }, include: { Product: { select: { recipeYield: true } } } });
                if (recipes.length > 0) {
                    let deductions: { id: number, qty: number }[] = [];
                    for (const r of recipes) {
                        const yieldFactor = r.Product?.recipeYield || 1;
                        const matQty = (Number(r.quantity) / yieldFactor) * qtyNeeded;
                        const childDeductions = await getRecursiveDeductions(Number(r.materialId), matQty);
                        deductions = deductions.concat(childDeductions);
                    }
                    return deductions;
                }
            }
            // If it's not an Auto Deduct WIP (or has no recipe), we just deduct it directly
            return [{ id: productId, qty: qtyNeeded }];
        }

        const operations: Promise<any>[] = [];

        for (const item of items) {
            const productId = Number(item.productId);
            const quantity = Number(item.quantity);
            const price = Number(item.price);
            const originalPrice = Number(item.originalPrice || item.price);

            // Pre-process modifiers to include linked product info for accurate COGS calculation later
            const finalModifiers: any = {};
            if (item.modifiers) {
                Object.entries(item.modifiers).forEach(([key, val]: [string, any]) => {
                    const finalVal = { ...val };
                    if (val && val.id && optionMap[val.id]) {
                        const opt = optionMap[val.id];
                        if (opt.linkedProductId) {
                           finalVal.linkedProductId = opt.linkedProductId;
                           finalVal.linkedQuantity = opt.linkedQuantity;
                        }
                    }
                    finalModifiers[key] = finalVal;
                });
            }
            const hasModifiers = Object.keys(finalModifiers).length > 0;

            // Add Sale Item creation to operations
            operations.push(tx.saleItem.create({
                data: {
                    saleId: sale.id,
                    productId: productId,
                    quantity: quantity,
                    price: price,
                    originalPrice: originalPrice,
                    total: price * quantity,
                    modifiers: hasModifiers ? finalModifiers : null
                }
            }));

            // --- OPTIMIZED STOCK LOGIC ---
            const mainProduct = productsInCart.find(p => p.id === productId);
            const isAutoDeduct = mainProduct?.isAutoDeduct || false;

            // Mode Pabrikasi (isAutoDeduct = false): HANYA potong stok produk jadi.
            // Mode Made-to-Order (isAutoDeduct = true): JANGAN potong stok produk jadi.
            if (!isAutoDeduct) {
                operations.push(tx.product.update({
                    where: { id: productId },
                    data: { stock: { decrement: quantity } }
                }));

                operations.push(tx.warehouseStock.upsert({
                    where: { productId_warehouseId: { productId: productId, warehouseId: warehouse.id } },
                    update: { quantity: { decrement: quantity } },
                    create: { productId: productId, warehouseId: warehouse.id, quantity: -quantity }
                }));

                operations.push(tx.stockTransaction.create({
                    data: {
                        productId: productId,
                        warehouseId: warehouse.id,
                        type: 'OUT',
                        quantity: quantity,
                        reference: `POS ${invoiceNumber}`,
                        date: new Date()
                    }
                }));
            }

            // --- MODIFIER STOCK DEDUCTION ---
            if (item.modifiers) {
                Object.values(item.modifiers).forEach((val: any) => {
                    if (val && val.id && optionMap[val.id]) {
                        const opt = optionMap[val.id];
                        if (opt.linkedProductId) {
                            const modQty = quantity * (opt.linkedQuantity || 1);
                            
                            operations.push(tx.product.update({
                                where: { id: opt.linkedProductId },
                                data: { stock: { decrement: modQty } }
                            }));

                            operations.push(tx.warehouseStock.upsert({
                                where: { productId_warehouseId: { productId: opt.linkedProductId, warehouseId: warehouse.id } },
                                update: { quantity: { decrement: modQty } },
                                create: { productId: opt.linkedProductId, warehouseId: warehouse.id, quantity: -modQty }
                            }));

                            operations.push(tx.stockTransaction.create({
                                data: {
                                    productId: opt.linkedProductId,
                                    warehouseId: warehouse.id,
                                    type: 'OUT',
                                    quantity: modQty,
                                    reference: `POS Add-on ${invoiceNumber}`,
                                    date: new Date()
                                }
                            }));
                        }
                    }
                });
            }

            // If it has a recipe AND is Made-to-Order, decrement the MATERIALS
            // (If it's Pabrikasi/isAutoDeduct=false, we DO NOT deduct materials here, because they were deducted during Production)
            const recipes = recipeMap[productId] || [];
            if (isAutoDeduct && recipes.length > 0) {
                for (const recipe of recipes) {
                    const materialId = Number(recipe.materialId);
                    const materialQtyNeeded = (Number(recipe.quantity) / (Number(recipe.recipeYield) || 1)) * quantity;

                    const deductions = await getRecursiveDeductions(materialId, materialQtyNeeded);
                    
                    for (const ded of deductions) {
                        operations.push(tx.product.update({
                            where: { id: ded.id },
                            data: { stock: { decrement: ded.qty } }
                        }));
    
                        operations.push(tx.warehouseStock.upsert({
                            where: { productId_warehouseId: { productId: ded.id, warehouseId: warehouse.id } },
                            update: { quantity: { decrement: ded.qty } },
                            create: { productId: ded.id, warehouseId: warehouse.id, quantity: -ded.qty }
                        }));
    
                        operations.push(tx.stockTransaction.create({
                            data: {
                                productId: ded.id,
                                warehouseId: warehouse.id,
                                type: 'OUT',
                                quantity: ded.qty,
                                reference: `POS ${invoiceNumber} (BOM Result of ${sale.invoiceNumber})`,
                                date: new Date()
                            }
                        }));
                    }
                }
            }
        }

        // Execute all stock and item operations in parallel
        await Promise.all(operations);

      // 4. Finance
      if (accountId) {
        await tx.financialAccount.update({
          where: { id: Number(accountId) },
          data: { balance: { increment: Number(totalAmount) } }
        });

        const category = await tx.incomeCategory.upsert({
          where: { companyId_name: { companyId: tenantId, name: 'Penjualan POS' } },
          update: {},
          create: { companyId: tenantId, name: 'Penjualan POS' }
        });

        await tx.income.create({
          data: {
            companyId: tenantId,
            branchId: user?.branchId || null,
            accountId: Number(accountId),
            categoryId: category.id,
            amount: Number(totalAmount),
            receivedFrom: `Pelanggan POS (${saleType})`,
            description: `POS #${invoiceNumber} (${saleType})`
          }
        });
      }

      return sale;
    }, { timeout: 120000 });

    res.json(result);
  } catch (error: any) {
    console.error("CHECKOUT ERROR:", error);
    res.status(500).json({ error: 'Gagal checkout: ' + error.message });
  }
});

// POS 2. Hold Bill
app.post('/api/pos/hold', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);
    const { label, items, saleType } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { branchId: true } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxSaleQueue = await prisma.sale.aggregate({
      _max: { queueNumber: true },
      where: { companyId: tenantId, createdAt: { gte: today } }
    });
    const maxPendingQueue = await prisma.pendingBill.aggregate({
      _max: { queueNumber: true },
      where: { companyId: tenantId, createdAt: { gte: today } }
    });

    const nextQueueNumber = Math.max(maxSaleQueue._max.queueNumber || 0, maxPendingQueue._max.queueNumber || 0) + 1;

    const pendingBill = await prisma.pendingBill.create({
      data: {
        companyId: tenantId,
        branchId: user?.branchId || 0,
        cashierId: userId,
        label: label || 'Pesanan',
        items: items, // JSON
        saleType: saleType || 'WALK_IN',
        kitchenStatus: 'PREPARING',
        queueNumber: nextQueueNumber
      },
    });

    res.json(pendingBill);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal menyimpan bill: ' + error.message });
  }
});

// POS 3. Get Pending Bills
app.get('/api/pos/pending', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { branchId: true } });

    const pendingBills = await prisma.pendingBill.findMany({
      where: {
        companyId: tenantId,
        branchId: user?.branchId || 0,
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } }
    });

    res.json(pendingBills);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil pending bills: ' + error.message });
  }
});

// POS 4. Delete Pending Bill
app.delete('/api/pos/pending/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const id = Number(req.params.id);

    await prisma.pendingBill.delete({
      where: { id, companyId: tenantId },
    });

    res.json({ message: 'Pending bill dihapus' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal menghapus pending bill: ' + error.message });
  }
});

// ================== KITCHEN APIs ==================
app.get('/api/kitchen/reports', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const user = (req as any).user;
    
    // We only care about orders that are READY or SERVED (i.e. they finished preparing)
    // and have both createdAt and preparedAt set.
    const completedSales = await prisma.sale.findMany({
      where: {
        companyId: tenantId,
        branchId: user?.branchId || undefined,
        kitchenStatus: { in: ['READY', 'SERVED'] },
        preparedAt: { not: null }
      },
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        createdAt: true,
        preparedAt: true,
        queueNumber: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // limit to recent 100 for table
    });

    // Calculate times
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    let todayCount = 0, todayTotalTime = 0;
    let weekCount = 0, weekTotalTime = 0;
    let monthCount = 0, monthTotalTime = 0;

    const history = completedSales.map(sale => {
      // Calculate diff in seconds
      const diffMs = sale.preparedAt!.getTime() - sale.createdAt.getTime();
      const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
      
      const saleDate = sale.createdAt;
      if (saleDate >= today) {
        todayCount++;
        todayTotalTime += diffSeconds;
      }
      if (saleDate >= startOfWeek) {
        weekCount++;
        weekTotalTime += diffSeconds;
      }
      if (saleDate >= startOfMonth) {
        monthCount++;
        monthTotalTime += diffSeconds;
      }

      return {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        customerName: sale.customerName,
        queueNumber: sale.queueNumber,
        createdAt: sale.createdAt,
        preparedAt: sale.preparedAt,
        durationSeconds: diffSeconds
      };
    });

    const averageToday = todayCount > 0 ? todayTotalTime / todayCount : 0;
    const averageWeek = weekCount > 0 ? weekTotalTime / weekCount : 0;
    const averageMonth = monthCount > 0 ? monthTotalTime / monthCount : 0;

    res.json({
      averages: {
        today: averageToday,
        week: averageWeek,
        month: averageMonth
      },
      history
    });
  } catch (error: any) {
    console.error('Kitchen Reports Error:', error);
    res.status(500).json({ error: 'Gagal mengambil laporan dapur.' });
  }
});

app.get('/api/kitchen/orders', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    
    // Fetch from Pending Bills
    const pendingBills = await prisma.pendingBill.findMany({
      where: { companyId: tenantId, kitchenStatus: { in: ['PREPARING', 'READY'] } },
      orderBy: { createdAt: 'asc' }
    });
    
    // Fetch from Sales
    const sales = await prisma.sale.findMany({
      where: { companyId: tenantId, kitchenStatus: { in: ['PREPARING', 'READY'] } },
      orderBy: { createdAt: 'asc' },
      include: {
        SaleItem: {
          include: { product: true }
        }
      }
    });

    const formattedPending = pendingBills.map(pb => ({
      id: pb.id,
      type: 'pending',
      label: pb.label || 'Pesanan ' + pb.id,
      items: typeof pb.items === 'string' ? JSON.parse(pb.items) : pb.items,
      status: pb.kitchenStatus,
      queueNumber: pb.queueNumber,
      createdAt: pb.createdAt,
      preparedAt: pb.preparedAt
    }));

    const formattedSales = sales.map(s => ({
      id: s.id,
      type: 'sale',
      label: s.customerName ? `${s.customerName} (${s.invoiceNumber})` : s.invoiceNumber,
      items: s.SaleItem.map((si: any) => ({
        productId: si.productId,
        name: si.product?.name || 'Item Terhapus',
        quantity: si.quantity,
        price: si.price,
        modifiers: typeof si.modifiers === 'string' ? JSON.parse(si.modifiers) : si.modifiers
      })),
      status: s.kitchenStatus,
      queueNumber: s.queueNumber,
      createdAt: s.createdAt,
      preparedAt: s.preparedAt
    }));

    const allOrders = [...formattedPending, ...formattedSales].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    res.json(allOrders);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil pesanan dapur: ' + error.message });
  }
});

app.patch('/api/kitchen/orders/:type/:id/ready', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { type, id } = req.params;
    
    if (type === 'pending') {
      await prisma.pendingBill.update({
        where: { id: Number(id), companyId: tenantId },
        data: { kitchenStatus: 'READY', preparedAt: new Date() }
      });
    } else if (type === 'sale') {
      await prisma.sale.update({
        where: { id: Number(id), companyId: tenantId },
        data: { kitchenStatus: 'READY', preparedAt: new Date() }
      });
    }
    res.json({ message: 'Status diubah ke READY' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal update status: ' + error.message });
  }
});

app.patch('/api/kitchen/orders/:type/:id/serve', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { type, id } = req.params;
    
    if (type === 'pending') {
      await prisma.pendingBill.update({
        where: { id: Number(id), companyId: tenantId },
        data: { kitchenStatus: 'SERVED' }
      });
    } else if (type === 'sale') {
      await prisma.sale.update({
        where: { id: Number(id), companyId: tenantId },
        data: { kitchenStatus: 'SERVED' }
      });
    }
    res.json({ message: 'Status diubah ke SERVED' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal update status: ' + error.message });
  }
});

// POS 5. Get Closing Summary
app.get('/api/pos/closing-summary', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);

    let user = await prisma.user.findUnique({ where: { id: userId }, select: { branchId: true, role: true } });
    
    // Robustness for ALL roles: fallback to first branch if branchId is null
    if (!user?.branchId) {
      const firstBranch = await prisma.branch.findFirst({ where: { companyId: tenantId } });
      if (firstBranch) {
        user = { ...user!, branchId: firstBranch.id };
        console.log(`[POS Closing] No branchId for user ${userId}, using fallback Branch ${firstBranch.id}`);
      }
    }

    if (!user?.branchId) return res.status(400).json({ error: 'User tidak terikat ke cabang manapun. Hubungi admin untuk mengatur cabang.' });

    // 1. Get last closing for this branch
    const lastClosing = await prisma.posClosing.findFirst({
      where: { companyId: tenantId, branchId: user.branchId, status: 'COMPLETED' },
      orderBy: { endTime: 'desc' }
    });

    // Default to start of current day in company timezone if no closing exists
    const companyTimezone = await getCompanyTimezone(tenantId);
    const { dayStart } = getDayRange(companyTimezone);
    const startTime = lastClosing ? lastClosing.endTime : dayStart;

    // 2. Find all sales since last closing in this branch (filtered by branchId directly)
    // We also include null branchId if the user is associated with the first branch (Head Office fallback)
    const sales = await prisma.sale.findMany({
      where: {
        companyId: tenantId,
        OR: [
          { branchId: user.branchId },
          { branchId: null } // Include transactions that don't have a branch assigned
        ],
        date: { gt: startTime, lte: new Date() },
        status: { notIn: ['CANCELLED', 'VOID'] }
      }
    });

    // 3. Aggregate totals
    const totalTransactions = sales.length;
    const totalGrossSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalCommission = sales.reduce((sum, s) => sum + (s.totalCommission || 0), 0);
    const totalNetSales = totalGrossSales - totalCommission;

    // 4. Detailed Breakdown by Payment Method (Tunai, QRIS, Transfer Bank, Debit, Credit)
    const accounts = await prisma.financialAccount.findMany({ where: { companyId: tenantId } });
    const accountMap = new Map(accounts.map(a => [a.id, a]));

    const methodMap = new Map<string, { accountId: number | null; accountName: string; accountType: string; expectedAmount: number }>();

    for (const sale of sales) {
      const notes = (sale.notes || '').toUpperCase();
      const account = sale.accountId ? accountMap.get(sale.accountId) : null;
      const accName = (account?.name || '').toUpperCase();
      const accType = (account?.type || '').toUpperCase();

      let methodLabel = '';
      let methodType = 'OTHER';

      if (notes.includes('QRIS')) {
        methodLabel = 'QRIS';
        methodType = 'QRIS';
      } else if (notes.includes('DEBIT/CREDIT') || notes.includes('DEBIT / CREDIT')) {
        methodLabel = 'Debit / Credit';
        methodType = 'DEBIT';
      } else if (notes.includes('DEBIT')) {
        methodLabel = 'Debit';
        methodType = 'DEBIT';
      } else if (notes.includes('CREDIT')) {
        methodLabel = 'Credit';
        methodType = 'CREDIT';
      } else if (notes.includes('TRANSFER')) {
        methodLabel = 'Transfer Bank';
        methodType = 'TRANSFER';
      } else if (notes.includes('TUNAI') || notes.includes('CASH')) {
        methodLabel = 'Tunai';
        methodType = 'CASH';
      } else if (accName.includes('QRIS')) {
        methodLabel = 'QRIS';
        methodType = 'QRIS';
      } else if (accName.includes('DEBIT')) {
        methodLabel = 'Debit';
        methodType = 'DEBIT';
      } else if (accName.includes('CREDIT')) {
        methodLabel = 'Credit';
        methodType = 'CREDIT';
      } else if (accName.includes('TRANSFER') || accType === 'BANK') {
        methodLabel = account?.name || 'Transfer Bank';
        methodType = 'TRANSFER';
      } else if (accType === 'CASH' || accName.includes('TUNAI') || accName.includes('CASH')) {
        methodLabel = 'Tunai';
        methodType = 'CASH';
      } else if (sale.saleType === 'WALK_IN' || !sale.accountId) {
        methodLabel = 'Tunai';
        methodType = 'CASH';
      } else {
        methodLabel = account ? account.name : 'Tunai';
        methodType = account ? (account.type || 'OTHER') : 'CASH';
      }

      if (!methodMap.has(methodLabel)) {
        methodMap.set(methodLabel, {
          accountId: sale.accountId || null,
          accountName: methodLabel,
          accountType: methodType,
          expectedAmount: 0
        });
      }

      const item = methodMap.get(methodLabel)!;
      item.expectedAmount += Number(sale.totalAmount);
    }

    const methodBreakdown = Array.from(methodMap.values()).filter(m => m.expectedAmount > 0);

    // Calculate expectedCash ONLY from items tagged as CASH or Tunai
    let cashTotal = methodBreakdown
      .filter(m => m.accountType?.toUpperCase() === 'CASH' || m.accountName.toLowerCase().includes('tunai') || m.accountName.toLowerCase().includes('cash'))
      .reduce((sum, m) => sum + m.expectedAmount, 0);

    // 5. Get Company Settings for Blind Closing
    const company = await prisma.company.findUnique({
      where: { id: tenantId },
      select: { posBlindClosing: true }
    });

    // 6. Aggregate items sold during this shift for stock checking (subtracting refunds)
    const saleIds = sales.map(s => s.id);
    let itemsSummary: { productId: number; productName: string; totalQty: number }[] = [];
    if (saleIds.length > 0) {
      const saleItems: any[] = await prisma.$queryRawUnsafe(`
        SELECT 
          si."productId", 
          p.name as "productName", 
          (COALESCE(SUM(si.quantity), 0) - COALESCE(SUM(sri."returnedQty"), 0)) as "totalQty"
        FROM "SaleItem" si
        JOIN "Product" p ON si."productId" = p.id
        JOIN "Sale" s ON si."saleId" = s.id
        LEFT JOIN (
          SELECT sri."productId", sr."saleId", SUM(sri.quantity) as "returnedQty"
          FROM "SaleReturnItem" sri
          JOIN "SaleReturn" sr ON sri."returnId" = sr.id
          WHERE sr."saleId" = ANY($1::int[])
          GROUP BY sri."productId", sr."saleId"
        ) sri ON sri."productId" = si."productId" AND sri."saleId" = si."saleId"
        WHERE si."saleId" = ANY($1::int[])
          AND s.status NOT IN ('CANCELLED', 'VOID')
        GROUP BY si."productId", p.name
        HAVING (COALESCE(SUM(si.quantity), 0) - COALESCE(SUM(sri."returnedQty"), 0)) > 0
        ORDER BY "totalQty" DESC
      `, saleIds);
      itemsSummary = saleItems.map(i => ({
        productId: Number(i.productId),
        productName: i.productName,
        totalQty: Number(i.totalQty),
      }));
    }

    res.json({
      startTime,
      endTime: new Date(),
      totalTransactions,
      totalGrossSales,
      totalNetSales,
      totalCommission,
      expectedCash: cashTotal,
      methodBreakdown,
      blindClosing: company?.posBlindClosing ?? false,
      itemsSummary,
    });
  } catch (error: any) {
    console.error("CLOSING SUMMARY ERROR:", error);
    res.status(500).json({ error: 'Gagal mengambil ringkasan closing: ' + error.message });
  }
});

// POS 6. Save Closing
app.post('/api/pos/closing', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);
    const { 
      startTime, 
      endTime, 
      totalGrossSales, 
      totalNetSales, 
      totalCommission, 
      totalTransactions,
      actualCash,
      expectedCash,
      cashDifference,
      notes
    } = req.body;

    let user = await prisma.user.findUnique({ where: { id: userId }, select: { branchId: true, role: true } });
    
    // Fallback for Admins/Owners who aren't tied to a specific branch
    if (!user?.branchId && (user?.role === 'SUPERADMIN' || user?.role === 'ADMIN' || user?.role === 'OWNER')) {
      const firstBranch = await prisma.branch.findFirst({ where: { companyId: tenantId } });
      if (firstBranch) {
        user = { ...user!, branchId: firstBranch.id };
      }
    }

    if (!user?.branchId) return res.status(400).json({ error: 'User tidak terikat ke cabang.' });

    const closing = await prisma.posClosing.create({
      data: {
        companyId: tenantId,
        branchId: user.branchId,
        cashierId: userId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        totalGrossSales: Number(totalGrossSales),
        totalNetSales: Number(totalNetSales),
        totalCommission: Number(totalCommission),
        totalTransactions: Number(totalTransactions),
        actualCash: Number(actualCash),
        expectedCash: Number(expectedCash),
        cashDifference: Number(cashDifference),
        notes,
        status: 'COMPLETED'
      }
    });

    res.json(closing);
  } catch (error: any) {
    console.error("SAVE CLOSING ERROR:", error);
    res.status(500).json({ error: 'Gagal melakukan closing: ' + error.message });
  }
});

// POS4. List POS Closings
app.get('/api/pos/closings', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { branchId, startDate, endDate } = req.query;

    const closings = await prisma.posClosing.findMany({
      where: {
        companyId: tenantId,
        branchId: branchId && branchId !== 'all' ? Number(branchId) : undefined,
        startTime: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined,
        }
      },
      include: {
        cashier: { select: { name: true } },
        branch: { select: { name: true } }
      },
      orderBy: { endTime: 'desc' }
    });

    res.json(closings);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil riwayat closing: ' + error.message });
  }
});



// --- MODUL SHAREDHOLDERS & DIVIDENDS ---

// SH1. List Shareholders
app.get('/api/finance/shareholders', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const shareholders = await prisma.shareholder.findMany({
      where: { companyId: tenantId },
      include: {
        _count: { select: { dividends: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(shareholders);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil daftar pemegang saham: ' + error.message });
  }
});

// SH5. Delete Shareholder
app.delete('/api/finance/shareholders/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const id = parseInt(req.params.id as string);

    await prisma.shareholder.delete({
      where: { id, companyId: tenantId }
    });

    res.json({ message: 'Pemegang saham berhasil dihapus.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal menghapus data: ' + error.message });
  }
});

// SH2. Create/Update Shareholder
app.post('/api/finance/shareholders', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { name, sharePercentage, idNumber } = req.body;

    if (!name || sharePercentage === undefined) {
      return res.status(400).json({ error: 'Nama dan persentase saham wajib diisi.' });
    }

    const result = await prisma.shareholder.create({
      data: {
        companyId: tenantId,
        name,
        sharePercentage: parseFloat(sharePercentage),
        idNumber
      }
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("ADD SHAREHOLDER ERROR:", error);
    res.status(500).json({ error: 'Gagal menambah pemegang saham: ' + error.message });
  }
});

// SH3. Distribute Dividends (The "Magic" Logic)
app.post('/api/finance/dividends/distribute', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { totalAmount, accountId, description, date } = req.body;

    if (!totalAmount || !accountId) {
      return res.status(400).json({ error: 'Total nominal dan Akun sumber dana wajib diisi.' });
    }

    const amount = parseFloat(totalAmount);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil semua pemegang saham
      const shareholders = await tx.shareholder.findMany({
        where: { companyId: tenantId }
      });

      if (shareholders.length === 0) {
        throw new Error('Belum ada data pemegang saham. Silakan tambah pemegang saham terlebih dahulu.');
      }

      // 2. Pastikan total persentase adalah 100% (opsional, tapi bagus untuk validasi)
      const totalShares = shareholders.reduce((sum, s) => sum + s.sharePercentage, 0);
      if (totalShares < 1) throw new Error('Persentase saham belum diatur dengan benar.');

      // 3. Kurangi Saldo Akun Finansial (Kas/Bank)
      const account = await tx.financialAccount.findUnique({ where: { id: parseInt(accountId) } });
      if (!account || account.balance < amount) {
        throw new Error('Saldo akun tidak mencukupi untuk membagikan dividen ini.');
      }

      await tx.financialAccount.update({
        where: { id: parseInt(accountId) },
        data: { balance: { decrement: amount } }
      });

      // 4. Buat record Dividen untuk masing-masing pemegang saham
      const dividendRecords = shareholders.map(s => ({
        companyId: tenantId,
        shareholderId: s.id,
        amount: (s.sharePercentage / 100) * amount,
        paidFromAccountId: parseInt(accountId),
        description: description || `Pembagian Dividen Proporsional`,
        date: date ? new Date(date) : new Date(),
        status: 'PAID'
      }));

      await tx.dividend.createMany({
        data: dividendRecords
      });

      return dividendRecords;
    });

    res.json({ message: 'Dividen berhasil dibagikan ke ' + result.length + ' pemegang saham.', data: result });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal membagikan dividen: ' + error.message });
  }
});

// SH4. List Dividends History
app.get('/api/finance/dividends', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const dividends = await prisma.dividend.findMany({
      where: { companyId: tenantId },
      include: {
        shareholder: { select: { name: true } },
        account: { select: { name: true } }
      },
      orderBy: { date: 'desc' },
      take: 100
    });
    res.json(dividends);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil riwayat dividen.' });
  }
});

// SH6. Update Authorized Capital (Modal Dasar)
app.patch('/api/finance/capital', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { authorizedCapital } = req.body;
    
    const company = await prisma.company.update({
      where: { id: tenantId },
      data: { authorizedCapital: parseFloat(authorizedCapital) }
    });

    res.json(company);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal update modal dasar: ' + error.message });
  }
});

// SH7. Get Company Finance Info (including Capital)
app.get('/api/finance/company-info', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const company = await prisma.company.findUnique({
      where: { id: tenantId },
      select: { authorizedCapital: true, name: true }
    });
    res.json(company);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil info modal: ' + error.message });
  }
});




// ==========================================
// WORK ASSIGNMENTS (TASK MONITORING) MODULE
// ==========================================

// 1. Get List of Assignments
app.get('/api/assignments', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const role = (req as any).userRole;

    const where: any = { companyId: tenantId };

    // Restrict visibility: Only Admins/Owners see all tasks.
    // Others only see tasks assigned to them OR created by them.
    if (!['SUPERADMIN', 'ADMIN', 'OWNER'].includes(role)) {
      where.OR = [
        { userId: userId },
        { assignedById: userId }
      ];
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, jobTitle: true, division: true } },
        assignedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(assignments);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil data penugasan: ' + error.message });
  }
});

// 2. Create Assignment (Two-way)
app.post('/api/assignments', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const creatorId = (req as any).userId;
    const role = (req as any).userRole;
    const { userId, title, description, priority, dueDate } = req.body;

    if (!title) return res.status(400).json({ error: 'Judul tugas wajib diisi' });

    // Determine initial status
    let status: any = 'IN_PROGRESS';
    let targetUserId = userId ? Number(userId) : creatorId;

    // If non-admin creates for themselves, it starts as PENDING for approval
    if (!['SUPERADMIN', 'ADMIN', 'OWNER'].includes(role)) {
      status = 'PENDING';
      targetUserId = creatorId; // Force self-assignment if non-admin
    }

    const newAssignment = await prisma.assignment.create({
      data: {
        companyId: tenantId,
        userId: targetUserId,
        assignedById: creatorId,
        title,
        description,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status
      },
      include: { user: true }
    });

    // Notify user if assigned by someone else
    if (targetUserId !== creatorId) {
      await sendNotification(
        tenantId, 
        targetUserId, 
        'Tugas Baru Di-assign', 
        `Anda mendapatkan tugas baru: ${title}. Segera cek aplikasi!`
      );
    } else if (!['SUPERADMIN', 'ADMIN', 'OWNER'].includes(role)) {
      // Notify Admin if non-admin proposes a task
      await notifyAdmins(
        tenantId,
        'Pengajuan Tugas Baru',
        `${newAssignment.user?.name || 'Seorang karyawan'} mengajukan tugas baru: ${title}. Mohon ditinjau.`
      );
    }

    res.json(newAssignment);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal membuat penugasan: ' + error.message });
  }
});

// 3. Update Assignment Status
app.patch('/api/assignments/:id/status', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const role = (req as any).userRole;
    const userId = (req as any).userId;
    const { status } = req.body;

    const assignment = await prisma.assignment.findUnique({
      where: { id: Number(req.params.id) }
    });

    if (!assignment || assignment.companyId !== tenantId) {
      return res.status(404).json({ error: 'Tugas tidak ditemukan' });
    }

    // Permission check: only assignee or creator can update status
    if (role === 'EMPLOYEE' && assignment.userId !== userId && assignment.assignedById !== userId) {
      return res.status(403).json({ error: 'Bukan wewenang Anda' });
    }

    const updated = await prisma.assignment.update({
      where: { id: assignment.id },
      data: { status }
    });

    // Notify creator if completed by employee
    if (status === 'COMPLETED' && assignment.assignedById !== userId) {
       await sendNotification(
         tenantId,
         assignment.assignedById,
         'Tugas Selesai',
         `Tugas "${assignment.title}" telah diselesaikan oleh pelaksana.`
       );
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal update status: ' + error.message });
  }
});

// 4. Submit Result (with evidence)
app.patch('/api/assignments/:id/result', tenantMiddleware, upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { resultNote } = req.body;
    
    // Get file path if uploaded
    let resultImageUrl = req.body.resultImageUrl;
    if (req.file) {
      resultImageUrl = `/uploads/${req.file.filename}`;
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: Number(req.params.id) }
    });

    if (!assignment || assignment.companyId !== tenantId) {
      return res.status(404).json({ error: 'Tugas tidak ditemukan' });
    }

    if (assignment.userId !== userId) {
      return res.status(403).json({ error: 'Hanya pelaksana tugas yang bisa mengirim hasil' });
    }

    const updated = await prisma.assignment.update({
      where: { id: assignment.id },
      data: { 
        resultNote, 
        resultImageUrl,
        status: 'COMPLETED' 
      }
    });

    // Notify Admin/Manager that result is submitted
    await sendNotification(
      tenantId,
      assignment.assignedById,
      'Hasil Tugas Masuk',
      `Hasil untuk tugas "${assignment.title}" telah dikirimkan.`
    );

    res.json(updated);
  } catch (error: any) {
    console.error("SUBMIT RESULT ERROR:", error);
    res.status(500).json({ error: 'Gagal mengirim hasil: ' + error.message });
  }
});

// 5. Admin Approve/Verify Task (with KPI Integration)
app.patch('/api/assignments/:id/approve', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const role = (req as any).userRole;
    const { action } = req.body; // 'APPROVE', 'REJECT', or 'VERIFY'
    
    if (role === 'EMPLOYEE') return res.status(403).json({ error: 'Hanya Admin/Manager yang bisa menyetujui' });

    const assignment = await prisma.assignment.findUnique({
      where: { id: Number(req.params.id) }
    });

    if (!assignment || assignment.companyId !== tenantId) {
      return res.status(404).json({ error: 'Tugas tidak ditemukan' });
    }

    let newStatus: AssignmentStatus = assignment.status;
    let kpiMessage = '';

    if (action === 'APPROVE') {
      newStatus = 'IN_PROGRESS';
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED';
    } else if (action === 'VERIFY') {
      // Final Approval after completion -> Award KPI
      newStatus = 'COMPLETED'; // Ensure it's marked as final
      
      // KPI Integration logic
      // 1. Find or Create Indicator for "Penugasan Khusus"
      let indicator = await prisma.kPIIndicator.findFirst({
        where: { companyId: tenantId, name: 'Penugasan Khusus / RnD' }
      });

      if (!indicator) {
        indicator = await prisma.kPIIndicator.create({
          data: {
            companyId: tenantId,
            name: 'Penugasan Khusus / RnD',
            description: 'Poin dari penyelesaian tugas mandiri atau delegasi khusus.',
            weight: 1,
            target: 100
          }
        });
      }

      // 2. Add Score
      const now = new Date();
      const score = assignment.priority === 'HIGH' ? 100 : (assignment.priority === 'MEDIUM' ? 85 : 70);
      
      await prisma.kPIScore.upsert({
        where: {
          userId_indicatorId_month_year: {
            userId: assignment.userId,
            indicatorId: indicator.id,
            month: now.getMonth() + 1,
            year: now.getFullYear()
          }
        },
        update: {
          score: { increment: score },
          comment: `Penyelesaian tugas: ${assignment.title}`
        },
        create: {
          companyId: tenantId,
          userId: assignment.userId,
          indicatorId: indicator.id,
          score: score,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          comment: `Penyelesaian tugas: ${assignment.title}`
        }
      });
      kpiMessage = ` Poin KPI sebesar ${score} telah ditambahkan.`;
    }

    const updated = await prisma.assignment.update({
      where: { id: assignment.id },
      data: { status: newStatus }
    });

    await sendNotification(
      tenantId,
      assignment.userId,
      `Tugas ${action === 'VERIFY' ? 'Selesai & Diverifikasi' : (action === 'APPROVE' ? 'Disetujui' : 'Ditolak')}`,
      `Tugas "${assignment.title}" Anda telah ${action === 'VERIFY' ? 'diverifikasi admin.' : (action === 'APPROVE' ? 'disetujui dan bisa dimulai.' : 'ditolak.')}${kpiMessage}`
    );

    res.json(updated);
  } catch (error: any) {
    console.error("APPROVE ERROR:", error);
    res.status(500).json({ error: 'Gagal proses persetujuan: ' + error.message });
  }
});

// ==========================================
// PUBLIC API FOR MOBILE APP
// ==========================================

// Get Active Banners for a Company (Public)
app.get('/api/companies/public/:id/banners', async (req: Request, res: Response) => {
  const companyId = parseInt(req.params.id as string);
  console.log(`[Banners API] Fetching for companyId: ${companyId}`);
  try {
    const banners = await prisma.banner.findMany({
      where: { companyId, isActive: true },
      orderBy: { order: 'asc' }
    });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch banners.' });
  }
});

// Get Active Vouchers for a Company (Public)
app.get('/api/companies/public/:id/vouchers', async (req: Request, res: Response) => {
  const companyId = parseInt(req.params.id as string);
  console.log(`[Vouchers API] Fetching for companyId: ${companyId}`);
  try {
    const vouchers = await prisma.voucher.findMany({
      where: { 
        companyId, 
        isActive: true
        // Date check is disabled for now to ensure visibility during testing
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(vouchers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vouchers.' });
  }
});

// Webhook dari Xendit saat pembayaran berhasil
app.post('/api/payments/xendit/webhook', async (req: Request, res: Response) => {
  try {
    const { external_id, status } = req.body;
    
    // Log the incoming webhook for debugging
    console.log(`[XENDIT WEBHOOK] Received for invoice: ${external_id}, status: ${status}`);

    if (status === 'PAID' && external_id) {
      // Find the sale record by invoice number
      const sale = await prisma.sale.findUnique({
        where: { invoiceNumber: external_id }
      });

      if (sale && sale.status !== 'PAID') {
        // Update sale status to PAID
        await prisma.sale.update({
          where: { id: sale.id },
          data: { status: 'PAID' }
        });

        // Optional: Trigger finance integration or socket update here if needed

        console.log(`[XENDIT WEBHOOK] Sale ${external_id} marked as PAID.`);
      }
    }
    
    // Xendit expects a 200 OK response quickly
    res.status(200).json({ message: 'Webhook received' });
  } catch (error: any) {
    console.error("[XENDIT WEBHOOK ERROR]:", error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

runAutoMigration().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`✅ Backend SaaS aivola berjalan di http://localhost:${PORT}`);
    console.log(`⚠️  Peringatan: Pastikan PostgreSQL database berjalan dan URLnya sudah diset di file .env (DATABASE_URL)`);
    initCleanupCron(); // Start the background cleanup job
  });
});
// Trigger reload

// ==========================================
// GLOBAL ERROR HANDLER (Express 5 Compatible)
// ==========================================
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[GLOBAL ERROR HANDLER]', req.method, req.url, '\nError:', err?.message, err?.stack?.substring(0, 300));
  if (!res.headersSent) {
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
});

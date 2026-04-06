import express from 'express';
import cors from 'cors';
import { PrismaClient, Role } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadToSupabase } from './supabase_storage';
import dotenv from 'dotenv';
import { initCleanupCron, runCleanup } from './cron_jobs';
import { compareFaces } from './faceAI';
import { getAIChatResponse, generateSubscriptionResponse } from './chatAI';
import { sendWhatsAppMessage } from './whatsappAPI';
import aiRoutes from './src/routes/ai.routes';


dotenv.config({ path: path.resolve(__dirname, '.env') });
console.log('🚀 [BOOT] Aivola Backend v1.0.6-Final-Live starting...');
console.log(`[BOOT] Working Directory: ${process.cwd()}`);
console.log(`[BOOT] .env Path: ${path.resolve(__dirname, '.env')}`);
console.log(`[BOOT] GEMINI_API_KEY Status: ${process.env.GEMINI_API_KEY ? 'LOADED (' + process.env.GEMINI_API_KEY.substring(0, 4) + '...)' : 'MISSING'}`);

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ [BOOT] GEMINI_API_KEY is missing from environment variables!');
}
const VERSION = 'v1.0.6-final-live';

// Helper for cleaning up local files after Supabase upload (Phase Cloud)
const cleanupLocalFile = (filePath: string | null) => {
  if (!filePath) return;
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
const prisma = new PrismaClient();

// --- DIRECTORY INITIALIZATION ---
// Create required upload folders on startup (important for Railway/Cloud)
const requiredFolders = [
  path.join(process.cwd(), 'uploads'),
  path.join(process.cwd(), 'uploads/attendance'),
  path.join(process.cwd(), 'uploads/face_references')
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

app.use(cors());
app.use(express.json());

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

    // Pastikan ini adalah event pesan masuk dari WhatsApp
    if (body.object === 'whatsapp_business_account' && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const messageObj = body.entry[0].changes[0].value.messages[0];
      const from = messageObj.from; // Nomor WA klien
      const text = messageObj.text?.body; // Isi pesan teks

      if (text) {
        console.log(`🤖 [WA AI] Memproses pesan dari ${from}: "${text}"`);
        
        // --- LOGIKA AI AUTO-REPLY ---
        // 1. Tanya AI (Cek data paket/harga jika msg mengandung kata kunci)
        const aiResponse = await getAIChatResponse(text, []);
        
        // 2. Kirim balasan balasan otomatis ke klien lewat Meta API
        await sendWhatsAppMessage(from, aiResponse);
        console.log(`✅ [WA AI] Balasan otomatis terkirim ke ${from}`);
      }
    }

    res.status(200).send('EVENT_RECEIVED');

  } catch (error: any) {
    console.error('❌ [WA WEBHOOK Error]:', error.message);
    res.status(200).send('EVENT_RECEIVED'); // Tetap balas 200 ke Meta biar tidak error persistent
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

// --- STORAGE CONFIGURATION (Unified & Absolute) ---
const uploadAttendance = multer({ dest: path.join(process.cwd(), 'uploads/attendance/') });
const uploadFaceReference = multer({ dest: path.join(process.cwd(), 'uploads/face_references/') });
const uploadAnnouncement = multer({ dest: path.join(process.cwd(), 'uploads/announcements/') });
const uploadLogo = multer({ dest: path.join(process.cwd(), 'uploads/logos/') });

// --- 1. MIDDLEWARE MULTI-TENANT & AUTH (CRITICAL) ---
// Middleware ini mengekstrak profil Karyawan dari token JWT.
// --- RESTART TRIGGER: Ensuring API Key Support is Live ---
const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  // 1. JWT PATH (Login Aplikasi Standar)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as any).tenantId = Number(decoded.companyId);
      (req as any).userId = Number(decoded.userId);
      (req as any).userRole = decoded.role;

      const targetTenantId = req.headers['x-tenant-id'];
      if (decoded.role === 'SUPERADMIN' && targetTenantId) {
          (req as any).tenantId = parseInt(targetTenantId as string);
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
    } catch (error) {
        return res.status(500).json({ error: 'Gagal memverifikasi API Key.' });
    }
  }

  return res.status(401).json({
    error: 'Akses Ditolak: Token JWT atau API Key tidak ditemukan'
  });
};

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
    const admins = await prisma.user.findMany({
      where: {
        companyId,
        role: { in: ['ADMIN', 'OWNER'] },
        isActive: true
      }
    });

    for (const admin of admins) {
      await sendNotification(companyId, admin.id, title, message);
    }
  } catch (error) {
    console.error('Gagal mengirim notifikasi ke Admin:', error);
  }
}

// --- 3. ENDPOINT API (ROUTES) ---

// Z. Endpoint Login Karyawan (Menghasilkan JWT)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi.' });
    }

    const trimmedEmail = email.trim();
    console.log(`[LOGIN ATTEMPT] Email: ${trimmedEmail}`);

    const user = await prisma.user.findUnique({ 
      where: { email: trimmedEmail },
      include: { company: { select: { plan: true, addons: true } } }
    });
    if (!user) {
      console.log(`[LOGIN FAILED] User not found: ${trimmedEmail}`);
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log(`[LOGIN FAILED] Invalid password for: ${trimmedEmail}`);
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    // --- ENFORCE ACTIVE STATUS ---
    if (!user.isActive) {
      console.log(`[LOGIN FAILED] Account inactive for: ${trimmedEmail}`);
      return res.status(403).json({ error: 'Akun Anda sudah dinonaktifkan (Ex-Employee). Hubungi HR jika ini kesalahan.' });
    }

    console.log(`[LOGIN SUCCESS] User: ${user.email}`);

    // Buat JWT Token yang membungkus rahasia perusahaan milik karyawan terkait
    const token = jwt.sign(
      { 
        userId: user.id, 
        companyId: user.companyId, 
        role: user.role, 
        name: user.name,
        plan: (user as any).company?.plan,
        addons: (user as any).company?.addons || []
      },
      JWT_SECRET,
      { expiresIn: '90d' }
    );

    res.json({
      message: 'Login Berhasil',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: user.companyId,
        role: user.role,
        language: user.language,
        plan: (user as any).company?.plan,
        addons: (user as any).company?.addons || []
      }
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
      // Hitung tanggal akhir trial (14 hari dari sekarang)
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

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

// B3. Endpoint Mendapatkan Detail Profil Diri (Mobile/Self)
app.get('/api/users/me', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true, shift: true }
    });
    if (!user) return res.status(404).json({ error: 'Profil tidak ditemukan' });

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

// A. Endpoint Mendaftar Perusahaan SaaS Baru (Super Admin)
app.post('/api/companies', async (req: Request, res: Response) => {
  try {
    const { 
      name, latitude, longitude, radius,
      picName, picPhone, contractType, contractValue, contractStart, contractEnd,
      employeeLimit, adminLimit, posLimit, photoRetentionDays,
      plan, addons,
      discountKpi, discountLearning, discountInventory, discountAi, discountFraud, discountExpansion,
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
          contractValue: contractValue ? parseFloat(contractValue) : 0,
          contractStart: contractStart ? new Date(contractStart) : null,
          contractEnd: contractEnd ? new Date(contractEnd) : null,
          employeeLimit: employeeLimit ? parseInt(employeeLimit, 10) : 0,
          adminLimit: adminLimit ? parseInt(adminLimit, 10) : 2,
          posLimit: posLimit ? parseInt(posLimit, 10) : 1,
          photoRetentionDays: photoRetentionDays ? parseInt(photoRetentionDays, 10) : 30,
          plan: plan || 'STARTER',
          addons: addons || [],
          discountKpi: parseInt(discountKpi, 10) || 0,
          discountLearning: parseInt(discountLearning, 10) || 0,
          discountInventory: parseInt(discountInventory, 10) || 0,
          discountAi: parseInt(discountAi, 10) || 0,
          discountFraud: parseInt(discountFraud, 10) || 0,
          discountExpansion: parseInt(discountExpansion, 10) || 0
        }
      });

      let adminUser = null;

      // 2. Buat Admin Pertama jika data dikirim
      if (adminEmail && adminPassword) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        adminUser = await tx.user.create({
          data: {
            companyId: company.id,
            email: adminEmail.trim(),
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
        }
      }
    });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar klien' });
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
    res.json({ ...company, expiryLevel });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data perusahaan' });
  }
});

// A2.3. Update Data Perusahaan Sendiri (Tenant - My Company)
app.patch('/api/companies/my', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { name, latitude, longitude, radius, modules, picName, picPhone } = req.body;

    const updated = await prisma.company.update({
      where: { id: tenantId },
      data: {
        ...(name !== undefined && { name }),
        ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
        ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
        ...(radius !== undefined && { radius: parseInt(radius, 10) }),
        ...(modules !== undefined && { modules }),
        // @ts-ignore
        ...(picName !== undefined && { picName }),
        ...(picPhone !== undefined && { picPhone }),
      }
    });

    res.json({ message: 'Data perusahaan berhasil diperbarui' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal memperbarui perusahaan: ' + error.message });
  }
});

// --- MODUL PURCHASE ORDER (PO) ---

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
        items: { include: { product: { select: { name: true, unit: true } } } }
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
    const userId = (req as any).userId;
    const { supplierId, date, items, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Minimal harus ada 1 barang yang dipesan.' });
    }

    const orderNumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.price)), 0);

    const result = await prisma.purchaseOrder.create({
      data: {
        companyId: tenantId,
        supplierId: parseInt(supplierId),
        orderNumber,
        date: date ? new Date(date) : new Date(),
        totalAmount,
        notes,
        createdById: userId,
        status: 'PENDING',
        items: {
          create: items.map((item: any) => ({
            productId: parseInt(item.productId),
            quantity: parseFloat(item.quantity),
            price: parseFloat(item.price),
            total: parseFloat(item.quantity) * parseFloat(item.price)
          }))
        }
      },
      include: { items: true }
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("PO CREATE ERROR:", error);
    res.status(500).json({ error: 'Gagal membuat PO: ' + error.message });
  }
});

// PO3. Update PO Status (Approve/Reject)
app.patch('/api/inventory/purchase-orders/:id/status', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    const id = parseInt(req.params.id as string);
    const { status } = req.body; // APPROVED or REJECTED

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid.' });
    }

    // Role check: Only PURCHASING/ADMIN can approve
    if (!['PURCHASING', 'ADMIN', 'SUPERADMIN', 'OWNER'].includes(userRole)) {
      return res.status(403).json({ error: 'Anda tidak memiliki hak untuk menyetujui PO ini.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id, companyId: tenantId },
        include: { supplier: true, items: true }
      });

      if (!po) throw new Error('PO tidak ditemukan.');
      if (po.status !== 'PENDING') throw new Error('PO sudah diproses sebelumnya.');

      const updatedPo = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status,
          approvedById: userId,
          updatedAt: new Date()
        }
      });

      // If APPROVED, create a PENDING Expense (Hutang) AND update Inventory
      if (status === 'APPROVED') {
        // 1. Create Finance Record (Hutang)
        // Find or create "Pembelian (Auto-PO)" category
        let category: any = await tx.expenseCategory.findFirst({
          where: { companyId: tenantId, name: 'Pembelian (Auto-PO)' }
        });

        if (!category) {
          const catResult: any[] = await tx.$queryRawUnsafe(`
            INSERT INTO "ExpenseCategory" ("companyId", "name", "type", "updatedAt")
            VALUES ($1, 'Pembelian (Auto-PO)', 'OPERATIONAL', NOW())
            RETURNING id
          `, tenantId);
          category = { id: catResult[0].id };
        }

        // Add to Expense (Hutang)
        await tx.expense.create({
          data: {
            companyId: tenantId,
            categoryId: category.id,
            supplierId: po.supplierId,
            amount: po.totalAmount,
            date: new Date(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
            description: `Hutang otomatis dari PO #${po.orderNumber}`,
            status: 'PENDING',
            paidTo: po.supplier.name
          }
        });

        // 2. Update Stock for each item
        for (const item of po.items) {
          // Update Global Stock
          await tx.product.update({
            where: { id: item.productId },
            data: { 
              stock: { increment: item.quantity },
              costPrice: item.price // Update latest purchase price
            }
          });

          // Record Stock Transaction
          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              type: 'IN',
              quantity: item.quantity,
              reference: `PO #${po.orderNumber} (Approved)`,
              date: new Date()
            }
          });
        }
      }

      return updatedPo;
    });

    res.json({ message: `PO berhasil ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}`, result });
  } catch (error: any) {
    console.error("PO STATUS ERROR:", error);
    res.status(500).json({ error: 'Gagal memproses PO: ' + error.message });
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
    if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
      console.warn(`[AUTH] Unauthorized Company Update Attempt by User: ${(req as any).userId}, Role: ${userRole}`);
      return res.status(403).json({ error: 'Akses Ditolak: Hanya Admin yang dapat merubah profil perusahaan' });
    }

    const { 
      name, latitude, longitude, radius,
      picName, picPhone, address, contractType, contractValue, contractStart, contractEnd,
      employeeLimit, photoRetentionDays, modules
    } = req.body;

    console.log(`[DEBUG] Updating Company Profile for Tenant: ${tenantId}`, {
      body: req.body
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
        contractType,
        contractValue: parseNum(contractValue),
        contractStart: contractStart ? new Date(contractStart) : undefined,
        contractEnd: contractEnd ? new Date(contractEnd) : undefined,
        employeeLimit: parseIntNum(employeeLimit),
        photoRetentionDays: parseIntNum(photoRetentionDays),
        modules: modules
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
      picName, picPhone, contractType, contractValue, contractStart, contractEnd,
      employeeLimit, adminLimit, posLimit, photoRetentionDays,
      plan, addons, purchasedInsights,
      discountKpi, discountLearning, discountInventory, discountAi, discountFraud, discountExpansion
    } = req.body;

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        latitude: (latitude !== undefined && latitude !== null) ? parseFloat(latitude.toString()) : (latitude === null ? null : undefined),
        longitude: (longitude !== undefined && longitude !== null) ? parseFloat(longitude.toString()) : (longitude === null ? null : undefined),
        radius: (radius !== undefined && radius !== null) ? parseInt(radius.toString(), 10) : undefined,
        picName,
        picPhone,
        contractType,
        contractValue: (contractValue !== undefined && contractValue !== null) ? parseFloat(contractValue.toString()) : undefined,
        contractStart: contractStart ? new Date(contractStart) : (contractStart === null ? null : undefined),
        contractEnd: contractEnd ? new Date(contractEnd) : (contractEnd === null ? null : undefined),
        employeeLimit: (employeeLimit !== undefined && employeeLimit !== null) ? parseInt(employeeLimit.toString(), 10) : undefined,
        adminLimit: (adminLimit !== undefined && adminLimit !== null) ? parseInt(adminLimit.toString(), 10) : undefined,
        posLimit: (posLimit !== undefined && posLimit !== null) ? parseInt(posLimit.toString(), 10) : undefined,
        photoRetentionDays: (photoRetentionDays !== undefined && photoRetentionDays !== null) ? parseInt(photoRetentionDays.toString(), 10) : undefined,
        plan: plan !== undefined ? plan : undefined,
        addons: addons !== undefined ? addons : undefined,
        purchasedInsights: purchasedInsights !== undefined ? purchasedInsights : undefined,
        discountKpi: discountKpi !== undefined ? parseInt(discountKpi.toString(), 10) : undefined,
        discountLearning: discountLearning !== undefined ? parseInt(discountLearning.toString(), 10) : undefined,
        discountInventory: discountInventory !== undefined ? parseInt(discountInventory.toString(), 10) : undefined,
        discountAi: discountAi !== undefined ? parseInt(discountAi.toString(), 10) : undefined,
        discountFraud: discountFraud !== undefined ? parseInt(discountFraud.toString(), 10) : undefined,
        discountExpansion: discountExpansion !== undefined ? parseInt(discountExpansion.toString(), 10) : undefined
      }
    });

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

    // 1. Upload ke Cloud Storage (dengan fallback otomatis ke lokal jika gagal)
    const logoUrl = await uploadToSupabase(req.file.path, 'logos');
    console.log(`[LOGO UPLOAD] File saved at: ${logoUrl}`);

    // 2. Update URL di Database
    const updatedCompany = await prisma.company.update({
      where: { id: tenantId },
      data: { logoUrl }
    });

    // 3. Cleanup local file hanya jika sudah aman di cloud
    if (logoUrl && !logoUrl.startsWith('/uploads')) {
      cleanupLocalFile(req.file.path);
    }

    // Pastikan URL yang dikirim balik adalah URL lengkap jika itu file lokal
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const finalUrl = logoUrl.startsWith('/') ? `${baseUrl}${logoUrl}` : logoUrl;

    res.json({ 
      success: true,
      message: 'Logo berhasil diperbarui', 
      logoUrl: finalUrl 
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
  try {
    const tenantId = (req as any).tenantId;
    const { 
      name, email, password, role, companyId, branchId, shiftId,
      basicSalary, allowance, overtimeRate, jobTitle, division, 
      grade, joinDate, contractEndDate, reportToId
    } = req.body;

    // --- ENFORCE EMPLOYEE LIMIT (PRO REQUEST) ---
    const company = await prisma.company.findUnique({
      where: { id: tenantId }
    });

    if (company) {
      // 1. Check Employee Limit (Active Employees Only)
      const activeUserCount = await prisma.user.count({
          where: { companyId: tenantId, isActive: true }
      });

      if (company.employeeLimit > 0 && activeUserCount >= company.employeeLimit) {
        return res.status(403).json({ 
          error: `Limit karyawan tercapai! Tenant ini hanya diizinkan memiliki maksimal ${company.employeeLimit} karyawan.` 
        });
      }

      // 3. Check Admin/Back-office Limit (NEW)
      const backOfficeRoles: Role[] = ['ADMIN', 'OWNER', 'MANAGER', 'PURCHASING', 'OPERATIONAL'] as any;
      if (backOfficeRoles.includes(role)) {
          const currentAdminCount = await prisma.user.count({
              where: { 
                  companyId: tenantId,
                  role: { in: backOfficeRoles as any }
              }
          });

          if (company.adminLimit > 0 && currentAdminCount >= company.adminLimit) {
              return res.status(403).json({
                  error: `Limit Admin/Back-office tercapai! Paket Anda hanya mengizinkan maksimal ${company.adminLimit} user dengan role manajemen. Silakan upgrade paket atau tambah slot admin.`
              });
          }
      }

      // 4. Check POS/Cashier Limit (NEW)
      if (role === 'CASHIER') {
          const companyLimit = await prisma.company.findUnique({ where: { id: tenantId } });
          const currentCashierCount = await prisma.user.count({
              where: { 
                  companyId: tenantId,
                  role: 'CASHIER'
              }
          });

          if (companyLimit && companyLimit.posLimit > 0 && currentCashierCount >= companyLimit.posLimit) {
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
        companyId: tenantId,
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
        reportToId: reportToId ? parseInt(reportToId) : null
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
  try {
    const tenantId = (req as any).tenantId;
    const reqUserId = parseInt(req.params.id as string);
    const { 
      name, email, role, basicSalary, allowance, overtimeRate, 
      jobTitle, division, grade, joinDate, contractEndDate, 
      reportToId, isActive, resignDate 
    } = req.body;

    // Pastikan karyawan milik tenant yang sama
    const checkUser = await prisma.user.findFirst({ where: { id: reqUserId, companyId: tenantId } });
    if (!checkUser) return res.status(404).json({ error: 'Karyawan tidak ditemukan' });

    // --- ENFORCE ADMIN LIMIT ON UPDATE ---
    const backOfficeRoles: Role[] = ['ADMIN', 'OWNER', 'MANAGER', 'PURCHASING', 'OPERATIONAL'] as any;
    if (role && role !== checkUser.role && backOfficeRoles.includes(role)) {
        const company = await prisma.company.findUnique({ where: { id: tenantId } });
        const currentAdminCount = await prisma.user.count({
            where: { 
                companyId: tenantId,
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
    if (role && role !== checkUser.role && role === 'CASHIER') {
        const company = await prisma.company.findUnique({ where: { id: tenantId } });
        const currentCashierCount = await prisma.user.count({
            where: { 
                companyId: tenantId,
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
        isActive: isActive !== undefined ? !!isActive : undefined,
        resignDate: resignDate ? new Date(resignDate) : undefined
      }
    });

    res.json({ message: 'Data karyawan berhasil diperbarui', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal memperbarui data karyawan' });
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
    // SuperAdmin can delete anyone. Admin can only delete users in their own company.
    if (userRole !== 'SUPERADMIN' && targetUser.companyId !== tenantId) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses untuk menghapus user ini' });
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

// B2. Endpoint Mendapatkan Daftar Karyawan (Menggunakan Tenant Middleware)
app.get('/api/users', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId; // Diambil dari middleware
    const userRole = (req as any).userRole;
    const { status } = req.query; // 'active' atau 'inactive'

    // WAJIB: Selalu gunakan klausa `where: { companyId: tenantId }`!
    // Ini memastikan PT. A tidak bisa melihat karyawan PT. B
    const users = await (prisma.user as any).findMany({
      where: {
        ...(userRole === 'SUPERADMIN' 
          ? {} 
          : { 
              companyId: tenantId, 
              role: { not: 'SUPERADMIN' },
              name: { not: 'Aivola Owner' }
            }
        ),
        ...(status === 'inactive' ? { isActive: false } : { isActive: true }) // Default active
      },
      include: {
        shift: true,
        branch: true,
        reportTo: { select: { id: true, name: true } } // Phase 42
      }
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data karyawan' });
  }
});

// C. Endpoint Karyawan Melakukan Absensi (Clock-In) dengan Validasi Pagar Virtual per Cabang
app.post('/api/attendance/clock-in', tenantMiddleware, uploadAttendance.single('photo'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { lat, lng, deviceId } = req.body;

    // photoUrl diambil dari multer jika ada
    const photoUrl = req.file ? `/uploads/attendance/${req.file.filename}` : null;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Koordinat GPS perangkat wajib dilampirkan!' });
    }

    // 1. Tarik Data Karyawan beserta Cabang & Perusahaannya
    const user = await prisma.user.findUnique({
      where: { id: userId },
      // @ts-ignore
      include: { company: true, branch: true }
    });

    // @ts-ignore
    if (!user || !user.company) return res.status(404).json({ error: 'Data karyawan atau perusahaan tidak ditemukan' });

    // --- FACE VERIFICATION (Phase 50/52) ---
    let faceSimilarityScore = null;
    let isFaceVerified = false;

    // @ts-ignore
    if (!user.faceReferenceUrl) {
      return res.status(400).json({ error: 'Verifikasi Wajah Gagal: Anda belum mendaftarkan Master Photo (Referensi Wajah). Silakan hubungi HRD.' });
    }

    if (req.file) {
      try {
        const capturePath = path.join(process.cwd(), photoUrl!.replace(/^\/+/, ""));
        // @ts-ignore
        const refUrl = user.faceReferenceUrl;
        
        const faceResult = await compareFaces(refUrl, capturePath);
        faceSimilarityScore = faceResult.score;
        isFaceVerified = faceResult.verified;
        console.log(`[Face AI] Clock-In Verification: ${isFaceVerified} (Score: ${faceSimilarityScore})`);

        if (!isFaceVerified) {
          const errMsg = faceResult.errorMessage ? `Error: ${faceResult.errorMessage}` : `Foto selfie tidak cocok dengan data referensi (Kemiripan: ${(faceSimilarityScore * 100).toFixed(1)}%). Pastikan wajah terlihat jelas.`;
          return res.status(400).json({ error: `Verifikasi Wajah Gagal: ${errMsg}` });
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

    // 3. Simpan data aman ke tabel absen
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
        status: 'PRESENT',
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

    // --- AI MOOD ANALYSIS (Phase 36) ---
    if (photoUrl) {
        const fullPath = path.join(process.cwd(), photoUrl.replace(/^\/+/, ""));
        console.log(`[Mood AI] Analyzing photo at: ${fullPath}`);
        if (fs.existsSync(fullPath)) {
            try {
                const { analyzeMood } = require('./moodAI');
                const moodResult = await analyzeMood(fullPath);
                console.log(`[Mood AI] Result for attendance ${attendance.id}:`, moodResult);
                await (prisma.attendance as any).update({
                    where: { id: attendance.id },
                    data: {
                        mood: moodResult.mood,
                        moodScore: moodResult.score
                    }
                });
                // Update response object for mobile
                (attendance as any).mood = moodResult.mood;
                (attendance as any).moodScore = moodResult.score;
            } catch (moodErr) {
                console.error('[Mood AI] Error during analysis:', moodErr);
            }
        } else {
            console.warn(`[Mood AI] Photo file not found for analysis: ${fullPath}`);
        }
        // Cleanup after Supabase upload and AI processing
        // ONLY cleanup if successfully uploaded to Supabase (finalPhotoUrl is not local)
        if (finalPhotoUrl && finalPhotoUrl.startsWith('http')) {
            cleanupLocalFile(fullPath);
        }
    }

    // TRIGGER NOTIFIKASI KE ADMIN
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    await notifyAdmins(tenantId, 'Clock-In Baru', `${targetUser?.name || 'Seorang karyawan'} melakukan clock-in.`);

    res.json({ message: 'Absent Berhasil (Clock In)', attendance });
  } catch (error) {
    res.status(500).json({ error: 'Gagal melakukan absensi' });
  }
});

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

// C1.1. Admin melihat semua daftar absensi (Terbaru)
app.get('/api/attendance', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const attendances = await prisma.attendance.findMany({
      where: userRole === 'SUPERADMIN' ? {} : { companyId: tenantId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { clockIn: 'desc' },
      take: 50 // Limit 50 terbaru
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: userId,
        companyId: tenantId,
        clockIn: { gte: today },
        clockOut: null
      },
      orderBy: { clockIn: 'desc' },
      include: { user: { include: { company: true, branch: true } } }
    });

    if (!attendance) {
      return res.status(404).json({ error: 'Data absensi aktif hari ini tidak ditemukan.' });
    }

    // --- FACE VERIFICATION (Phase 50/52) - Clock Out ---
    let faceSimilarityScore = null;
    let isFaceVerified = false;

    // @ts-ignore
    if (!attendance.user.faceReferenceUrl) {
      return res.status(400).json({ error: 'Verifikasi Wajah Gagal: Anda belum memiliki Master Photo. Hubungi HRD.' });
    }

    if (req.file) {
      try {
        const capturePath = path.join(process.cwd(), photoUrl!.replace(/^\/+/, ""));
        // @ts-ignore
        const refUrl = attendance.user.faceReferenceUrl;
        const faceResult = await compareFaces(refUrl, capturePath);
        faceSimilarityScore = faceResult.score;
        isFaceVerified = faceResult.verified;
        console.log(`[Face AI] Clock-Out Verification: ${isFaceVerified} (Score: ${faceSimilarityScore})`);

        if (!isFaceVerified) {
          const errMsg = faceResult.errorMessage ? `Error: ${faceResult.errorMessage}` : `Foto tidak cocok (Kemiripan: ${(faceSimilarityScore * 100).toFixed(1)}%).`;
          return res.status(400).json({ error: `Verifikasi Wajah Gagal: ${errMsg}` });
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
        deviceId: deviceId || (attendance as any).deviceId
      }
    });

    // --- AI MOOD ANALYSIS (Phase 36) - Clock Out ---
    if (photoUrl) {
        const fullPath = path.join(process.cwd(), photoUrl.replace(/^\/+/, ""));
        if (fs.existsSync(fullPath)) {
            try {
                const { analyzeMood } = require('./moodAI');
                const moodResult = await analyzeMood(fullPath);
                console.log(`[Mood AI - ClockOut] Result for attendance ${attendance.id}:`, moodResult);
                // Kita simpan mood clock-out jika ingin mendata mood akhir hari
                // Namun di database kita hanya punya satu kolom mood (biasanya clock-in yang paling krusial)
                // Jika ingin menyimpan keduanya, butuh update schema.
                // Untuk sekarang kita hanya update jika data mood masih kosong (misal gagal saat clock-in)
                await (prisma.attendance as any).update({
                    where: { id: attendance.id },
                    data: {
                        mood: moodResult.mood,
                        moodScore: moodResult.score
                    }
                });
            } catch (moodErr) {
                console.error('[Mood AI - ClockOut] Error:', moodErr);
            }
        }
        // ONLY cleanup if successfully uploaded to Supabase (finalPhotoUrl is not local)
        if (finalPhotoUrl && finalPhotoUrl.startsWith('http')) {
            cleanupLocalFile(fullPath);
        }
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendances = await prisma.attendance.findMany({
      where: {
        userId: userId,
        companyId: tenantId,
        clockIn: { gte: today }
      },
      orderBy: { clockIn: 'desc' }
    });

    // latest attendance for button status
    const attendance = attendances.length > 0 ? attendances[0] : null;

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
      where: userRole === 'SUPERADMIN' ? {} : { companyId: tenantId } 
    });
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data jadwal shift' });
  }
});

// D3. Endpoint Menugaskan Karyawan Tertentu ke Sebuah Shift
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

    // 4. Validasi Sisa Kuota (12 Hari) - KECUALI JIKA SAKIT
    if (type !== 'SICK') {
      if (usedLeaveDays + newLeaveDays > 12) {
        return res.status(400).json({
          error: `Jatah cuti tahunan (12 hari) tidak mencukupi.\nSisa: ${12 - usedLeaveDays} hari.\nMeminta: ${newLeaveDays} hari.`
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

    // TRIGGER NOTIFIKASI KE ADMIN
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    await notifyAdmins(tenantId, 'Pengajuan Cuti Baru', `${targetUser?.name || 'Seorang karyawan'} mengajukan cuti baru.`);

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

    res.json({
      totalQuota: 12,
      used: usedLeaveDays,
      remaining: 12 - usedLeaveDays,
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
      where: userRole === 'SUPERADMIN' ? {} : { companyId: tenantId },
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

// E3. Admin memberikan persetujuan atau penolakan cuti
app.patch('/api/leaves/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const leaveId = parseInt(req.params.id as string);
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid' });
    }

    // Pastikan cuti ini milik tenant yang benar
    const leave = await prisma.leaveRequest.findFirst({
      where: { id: leaveId, companyId: tenantId }
    });

    if (!leave) return res.status(404).json({ error: 'Data cuti tidak ditemukan' });

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { status }
    });

    // TRIGGER NOTIFIKASI
    await sendNotification(
      tenantId,
      updatedLeave.userId,
      `Status Cuti: ${status}`,
      `Pengajuan cuti Anda untuk tanggal ${new Date(updatedLeave.startDate).toLocaleDateString('id-ID')} telah ${status === 'APPROVED' ? 'DISETUJUI' : 'DITOLAK'}.`
    );

    res.json({ message: `Cuti telah ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}`, updatedLeave });
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
    const indicators = await prisma.kPIIndicator.findMany({
      where: { companyId: tenantId },
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
    const { name, description, target, weight, isSystem, systemType } = req.body;
    console.log(`[KPI] Create Indicator: Tenant=${tenantId}, Body=`, req.body);

    if (!name) return res.status(400).json({ error: 'Nama indikator wajib diisi' });

    const newIndicator = await prisma.kPIIndicator.create({
      data: {
        companyId: tenantId,
        name,
        description,
        target: target ? parseFloat(target) : 100,
        weight: weight ? parseFloat(weight) : 1,
        isSystem: isSystem || false,
        systemType: systemType || null
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
    const { name, description, target, weight, isSystem, systemType } = req.body;

    if (typeof id !== 'string') return res.status(400).json({ error: 'ID tidak valid' });

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
        systemType: systemType || null
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
      where: userRole === 'SUPERADMIN' ? {} : { companyId: tenantId } 
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
          },
          include: { 
            // @ts-ignore
            shift: true 
          }
        });

        for (const att of lateAttendances) {
          // @ts-ignore
          if (att.shift && att.shift.startTime) {
            // @ts-ignore
            const shiftStart = att.shift.startTime; // Format "HH:mm"
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
      const totalDeductions = (lateCount * LATE_RATE) + absentDeductionAmount;

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
      
      const pph21 = calculatePPh21(grossForTax, deductionForTax, (user as any).taxStatus || 'TK-0');

      // 6. Final Calculation
      // Gaji Bersih = (Pendapatan Kotor) - (Potongan Absensi + Pinjaman + BPJS Karyawan + PPh 21 + Potongan Sakit)
      const totalEarnings = (user.basicSalary + (user.allowance || 0) + overtimePay + reimbursementPay + bonusPayTotal);
      const totalDeductionsAll = totalDeductions + loanDeduction + bpjs.employeeDeduction + pph21 + sickLeaveDeduction;
      
      const netSalary = totalEarnings - totalDeductionsAll;

      // Simpan Draft Payroll
      const payroll = await prisma.payroll.upsert({
        where: {
          userId_month_year: { userId: user.id, month, year }
        },
        update: {
          basicSalary: user.basicSalary,
          allowance: user.allowance || 0,
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

// F2. Melihat daftar payroll perusahaan
app.get('/api/payroll', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const { month, year } = req.query;

    const whereClause: any = userRole === 'SUPERADMIN' ? {} : { companyId: tenantId };
    if (month) whereClause.month = parseInt(month as string);
    if (year) whereClause.year = parseInt(year as string);

    const payrolls = await prisma.payroll.findMany({
      where: whereClause,
      include: { user: { select: { name: true, email: true } } },
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
    const { month, year } = req.query;
    const ExcelJS = require('exceljs');

    const payrolls = await prisma.payroll.findMany({
      where: {
        companyId: tenantId,
        ...(month ? { month: parseInt(month as string) } : {}),
        ...(year ? { year: parseInt(year as string) } : {})
      },
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
        bonus: p.bonusPay,
        overtime: p.overtimePay,
        deductions: p.deductions,
        netSalary: p.netSalary,
        status: p.status
      });

      // Format currency
      ['basicSalary', 'allowance', 'bonus', 'overtime', 'deductions', 'netSalary'].forEach(col => {
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
    const { userId, month, year, basicSalary, allowance, deductions, bonusPay, status } = req.body;

    if (!userId || !month || !year) return res.status(400).json({ error: 'User ID, Bulan, dan Tahun wajib diisi.' });

    // --- CHECK CLOSING ---
    const dateCheck = new Date(year, month - 1, 1);
    if (await isPeriodClosed(tenantId, dateCheck)) {
       return res.status(403).json({ error: 'Periode buku sudah ditutup. Tidak dapat mencatat gaji manual pada periode ini.' });
    }

    const netSalary = (Number(basicSalary) || 0) + (Number(allowance) || 0) + (Number(bonusPay) || 0) - (Number(deductions) || 0);

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
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    const reimbursement = await (prisma.reimbursement as any).findFirst({
        where: { id: parseInt(id as string), companyId: tenantId as any }
    });

    if (!reimbursement) return res.status(404).json({ error: 'Data tidak ditemukan' });
    if (reimbursement.status !== 'APPROVED') {
        return res.status(400).json({ error: 'Hanya reimbursement yang sudah DISETUJUI yang bisa dibayar.' });
    }

    const updated = await (prisma.reimbursement as any).update({
      where: { id: parseInt(id as string) },
      data: {
        isPaid: true,
        paidAt: new Date()
      }
    });

    // Notifikasi ke karyawan
    await sendNotification(
      tenantId,
      updated.userId,
      `Reimbursement Dibayar`,
      `Dana untuk klaim "${updated.title}" sebesar Rp${updated.amount} telah dibayarkan/ditransfer.`
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Gagal memproses pembayaran reimbursement.' });
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

// 2. Admin melihat semua pinjaman
app.get('/api/loans', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const loans = await prisma.loan.findMany({
      where: userRole === 'SUPERADMIN' ? {} : { companyId: tenantId },
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
    let receiptUrl = req.file ? `/uploads/reimbursements/${req.file.filename}` : null;

    if (req.file) {
      try {
        const fullLocalPath = path.join(__dirname, 'uploads/reimbursements', req.file.filename);
        receiptUrl = await uploadToSupabase(fullLocalPath, 'reimbursements');
      } catch (uploadError) {
        console.error('Failed to upload reimbursement to R2:', uploadError);
      }
    }

    if (!title || !amount) {
      return res.status(400).json({ error: 'Judul dan nominal klaim wajib diisi.' });
    }

    const fullPath = req.file ? path.join(__dirname, 'uploads/reimbursements', req.file.filename) : null;

    let ocrResult = { amount: null, date: null, category: null };
    let fraudCheck = { isFraud: false, reason: null, receiptHash: null };

    if (fullPath) {
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
    }

    const reimbursement = await prisma.reimbursement.create({
      data: {
        companyId: tenantId,
        userId: userId,
        title,
        description,
        amount: parseFloat(amount),
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

    // Cleanup local file after Supabase upload and AI processing
    cleanupLocalFile(fullPath);

    // TRIGGER NOTIFIKASI KE ADMIN
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    await notifyAdmins(tenantId, 'Pengajuan Reimbursement', `${targetUser?.name || 'Seorang karyawan'} mengajukan reimbursement sebesar Rp ${amount.toLocaleString('id-ID')}.`);

    res.json({ message: 'Reimbursement berhasil diajukan', reimbursement });
  } catch (error) {
    console.error('Error reimbursement:', error);
    res.status(500).json({ error: 'Gagal mengajukan klaim reimbursement.' });
  }
});

// 2. Admin mengambil semua klaim di perusahaannya
app.get('/api/reimbursements', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;

    const reimbursements = await prisma.reimbursement.findMany({
      where: userRole === 'SUPERADMIN' ? {} : { companyId: tenantId },
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

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid.' });
    }

    const reimbursement = await prisma.reimbursement.update({
      where: {
        id: parseInt(id as string),
        companyId: tenantId
      },
      data: { status }
    });

    // TRIGGER NOTIFIKASI
    await sendNotification(
      tenantId,
      reimbursement.userId,
      `Klaim Biaya: ${status}`,
      `Pengajuan reimbursement "${reimbursement.title}" Anda telah ${status === 'APPROVED' ? 'DISETUJUI' : 'DITOLAK'}.`
    );

    res.json(reimbursement);
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui status reimbursement.' });
  }
});

// --- Manajemen Libur Nasional (Hari Bebas Gaji) ---

app.get('/api/holidays', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { month, year } = req.query;

    const userRole = (req as any).userRole;
    const whereClause: any = userRole === 'SUPERADMIN' ? {} : { companyId: tenantId };
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

    if (!['APPROVED', 'REJECTED'].includes(status)) {
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
      `Pengajuan cuti Anda untuk tanggal ${new Date(updated.startDate).toLocaleDateString('id-ID')} telah ${status === 'APPROVED' ? 'DISETUJUI' : 'DITOLAK'}.`
    );

    res.json({ message: `Cuti berhasil ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}`, updated });
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
    const vents = await (prisma as any).employeeVent.findMany({
      where: userRole === 'SUPERADMIN' ? {} : { companyId: tenantId },
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
      where: userRole === 'SUPERADMIN' ? {} : { companyId: tenantId },
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
      where: userRole === 'SUPERADMIN' ? {} : { companyId: tenantId },
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
app.put('/api/admin/learning/materials/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const id = parseInt(req.params.id as string);
    const { title, content, category, targetDivision, targetJobTitle, regenerateQuestions, questionCount, minScore } = req.body;

    const material = await (prisma as any).learningMaterial.findFirst({
      where: userRole === 'SUPERADMIN' ? { id } : { id, companyId: tenantId }
    });

    if (!material) return res.status(404).json({ error: 'Materi tidak ditemukan.' });

    // Update material
    const updatedMaterial = await (prisma as any).learningMaterial.update({
      where: { id },
      data: {
        title,
        content,
        category,
        targetDivision,
        targetJobTitle
      }
    });

    // Update minScore of existing exams if present
    if (minScore !== undefined) {
      await (prisma as any).exam.updateMany({
        where: { materialId: id },
        data: { minScore: parseFloat(minScore) }
      });
    }

    // Jika re-generate questions
    if (regenerateQuestions) {
        // Hapus ujian lama
        await (prisma as any).exam.deleteMany({
            where: { materialId: id }
        });

        // Generate baru
        const { generateQuestions } = require('./examAI');
        const questionsData = await generateQuestions(content, questionCount || 5);

        await (prisma as any).exam.create({
            data: {
                companyId: material.companyId,
                materialId: id,
                title: `Test Pemahaman: ${title}`,
                description: `Ujian otomatis untuk memverifikasi pemahaman Anda tentang ${title}.`,
                targetDivision: targetDivision || null,
                targetJobTitle: targetJobTitle || null,
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

    res.json(updatedMaterial);
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Gagal memperbarui materi.' });
  }
});

// --- FASE 39: AI-GENERATED EXAM SYSTEM (OTOMASI TES SOP) ---

// 1. Admin: Upload SOP & Generate Exam
app.post('/api/learning/materials', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { title, content, category, targetDivision, targetJobTitle, questionCount, minScore } = req.body;

    // Simpan Material SOP
    const material = await (prisma as any).learningMaterial.create({
      data: {
        companyId: tenantId,
        title,
        content,
        category: category || 'SOP',
        targetDivision: targetDivision || null,
        targetJobTitle: targetJobTitle || null
      }
    });

    // AI generate questions
    const { generateQuestions } = require('./examAI');
    const questionsData = await generateQuestions(content, questionCount || 5);

    // Create Exam based on material
    const exam = await (prisma as any).exam.create({
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

    res.status(201).json({ material, exam });
  } catch (error) {
    console.error('Error creating material/exam:', error);
    res.status(500).json({ error: 'Gagal memproses material dan membuat ujian.' });
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
    if (score >= passingScore && exam.materialId) {
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
      where: userRole === 'SUPERADMIN' ? {} : { companyId: tenantId },
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

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid.' });
    }

    // Autoritas: Harus Admin atau orang yang ditunjuk sebagai approverId
    const target = await (prisma.overtimeRequest as any).findUnique({
      where: { id, companyId: tenantId }
    });

    if (!target) {
      return res.status(404).json({ error: 'Data lembur tidak ditemukan.' });
    }

    if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN' && target.approverId !== userId) {
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
      `Pengajuan lembur Anda untuk tanggal ${new Date(updated.date).toLocaleDateString('id-ID')} telah ${status === 'APPROVED' ? 'DISETUJUI' : 'DITOLAK'}.`
    );

    res.json({ message: `Lembur berhasil ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}`, updated });
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
      where: userRole === 'SUPERADMIN' ? {} : { companyId: tenantId },
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
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    const notifications = await prisma.notification.findMany({
      where: { companyId: tenantId, userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil notifikasi.' });
  }
});

app.patch('/api/notifications/:id/read', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const id = parseInt(req.params.id as string);

    await prisma.notification.update({
      where: { id, companyId: tenantId, userId: userId },
      data: { isRead: true }
    });

    res.json({ message: 'Notifikasi ditandai telah dibaca.' });
  } catch (error) {
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
        ...(userRole === 'SUPERADMIN' ? {} : { companyId: tenantId }),
        ...(userRole !== 'SUPERADMIN' ? { name: { not: 'Aivola Owner' } } : {})
      }
    });

    // 2. Hadir Hari Ini (PRESENT atau LATE)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendancesToday = await prisma.attendance.groupBy({
      by: ['userId'],
      where: {
        ...(userRole === 'SUPERADMIN' ? {} : { companyId: tenantId }),
        clockIn: { gte: today }
      }
    });
    const presentCount = attendancesToday.length;

    // 3. Terlambat Hari Ini
    const lateCountCurrentDay = await prisma.attendance.count({
      where: {
        ...(userRole === 'SUPERADMIN' ? {} : { companyId: tenantId }),
        status: 'LATE',
        clockIn: { gte: today }
      }
    });

    // 4. Cuti/Sakit
    const leaveCount = await prisma.leaveRequest.count({
      where: {
        ...(userRole === 'SUPERADMIN' ? {} : { companyId: tenantId }),
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

    const inventoryValRes: any[] = await prisma.$queryRawUnsafe(`
      SELECT SUM(stock * price) as value FROM "Product" WHERE "companyId" = $1
    `, tenantId);
    const inventoryValue = Number(inventoryValRes[0]?.value || 0);

    // 7. NEW: Rincian Gaji Karyawan (Untuk Dashboard Coffee)
    const activeStaff = await prisma.user.findMany({
        where: { companyId: tenantId, isActive: true },
        select: { id: true, name: true, jobTitle: true, basicSalary: true, allowance: true }
    });

    const staff_list = await Promise.all(activeStaff.map(async (st) => {
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
            estimated_payroll: Math.max(0, (st.basicSalary + st.allowance) - deductions)
        };
    }));

    res.json({
      totalEmployees,
      total_staff: totalEmployees, // Alias for Dashboard Compatibility
      presentCount,
      lateCount: lateCountCurrentDay,
      leaveCount,
      totalBalance,
      monthlyProfit,
      totalPayable,
      totalReceivable,
      inventoryValue,
      companyName: company?.name || 'Perusahaan Anda',
      companyContract: company,
      staff_list // Detailed data for Gaji Page sync
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mengambil statistik dashboard.' });
  }
});

// Endpoint Contract Alerts (Phase 29)
app.get('/api/stats/contract-alerts', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const expiringSoon = await prisma.user.findMany({
      where: {
        ...(userRole === 'SUPERADMIN' ? {} : { companyId: tenantId }),
        contractEndDate: {
          gte: today,
          lte: thirtyDaysLater
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
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
    const lowStockCount = await prisma.product.count({
        where: { companyId: tenantId, stock: { lte: 5 } }
    });

    if (lowStockCount > 0) {
        insights.push({ 
            type: 'danger', 
            message: `${lowStockCount} Stok Kritis`, 
            detail: `Item '${lowStockItems[0]?.name}' dan ${lowStockCount - 1} lainnya hampir habis. Segera restock!` 
        });
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

// --- FASE 30: COMPANY ASSET MANAGEMENT ---

// 1. List semua aset tenant
app.get('/api/assets', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    const assets = await prisma.asset.findMany({
      where: {
        ...(userRole === 'SUPERADMIN' ? {} : { companyId: tenantId }),
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
    const id = parseInt(req.params.id as string);
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
    const id = parseInt(req.params.id as string);

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

    // 1. Get Sales Aggregated by Date
    const salesData: any[] = await prisma.$queryRawUnsafe(`
      SELECT DATE_TRUNC('day', "date") as day, SUM("totalAmount") as total 
      FROM "Sale" 
      WHERE "companyId" = $1 AND "date" >= $2
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

      const saleMatch = salesData.find(s => s.day.toISOString().split('T')[0] === dayStr);
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
    const trends = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const attendances = await prisma.attendance.findMany({
        where: {
          ...(userRole === 'SUPERADMIN' ? {} : { companyId: tenantId }),
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
      where: userRole === 'SUPERADMIN' ? {} : { companyId: tenantId },
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
      where: userRole === 'SUPERADMIN' ? {} : { companyId: tenantId },
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
    if ((req as any).userRole !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Akses terbatas untuk Super Admin' });
    }

    console.log('[MANUAL] Triggering Photo Cleanup...');
    await runCleanup();
    res.json({ message: 'Proses pembersihan foto selesai dijalankan.' });
  } catch (error) {
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

// C1.3. Get All Sessions (Admin Monitoring)
app.get('/api/chat/admin/sessions', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.chatSession.findMany({
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
    const session = await prisma.chatSession.findUnique({
      where: { id: req.params.id as string },
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
    res.status(500).json({ error: 'Gagal mengambil daftar akun keuangan' });
  }
});

// F1.2. Create Account
app.post('/api/finance/accounts', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, type, balance, branchId } = req.body;
    const account = await prisma.financialAccount.create({
      data: {
        companyId: (req as any).tenantId,
        branchId: branchId ? parseInt(branchId) : null,
        name,
        type,
        balance: parseFloat(balance) || 0
      }
    });
    res.status(201).json(account);
  } catch (error: any) {
    console.error('[Account Creation Error]:', error);
    res.status(500).json({ error: 'Gagal membuat akun keuangan: ' + error.message });
  }
});

// F1.3. Update Account
app.patch('/api/finance/accounts/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;
    const tenantId = (req as any).tenantId;

    const account = await prisma.financialAccount.update({
      where: { id: parseInt(id as string), companyId: tenantId },
      data: { name, type }
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
    const { name } = req.body;
    const category = await prisma.incomeCategory.create({
      data: {
        companyId: (req as any).tenantId,
        name
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
    res.status(500).json({ error: 'Gagal mengambil kategori pengeluaran' });
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
    const { accountId, categoryId, branchId, amount, date, description, paidTo, status, dueDate, productId, quantity } = req.body;
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
            VALUES ($1, 'Belanja Bahan Baku (Inventori)', 'COGS', NOW())
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
      
      const insertRes = await tx.$queryRawUnsafe<any[]>(
        `INSERT INTO "Expense" ("companyId", "accountId", "categoryId", "supplierId", "productId", "quantity", "amount", "date", "dueDate", "status", "description", "paidTo", "branchId", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::"ExpenseStatus", $11, $12, $13, NOW())
         RETURNING "id", "companyId", "accountId", "categoryId", "supplierId", "productId", "quantity", "amount", "date", "dueDate", "status", "description", "paidTo", "branchId"`,
        tenantId, 
        accountId ? parseInt(accountId) : null,
        finalCategoryId,
        req.body.supplierId ? parseInt(req.body.supplierId) : null,
        prodIdNum,
        qtyNum,
        parseFloat(amount),
        dateVal,
        dueDateVal,
        status || 'PAID',
        description,
        paidTo,
        branchId ? parseInt(branchId) : null
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
    const { accountId, categoryId, supplierId, amount, date, dueDate, status, description, paidTo } = req.body;
    const tenantId = Number((req as any).tenantId);

    // 1. Safety Check: Period Closing
    const expense = await prisma.expense.findFirst({
        where: { id: parseInt(id as string), companyId: tenantId }
    });

    if (!expense) return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });

    const isClosed = await prisma.periodClosing.findFirst({
        where: { 
            companyId: tenantId, 
            month: new Date(expense.date).getMonth() + 1,
            year: new Date(expense.date).getFullYear(),
            status: 'CLOSED'
        }
    });

    if (isClosed) return res.status(403).json({ error: 'Periode transaksi sudah ditutup. Data tidak dapat diubah.' });

    const result = await prisma.$transaction(async (tx) => {
        // 2. Revert Old Balance (ONLY if status was not PENDING and had accountId)
        if (expense.status !== 'PENDING' && expense.accountId) {
            await tx.$executeRawUnsafe(
                'UPDATE "FinancialAccount" SET "balance" = "balance" + $1, "updatedAt" = NOW() WHERE "id" = $2 AND "companyId" = $3',
                expense.amount, expense.accountId, tenantId
            );
        }

        // 3. Update Expense
        const upRes = await tx.$queryRawUnsafe<any[]>(
            `UPDATE "Expense" SET 
                "accountId" = $1, "categoryId" = $2, "supplierId" = $3, "amount" = $4, 
                "date" = $5, "dueDate" = $6, "status" = $7::"ExpenseStatus", 
                "description" = $8, "paidTo" = $9, "updatedAt" = NOW() 
             WHERE "id" = $10 AND "companyId" = $11
             RETURNING *`,
            accountId || expense.accountId, categoryId || expense.categoryId, supplierId || expense.supplierId, 
            amount || expense.amount, date ? new Date(date) : expense.date, 
            dueDate ? new Date(dueDate) : expense.dueDate, status || expense.status, 
            description || expense.description, paidTo || expense.paidTo, 
            parseInt(id as string), tenantId
        );

        // 4. Apply New Balance (ONLY if new status is not PENDING and has accountId)
        const finalStatus = status || expense.status;
        const finalAccountId = accountId || expense.accountId;
        const finalAmount = amount || expense.amount;

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

    // Period Check
    const isClosed = await prisma.periodClosing.findFirst({
        where: { 
            companyId: tenantId, 
            month: new Date(expense.date).getMonth() + 1,
            year: new Date(expense.date).getFullYear(),
            status: 'CLOSED'
        }
    });

    if (isClosed) return res.status(403).json({ error: 'Periode transaksi sudah ditutup. Data tidak dapat dihapus.' });

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

// F5.3. Pay Pending Expense
app.post('/api/finance/expense/:id/pay', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const expenseId = parseInt(req.params.id as string);
    const { accountId } = req.body; // New: pick account at payment time
    const tenantId = Number((req as any).tenantId);

    if (!accountId) return res.status(400).json({ error: 'Pilih akun pembayaran' });

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({
        where: { id: expenseId, companyId: tenantId }
      });

      if (!expense) throw new Error('Pengeluaran tidak ditemukan');
      if (expense.status === 'PAID') throw new Error('Pengeluaran sudah lunas');

      // --- CHECK CLOSING ---
      if (await isPeriodClosed(tenantId, expense.date)) {
        throw new Error('Periode buku sudah ditutup. Tidak dapat mengubah transaksi pada tanggal ini.');
      }

      const res = await tx.$queryRawUnsafe<any[]>(
        `UPDATE "Expense" SET "status" = 'PAID'::"ExpenseStatus", "accountId" = $1, "updatedAt" = NOW()
         WHERE "id" = $2 AND "companyId" = $3
         RETURNING "id", "status", "accountId"`,
        parseInt(accountId), expenseId, tenantId
      );
      const updatedExpense = res[0];

      // Decrement account balance now
      await tx.financialAccount.update({
        where: { id: parseInt(accountId) },
        data: {
          balance: { decrement: expense.amount }
        }
      });

      return updatedExpense;
    });

    res.json(result);
  } catch (error: any) {
    console.error("DEBUG EXPENSE PAY ERROR:", error);
    fs.appendFileSync('debug_error.txt', `\n[${new Date().toISOString()}] EXPENSE PAY ERROR: ${error.message}\n${error.stack}\n`);
    res.status(500).json({ error: 'Gagal melunasi pengeluaran: ' + error.message });
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
            "accountId" = $1, 
            "categoryId" = $2, 
            "supplierId" = $3,
            "amount" = $4, 
            "date" = $5, 
            "dueDate" = $6, 
            "status" = $7::"ExpenseStatus", 
            "description" = $8, 
            "paidTo" = $9, 
            "updatedAt" = NOW()
         WHERE "id" = $10 AND "companyId" = $11`,
        newAccountId, 
        parseInt(categoryId), 
        req.body.supplierId ? parseInt(req.body.supplierId) : null,
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
    const revenueByCategory: Record<string, number> = {};
    let totalRevenue = 0;
    incomes.forEach(inc => {
      const catName = inc.category?.name || 'Uncategorized';
      revenueByCategory[catName] = (revenueByCategory[catName] || 0) + inc.amount;
      totalRevenue += inc.amount;
    });

    const cogsByCategory: Record<string, number> = {};
    const opexByCategory: Record<string, number> = {};
    let totalOpEx = 0;
    let manualCOGS = 0;

    expenses.forEach(exp => {
      const catName = exp.category?.name || 'Uncategorized';
      const isCOGS = exp.category?.type === 'COGS';
      
      if (isCOGS) {
        cogsByCategory[catName] = (cogsByCategory[catName] || 0) + exp.amount;
        manualCOGS += exp.amount;
      } else {
        opexByCategory[catName] = (opexByCategory[catName] || 0) + exp.amount;
        totalOpEx += exp.amount;
      }
    });

    // 4. Calculate Detailed COGS based on Sales (Standard Costing)
    // We use queryRawUnsafe for Sale/SaleItem as they are not in the main Prisma model yet
    const sales: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM "Sale" 
      WHERE "companyId" = $1 AND "date" >= $2 AND "date" <= $3
    `, tenantId, startDate, endDate);

    let calculatedCogsFromSales = 0;
    for (const s of sales) {
      const items: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "SaleItem" WHERE "saleId" = $1`, s.id);
      for (const item of items) {
        // Get recipe for this product
        const recipes: any[] = await prisma.$queryRawUnsafe(`
          SELECT pr.*, p."costPrice" 
          FROM "ProductRecipe" pr
          JOIN "Product" p ON pr."materialId" = p.id
          WHERE pr."productId" = $1
        `, item.productId);

        if (recipes.length > 0) {
          const recipeCost = recipes.reduce((sum, r) => sum + (parseFloat(r.quantity) * (r.costPrice || 0)), 0);
          calculatedCogsFromSales += item.quantity * recipeCost;
        } else {
          // If no recipe, use product's own costPrice (Retail)
          const products: any[] = await prisma.$queryRawUnsafe(`SELECT "costPrice" FROM "Product" WHERE id = $1`, item.productId);
          const costPrice = products[0]?.costPrice || 0;
          calculatedCogsFromSales += item.quantity * costPrice;
        }
      }
    }

    const totalCOGS = calculatedCogsFromSales + manualCOGS;
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalOpEx;

    res.json({
      period: { month, year },
      revenue: {
        categories: revenueByCategory,
        total: totalRevenue
      },
      cogs: {
        categories: { ...cogsByCategory, "HPP Terjual (Calc)": calculatedCogsFromSales },
        total: totalCOGS,
        detail: "HPP dihitung otomatis berdasarkan resep dan volume penjualan"
      },
      grossProfit,
      opex: {
        categories: opexByCategory,
        total: totalOpEx
      },
      netProfit
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

    const revenueByCategory: Record<string, number> = {};
    let totalRevenue = 0;
    incomes.forEach(inc => {
      const catName = inc.category?.name || 'Uncategorized';
      revenueByCategory[catName] = (revenueByCategory[catName] || 0) + inc.amount;
      totalRevenue += inc.amount;
    });

    const cogsByCategory: Record<string, number> = {};
    const opexByCategory: Record<string, number> = {};
    let totalOpEx = 0;
    let manualCOGS = 0;
    expenses.forEach(exp => {
      const catName = exp.category?.name || 'Uncategorized';
      if (exp.category?.type === 'COGS') {
        cogsByCategory[catName] = (cogsByCategory[catName] || 0) + exp.amount;
        manualCOGS += exp.amount;
      } else {
        opexByCategory[catName] = (opexByCategory[catName] || 0) + exp.amount;
        totalOpEx += exp.amount;
      }
    });

    const sales: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM "Sale" 
      WHERE "companyId" = $1 AND "date" >= $2 AND "date" <= $3
    `, tenantId, startDate, endDate);

    let calculatedCogsFromSales = 0;
    for (const s of sales) {
      const items: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "SaleItem" WHERE "saleId" = $1`, s.id);
      for (const item of items) {
        const recipes: any[] = await prisma.$queryRawUnsafe(`
          SELECT pr.*, p."costPrice" FROM "ProductRecipe" pr
          JOIN "Product" p ON pr."materialId" = p.id
          WHERE pr."productId" = $1
        `, item.productId);
        if (recipes.length > 0) {
          calculatedCogsFromSales += item.quantity * recipes.reduce((sum, r) => sum + (parseFloat(r.quantity) * (r.costPrice || 0)), 0);
        } else {
          const products: any[] = await prisma.$queryRawUnsafe(`SELECT "costPrice" FROM "Product" WHERE id = $1`, item.productId);
          calculatedCogsFromSales += item.quantity * (products[0]?.costPrice || 0);
        }
      }
    }

    const totalCOGS = calculatedCogsFromSales + manualCOGS;
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalOpEx;

    // --- CREATE EXCEL ---
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laba Rugi');

    worksheet.mergeCells('A1:C1');
    worksheet.getCell('A1').value = `LAPORAN LABA RUGI - Periode ${month}/${year}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    let currentRow = 3;

    // Revenue
    worksheet.getCell(`A${currentRow}`).value = 'PENDAPATAN';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
    Object.entries(revenueByCategory).forEach(([cat, amt]) => {
      worksheet.addRow([cat, '', amt]);
      currentRow++;
    });
    worksheet.addRow(['Total Pendapatan', '', totalRevenue]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 2;

    // COGS
    worksheet.getCell(`A${currentRow}`).value = 'BEBAN POKOK PENJUALAN (HPP)';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
    Object.entries(cogsByCategory).forEach(([cat, amt]) => {
      worksheet.addRow([cat, '', amt]);
      currentRow++;
    });
    worksheet.addRow(['HPP Terjual (Otomatis)', '', calculatedCogsFromSales]);
    currentRow++;
    worksheet.addRow(['Total HPP', '', totalCOGS]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 2;

    // Gross Profit
    worksheet.addRow(['LABA KOTOR', '', grossProfit]);
    worksheet.getRow(currentRow).font = { bold: true, color: { argb: 'FF0000FF' } };
    currentRow += 2;

    // OpEx
    worksheet.getCell(`A${currentRow}`).value = 'BEBAN OPERASIONAL';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
    Object.entries(opexByCategory).forEach(([cat, amt]) => {
      worksheet.addRow([cat, '', amt]);
      currentRow++;
    });
    worksheet.addRow(['Total Beban Operasional', '', totalOpEx]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 2;

    // Net Profit
    worksheet.addRow(['LABA BERSIH', '', netProfit]);
    worksheet.getRow(currentRow).font = { bold: true, size: 12 };
    worksheet.getCell(`C${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

    // Styling
    worksheet.getColumn(3).numFmt = '#,##0';
    worksheet.getColumn(1).width = 40;
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
    const assetsWithBookValue = physicalAssets.map(asset => {
        let bookValue = Number(asset.purchasePrice || 0);
        if (asset.isDepreciating && Number(asset.purchasePrice) > 0 && Number(asset.usefulLife) > 0) {
            const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date(asset.createdAt);
            const now = new Date();
            const monthsPassed = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
            const monthlyDepreciation = (Number(asset.purchasePrice) - Number(asset.residualValue || 0)) / Number(asset.usefulLife);
            const accumulatedDepreciation = Math.max(0, Math.min(monthsPassed * monthlyDepreciation, Number(asset.purchasePrice) - Number(asset.residualValue || 0)));
        bookValue = Number(asset.purchasePrice) - accumulatedDepreciation;
        }
        totalFixedAssets += bookValue;
        return { ...asset, bookValue };
    });

    // 3. Assets: Employee Loans (Piutang Karyawan)
    const activeLoans = await prisma.loan.findMany({
      where: { companyId: tenantId, status: 'ACTIVE' }
    });
    const totalLoans = activeLoans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);

    const totalAssets = totalCurrentAssets + totalFixedAssets + totalLoans;

    // 4. Liabilities: Pending Expenses (Hutang Usaha)
    const pendingExpenses = await prisma.expense.findMany({
      where: { companyId: tenantId, status: 'PENDING' }
    });
    const totalLiabilities = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 5. Equity: Assets - Liabilities
    const totalEquity = totalAssets - totalLiabilities;

    res.json({
      assets: {
        total: totalAssets,
        totalCurrent: totalCurrentAssets,
        totalFixed: totalFixedAssets,
        totalLoans: totalLoans,
        accounts,
        fixedAssets: assetsWithBookValue,
        loans: activeLoans
      },
      liabilities: { total: totalLiabilities, details: pendingExpenses },
      equity: { total: totalEquity }
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
    const assetsWithBookValue = physicalAssets.map(asset => {
        let bookValue = Number(asset.purchasePrice || 0);
        if (asset.isDepreciating && Number(asset.purchasePrice) > 0 && Number(asset.usefulLife) > 0) {
            const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date(asset.createdAt);
            const now = new Date();
            const monthsPassed = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
            const monthlyDepreciation = (Number(asset.purchasePrice) - Number(asset.residualValue || 0)) / Number(asset.usefulLife);
            const accumulatedDepreciation = Math.max(0, Math.min(monthsPassed * monthlyDepreciation, Number(asset.purchasePrice) - Number(asset.residualValue || 0)));
            bookValue = Number(asset.purchasePrice) - accumulatedDepreciation;
        }
        totalFixedAssets += bookValue;
        return { ...asset, bookValue };
    });

    const activeLoans = await prisma.loan.findMany({ where: { companyId: tenantId, status: 'ACTIVE' } });
    const totalLoans = activeLoans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets + totalLoans;

    const pendingExpenses = await prisma.expense.findMany({ where: { companyId: tenantId, status: 'PENDING' } });
    const totalLiabilities = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalEquity = totalAssets - totalLiabilities;

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
    worksheet.addRow(['Piutang Karyawan', '', totalLoans]);
    currentRow++;
    worksheet.addRow(['Total Aset Lancar', '', totalCurrentAssets + totalLoans]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 2;

    worksheet.addRow(['Aset Tetap (Nilai Perolehan - Akm. Penyusutan)']);
    worksheet.getRow(currentRow).font = { italic: true };
    currentRow++;
    assetsWithBookValue.forEach(asset => {
      worksheet.addRow([asset.name, '', asset.bookValue]);
      currentRow++;
    });
    worksheet.addRow(['Total Aset Tetap', '', totalFixedAssets]);
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
    worksheet.addRow(['TOTAL KEWAJIBAN', '', totalLiabilities]);
    worksheet.getRow(currentRow).font = { bold: true };
    currentRow += 3;

    // EQUITY
    worksheet.getCell(`A${currentRow}`).value = 'EKUITAS (MODAL)';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
    worksheet.addRow(['Modal Pemilik / Laba Ditahan (Estimasi)', '', totalEquity]);
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
        date: { gte: startDate, lte: endDate }
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
      where: { companyId: tenantId, status: 'PAID', date: { gt: endDate } },
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
      where: { companyId: tenantId, status: 'PAID', date: { gte: startDate, lte: endDate } },
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
    const futureOutflows = await prisma.expense.aggregate({ where: { companyId: tenantId, status: 'PAID', date: { gt: endDate } }, _sum: { amount: true } });
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

    // 1. Fetch Incomes
    const incomes = await prisma.income.findMany({
      where: { companyId: tenantId },
      include: { account: true, category: true },
      orderBy: { date: 'desc' }
    });

    // 2. Fetch Expenses
    const expenses = await prisma.expense.findMany({
      where: { companyId: tenantId },
      include: { account: true, category: true },
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

    // 1. Fetch Data (Same as journal route)
    const incomes = await prisma.income.findMany({
      where: { companyId: tenantId },
      include: { account: true, category: true },
      orderBy: { date: 'asc' } // Sorted by date for better readability in excel
    });

    const expenses = await prisma.expense.findMany({
      where: { companyId: tenantId },
      include: { account: true, category: true },
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
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    // Set end of day for endDate
    endDate.setHours(23, 59, 59, 999);

    // 1. Get SaleItems joining with Sale to filter by date and company
    const saleItems: any[] = await prisma.$queryRaw`
      SELECT 
        si.id, 
        si."productId", 
        si.quantity, 
        si.price, 
        si.total, 
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
      WHERE s."companyId" = ${tenantId} AND s.date >= ${startDate} AND s.date <= ${endDate}
    `;

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
        return product.Recipes.reduce((sum: number, r: any) => {
          // Find the material in our pre-fetched products list to get its potential recipes
          const material = allProducts.find(m => m.id === r.materialId);
          const materialUnitCost = material ? getProductCost(material, new Set(visited)) : (r.Material?.costPrice || 0);
          return sum + (Number(r.quantity) * materialUnitCost);
        }, 0);
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

      const itemCogs = item.quantity * calculatedUnitCost;
      const itemRevenue = item.total;
      const itemProfit = itemRevenue - itemCogs;
      
      productStats[pid].qtySold += item.quantity;
      productStats[pid].revenue += itemRevenue;
      productStats[pid].cogs += itemCogs;
      productStats[pid].profit += itemProfit;

      // Trend data
      const dateKey = new Date(item.date).toISOString().split('T')[0];
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

    res.json({
      products: productArray,
      trend: trendArray,
      summary: {
        totalRevenue,
        totalProfit,
        // Weighted Average Margin: (Total Profit / Total Revenue)
        avgMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
      }
    });
  } catch (error: any) {
    console.error("PROFITABILITY REPORT ERROR:", error);
    res.status(500).json({ error: 'Gagal menghasilkan analisis margin: ' + error.message });
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
      WHERE s."companyId" = $1 AND s."status" = 'UNPAID'
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

// F16.4. Lunasi Piutang (Mark Sale as PAID)
app.patch('/api/finance/sales/:id/pay', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const id = parseInt(req.params.id as string);
    const { accountId, paymentDate } = req.body;

    if (!accountId) return res.status(400).json({ error: 'Pilih akun pembayaran (Kas/Bank).' });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get Sale using Prisma (as any to handle type syncing)
      const sale = await (tx as any).sale.findFirst({
        where: { id, companyId: tenantId }
      });

      if (!sale) throw new Error('Penjualan tidak ditemukan.');
      if (sale.status === 'PAID') throw new Error('Penjualan sudah lunas.');

      const dateVal = paymentDate ? new Date(paymentDate) : new Date();

      // 2. Update Status using Prisma (much safer than raw SQL)
      await (tx as any).sale.update({
        where: { id },
        data: {
          status: 'PAID',
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

      await tx.income.create({
        data: {
          companyId: tenantId,
          accountId: parseInt(accountId),
          categoryId: category.id,
          amount: parseFloat(sale.totalAmount.toString()),
          date: dateVal,
          description: `Pelunasan Piutang Inv ${sale.invoiceNumber}`,
          receivedFrom: 'Customer'
        }
      });

      // 4. Update Financial Account Balance
      await tx.financialAccount.update({
        where: { id: parseInt(accountId) },
        data: { balance: { increment: parseFloat(sale.totalAmount.toString()) } }
      });

      return { id, status: 'PAID', invoiceNumber: sale.invoiceNumber };
    });

    res.json({ message: 'Piutang berhasil dilunasi.', result });
  } catch (error: any) {
    console.error("PAY DEBT ERROR:", error);
    res.status(500).json({ error: 'Gagal melunasi piutang: ' + error.message });
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

// I1. List Products
// I1. List Products (Updated with Warehouse Stock)
app.get('/api/inventory/products', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { branchId, warehouseId } = req.query;

    const products = await prisma.product.findMany({
      where: { companyId: tenantId },
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
           return product.Recipes.reduce((sum: number, r: any) => {
             const material = products.find(m => m.id === r.materialId);
             const materialUnitCost = material ? getProductCost(material, new Set(visited)) : (r.Material?.costPrice || 0);
             return sum + (r.quantity * materialUnitCost);
           }, 0);
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
    const { name, sku, description, price, costPrice, stock, minStock, recordExpense, accountId, unit, warehouseId, categoryId, showInPos, priceGofood, priceGrabfood, priceShopeefood } = req.body;

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
          categoryId: categoryId && !isNaN(parseInt(String(categoryId))) ? parseInt(String(categoryId)) : null,
          type: req.body.type || 'FINISHED_GOOD',
          trackStock: req.body.trackStock !== undefined ? req.body.trackStock : true,
          priceGofood: Number(priceGofood) || 0,
          priceGrabfood: Number(priceGrabfood) || 0,
          priceShopeefood: Number(priceShopeefood) || 0,
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
    });

    res.status(201).json({ message: 'Produk berhasil ditambahkan', productId: result });
  } catch (error: any) {
    fs.appendFileSync('debug_error.txt', `\n[${new Date().toISOString()}] PRODUCT CREATE ERROR: \n${error.stack || error.message}\n`);
    console.error('Product Create Error:', error);
    res.status(500).json({ error: 'Gagal menambah produk: ' + error.message });
  }
});

// I3. Update Product
app.patch('/api/inventory/products/:id', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const id = parseInt(req.params.id as string);
    const { name, sku, description, price, costPrice, minStock, unit, categoryId, showInPos, priceGofood, priceGrabfood, priceShopeefood } = req.body;

    // Verify ownership
    const existingProduct = await prisma.product.findFirst({
      where: { id, companyId: tenantId }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    await prisma.product.update({
      where: { id },
      data: {
        name: String(name),
        sku: sku && sku.trim() !== "" ? String(sku) : null,
        description: String(description || ""),
        price: Number(price) || 0,
        costPrice: Number(costPrice) || 0,
        minStock: Number(minStock) || 0,
        unit: String(unit || "Pcs"),
        showInPos: showInPos !== undefined ? showInPos : true,
        categoryId: categoryId && !isNaN(parseInt(String(categoryId))) ? parseInt(String(categoryId)) : null,
        type: req.body.type || existingProduct.type,
        trackStock: req.body.trackStock !== undefined ? req.body.trackStock : existingProduct.trackStock,
        priceGofood: priceGofood !== undefined ? Number(priceGofood) : existingProduct.priceGofood,
        priceGrabfood: priceGrabfood !== undefined ? Number(priceGrabfood) : existingProduct.priceGrabfood,
        priceShopeefood: priceShopeefood !== undefined ? Number(priceShopeefood) : existingProduct.priceShopeefood,
        updatedAt: new Date()
      }
    });

    res.json({ message: 'Produk berhasil diperbarui' });
  } catch (error: any) {
    console.error('Product Update Error:', error);
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

    await prisma.product.delete({
      where: { id }
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
    const recipes = await prisma.$queryRawUnsafe(`
      SELECT pr.*, p.name as material_name, p.unit as material_unit
      FROM "ProductRecipe" pr
      JOIN "Product" p ON pr."materialId" = p.id
      WHERE pr."productId" = $1
    `, productId);
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
      
      // 2. Insert new recipe items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await tx.$executeRawUnsafe(`
            INSERT INTO "ProductRecipe" ("productId", "materialId", "quantity", "updatedAt")
            VALUES ($1, $2, $3, NOW())
          `, productId, parseInt(item.materialId), parseFloat(item.quantity));
        }
      }
    });

    res.json({ message: 'Resep berhasil diperbarui' });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal menyimpan resep: ' + error.message });
  }
});

// I3. Stock Adjustment (Updated with Categorized Expense Sync)
app.post('/api/inventory/adjust', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const { productId, type, quantity, reference, recordExpense, accountId, expenseType, supplierId, warehouseId } = req.body;

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
      await tx.$executeRawUnsafe(`
        INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date", "supplierId", "warehouseId")
        VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
        productId, type, quantity, reference, supplierId ? parseInt(supplierId) : null, warehouseId ? parseInt(warehouseId) : null
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
          const catResult: any[] = await tx.$queryRawUnsafe(`
            INSERT INTO "ExpenseCategory" ("companyId", "name", "type", "updatedAt")
            VALUES ($1, $2, $3::"ExpenseType", NOW())
            RETURNING id
          `, tenantId, catName, catType);
          category = { id: catResult[0].id };
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
            date: new Date(),
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
    const { name, location, isMain } = req.body;
    
    // If isMain is true, unset other main warehouses for this company
    if (isMain) {
      await prisma.$executeRawUnsafe(`UPDATE "Warehouse" SET "isMain" = FALSE WHERE "companyId" = $1`, tenantId);
    }
    
    const result: any[] = await prisma.$queryRawUnsafe(`
      INSERT INTO "Warehouse" ("companyId", "name", "location", "isMain", "updatedAt")
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
    `, tenantId, name, location, isMain || false);
    
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
    const { name, location, isMain } = req.body;
    
    if (isMain) {
      await prisma.$executeRawUnsafe(`UPDATE "Warehouse" SET "isMain" = FALSE WHERE "companyId" = $1`, tenantId);
    }
    
    await prisma.$executeRawUnsafe(`
      UPDATE "Warehouse" 
      SET "name" = $1, "location" = $2, "isMain" = $3, "updatedAt" = NOW()
      WHERE id = $4 AND "companyId" = $5
    `, name, location, isMain, warehouseId, tenantId);
    
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
    const { name, phone, email, address } = req.body;

    if (!name) return res.status(400).json({ error: 'Nama pelanggan wajib diisi' });

    const result: any[] = await prisma.$queryRawUnsafe(`
      INSERT INTO "Customer" ("companyId", "name", "phone", "email", "address", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id
    `, tenantId, name, phone, email, address);

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
    const { items, accountId, customerId, status, notes, date } = req.body;

    // --- CHECK CLOSING ---
    if (await isPeriodClosed(tenantId, date || new Date())) {
      return res.status(403).json({ error: 'Periode buku sudah ditutup. Tidak dapat mencatat penjualan pada tanggal ini.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Minimal harus ada 1 barang' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate Invoice Number: SLS/2026/03/ID4-XXXX
      const dateVal = date ? new Date(date) : new Date();
      const y = dateVal.getFullYear();
      const m = (dateVal.getMonth() + 1).toString().padStart(2, '0');
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const invoiceNumber = `SLS/${y}/${m}/ID${tenantId}-${randomStr}`;

      // 2. Calculate Total
      let totalAmount = 0;
      for (const item of items) {
        totalAmount += parseFloat(item.quantity) * parseFloat(item.price);
      }

      // 3. Create Sale Record
      const saleResult: any[] = await tx.$queryRawUnsafe(`
        INSERT INTO "Sale" ("companyId", "invoiceNumber", "customerId", "date", "totalAmount", "status", "accountId", "notes", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id
      `, tenantId, invoiceNumber, customerId ? parseInt(customerId) : null, dateVal, totalAmount, status || 'PAID', accountId ? parseInt(accountId) : null, notes);
      
      const saleId = saleResult[0].id;

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
          SELECT * FROM "ProductRecipe" WHERE "productId" = $1
        `, productId);

        if (recipes.length > 0) {
          // Decrement Materials instead of Product
          for (const recipe of recipes) {
            const materialId = recipe.materialId;
            const recipeQty = parseFloat(recipe.quantity);
            const totalMaterialNeeded = recipeQty * quantity;

            await tx.$executeRawUnsafe(`
              UPDATE "Product" SET "stock" = "stock" - $1, "updatedAt" = NOW() WHERE "id" = $2
            `, totalMaterialNeeded, materialId);

            await tx.$executeRawUnsafe(`
              INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date")
              VALUES ($1, 'OUT', $2, $3, NOW())
            `, materialId, totalMaterialNeeded, `Penjualan (BOM) Inv ${invoiceNumber}`);
          }
        } else {
          // Original logic for Retail (Decrement Product itself)
          await tx.$executeRawUnsafe(`
            UPDATE "Product" SET "stock" = "stock" - $1, "updatedAt" = NOW() WHERE "id" = $2 AND "companyId" = $3
          `, quantity, productId, tenantId);

          await tx.$executeRawUnsafe(`
            INSERT INTO "StockTransaction" ("productId", "type", "quantity", "reference", "date")
            VALUES ($1, 'OUT', $2, $3, NOW())
          `, productId, quantity, `Penjualan Invoice ${invoiceNumber}`);
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

      return { saleId, invoiceNumber, totalAmount };
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("DEBUG SALE CREATE ERROR:", error);
    res.status(500).json({ error: 'Gagal mencatat penjualan: ' + error.message });
  }
});

// S2. List Sales
app.get('/api/sales', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);

    // 1. Get user branch
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { branchId: true, role: true } });
    const { branchId } = req.query;

    // 2. Build query based on branch and role
    let sales;
    if (user?.role === 'SUPERADMIN' || user?.role === 'ADMIN' || user?.role === 'OWNER') {
      // Admins and owners see everything for the company, but can filter by branchId if provided
      if (branchId && branchId !== 'all') {
        const bId = branchId === 'null' ? null : parseInt(branchId as string);
        
        if (bId === null) {
          sales = await prisma.$queryRawUnsafe(`
            SELECT s.*, c.name as "customerName"
            FROM "Sale" s
            LEFT JOIN "Customer" c ON s."customerId" = c.id
            WHERE s."companyId" = $1 AND s."branchId" IS NULL
            ORDER BY s."date" DESC
          `, tenantId);
        } else {
          sales = await prisma.$queryRawUnsafe(`
            SELECT s.*, c.name as "customerName"
            FROM "Sale" s
            LEFT JOIN "Customer" c ON s."customerId" = c.id
            WHERE s."companyId" = $1 AND s."branchId" = $2
            ORDER BY s."date" DESC
          `, tenantId, bId);
        }
      } else {
        sales = await prisma.$queryRawUnsafe(`
          SELECT s.*, c.name as "customerName"
          FROM "Sale" s
          LEFT JOIN "Customer" c ON s."customerId" = c.id
          WHERE s."companyId" = $1 
          ORDER BY s."date" DESC
        `, tenantId);
      }
    } else {
      // Cashiers/Staff see only their branch's sales
      if (user?.branchId === null) {
        sales = await prisma.$queryRawUnsafe(`
          SELECT s.*, c.name as "customerName"
          FROM "Sale" s
          JOIN "User" u ON s."cashierId" = u.id
          LEFT JOIN "Customer" c ON s."customerId" = c.id
          WHERE s."companyId" = $1 AND u."branchId" IS NULL
          ORDER BY s."date" DESC
        `, tenantId);
      } else {
        sales = await prisma.$queryRawUnsafe(`
          SELECT s.*, c.name as "customerName"
          FROM "Sale" s
          JOIN "User" u ON s."cashierId" = u.id
          LEFT JOIN "Customer" c ON s."customerId" = c.id
          WHERE s."companyId" = $1 AND u."branchId" = $2
          ORDER BY s."date" DESC
        `, tenantId, user?.branchId);
      }
    }
    
    res.json(sales);
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil data penjualan: ' + error.message });
  }
});

// S2b. Export Sales to Excel (Server-Side)
app.get('/api/sales/export', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);
    const ExcelJS = require('exceljs');

    // 1. Fetch Data (logic same as List Sales)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { branchId: true, role: true } });
    
    const { branchId } = req.query;
    
    let sales: any[];
    if (user?.role === 'SUPERADMIN' || user?.role === 'ADMIN' || user?.role === 'OWNER') {
      if (branchId && branchId !== 'all') {
        const bId = branchId === 'null' ? null : parseInt(branchId as string);
        if (bId === null) {
          sales = await prisma.$queryRawUnsafe(`
            SELECT s.*, c.name as "customerName"
            FROM "Sale" s
            LEFT JOIN "Customer" c ON s."customerId" = c.id
            WHERE s."companyId" = $1 AND s."branchId" IS NULL
            ORDER BY s."date" DESC
          `, tenantId);
        } else {
          sales = await prisma.$queryRawUnsafe(`
            SELECT s.*, c.name as "customerName"
            FROM "Sale" s
            LEFT JOIN "Customer" c ON s."customerId" = c.id
            WHERE s."companyId" = $1 AND s."branchId" = $2
            ORDER BY s."date" DESC
          `, tenantId, bId);
        }
      } else {
        sales = await prisma.$queryRawUnsafe(`
          SELECT s.*, c.name as "customerName"
          FROM "Sale" s
          LEFT JOIN "Customer" c ON s."customerId" = c.id
          WHERE s."companyId" = $1 
          ORDER BY s."date" DESC
        `, tenantId);
      }
    } else {
      if (user?.branchId === null) {
        sales = await prisma.$queryRawUnsafe(`
          SELECT s.*, c.name as "customerName"
          FROM "Sale" s
          JOIN "User" u ON s."cashierId" = u.id
          LEFT JOIN "Customer" c ON s."customerId" = c.id
          WHERE s."companyId" = $1 AND u."branchId" IS NULL
          ORDER BY s."date" DESC
        `, tenantId);
      } else {
        sales = await prisma.$queryRawUnsafe(`
          SELECT s.*, c.name as "customerName"
          FROM "Sale" s
          JOIN "User" u ON s."cashierId" = u.id
          LEFT JOIN "Customer" c ON s."customerId" = c.id
          WHERE s."companyId" = $1 AND u."branchId" = $2
          ORDER BY s."date" DESC
        `, tenantId, user?.branchId);
      }
    }

    // 2. Create Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Penjualan');

    // 3. Define Columns
    worksheet.columns = [
      { header: 'Tanggal', key: 'date', width: 15 },
      { header: 'No. Invoice', key: 'invoiceNumber', width: 25 },
      { header: 'Pelanggan', key: 'customerName', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Total Penjualan', key: 'totalAmount', width: 20 },
      { header: 'Catatan', key: 'notes', width: 30 }
    ];

    // 4. Style Header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // 5. Add Rows
    sales.forEach(sale => {
      const row = worksheet.addRow({
        date: new Date(sale.date).toLocaleDateString('id-ID'),
        invoiceNumber: sale.invoiceNumber,
        customerName: sale.customerName || 'Umum',
        status: sale.status === 'PAID' ? 'Lunas' : 
                sale.status === 'RETURNED' ? 'Diretur' :
                sale.status === 'PARTIALLY_RETURNED' ? 'Retur Sebagian' : 'Belum Bayar',
        totalAmount: sale.totalAmount || 0,
        notes: sale.notes || '-'
      });
      
      row.getCell('totalAmount').numFmt = '#,##0';
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

    const items = await prisma.$queryRawUnsafe(`
      SELECT si.*, p.name as product_name, p.sku as product_sku, p.unit as product_unit
      FROM "SaleItem" si
      JOIN "Product" p ON si."productId" = p.id
      WHERE si."saleId" = $1
    `, saleId);

    const company: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Company" WHERE id = $1`, tenantId);
    if (company.length > 0) {
      const comp = company[0];
      if (comp.logoUrl && comp.logoUrl.startsWith('/uploads')) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        comp.logoUrl = `${baseUrl}${comp.logoUrl}`;
      }
      res.json({ ...sales[0], items, company: comp });
    } else {
      res.json({ ...sales[0], items, company: null });
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
        const recipes: any[] = await tx.$queryRawUnsafe(`SELECT * FROM "ProductRecipe" WHERE "productId" = $1`, item.productId);
        if (recipes.length > 0) {
          for (const recipe of recipes) {
            const materialQty = parseFloat(recipe.quantity) * item.quantity;
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
      include: { 
        category: true,
        WarehouseStock: {
          where: { warehouseId: warehouse?.id }
        },
        customizations: {
          include: {
            Group: {
              include: { options: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Map stock to branch-specific quantity
    const mappedProducts = products.map((p: any) => ({
      ...p,
      stock: p.WarehouseStock && p.WarehouseStock.length > 0 ? p.WarehouseStock[0].quantity : 0
    }));

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
    const group = await prisma.customizationGroup.create({
      data: {
        companyId: tenantId,
        name,
        isRequired,
        minSelections,
        maxSelections,
        options: { create: options }
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
    await prisma.customizationOption.deleteMany({ where: { groupId: Number(id) } });
    const group = await prisma.customizationGroup.update({
      where: { id: Number(id), companyId: tenantId },
      data: {
        name, isRequired, minSelections, maxSelections,
        options: { create: options }
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

// 2. POS Checkout (Branch-Specific Stock Deduction)
app.post('/api/pos/checkout', tenantMiddleware, async (req: Request, res: Response) => {
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
      markupPercentage = 0 
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
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
      const invoiceNumber = `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const sale = await tx.sale.create({
        data: {
          companyId: tenantId,
          branchId: user?.branchId || null,
          cashierId: userId,
          customerId: finalCustomerId,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          accountId: accountId ? Number(accountId) : null,
          invoiceNumber,
          totalAmount: Number(totalAmount),
          totalCommission: Number(totalCommission),
          notes,
          status: 'PAID',
          saleType,
          serviceFee: Number(serviceFee),
          markupPercentage: Number(markupPercentage)
        }
      });

        // 2. Process Items
        for (const item of items) {
            const productId = Number(item.productId);
            const quantity = Number(item.quantity);
            const price = Number(item.price);
            const originalPrice = Number(item.originalPrice || item.price);

            await tx.saleItem.create({
                data: {
                    saleId: sale.id,
                    productId: productId,
                    quantity: quantity,
                    price: price,
                    originalPrice: originalPrice,
                    total: price * quantity,
                    modifiers: item.modifiers ? item.modifiers : null
                }
            });

            // --- BOM LOGIC INTEGRATION ---
            const recipes: any[] = await tx.$queryRawUnsafe(`
                SELECT * FROM "ProductRecipe" WHERE "productId" = $1
            `, productId);

            if (recipes.length > 0) {
                // If product has a recipe, decrement the MATERIALS
                for (const recipe of recipes) {
                    const materialId = Number(recipe.materialId);
                    const materialQtyNeeded = Number(recipe.quantity) * quantity;

                    // Update Material Global Stock
                    await tx.product.update({
                        where: { id: materialId },
                        data: { stock: { decrement: materialQtyNeeded } }
                    });

                    // Update Material Warehouse Stock
                    await tx.warehouseStock.upsert({
                        where: { productId_warehouseId: { productId: materialId, warehouseId: warehouse.id } },
                        update: { quantity: { decrement: materialQtyNeeded } },
                        create: { productId: materialId, warehouseId: warehouse.id, quantity: -materialQtyNeeded }
                    });

                    // Record Transaction for Material
                    await tx.stockTransaction.create({
                        data: {
                            productId: materialId,
                            warehouseId: warehouse.id,
                            type: 'OUT',
                            quantity: materialQtyNeeded,
                            reference: `POS ${invoiceNumber} (BOM Result of ${sale.invoiceNumber})`,
                            date: new Date()
                        }
                    });
                }
            } else {
                // Normal Product (No Recipe), decrement the item itself
                await tx.product.update({
                    where: { id: productId },
                    data: { stock: { decrement: quantity } }
                });

                await tx.warehouseStock.upsert({
                    where: { productId_warehouseId: { productId: productId, warehouseId: warehouse.id } },
                    update: { quantity: { decrement: quantity } },
                    create: { productId: productId, warehouseId: warehouse.id, quantity: -quantity }
                });

                await tx.stockTransaction.create({
                    data: {
                        productId: productId,
                        warehouseId: warehouse.id,
                        type: 'OUT',
                        quantity: quantity,
                        reference: `POS ${invoiceNumber}`,
                        date: new Date()
                    }
                });
            }
        }

      // 3. Finance
      await tx.financialAccount.update({
        where: { id: accountId },
        data: { balance: { increment: totalAmount } }
      });

      // Record Income
      const category = await tx.incomeCategory.upsert({
        where: { companyId_name: { companyId: tenantId, name: 'Penjualan POS' } },
        update: {},
        create: { companyId: tenantId, name: 'Penjualan POS' }
      });

      await tx.income.create({
        data: {
          companyId: tenantId,
          branchId: user?.branchId || null,
          accountId,
          categoryId: category.id,
          amount: totalAmount,
          receivedFrom: `Pelanggan POS (${saleType})`,
          description: `POS #${invoiceNumber} (${saleType})`
        }
      });

      return sale;
    });

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

    const pendingBill = await prisma.pendingBill.create({
      data: {
        companyId: tenantId,
        branchId: user?.branchId || 0,
        cashierId: userId,
        label: label || 'Pesanan',
        items: items, // JSON
        saleType: saleType || 'WALK_IN',
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

// POS 5. Get Closing Summary
app.get('/api/pos/closing-summary', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const userId = Number((req as any).userId);

    let user = await prisma.user.findUnique({ where: { id: userId }, select: { branchId: true, role: true } });
    
    // Robustness for Admins/SuperAdmins who might not be tied to a specific branch
    if (!user?.branchId && (user?.role === 'SUPERADMIN' || user?.role === 'ADMIN' || user?.role === 'OWNER')) {
      const firstBranch = await prisma.branch.findFirst({ where: { companyId: tenantId } });
      if (firstBranch) {
        user = { ...user!, branchId: firstBranch.id };
        console.log(`[POS] Admin viewing summary for Branch ${firstBranch.id} (Auto-fallback)`);
      }
    }

    if (!user?.branchId) return res.status(400).json({ error: 'User tidak terikat ke cabang manapun.' });

    // 1. Get last closing for this branch
    const lastClosing = await prisma.posClosing.findFirst({
      where: { companyId: tenantId, branchId: user.branchId, status: 'COMPLETED' },
      orderBy: { endTime: 'desc' }
    });

    // Default to start of current day if no closing exists, to avoid pulling years of history
    const defaultStartTime = new Date();
    defaultStartTime.setHours(0, 0, 0, 0);
    const startTime = lastClosing ? lastClosing.endTime : defaultStartTime;

    // 2. Find all sales since last closing in this branch (filtered by branchId directly)
    const sales = await prisma.sale.findMany({
      where: {
        companyId: tenantId,
        branchId: user.branchId,
        date: { gt: startTime, lte: new Date() }
      }
    });

    // 3. Aggregate totals
    const totalTransactions = sales.length;
    const totalGrossSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalCommission = sales.reduce((sum, s) => sum + (s.totalCommission || 0), 0);
    const totalNetSales = totalGrossSales - totalCommission;

    // 4. Breakdown by Financial Account (Expected Cash vs Bank)
    const accounts = await prisma.financialAccount.findMany({ where: { companyId: tenantId } });
    const methodBreakdown = accounts.map(acc => {
      const amount = sales
        .filter(s => s.accountId === acc.id)
        .reduce((sum, s) => sum + s.totalAmount, 0);
      return {
        accountId: acc.id,
        accountName: acc.name,
        accountType: acc.type,
        expectedAmount: amount
      };
    }).filter(m => m.expectedAmount > 0);

    // Calculate expectedCash ONLY from accounts marked with type 'CASH'
    // This ensures physical cash reconciliation is separate from digital/3rd-party transfers
    const cashTotal = methodBreakdown
      .filter(m => m.accountType?.toUpperCase() === 'CASH' || m.accountName.toLowerCase().includes('tunai') || m.accountName.toLowerCase().includes('cash'))
      .reduce((sum, m) => sum + m.expectedAmount, 0);

    res.json({
      startTime,
      endTime: new Date(),
      totalTransactions,
      totalGrossSales,
      totalNetSales,
      totalCommission,
      expectedCash: cashTotal,
      methodBreakdown
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

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { branchId: true } });
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

app.listen(PORT, () => {
  console.log(`✅ Backend SaaS aivola berjalan di http://localhost:${PORT}`);
  console.log(`⚠️  Peringatan: Pastikan PostgreSQL database berjalan dan URLnya sudah diset di file .env (DATABASE_URL)`);
  initCleanupCron(); // Start the background cleanup job
});

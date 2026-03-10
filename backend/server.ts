import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadToSupabase } from './supabase_storage';
import dotenv from 'dotenv';

dotenv.config();

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
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_hris_key_123';

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
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

app.get('/api/debug-db', (req, res) => {
  res.json({ url: process.env.DATABASE_URL });
});

app.use('/uploads', express.static('uploads'));

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

// --- CONFIG MULTER UNTUK UPLOAD ABSENSI ---
const attendanceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/attendance';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'absensi-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadAttendance = multer({ storage: attendanceStorage });

// --- CONFIG MULTER UNTUK PENGUMUMAN (Phase 26) ---
const announcementStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/announcements';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'announcement-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadAnnouncement = multer({ storage: announcementStorage });

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

// --- 1. MIDDLEWARE MULTI-TENANT & AUTH (CRITICAL) ---
// Middleware ini mengekstrak profil Karyawan dari token JWT.
const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Akses Ditolak: Token otentikasi (JWT) tidak ditemukan'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Inject companyId dan userId ke object request agar dibaca oleh endpoint di bawah
    const tenantId = decoded.companyId;
    (req as any).tenantId = tenantId;
    (req as any).userId = decoded.userId;
    (req as any).userRole = decoded.role;

    // --- GRADUAL CONTRACT ENFORCEMENT ---
    // SuperAdmin dikecualikan agar tetap bisa mengelola sistem
    if (decoded.role !== 'SUPERADMIN') {
      const expiryLevel = await getTenantExpiryLevel(tenantId);

      if (expiryLevel >= 3) {
        return res.status(403).json({ 
          error: 'Kontrak Anda telah berakhir lebih dari 30 hari. Akses dibekukan sepenuhnya. Silakan hubungi admin pusat.' 
        });
      }

      if (expiryLevel >= 2 && req.method !== 'GET') {
        return res.status(403).json({ 
          error: 'Kontrak Anda telah berakhir lebih dari 15 hari. Mode Read-Only diaktifkan. Anda tidak dapat merubah data atau melakukan absensi.' 
        });
      }
    }

    // Tambahan: Izinkan SuperAdmin untuk "mengintip" tenant lain lewat Header jika diperlukan
    const targetTenantId = req.headers['x-tenant-id'];
    if (decoded.role === 'SUPERADMIN' && targetTenantId) {
      (req as any).tenantId = parseInt(targetTenantId as string);
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token tidak valid atau sudah kadaluarsa.' });
  }
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

// --- 3. ENDPOINT API (ROUTES) ---

// Z. Endpoint Login Karyawan (Menghasilkan JWT)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    console.log(`[LOGIN ATTEMPT] Email: ${email}`);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`[LOGIN FAILED] User not found: ${email}`);
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log(`[LOGIN FAILED] Invalid password for: ${email}`);
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    console.log(`[LOGIN SUCCESS] User: ${user.email}`);

    // --- ENFORCE CONTRACT LEVEL 3 (HARD BLOCK) ---
    if (user.role !== 'SUPERADMIN') {
      const expiryLevel = await getTenantExpiryLevel(user.companyId);
      if (expiryLevel >= 3) {
        return res.status(403).json({ 
          error: 'Kontrak Perusahaan Anda telah berakhir lebih dari 30 hari. Akses dibekukan. Silakan hubungi admin pusat.' 
        });
      }
    }

    // Buat JWT Token yang membungkus rahasia perusahaan milik karyawan terkait
    const token = jwt.sign(
      { userId: user.id, companyId: user.companyId, role: user.role, name: user.name },
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
        language: user.language
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server saat login.' });
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
      employeeLimit 
    } = req.body;

    // Casting tipe data memastikan angka desimal dari Frontend aman
    const company = await prisma.company.create({
      data: {
        name,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        radius: radius ? parseInt(radius, 10) : 100,
        picName,
        picPhone,
        contractType: contractType || 'LUMSUM',
        contractValue: contractValue ? parseFloat(contractValue) : 0,
        contractStart: contractStart ? new Date(contractStart) : null,
        contractEnd: contractEnd ? new Date(contractEnd) : null,
        employeeLimit: employeeLimit ? parseInt(employeeLimit, 10) : 0
      }
    });
    res.json({ message: 'Perusahaan berhasil didaftarkan di SaaS', company });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Gagal mendaftar perusahaan' });
  }
});

// A2. Endpoint Mendapatkan Daftar Perusahaan (Global)
app.get('/api/companies', async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany();
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar klien' });
  }
});

// A3. Endpoint Mendapatkan Detail Perusahaan Sendiri (Tenant)
app.get('/api/companies/my', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const company = await prisma.company.findUnique({
      where: { id: tenantId }
    });
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data perusahaan' });
  }
});

// A3.1. Endpoint Men-generate Ulang API Key (Integrasi Kasir)
app.post('/api/companies/my/api-key', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
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
// A4. Endpoint Update Detail Perusahaan (Tenant)
app.patch('/api/companies/my', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { 
      name, latitude, longitude, radius,
      picName, picPhone, contractType, contractValue, contractStart, contractEnd,
      employeeLimit
    } = req.body;

    const updatedCompany = await prisma.company.update({
      where: { id: tenantId },
      data: {
        name,
        latitude: latitude ? parseFloat(latitude.toString()) : undefined,
        longitude: longitude ? parseFloat(longitude.toString()) : undefined,
        radius: radius ? parseInt(radius.toString(), 10) : undefined,
        picName,
        picPhone,
        contractType,
        contractValue: contractValue ? parseFloat(contractValue.toString()) : undefined,
        contractStart: contractStart ? new Date(contractStart) : undefined,
        contractEnd: contractEnd ? new Date(contractEnd) : undefined,
        employeeLimit: employeeLimit ? parseInt(employeeLimit.toString(), 10) : undefined
      }
    });

    res.json({ message: 'Profil perusahaan berhasil diperbarui', company: updatedCompany });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal memperbarui data perusahaan' });
  }
});

// A4.1. Endpoint Update Aturan Gaji (Payroll Settings) Phase 20
app.patch('/api/companies/my/payroll-settings', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { lateDeductionRate, absenceDeductionType, absenceDeductionRate, sickLeaveDeductionRate } = req.body;

    const updatedCompany = await prisma.company.update({
      where: { id: tenantId },
      data: {
        lateDeductionRate: isNaN(parseFloat(lateDeductionRate)) ? undefined : parseFloat(lateDeductionRate),
        absenceDeductionType: absenceDeductionType, // 'PRO_RATA' | 'FIXED_AMOUNT'
        absenceDeductionRate: isNaN(parseFloat(absenceDeductionRate)) ? undefined : parseFloat(absenceDeductionRate),
        sickLeaveDeductionRate: isNaN(parseFloat(sickLeaveDeductionRate)) ? undefined : parseFloat(sickLeaveDeductionRate),
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
      where: { id: tenantId },
      include: { _count: { select: { users: true } } }
    });

    if (company) {
      // 1. Check Contract Expiry Level
      const expiryLevel = await getTenantExpiryLevel(tenantId);
      if (expiryLevel >= 1) {
        return res.status(403).json({ 
          error: "Kontrak Anda telah berakhir. Anda tidak dapat menambah karyawan baru. Silakan hubungi admin pusat untuk perpanjangan." 
        });
      }

      // 2. Check Employee Limit
      if (company.employeeLimit > 0 && company._count.users >= company.employeeLimit) {
        return res.status(403).json({ 
          error: `Limit karyawan tercapai! Tenant ini hanya diizinkan memiliki maksimal ${company.employeeLimit} karyawan.` 
        });
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
    const { name, email, role, basicSalary, allowance, overtimeRate, jobTitle, division, grade, joinDate, contractEndDate, reportToId } = req.body;

    // Pastikan karyawan milik tenant yang sama
    const checkUser = await prisma.user.findFirst({ where: { id: reqUserId, companyId: tenantId } });
    if (!checkUser) return res.status(404).json({ error: 'Karyawan tidak ditemukan' });

    const updatedUser = await (prisma.user as any).update({
      where: { id: reqUserId },
      data: {
        name,
        email,
        role,
        basicSalary: basicSalary ? parseFloat(basicSalary) : 0,
        allowance: allowance ? parseFloat(allowance) : 0,
        overtimeRate: overtimeRate ? parseFloat(overtimeRate) : 0,
        jobTitle: jobTitle || null,
        division: division || null,
        grade: grade || null,
        joinDate: joinDate ? new Date(joinDate) : null,
        contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
        reportToId: reportToId ? parseInt(reportToId) : null
      }
    });

    res.json({ message: 'Profil karyawan diperbarui', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui karyawan.' });
  }
});

// B2. Endpoint Mendapatkan Daftar Karyawan (Menggunakan Tenant Middleware)
app.get('/api/users', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId; // Diambil dari middleware
    const userRole = (req as any).userRole;

    // WAJIB: Selalu gunakan klausa `where: { companyId: tenantId }`!
    // Ini memastikan PT. A tidak bisa melihat karyawan PT. B
    const users = await (prisma.user as any).findMany({
      where: userRole === 'SUPERADMIN' ? {} : {
        companyId: tenantId
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
    const { lat, lng } = req.body;

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

    // 3. Simpan data aman ke tabel absen
    let finalPhotoUrl = photoUrl;
    if (photoUrl) {
      try {
        const fullPath = path.join(__dirname, photoUrl);
        finalPhotoUrl = await uploadToSupabase(fullPath, 'attendance');
      } catch (uploadError) {
        console.error('Failed to upload to R2, keeping local path:', uploadError);
      }
    }

    const attendance = await prisma.attendance.create({
      data: {
        companyId: tenantId,
        userId: userId,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        photoUrl: finalPhotoUrl,
        status: 'PRESENT'
      }
    });

    // --- AI MOOD ANALYSIS (Phase 36) ---
    if (photoUrl) {
        const fullPath = path.join(__dirname, photoUrl);
        if (fs.existsSync(fullPath)) {
            const { analyzeMood } = require('./moodAI');
            const moodResult = await analyzeMood(fullPath);
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
        }
        // Cleanup after Supabase upload and AI processing
        cleanupLocalFile(fullPath);
    }

    res.json({ message: 'Berhasil Clock-In', attendance });
  } catch (error) {
    res.status(500).json({ error: 'Gagal melakukan absensi' });
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
app.patch('/api/attendance/clock-out', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

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
      orderBy: { clockIn: 'desc' }
    });

    if (!attendance) {
      return res.status(404).json({ error: 'Data absensi aktif hari ini tidak ditemukan.' });
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { clockOut: new Date() }
    });

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
    const { name, description, target, weight } = req.body;
    console.log(`[KPI] Create Indicator: Tenant=${tenantId}, Body=`, req.body);

    if (!name) return res.status(400).json({ error: 'Nama indikator wajib diisi' });

    const newIndicator = await prisma.kPIIndicator.create({
      data: {
        companyId: tenantId,
        name,
        description,
        target: target ? parseFloat(target) : 100,
        weight: weight ? parseFloat(weight) : 1
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
    const { name, description, target, weight } = req.body;

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
        weight: weight ? parseFloat(weight) : undefined
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

    res.json({ scores });

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
    const { userId, indicatorId, score, comment, month, year } = req.body;

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
        comment
      },
      create: {
        companyId: tenantId,
        userId: parseInt(userId),
        indicatorId: parseInt(indicatorId),
        score: parseFloat(score),
        comment,
        month: parseInt(month),
        year: parseInt(year)
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

// F. Endpoint Manajemen Penggajian (Fase 12)
// F1. HRD men-generate daftar gaji bulanan masal
app.post('/api/payroll/generate', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const month = parseInt(req.body.month as string);
    const year = parseInt(req.body.year as string);

    if (isNaN(month) || isNaN(year)) return res.status(400).json({ error: 'Bulan dan Tahun wajib diisi dengan angka.' });

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
    // Hitung total hari kerja (Senin-Jumat) dalam bulan ini
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

    const activeWorkingDays = Math.max(1, totalWeekdays - holidayWeekdays);

    const results = [];

    for (const user of users) {
      // 2. Hitung jumlah kehadiran (PRESENT/LATE)
      const attendanceCount = await prisma.attendance.count({
        where: { userId: user.id, companyId: tenantId, clockIn: { gte: startDate, lte: endDate } }
      });

      // 3. Hitung jumlah keterlambatan (LATE)
      const lateCount = await prisma.attendance.count({
        where: { userId: user.id, companyId: tenantId, status: 'LATE', clockIn: { gte: startDate, lte: endDate } }
      });

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

      // 4. Hitung BPJS (Fase 21)
      let bpjsKesehatan = 0;
      let bpjsKetenagakerjaan = 0;
      if (user.bpjsKesehatan) bpjsKesehatan = user.basicSalary * 0.01;
      if (user.bpjsKetenagakerjaan) bpjsKetenagakerjaan = user.basicSalary * 0.03;

      // 5. Hitung Bonus/THR (Fase 31)
      const bonuses = await prisma.bonus.findMany({
        where: {
          companyId: tenantId,
          userId: user.id,
          month: month,
          year: year
        }
      });
      const bonusPay = bonuses.reduce((sum, b) => sum + b.amount, 0);

      // 6. Final Calculation
      // Gaji Bersih = (Potensi Gaji Penuh + Lembur + Reimburse + Bonus) - (Potongan Absen/Telat + Kasbon + BPJS + Potongan Sakit)
      const netSalary = (user.basicSalary + user.allowance + overtimePay + reimbursementPay + bonusPay)
        - totalDeductions - loanDeduction - bpjsKesehatan - bpjsKetenagakerjaan - sickLeaveDeduction;

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
          bpjsKesehatanDeduction: bpjsKesehatan,
          bpjsKetenagakerjaanDeduction: bpjsKetenagakerjaan,
          sickLeaveCount: sickLeaveCount,
          sickLeaveDeduction: sickLeaveDeduction,
          overtimeHours: overtimeHours,
          overtimePay: overtimePay,
          reimbursementPay: reimbursementPay,
          bonusPay: bonusPay,
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
          bpjsKesehatanDeduction: bpjsKesehatan,
          bpjsKetenagakerjaanDeduction: bpjsKetenagakerjaan,
          sickLeaveCount: sickLeaveCount,
          sickLeaveDeduction: sickLeaveDeduction,
          overtimeHours: overtimeHours,
          overtimePay: overtimePay,
          reimbursementPay: reimbursementPay,
          bonusPay: bonusPay,
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

// F4. Karyawan menarik riwayat gaji masing-masing (Mobile)
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
    cleanupLocalFile(fullLocalPath);

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

    res.status(201).json(reimbursement);
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
      orderBy: { createdAt: 'desc' }
    });
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
      include: { user: { select: { name: true, jobTitle: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data monitoring L&D.' });
  }
});

// --- FASE 39: AI-GENERATED EXAM SYSTEM (OTOMASI TES SOP) ---

// 1. Admin: Upload SOP & Generate Exam
app.post('/api/learning/materials', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, content, category, targetDivision, targetJobTitle } = req.body;
    const tenantId = (req as any).tenantId;

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
    const questionsData = await generateQuestions(content);

    // Create Exam based on material
    const exam = await (prisma as any).exam.create({
      data: {
        companyId: tenantId,
        materialId: material.id,
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

    const exams = await (prisma as any).exam.findMany({
      where: { 
        ...(userRole === 'SUPERADMIN' ? {} : { companyId: tenantId }),
        OR: [
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
        const fullLocalPath = path.join(__dirname, 'uploads/announcements', req.file.filename);
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
      const fullLocalPath = path.join(__dirname, 'uploads/announcements', req.file.filename);
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

    // 1. Total Karyawan
    const totalEmployees = await prisma.user.count({
      where: userRole === 'SUPERADMIN' ? {} : { companyId: tenantId }
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
    const lateCount = await prisma.attendance.count({
      where: {
        ...(userRole === 'SUPERADMIN' ? {} : { companyId: tenantId }),
        status: 'LATE',
        clockIn: { gte: today }
      }
    });

    // 4. Cuti/Sakit (Leave Requests yang APPROVED dan hari ini termasuk dalam rentang cuti)
    const leaveCount = await prisma.leaveRequest.count({
      where: {
        ...(userRole === 'SUPERADMIN' ? {} : { companyId: tenantId }),
        status: 'APPROVED',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    // 5. Nama Perusahaan & Detail Kontrak
    const company = await prisma.company.findUnique({
      where: { id: tenantId },
      select: { 
        name: true,
        contractStart: true,
        contractEnd: true,
        employeeLimit: true,
        contractType: true
      }
    });

    res.json({
      totalEmployees,
      presentCount,
      lateCount,
      leaveCount,
      companyName: company?.name || 'Perusahaan Anda',
      companyContract: company
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
    const { name, serialNumber, condition, purchaseDate, userId } = req.body;
    let imageUrl = req.file ? `/uploads/assets/${req.file.filename}` : null;

    if (req.file) {
      try {
        const fullLocalPath = path.join(__dirname, 'uploads/assets', req.file.filename);
        imageUrl = await uploadToSupabase(fullLocalPath, 'assets');
      } catch (uploadError) {
        console.error('Failed to upload asset image to R2:', uploadError);
      }
    }

    if (!name || !serialNumber) {
      return res.status(400).json({ error: 'Nama aset dan nomor seri wajib diisi.' });
    }

    // Cek duplikasi Serial Number di tenant yang sama
    const existing = await prisma.asset.findUnique({
      where: {
        companyId_serialNumber: {
          companyId: tenantId,
          serialNumber
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Nomor seri ini sudah terdaftar di perusahaan Anda.' });
    }

    const asset = await prisma.asset.create({
      data: {
        companyId: tenantId,
        name,
        serialNumber,
        condition: condition || 'GOOD',
        imageUrl,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
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
    const { name, serialNumber, condition, purchaseDate, userId } = req.body;

    // Siapkan data update
    const updateData: any = {
      name,
      serialNumber,
      condition,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
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
        if (company.contractType === 'LUMSUM') {
          amount = company.contractValue;
        } else {
          // SATUAN: contractValue * kuota (employeeLimit)
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
app.listen(PORT, () => {
  console.log(`✅ Backend SaaS aivola berjalan di http://localhost:${PORT}`);
  console.log(`⚠️  Peringatan: Pastikan PostgreSQL database berjalan dan URLnya sudah diset di file .env (DATABASE_URL)`);
});
// reload
// reload for IP

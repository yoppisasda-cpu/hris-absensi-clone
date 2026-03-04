import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- 1. MIDDLEWARE MULTI-TENANT (CRITICAL) ---
// Middleware ini akan mengekstrak companyId dari pengguna yang mengakses API.
// Di sistem nyata, ini diambil dari token JWT (JSON Web Token) saat user Login: req.user.companyId
const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Untuk simulasi MVP: Kita pakai Header 'x-company-id' sebagai pengganti JWT
  const companyId = req.headers['x-company-id'];

  if (!companyId) {
    return res.status(401).json({
      error: 'Akses Ditolak: Identitas Perusahaan (Tenant ID) tidak ditemukan'
    });
  }

  // Inject companyId ke object request agar bisa dibaca oleh route berikutnya
  (req as any).tenantId = parseInt(companyId as string, 10);
  next();
};

// --- 2. ENDPOINT API (ROUTES) ---

// A. Endpoint Mendaftar Perusahaan SaaS Baru (Bypass Tenant Middleware)
app.post('/api/companies', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const company = await prisma.company.create({
      data: { name }
    });
    res.json({ message: 'Perusahaan berhasil didaftarkan di SaaS', company });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mendaftar perusahaan' });
  }
});

// B. Endpoint Mendapatkan Daftar Karyawan (Menggunakan Tenant Middleware)
app.get('/api/users', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId; // Diambil dari middleware

    // WAJIB: Selalu gunakan klausa `where: { companyId: tenantId }`!
    // Ini memastikan PT. A tidak bisa melihat karyawan PT. B
    const users = await prisma.user.findMany({
      where: {
        companyId: tenantId
      }
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data karyawan' });
  }
});

// C. Endpoint Karyawan Melakukan Absensi (Clock-In)
app.post('/api/attendance/clock-in', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { userId, lat, lng } = req.body;

    const attendance = await prisma.attendance.create({
      data: {
        companyId: tenantId, // WAJIB: Assign absen ini ke perusahaannya
        userId: userId,
        lat,
        lng,
        status: 'PRESENT'
      }
    });

    res.json({ message: 'Berhasil Clock-In', attendance });
  } catch (error) {
    res.status(500).json({ error: 'Gagal melakukan absensi' });
  }
});

// --- 3. JALANKAN SERVER ---
app.listen(PORT, () => {
  console.log(`✅ Backend SaaS HRIS berjalan di http://localhost:${PORT}`);
  console.log(`⚠️  Peringatan: Pastikan PostgreSQL database berjalan dan URLnya sudah diset di file .env (DATABASE_URL)`);
});

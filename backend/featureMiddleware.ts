import { Request, Response, NextFunction } from 'express';
import { PrismaClient, SubscriptionPlan, AppModule } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * featureMiddleware
 * Digunakan untuk membatasi akses endpoint berdasarkan Paket Langganan (Plan) atau Add-on tertentu.
 * @param requiredFeature Nama fitur/add-on (string) atau modul (AppModule)
 */
export const featureMiddleware = (requiredFeature: string | AppModule) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req as any).tenantId;
    const userRole = (req as any).userRole;

    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID tidak ditemukan. Pastikan Anda sudah login.' });
    }

    // Superadmin bypass semua pengecekan fitur
    if (userRole === 'SUPERADMIN') {
      return next();
    }

    try {
      const company = await prisma.company.findUnique({
        where: { id: tenantId },
        select: { 
          plan: true, 
          addons: true, 
          modules: true,
          purchasedInsights: true 
        }
      });

      if (!company) {
        return res.status(404).json({ error: 'Data perusahaan tidak ditemukan.' });
      }

      // 1. Cek jika yang diminta adalah core Module (ABSENSI, FINANCE, dll)
      if (Object.values(AppModule).includes(requiredFeature as AppModule)) {
        const reqMod = requiredFeature as AppModule;
        if (company.modules !== 'BOTH' && company.modules !== reqMod) {
          return res.status(403).json({ 
            error: `Modul ${reqMod} tidak aktif.`,
            code: 'MODULE_LOCKED',
            requiredPlan: reqMod === 'FINANCE' ? 'PRO' : 'STARTER'
          });
        }
        return next();
      }

      // 2. Cek jika yang diminta adalah fitur spesifik (Add-on/Insight)
      const allActiveFeatures = [...company.addons, ...company.purchasedInsights];
      
      // ENTERPRISE plan memiliki akses ke semua fitur standar
      if (company.plan === 'ENTERPRISE') {
        return next();
      }

      // Jika bukan Enterprise, cek apakah fitur ada di list addons
      if (allActiveFeatures.includes(requiredFeature as string)) {
        return next();
      }

      // Jika sampai sini, berarti fitur terkunci
      return res.status(403).json({ 
        error: `Fitur '${requiredFeature}' memerlukan upgrade paket atau pembelian add-on.`,
        code: 'FEATURE_LOCKED',
        feature: requiredFeature
      });

    } catch (error) {
      console.error('[FeatureMiddleware Error]:', error);
      res.status(500).json({ error: 'Gagal memverifikasi hak akses fitur.' });
    }
  };
};

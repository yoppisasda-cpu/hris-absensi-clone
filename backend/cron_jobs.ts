import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { supabase } from './supabase_storage'; // Assuming supabase client is exported

const prisma = new PrismaClient();

/**
 * Cleanup Job: Runs daily at 02:00 AM
 * Deletes photos older than X days based on GlobalSetting 'photo_retention_days'
 */
export const initCleanupCron = () => {
    // Run every day at 02:00 AM for photo cleanup
    cron.schedule('0 2 * * *', async () => {
        console.log('[CRON] Starting Photo Retention Cleanup...');
        await runCleanup();
    });

    // Run every 1st of the month at 00:00 AM for Asset Depreciation
    cron.schedule('0 0 1 * *', async () => {
        console.log('[CRON] Starting Asset Depreciation...');
        await runAssetDepreciation();
    });
};

export const runCleanup = async () => {
    try {
        console.log('[CRON] Starting Per-Company Photo Retention Cleanup...');
        
        // 1. Ambil semua perusahaan
        const companies = await prisma.company.findMany({
            select: { id: true, name: true, photoRetentionDays: true }
        });

        for (const company of companies) {
            const retentionDays = company.photoRetentionDays || 30; // Default 30 hari
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            console.log(`[CRON] Company: ${company.name} (ID: ${company.id}) - Retention: ${retentionDays} days (Before: ${cutoffDate.toISOString()})`);

            // 2. Cleanup Attendance Photos untuk Perusahaan ini
            const oldAttendances = await prisma.attendance.findMany({
                where: {
                    companyId: company.id,
                    OR: [
                        { clockIn: { lt: cutoffDate }, photoUrl: { not: null } },
                        { clockOut: { lt: cutoffDate }, clockOutPhotoUrl: { not: null } }
                    ]
                },
                select: { id: true, photoUrl: true, clockOutPhotoUrl: true }
            });

            for (const record of oldAttendances) {
                if (record.photoUrl) await deleteFromSupabase(record.photoUrl, 'attendance');
                if (record.clockOutPhotoUrl) await deleteFromSupabase(record.clockOutPhotoUrl, 'attendance');
                
                await prisma.attendance.update({
                    where: { id: record.id },
                    data: { photoUrl: null, clockOutPhotoUrl: null }
                });
            }

            // 3. Cleanup Reimbursement Receipts untuk Perusahaan ini
            const oldReimbursements = await prisma.reimbursement.findMany({
                where: {
                    companyId: company.id,
                    createdAt: { lt: cutoffDate },
                    receiptUrl: { not: null }
                },
                select: { id: true, receiptUrl: true }
            });

            for (const record of oldReimbursements) {
                if (record.receiptUrl) await deleteFromSupabase(record.receiptUrl, 'reimbursements');
                
                await prisma.reimbursement.update({
                    where: { id: record.id },
                    data: { receiptUrl: null }
                });
            }

            if (oldAttendances.length > 0 || oldReimbursements.length > 0) {
                console.log(`[CRON] ${company.name}: Cleaned up ${oldAttendances.length} attendances and ${oldReimbursements.length} reimbursements.`);
            }
        }

        console.log('[CRON] Per-company cleanup finished successfully.');
    } catch (error) {
        console.error('[CRON] Cleanup Error:', error);
    }
};

export const runAssetDepreciation = async () => {
    try {
        console.log('[CRON] Starting Asset Depreciation calculation...');
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1-12

        const assets = await prisma.asset.findMany({
            where: { isDepreciating: true }
        });

        for (const asset of assets) {
            if (asset.purchasePrice && asset.purchasePrice > 0 && asset.usefulLife && asset.usefulLife > 0) {
                const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date(asset.createdAt);
                
                let monthsPassed = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
                if (monthsPassed >= 0) monthsPassed += 1; // Termasuk bulan pertama

                const residualValue = Number(asset.residualValue || 0);
                const monthlyDepreciation = Math.round(((Number(asset.purchasePrice) - residualValue) / Number(asset.usefulLife)) * 100) / 100;
                
                // Cek apakah belum lewat umur ekonomis
                if (monthsPassed <= asset.usefulLife) {
                    const currentAccumulated = Math.min(monthsPassed * monthlyDepreciation, Number(asset.purchasePrice) - residualValue);
                    const bookValue = Number(asset.purchasePrice) - currentAccumulated;

                    // Update asset static columns
                    await prisma.asset.update({
                        where: { id: asset.id },
                        data: {
                            accumulatedDepreciation: currentAccumulated,
                            bookValue: bookValue
                        }
                    });

                    // Cek apakah jurnal penyusutan bulan ini sudah ada
                    const catName = `Penyusutan Kategori: ${asset.category || 'Lainnya'}`;
                    const description = `Beban penyusutan otomatis ${asset.name} (Bulan ${monthsPassed} dari ${asset.usefulLife})`;
                    
                    const existingExpense = await prisma.expense.findFirst({
                        where: {
                            companyId: asset.companyId,
                            description: description,
                            // Ensure same month/year to avoid duplicates if cron runs multiple times
                        }
                    });

                    if (!existingExpense) {
                        // Cari atau buat kategori pengeluaran
                        let category: any = await prisma.expenseCategory.findFirst({ where: { companyId: asset.companyId, name: catName } });
                        if (!category) {
                            category = await prisma.expenseCategory.create({
                                data: { companyId: asset.companyId, name: catName, type: 'OPERATIONAL', updatedAt: new Date() }
                            });
                        }

                        // Jurnal Pengeluaran (Expense) berstatus PAID secara sistem
                        await prisma.expense.create({
                            data: {
                                companyId: asset.companyId,
                                categoryId: category.id,
                                amount: monthlyDepreciation,
                                date: new Date(),
                                description: description,
                                paidTo: 'Sistem (Penyusutan Aset)',
                                status: 'PAID'
                            }
                        });
                    }
                }
            }
        }
        console.log('[CRON] Asset Depreciation finished successfully.');
    } catch (error) {
        console.error('[CRON] Asset Depreciation Error:', error);
    }
};

async function deleteFromSupabase(url: string, folder: string) {
    try {
        // Extracts filename from URL
        // Example: https://.../storage/v1/object/public/hris-bucket/attendance/filename.jpg
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        
        if (!filename) return;

        if (!supabase) {
            console.warn('[CRON] Supabase not configured. Skipping file deletion.');
            return;
        }

        const { error } = await supabase.storage
            .from(folder) // folder is actually the bucket name (e.g., 'attendance')
            .remove([filename]);

        if (error) {
            console.error(`[CRON] Failed to delete file ${filename} from Supabase:`, error.message);
        } else {
            console.log(`[CRON] Deleted ${folder}/${filename} from Supabase.`);
        }
    } catch (err) {
        console.error('[CRON] Supabase Delete Error:', err);
    }
}

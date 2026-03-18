import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { supabase } from './supabase_storage'; // Assuming supabase client is exported

const prisma = new PrismaClient();

/**
 * Cleanup Job: Runs daily at 02:00 AM
 * Deletes photos older than X days based on GlobalSetting 'photo_retention_days'
 */
export const initCleanupCron = () => {
    // Run every day at 02:00 AM
    cron.schedule('0 2 * * *', async () => {
        console.log('[CRON] Starting Photo Retention Cleanup...');
        await runCleanup();
    });
};

export const runCleanup = async () => {
    try {
        // 1. Get Retention Period from Settings
        const setting = await prisma.globalSetting.findUnique({
            where: { key: 'photo_retention_days' }
        });

        const retentionDays = setting ? parseInt(setting.value) : 30; // Default 30 days
        if (isNaN(retentionDays) || retentionDays < 0) {
            console.log('[CRON] Invalid retention days setting. Skipping.');
            return;
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        console.log(`[CRON] Deleting photos older than ${retentionDays} days (before ${cutoffDate.toISOString()})`);

        // 2. Cleanup Attendance Photos
        const oldAttendances = await prisma.attendance.findMany({
            where: {
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

        // 3. Cleanup Reimbursement Receipts
        const oldReimbursements = await prisma.reimbursement.findMany({
            where: {
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

        console.log(`[CRON] Cleanup finished. Processed ${oldAttendances.length} attendance records and ${oldReimbursements.length} reimbursements.`);
    } catch (error) {
        console.error('[CRON] Cleanup Error:', error);
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
            .from(process.env.SUPABASE_BUCKET_NAME || 'hris-bucket')
            .remove([`${folder}/${filename}`]);

        if (error) {
            console.error(`[CRON] Failed to delete file ${filename} from Supabase:`, error.message);
        } else {
            console.log(`[CRON] Deleted ${folder}/${filename} from Supabase.`);
        }
    } catch (err) {
        console.error('[CRON] Supabase Delete Error:', err);
    }
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTodayAttendance() {
    console.log('🚀 Memulai perbaikan data absen hari ini...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 1. Ambil semua absen hari ini beserta data shift karyawan
    const attendances = await prisma.attendance.findMany({
        where: {
            clockIn: { gte: today }
        },
        include: {
            user: {
                include: {
                    shift: true,
                    company: true
                }
            }
        }
    });

    console.log(`🔍 Ditemukan ${attendances.length} rekaman untuk hari ini.`);

    for (const att of attendances) {
        // @ts-ignore
        const shift = att.user?.shift;
        // @ts-ignore
        const company = att.user?.company;

        if (!shift) {
            console.log(`[PASS] Karyawan ${att.user.name} tidak memiliki shift.`);
            continue;
        }

        let updateData: any = {};
        
        // --- Hitung Telat (Clock In) ---
        if (shift.startTime) {
            const [sh, sm] = shift.startTime.split(':').map(Number);
            const shiftStartTime = new Date(att.clockIn);
            shiftStartTime.setHours(sh, sm, 0, 0);
            
            const gracePeriod = company?.lateGracePeriod || 0;
            const threshold = new Date(shiftStartTime.getTime() + (gracePeriod * 60000));
            
            if (att.clockIn > threshold) {
                updateData.status = 'LATE';
                updateData.lateMinutes = Math.floor((att.clockIn.getTime() - shiftStartTime.getTime()) / 60000);
            } else {
                updateData.status = 'PRESENT';
                updateData.lateMinutes = 0;
            }
        }

        // --- Hitung Pulang Cepat (Clock Out) ---
        if (att.clockOut && shift.endTime) {
            const [eh, em] = shift.endTime.split(':').map(Number);
            const shiftEndTime = new Date(att.clockOut);
            shiftEndTime.setHours(eh, em, 0, 0);
            
            if (att.clockOut < shiftEndTime) {
                updateData.earlyCheckOutMinutes = Math.floor((shiftEndTime.getTime() - att.clockOut.getTime()) / 60000);
            } else {
                updateData.earlyCheckOutMinutes = 0;
            }
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.attendance.update({
                where: { id: att.id },
                data: updateData
            });
            console.log(`✅ Update ${att.user.name}: Status=${updateData.status || att.status}, Telat=${updateData.lateMinutes || 0}m, Pulang Cepat=${updateData.earlyCheckOutMinutes || 0}m`);
        }
    }

    console.log('✨ Perbaikan dokumen selesai!');
}

fixTodayAttendance()
    .catch(e => console.error('❌ Terjadi kesalahan:', e))
    .finally(async () => await prisma.$disconnect());

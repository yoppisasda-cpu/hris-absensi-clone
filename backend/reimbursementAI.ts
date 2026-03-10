
import { createWorker } from 'tesseract.js';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export interface OCRResult {
    amount: number | null;
    date: Date | null;
    category: string | null;
}

export interface FraudResult {
    isFraud: boolean;
    reason: string | null;
    receiptHash: string;
}

/**
 * Mendeteksi teks dari gambar kuitansi menggunakan Tesseract.js
 */
export async function performOCR(imagePath: string): Promise<OCRResult> {
    const worker = await createWorker('ind+eng'); // Mendukung bahasa Indonesia dan Inggris
    
    try {
        const { data: { text } } = await worker.recognize(imagePath);
        console.log('[AI OCR] Extracted Text:', text);

        // --- Logika Ekstraksi Data dari Teks ---
        
        // 1. Deteksi Nominal (Amount)
        // Mencari pola angka setelah kata kunci: TOTAL, JUMLAH, AMOUNT, Rp, dll.
        const amountRegex = /(?:total|jumlah|amount|rp|idr)\.?\s*[:=]?\s*([\d\.,]+)/gi;
        let match;
        let amounts: number[] = [];
        while ((match = amountRegex.exec(text)) !== null) {
            // Bersihkan format (hapus titik ribuan, ganti koma desimal)
            const cleanAmount = match[1].replace(/\./g, '').replace(/,/g, '.');
            const num = parseFloat(cleanAmount);
            if (!isNaN(num)) amounts.push(num);
        }
        // Ambil yang paling besar (biasanya Total ada di bawah dan paling besar)
        const ocrAmount = amounts.length > 0 ? Math.max(...amounts) : null;

        // 2. Deteksi Tanggal
        // Mencari pola tanggal DD/MM/YYYY atau YYYY-MM-DD
        const dateRegex = /(\d{1,4}[-\/\.]\d{1,2}[-\/\.]\d{1,4})/g;
        const dateMatches = text.match(dateRegex);
        let ocrDate: Date | null = null;
        if (dateMatches) {
            // Ambil tanggal pertama yang valid
            for (const d of dateMatches) {
                const parsed = new Date(d);
                if (!isNaN(parsed.getTime())) {
                    ocrDate = parsed;
                    break;
                }
            }
        }

        // 3. Deteksi Kategori (Sederhana)
        let category = 'Lain-lain';
        if (/makan|minum|resto|cafe|food|beverage/i.test(text)) category = 'Konsumsi';
        if (/bensin|pertamina|shell|transport|taxi|grab|gojek/i.test(text)) category = 'Transportasi';
        if (/hotel|penginapan|travel|tiket|pesawat/i.test(text)) category = 'Perjalanan Dinas';
        if (/listrik|air|internet|pulsa|telkom/i.test(text)) category = 'Utilitas';

        return {
            amount: ocrAmount,
            date: ocrDate,
            category: category
        };
    } catch (error) {
        console.error('[AI OCR] Error:', error);
        return { amount: null, date: null, category: null };
    } finally {
        await worker.terminate();
    }
}

/**
 * Mengecek adanya anomali atau fraud
 */
export async function detectFraud(
    companyId: number, 
    userId: number, 
    imagePath: string, 
    userAmount: number, 
    ocrAmount: number | null
): Promise<FraudResult> {
    // 1. Generate SHA-256 hash dari file untuk cek duplikat persis
    const fileBuffer = fs.readFileSync(imagePath);
    const receiptHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 2. Cek apakah Hash ini pernah digunakan di perusahaan yang sama
    const duplicate = await (prisma.reimbursement as any).findFirst({
        where: {
            companyId,
            receiptHash,
            status: { in: ['PENDING', 'APPROVED'] }
        },
        include: { user: true }
    });

    if (duplicate) {
        return {
            isFraud: true,
            reason: `Struk ini identik dengan klaim #${duplicate.id} oleh ${(duplicate as any).user.name}.`,
            receiptHash
        };
    }

    // 3. Cek selisih nominal (User input vs OCR)
    // Jika selisih > 10%, tandai sebagai anomali (bukan langsung fraud, tapi peringatan)
    if (ocrAmount !== null) {
        const diff = Math.abs(userAmount - ocrAmount);
        const tolerance = ocrAmount * 0.1;
        if (diff > tolerance) {
            return {
                isFraud: true,
                reason: `Nominal yang diinput (Rp${userAmount}) berbeda signifikan dengan hasil scan AI (Rp${ocrAmount}).`,
                receiptHash
            };
        }
    }

    // 4. Cek frekuensi klaim (Opsional: Misal lebih dari 5 klaim dalam 1 hari)
    const today = new Date();
    today.setHours(0,0,0,0);
    const dailyCount = await prisma.reimbursement.count({
        where: {
            userId,
            createdAt: { gte: today }
        }
    });

    if (dailyCount >= 10) {
        return {
            isFraud: true,
            reason: `Aktivitas tidak wajar: Karyawan mengajukan lebih dari 10 klaim dalam satu hari.`,
            receiptHash
        };
    }

    return {
        isFraud: false,
        reason: null,
        receiptHash
    };
}

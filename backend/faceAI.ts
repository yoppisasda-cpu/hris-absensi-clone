
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

/**
 * Real Face Similarity Verification AI (Gemini 1.5 Flash Edition)
 * Melakukan perbandingan visual nyata antara dua foto.
 */
export interface FaceResult {
    score: number;       // 0.0 - 1.0
    verified: boolean;   // true jika AI yakin foto orang yang sama
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Helper untuk membaca file ke base64 (format yang diminta Gemini)
function fileToGenerativePart(path: string, mimeType: string) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

// Helper untuk download image jika URL
async function downloadImage(url: string, dest: string) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(dest);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

export async function compareFaces(referencePath: string, capturePath: string): Promise<FaceResult> {
    try {
        console.log(`[Face AI] REAL AI Comparison Started...`);
        console.log(`- Base Reference: ${referencePath}`);
        console.log(`- Capture To Check: ${capturePath}`);

        let finalRefPath = referencePath;
        const isRemote = referencePath.startsWith('http');

        // 1. Jika remote (Supabase/URL), download dulu ke temp
        if (isRemote) {
            const tempRef = path.join(process.cwd(), 'uploads', `temp_ref_${Date.now()}.jpg`);
            await downloadImage(referencePath, tempRef);
            finalRefPath = tempRef;
        }

        // 2. Kirim ke Gemini untuk Analisis Visual
        const prompt = "Apakah dua gambar ini menunjukkan orang yang sama? " +
                       "Gambar pertama adalah foto profil referensi, gambar kedua adalah foto selfie absensi. " +
                       "Berikan jawaban dalam format JSON: { \"isSamePerson\": boolean, \"confidenceScore\": 0.0-1.0 } " +
                       "Gunakan confidence score 0.8 ke atas jika Anda yakin 100%. " +
                       "Jangan berikan teks tambahan selain JSON.";

        const imageParts = [
            fileToGenerativePart(finalRefPath, "image/jpeg"),
            fileToGenerativePart(capturePath, "image/jpeg"),
        ];

        const result = await model.generateContent([prompt, ...imageParts]);
        const text = result.response.text();
        
        // Bersihkan teks dari Markdown jika ada (```json ... ```)
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        // Hapus file temp jika tadi di-download
        if (isRemote && fs.existsSync(finalRefPath)) {
            fs.unlinkSync(finalRefPath);
        }

        console.log(`[Face AI] Result: ${data.isSamePerson ? 'MATCH' : 'MISMATCH'} (Score: ${data.confidenceScore})`);

        return {
            score: data.confidenceScore || 0,
            verified: data.isSamePerson === true && (data.confidenceScore || 0) >= 0.7
        };

    } catch (error: any) {
        console.error('[Face AI] AI Analysis Error:', error.message);
        // Fallback: Jika AI mati, kita kembalikan false tapi dengan skor tinggi agar tidak memblokir demo 
        // (opsional: jika ingin tetap ketat, set verified false)
        return { score: 0.5, verified: false };
    }
}

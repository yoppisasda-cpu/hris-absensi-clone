
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

/**
 * Robust Face Similarity Verification AI (Gemini 1.5 Flash)
 * Menggunakan folder sistem sementara (os.tmpdir) agar aman di server (Railway).
 */
export interface FaceResult {
    score: number;
    verified: boolean;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function fileToGenerativePart(filePath: string, mimeType: string) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType,
    },
  };
}

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
    const tempFiles: string[] = [];
    try {
        console.log(`[Face AI] STARTING CLOUD-RESILIENT COMPARISON...`);
        
        let finalRefPath = referencePath;
        const isRemote = referencePath.startsWith('http');

        // 1. Download reference image ke folder /tmp jika remote
        if (isRemote) {
            const fileName = `ref_${Date.now()}.jpg`;
            const tempRef = path.join(os.tmpdir(), fileName);
            console.log(`[Face AI] Downloading remote reference to: ${tempRef}`);
            await downloadImage(referencePath, tempRef);
            finalRefPath = tempRef;
            tempFiles.push(tempRef);
        }

        // 2. Kirim ke Gemini 1.5 Flash
        const prompt = "Berikan perbandingan visual antara dua gambar ini. Apakah ini orang yang sama? " +
                       "Gambar pertama: Referensi, Gambar kedua: Capture. " +
                       "Balas HANYA dengan JSON: { \"isSamePerson\": boolean, \"confidenceScore\": 0.0-1.0 }";

        const imageParts = [
            fileToGenerativePart(finalRefPath, "image/jpeg"),
            fileToGenerativePart(capturePath, "image/jpeg"),
        ];

        console.log(`[Face AI] Sending request to Gemini...`);
        const result = await model.generateContent([prompt, ...imageParts]);
        const text = result.response.text();
        
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        console.log(`[Face AI] Analysis Complete: ${data.isSamePerson ? 'MATCH' : 'NO MATCH'} (Score: ${data.confidenceScore})`);

        return {
            score: data.confidenceScore || 0,
            verified: (data.isSamePerson === true) && (data.confidenceScore || 0) >= 0.7
        };

    } catch (error: any) {
        console.error('❌ [Face AI Error]:', error.message);
        // Fallback jika API limit atau internet terputus
        return { score: 0.5, verified: false };
    } finally {
        // Hapus file sementara dari /tmp
        tempFiles.forEach(f => {
            if (fs.existsSync(f)) fs.unlinkSync(f);
        });
    }
}

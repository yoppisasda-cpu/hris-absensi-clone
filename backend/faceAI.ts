
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

export interface FaceResult {
    score: number;
    verified: boolean;
    errorMessage?: string; 
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });

function fileToGenerativePart(filePath: string, mimeType: string) {
    let finalPath = filePath;
    
    // Self-Healing Path Check
    if (!fs.existsSync(finalPath)) {
        console.warn(`[Face AI] Path not found: ${finalPath}. Attempting deeper self-healing...`);
        
        // Coba 1: Bersihkan total (buang //, buang /app/ di depan jika ada)
        let cleaned = filePath.replace(/^\/+/, "").replace(/\/\//g, "/");
        if (cleaned.startsWith('app/')) {
            cleaned = cleaned.replace('app/', '');
        }

        const try1 = path.join(process.cwd(), cleaned);
        
        // Coba 2: Cari langsung di folder uploads root
        const fileName = path.basename(filePath);
        const folderName = filePath.includes('attendance') ? 'attendance' : 'face_references';
        const try2 = path.join(process.cwd(), 'uploads', folderName, fileName);

        if (fs.existsSync(try1)) {
            finalPath = try1;
        } else if (fs.existsSync(try2)) {
            finalPath = try2;
        } else {
            console.error(`[Face AI] ENOENT File not found for: ${filePath}. Current CWD: ${process.cwd()}`);
            throw new Error(`Verifikasi Gagal: Foto Master bapak tidak ditemukan di server. Silakan hubungi Admin atau daftar ulang wajah bapak di Web Admin.`);
        }
    }

    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(finalPath)).toString("base64"),
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

/**
 * Membandingkan dua wajah menggunakan Google Gemini AI (Phase Cloud 1.0)
 * Kini dengan Sistem Auto-Fallback (Multi-Brain) agar anti-error
 */
export async function compareFaces(referencePath: string, capturePath: string): Promise<FaceResult> {
    console.log(`[Face AI] START Verification. Ref: ${referencePath}, Cap: ${capturePath}`);
    
    if (!process.env.GEMINI_API_KEY) {
        console.error("[Face AI] GEMINI_API_KEY is MISSING in environment!");
        return { verified: false, score: 0.5, errorMessage: "Sistem AI tidak terkonfigurasi (API Key Hilang)." };
    }

    const modelNames = [
        "models/gemini-1.5-flash", 
        "models/gemini-2.0-flash",
        "models/gemini-pro-vision"
    ];

    let lastError = "Tidak ada model yang merespons.";
    const tempFiles: string[] = [];

    // loop through all potential models
    for (const modelName of modelNames) {
        try {
            console.log(`[Face AI] Trying model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            let finalRefPath = referencePath;
            // Handle remote references (Supabase)
            if (referencePath.startsWith('http')) {
                const tempRef = path.join(os.tmpdir(), `ref-${Date.now()}.jpg`);
                await downloadImage(referencePath, tempRef);
                finalRefPath = tempRef;
                tempFiles.push(tempRef);
            }

            const refPart = fileToGenerativePart(finalRefPath, "image/jpeg");
            const capPart = fileToGenerativePart(capturePath, "image/jpeg");

            const prompt = `
                Analyze these two images and determine if they show the same person.
                Focus on permanent facial structures. Ignore age, facial hair, or accessories if possible.
                Return ONLY a JSON object: {"isSamePerson": boolean, "confidenceScore": number (0 to 1)}.
            `;

            const result = await model.generateContent([prompt, refPart, capPart]);
            const response = await result.response;
            const text = response.text();
            
            const cleanText = text.replace(/```json|```/g, "").trim();
            const json = JSON.parse(cleanText);

            console.log(`[Face AI] ${modelName} SUCCESS:`, json);
            return {
                verified: json.isSamePerson,
                score: json.confidenceScore
            };
        } catch (error: any) {
            console.error(`[Face AI] ${modelName} FAILED:`, error.message);
            lastError = error.message;
            // We NO LONGER break. We try every model in the list.
        } finally {
            tempFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
        }
    }

    // Final failure response
    console.error(`[Face AI] CRITICAL: ALL MODELS FAILED. Error: ${lastError}`);
    return { 
        verified: false, 
        score: 0, 
        errorMessage: `AI Sedang Sibuk atau Error (${lastError.substring(0, 50)}...). Silakan coba lagi sebentar lagi.` 
    };
}

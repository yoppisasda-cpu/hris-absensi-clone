
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
            const serverInfo = `[CWD: ${process.cwd()}]`;
            
            // DEBUG: Cek isi folder untuk memastikan filenya ada di mana
            let dirFiles = "Folder Not Found";
            const targetDir = path.join(process.cwd(), 'uploads/face_references');
            if (fs.existsSync(targetDir)) {
                dirFiles = fs.readdirSync(targetDir).slice(0, 5).join(", ");
            }

            console.error(`[Face AI] FAILED. ${serverInfo} for: ${filePath}. Files found: ${dirFiles}`);
            throw new Error(`ENOENT: File tidak ditemukan. ${serverInfo}. Files in folder: [${dirFiles}]. Cek path: ${filePath}`);
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
    if (!process.env.GEMINI_API_KEY) {
        return { verified: false, score: 0.5, errorMessage: "GEMINI_API_KEY_MISSING" };
    }

    const modelNames = [
        "models/gemini-1.5-flash",
        "models/gemini-1.5-pro",
        "models/gemini-pro-vision"
    ];

    let lastError = "";
    const tempFiles: string[] = [];

    // Coba satu per satu model sampai ada yang berhasil
    for (const modelName of modelNames) {
        try {
            console.log(`[Face AI] Attempting verification with model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            let finalRefPath = referencePath;
            if (referencePath.startsWith('http')) {
                const tempRef = path.join(os.tmpdir(), `ref-${Date.now()}.jpg`);
                await downloadImage(referencePath, tempRef);
                finalRefPath = tempRef;
                tempFiles.push(tempRef);
            }

            const refPart = fileToGenerativePart(finalRefPath, "image/jpeg");
            const capPart = fileToGenerativePart(capturePath, "image/jpeg");

            const prompt = `
                Analyze these two images and determine if they show the SAME PERSON.
                Comparison Task:
                1. Look for definitive facial features (eyes, nose, bone structure).
                2. Ignore lighting, background, or head tilt.
                3. Return a JSON object: {"isSamePerson": boolean, "confidenceScore": number (0.0 to 1.0)}.
                Only return the JSON.
            `;

            const result = await model.generateContent([prompt, refPart, capPart]);
            const response = await result.response;
            const text = response.text();
            
            // Parsing hasil JSON
            const cleanText = text.replace(/```json|```/g, "").trim();
            const json = JSON.parse(cleanText);

            return {
                verified: json.isSamePerson,
                score: json.confidenceScore
            };
        } catch (error: any) {
            console.warn(`[Face AI] Model ${modelName} failed:`, error.message);
            lastError = error.message;
            // Jika bukan error 404 (misal: API key salah), tidak perlu coba model lain
            if (!error.message.includes("404")) {
                break;
            }
        } finally {
            tempFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
        }
    }

    // JIKA SEMUA GAGAL, TANYA GOOGLE: "SAYA BOLEH PAKAI MODEL APA?!" (DIAGNOSTIK TOTAL)
    let availableModels = "Unknown";
    try {
        const diagResp = await axios.get(`https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`);
        availableModels = diagResp.data.models.map((m: any) => m.name.split('/').pop()).join(", ");
    } catch (diagErr: any) {
        availableModels = `Gagal list models: ${diagErr.message}`;
    }

    return { 
        verified: false, 
        score: 0.5, 
        errorMessage: `AI 404 Terus. Model tersedia untuk Kunci Bapak: [${availableModels}]. Terakhir nyoba: ${lastError}` 
    };
}

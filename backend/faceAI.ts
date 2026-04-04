
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
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

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

export async function compareFaces(referencePath: string, capturePath: string): Promise<FaceResult> {
    const tempFiles: string[] = [];
    try {
        console.log(`[Face AI] STARTING DIAGNOSTIC COMPARISON...`);

        if (!process.env.GEMINI_API_KEY) {
            return { score: 0, verified: false, errorMessage: "API_KEY_MISSING: GEMINI_API_KEY tidak terdeteksi di server." };
        }
        
        let finalRefPath = referencePath;
        const isRemote = referencePath.startsWith('http');

        if (isRemote) {
            const fileName = `ref_${Date.now()}.jpg`;
            const tempRef = path.join(os.tmpdir(), fileName);
            await downloadImage(referencePath, tempRef);
            finalRefPath = tempRef;
            tempFiles.push(tempRef);
        }

        const prompt = "Bandingkan visual dua gambar ini. Berikan jawaban HANYA JSON: { \"isSamePerson\": boolean, \"confidenceScore\": 0.0-1.0 }";
        const imageParts = [
            fileToGenerativePart(finalRefPath, "image/jpeg"),
            fileToGenerativePart(capturePath, "image/jpeg"),
        ];

        const result = await model.generateContent([prompt, ...imageParts]);
        const text = result.response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        return {
            score: data.confidenceScore || 0,
            verified: (data.isSamePerson === true) && (data.confidenceScore || 0) >= 0.7
        };

    } catch (error: any) {
        console.error('❌ [Face AI Error]:', error.message);
        return { score: 0.5, verified: false, errorMessage: error.message };
    } finally {
        tempFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
    }
}

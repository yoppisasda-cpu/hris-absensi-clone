
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config();

export interface FaceResult {
    score: number;
    verified: boolean;
    errorMessage?: string; 
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });

async function fileToGenerativePart(filePath: string, mimeType: string) {
    let finalPath = filePath;
    
    // Self-Healing Path Check
    if (!fs.existsSync(finalPath)) {
        console.warn(`[Face AI] Path not found: ${finalPath}. Attempting deeper self-healing...`);
        
        let cleaned = filePath.replace(/^\/+/, "").replace(/\/\//g, "/");
        if (cleaned.startsWith('app/')) {
            cleaned = cleaned.replace('app/', '');
        }

        const try1 = path.join(process.cwd(), cleaned);
        const fileName = path.basename(filePath);
        const folderName = filePath.includes('attendance') ? 'attendance' : 'face_references';
        const try2 = path.join(process.cwd(), 'uploads', folderName, fileName);

        if (fs.existsSync(try1)) {
            finalPath = try1;
        } else if (fs.existsSync(try2)) {
            finalPath = try2;
        } else {
            console.error(`[Face AI] ENOENT File not found for: ${filePath}. Current CWD: ${process.cwd()}`);
            throw new Error(`Verifikasi Gagal: Foto Master tidak ditemukan.`);
        }
    }

    try {
        console.log(`[Face AI] Compressing image: ${path.basename(finalPath)}...`);
        // Compress image to ensure it's under API limits and faster to upload
        const compressedBuffer = await sharp(finalPath)
            .resize({ width: 1024, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
            
        console.log(`[Face AI] Compression done. Original: ${fs.statSync(finalPath).size} bytes, Compressed: ${compressedBuffer.length} bytes`);
        
        return {
            inlineData: {
                data: compressedBuffer.toString("base64"),
                mimeType,
            },
        };
    } catch (error) {
        console.error(`[Face AI] Sharp Compression Failed! Falling back to raw.`, error);
        return {
            inlineData: {
                data: Buffer.from(fs.readFileSync(finalPath)).toString("base64"),
                mimeType,
            },
        };
    }
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
        "gemini-1.5-flash", 
        "gemini-1.5-flash-8b",
        "gemini-2.0-flash-exp",
        "gemini-1.5-pro"
    ];

    let lastError = "Tidak ada model yang merespons.";
    const tempFiles: string[] = [];

    // loop through all potential models
    for (const modelName of modelNames) {
        const maxRetries = 2;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) console.log(`[Face AI] RETRY attempt ${attempt} for model ${modelName}...`);
                console.log(`[Face AI] Requesting analysis from ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                
                let finalRefPath = referencePath;
                if (referencePath.startsWith('http')) {
                    const tempRef = path.join(os.tmpdir(), `ref-${Date.now()}.jpg`);
                    await downloadImage(referencePath, tempRef);
                    finalRefPath = tempRef;
                    tempFiles.push(tempRef);
                }

                const refPart = await fileToGenerativePart(finalRefPath, "image/jpeg");
                const capPart = await fileToGenerativePart(capturePath, "image/jpeg");

                const prompt = `
                    Perform a rigorous biometric facial comparison between these two images.
                    analyze key facial structures (eyes, nose, jawline). Return JSON: {"isSamePerson": boolean, "confidenceScore": number}.
                `;

                // Add a fetch timeout or safety if possible, or just catch it
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
                console.error(`[Face AI] ${modelName} attempt ${attempt} FAILED:`, error.message);
                lastError = error.message;
                
                if (error.message.includes("fetch") || error.message.includes("quota")) {
                    // Wait a bit before retry if it's a fetch or quota issue
                    if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                    continue;
                }
                break; // If it's not a fetch issue, move to next model
            } finally {
                tempFiles.forEach(f => { if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch(e) {} });
            }
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

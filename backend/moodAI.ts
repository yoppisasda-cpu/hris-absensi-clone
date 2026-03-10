
import fs from 'fs';
import path from 'path';

/**
 * Simulasi AI Mood Analysis (Phase 36)
 * Sejatinya ini membutuhkan model TensorFlow.js atau MediaPipe di server/client.
 * Untuk versi MVP ini, kita mensimulasikan deteksi ekspresi dari metadata gambar.
 */
export interface MoodResult {
    mood: 'Senang' | 'Stres' | 'Lelah' | 'Netral';
    score: number; // 0.0 - 1.0
}

export async function analyzeMood(imagePath: string): Promise<MoodResult> {
    try {
        // Pada implementasi nyata, kita akan me-load model face-api.js atau sejenisnya
        // const image = await fs.promises.readFile(imagePath);
        // const detections = await faceapi.detectSingleFace(image).withFaceExpressions();
        
        // Simulasi: Menggunakan hash sederhana dari nama file untuk deterministik hasil test
        const stats = fs.statSync(imagePath);
        const fileName = path.basename(imagePath);
        const seed = (stats.size + fileName.length) % 100;

        if (seed < 40) {
            return { mood: 'Senang', score: 0.8 + (seed % 20) / 100 };
        } else if (seed < 70) {
            return { mood: 'Netral', score: 0.5 + (seed % 20) / 100 };
        } else if (seed < 85) {
            return { mood: 'Lelah', score: 0.3 + (seed % 20) / 100 };
        } else {
            return { mood: 'Stres', score: 0.1 + (seed % 20) / 100 };
        }

    } catch (error) {
        console.error('Mood Analysis Error:', error);
        return { mood: 'Netral', score: 0.5 };
    }
}

/**
 * Summary Well-being untuk Dashboard
 * Menghitung persentase mood karyawan secara anonim.
 */
export function calculateWellBeing(attendances: any[]) {
    const total = attendances.length;
    if (total === 0) return null;

    const counts = {
        'Senang': 0,
        'Netral': 0,
        'Lelah': 0,
        'Stres': 0
    };

    attendances.forEach(a => {
        if (a.mood && (counts as any)[a.mood] !== undefined) {
            (counts as any)[a.mood]++;
        }
    });

    return {
        total,
        breakdown: {
            happy: (counts['Senang'] / total) * 100,
            neutral: (counts['Netral'] / total) * 100,
            tired: (counts['Lelah'] / total) * 100,
            stressed: (counts['Stres'] / total) * 100
        }
    };
}

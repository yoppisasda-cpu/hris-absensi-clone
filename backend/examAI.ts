import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * AI Exam Question Generator (Phase 39)
 * Generates high-quality multiple-choice questions from text content (SOP) using Gemini AI.
 */

export async function generateQuestions(content: string, count: number = 5) {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log(`[examAI] Starting generation for ${count} questions. API Key present: ${!!apiKey}`);
    
    if (!apiKey) {
        console.warn("[examAI] GEMINI_API_KEY is missing. Falling back to simple simulation.");
        return generateSimulatedQuestions(content, count);
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Using gemini-2.0-flash for high speed and reliable output
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
            Anda adalah seorang spesialis HR Learning & Development yang sangat detail. 
            Tugas Anda adalah membuat soal ujian pilihan ganda (multiple choice) yang SANGAT SPESIFIK berdasarkan SOP/Materi berikut:
            
            "${content}"
            
            INSTRUKSI KETAT:
            1. Buat sebanyak ${count} soal.
            2. PERTANYAAN HARUS SPESIFIK: Tanyakan tentang angka, takaran, suhu, waktu, atau langkah teknis yang ada di teks.
            3. JANGAN gunakan pertanyaan umum seperti "apa yang ditekankan".
            4. PILIHAN JAWABAN HARUS VARIATIF: Jangan gunakan "Kepatuhan pada standar" di semua soal. Buat pilihan jawaban yang benar-benar berasal dari konteks materi.
            5. JAWABAN PENGECOH: Buat jawaban salah yang terlihat meyakinkan (misal: angka yang salah, atau urutan yang tertukar).
            6. Format output HARUS dalam JSON Array murni tanpa markdown, seperti ini:
                [
                  {
                    "question": "Berapa gram bumbu yang dibutuhkan untuk 1kg ayam?",
                    "options": ["100g", "250g", "500g", "1000g"],
                    "correctAnswer": "250g"
                  }
                ]
        `;

        console.log("[examAI] Calling Gemini API...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("[examAI] Received response from Gemini.");
        
        // Clean the response if it has markdown code blocks
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let questions = JSON.parse(cleanedText);
        
        // Handle cases where the model returns an object wrapping the array
        if (questions && typeof questions === 'object' && !Array.isArray(questions)) {
            if (Array.isArray((questions as any).questions)) {
                questions = (questions as any).questions;
            } else {
                const keys = Object.keys(questions);
                const arrayKey = keys.find(k => Array.isArray((questions as any)[k]));
                if (arrayKey) {
                    questions = (questions as any)[arrayKey];
                } else {
                    throw new Error("Parsed JSON object does not contain a questions array.");
                }
            }
        }

        if (!Array.isArray(questions)) {
            throw new Error("Gemini response is not a valid JSON array.");
        }

        // Validate and normalize schema to prevent database query failures
        const mappedQuestions = questions.map((q: any) => {
            const questionText = q.question || q.text || "Pertanyaan Prosedur";
            
            let rawOptions = q.options || q.choices || q.answers || [];
            if (!Array.isArray(rawOptions)) {
                if (typeof rawOptions === 'string') {
                    rawOptions = rawOptions.split(',').map((o: string) => o.trim());
                } else {
                    rawOptions = [];
                }
            }
            
            // Provide solid defaults if options are empty
            const finalOptions = rawOptions.length >= 2 ? rawOptions : ["Kepatuhan pada standar", "Efisiensi biaya", "Kecepatan eksekusi", "Kebersihan area"];
            const correctAnswer = q.correctAnswer || q.correct_answer || q.answer || finalOptions[0];

            return {
                question: questionText,
                options: finalOptions,
                correctAnswer: correctAnswer
            };
        });
        
        console.log(`[examAI] Successfully parsed and normalized ${mappedQuestions.length} questions.`);
        return mappedQuestions.slice(0, count);
    } catch (error: any) {
        console.error("[examAI] CRITICAL ERROR calling Gemini AI:", error.message);
        if (error.stack) console.error(error.stack);
        return generateSimulatedQuestions(content, count);
    }
}

/**
 * Fallback simulation if AI fails or key is missing
 */
function generateSimulatedQuestions(content: string, count: number = 5) {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 15);
    const questions: any[] = [];
    
    for (let i = 0; i < Math.min(count, lines.length); i++) {
        questions.push({
            question: `Terkait poin "${lines[i].substring(0, 50)}...", apa yang paling ditekankan dalam prosedur?`,
            options: ["Kepatuhan pada standar", "Efisiensi biaya", "Kecepatan eksekusi", "Kebersihan area"],
            correctAnswer: "Kepatuhan pada standar"
        });
    }
    
    while (questions.length < count) {
        questions.push({
            question: "Bagaimana sikap karyawan yang paling tepat sesuai standar perusahaan?",
            options: ["Mengikuti SOP secara presisi", "Bekerja secepat mungkin", "Mencari cara yang paling hemat", "Menunggu instruksi tambahan"],
            correctAnswer: "Mengikuti SOP secara presisi"
        });
    }

    return questions;
}

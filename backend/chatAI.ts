import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

type ChatRole = 'USER' | 'AI' | 'ADMIN';

// Inisialisasi Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * getAIChatResponse
 * Menghubungkan HRIS CRM Live Chat dengan Google Gemini 1.5 Flash.
 * Mendukung context history untuk interaksi yang lebih cerdas.
 */
export async function getAIChatResponse(userMessage: string, history: {role: ChatRole, content: string}[]): Promise<string> {
    try {
        // 1. Pilih Model
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: "Anda adalah 'Aivola AI Strategic Assistant', asisten cerdas resmi dari Aivola.id (Platform HRIS, Payroll, & Enterprise Finance). " +
                               "Tugas Anda adalah menjadi konsultan ahli bagi pemilik bisnis (CEO/Owner) dan tim HR/Finance. " +
                               "Keahlian Utama Anda: \n" +
                               "1. HRIS & Absensi: Manajemen karyawan, Anti-Fraud GPS/Wajah, & KPI tracking.\n" +
                               "2. Payroll: Otomatisasi gaji, BPJS, PPh21, dan potongan pinjaman.\n" +
                               "3. Finance & AR/AP: Analisis Buku Piutang (Receivables), Tukar Faktur, Buku Hutang, dan Cash Flow.\n" +
                               "4. Analisis Bisnis: Memberikan saran strategis berdasarkan tren data untuk meningkatkan produktivitas dan kesehatan keuangan perusahaan.\n" +
                               "Gaya bahasa: Eksekutif, solutif, cerdas, dan profesional. Selalu gunakan bahasa Indonesia. " +
                               "Jika ditanya tentang 'Tukar Faktur', jelaskan bahwa itu adalah fitur unggulan Aivola Finance untuk melacak dokumen tagihan ke pelanggan.",
        });

        // 2. Format History untuk Gemini SDK (user/model roles)
        // Gemini mengharapkan history dalam format: { role: 'user' | 'model', parts: [{ text: string }] }
        const formattedHistory = history.map(h => ({
            role: h.role === 'USER' ? 'user' : 'model',
            parts: [{ text: h.content }]
        }));

        // 3. Mulai Chat dengan History
        const chat = model.startChat({
            history: formattedHistory,
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        // 4. Kirim Pesan dan Dapatkan Respon
        const result = await chat.sendMessage(userMessage);
        const response = await result.response;
        return response.text();

    } catch (error: any) {
        console.error("❌ [Gemini Error]:", error.message);
        
        // --- FALLBACK MOCK LOGIC (Jika API Key Error / Limit Tercapai) ---
        return fallbackMockResponse(userMessage);
    }
}

/**
 * fallbackMockResponse
 * Digunakan sebagai pengaman jika API Gemini sedang bermasalah.
 */
function fallbackMockResponse(msg: string): string {
    const lowerMsg = msg.toLowerCase();
    
    if (lowerMsg.includes('halo') || lowerMsg.includes('hi')) return "Halo! Saya Aivola Assistant. Maaf, saat ini sistem AI sedang sibuk, namun saya tetap bisa membantu menjawab hal-hal dasar tentang absensi dan payroll.";
    if (lowerMsg.includes('harga')) return "Aivola mulai dari Rp 10.000/karyawan. Silakan hubungi tim sales kami untuk penawaran khusus.";
    if (lowerMsg.includes('absensi')) return "Aivola menggunakan AI Face Recognition dan Liveness Detection untuk mencegah titip absen.";
    
    return "Maaf, sistem AI cerdas kami sedang mengalami kendala teknis (Limit API). Mohon coba beberapa saat lagi atau hubungi support kami.";
}

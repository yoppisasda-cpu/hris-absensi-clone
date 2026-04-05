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
 * generateSubscriptionResponse
 * Fungsi khusus untuk menyusun draft balasan WhatsApp saat klien klik "Berlangganan" atau tanya paket.
 */
export async function generateSubscriptionResponse(clientName: string, plan: string, isAnnual: boolean = true): Promise<string> {
    try {
        const planUpper = plan.toUpperCase();
        
        // Data paket untuk context AI
        const pricingInfo = {
            STARTER: { price: isAnnual ? "1.500.000/tahun" : "150.000/bulan", emp: 10, pos: 1, features: ["Absensi Wajah & GPS", "Laporan Penjualan Dasar", "2 Slot Admin"] },
            PRO: { price: isAnnual ? "3.500.000/tahun" : "350.000/bulan", emp: 50, pos: 5, features: ["Inventory & Stok Management", "Laporan Laba Rugi (P&L)", "AI Stock Forecasting", "5 Slot Admin"] },
            ENTERPRISE: { price: isAnnual ? "7.500.000/tahun" : "750.000/bulan", emp: 100, pos: 10, features: ["Warehouse Management Multi-Cabang", "Audit Log & Anti-Fraud", "Prioritas Support 24/7", "10 Slot Admin"] }
        };

        const selected = (pricingInfo as any)[planUpper] || pricingInfo.STARTER;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: "Anda adalah Sales Assistant Aivola.id. " +
                               "Tugas Anda: Menyusun draft balasan WhatsApp yang ramah, profesional, dan persuasif untuk klien yang baru saja mengklik tombol berlangganan. " +
                               "Gunakan gaya bahasa person-to-person yang hangat, bukan robot. Sertakan rincian paket yang dipilih secara ringkas."
        });

        const prompt = `Nama Klien: ${clientName}
Paket yang dipilih: ${planUpper} (${isAnnual ? 'Tahunan' : 'Bulanan'})
Harga: Rp ${selected.price}
Fitur Unggulan: ${selected.features.join(", ")}
Limit Karyawan: ${selected.emp} orang
Limit POS: ${selected.pos} terminal

Susunlah pesan balasan WhatsApp yang mengonfirmasi ketertarikan mereka, menjelaskan benefit paket tersebut secara singkat, dan arahkan ke langkah pembayaran/aktivasi selanjutnya. Tambahkan emoji agar ramah.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();

    } catch (error: any) {
        console.error("❌ [Subscription AI Error]:", error.message);
        return `Halo Kak ${clientName}! Terima kasih sudah tertarik dengan paket Aivola. Tim kami akan segera menghubungi Kakak untuk proses aktivasi selanjutnya ya. 😊`;
    }
}

/**
 * fallbackMockResponse
 * Digunakan sebagai pengaman jika API Gemini sedang bermasalah.
 */
function fallbackMockResponse(msg: string): string {
    const lowerMsg = msg.toLowerCase();
    
    if (lowerMsg.includes('halo') || lowerMsg.includes('hi')) return "Halo! Saya Aivola Assistant. Maaf, saat ini sistem AI sedang sibuk, namun saya tetap bisa membantu menjawab hal-hal dasar tentang absensi dan payroll.";
    if (lowerMsg.includes('harga')) return "Aivola mulai dari Rp 150.000/bulan. Silakan hubungi tim sales kami untuk penawaran khusus.";
    if (lowerMsg.includes('absensi')) return "Aivola menggunakan AI Face Recognition dan Liveness Detection untuk mencegah titip absen.";
    
    return "Maaf, sistem AI cerdas kami sedang mengalami kendala teknis (Limit API). Mohon coba beberapa saat lagi atau hubungi support kami.";
}

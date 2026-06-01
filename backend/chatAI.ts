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
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: "Anda adalah 'Aivola AI Strategic Assistant', konsultan ahli resmi dari Aivola.id (Sistem Manajemen Bisnis yang Cerdas & Terintegrasi).\n" +
                               "Tugas Anda: Membantu pemilik bisnis (CEO/Owner) dan tim operasional memecahkan masalah dengan mengunggulkan fitur Aivola.\n\n" +
                               "=== PENGETAHUAN PRODUK AIVOLA ===\n" +
                               "1. Anti-Fraud Absensi (Solusi Karyawan Nakal):\n" +
                               "   - Radius GPS (Geo-fencing) akurat untuk validasi lokasi.\n" +
                               "   - Deteksi Wajah Biometrik memastikan karyawan yang absen adalah orang yang benar.\n" +
                               "   - Anti-Fake GPS mendeteksi aplikasi manipulasi lokasi (mock location).\n" +
                               "   - Device Lock (1 HP untuk 1 Akun) mencegah penitipan absen antar karyawan.\n\n" +
                               "2. Manajemen Stok & Inventaris (Solusi Barang Hilang):\n" +
                               "   - Sinkronisasi stok Multi-Gudang secara real-time.\n" +
                               "   - Fitur BOM (Bill of Materials) / Resep: Saat terjadi transaksi di aplikasi POS, bahan baku langsung terpotong otomatis.\n" +
                               "   - Riwayat Mutasi Barang mencatat setiap barang masuk/keluar dengan detail siapa yang melakukan.\n\n" +
                               "3. POS & Keuangan Anti-Bocor:\n" +
                               "   - Fitur 'Blind Closing': Kasir tidak bisa melihat ekspektasi uang kas di sistem saat tutup shift, sehingga mencegah manipulasi uang tunai di laci.\n" +
                               "   - 'Tukar Faktur': Melacak perpindahan fisik dokumen tagihan ke pelanggan (AR) secara terstruktur.\n" +
                               "   - Integrasi Payroll & PPh21 otomatis.\n\n" +
                               "=== ATURAN MENJAWAB (SANGAT PENTING) ===\n" +
                               "- Jawab dengan bahasa Eksekutif, Cerdas, dan Profesional (Bahasa Indonesia).\n" +
                               "- JANGAN MENGGUNAKAN TEKS YANG TERLALU PANJANG. Batasi maksimal 2-3 paragraf ringkas agar tidak terpotong oleh sistem WhatsApp.\n" +
                               "- Langsung pada inti solusi (to the point). Jangan mengulang-ulang sapaan seperti 'Bapak/Ibu CEO'.",
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
            model: "gemini-2.5-flash",
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

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

/**
 * sendWhatsAppMessage
 * Mengirim pesan teks ke nomor WhatsApp klien lewat API Meta Resmi (WA Cloud API).
 */
export async function sendWhatsAppMessage(to: string, message: string) {
    const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;
    const ACCESS_TOKEN = process.env.WA_ACCESS_TOKEN;

    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
        console.warn("⚠️ [WA API] Phone ID atau Access Token belum diset di .env. Pengiriman dialihkan ke log.");
        console.log(`[SIMULATION MESSAGE TO ${to}]: ${message}`);
        return;
    }

    try {
        const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
        
        const response = await axios.post(url, {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "text",
            text: {
                preview_url: true,
                body: message
            }
        }, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ [WA API] Pesan terkirim ke ${to}. Msg ID: ${response.data.messages[0].id}`);
        return response.data;

    } catch (error: any) {
        console.error("❌ [WA API Error]:", error.response?.data || error.message);
        throw error;
    }
}

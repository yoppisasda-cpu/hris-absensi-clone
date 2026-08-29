import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

/**
 * sendWhatsAppMessage
 * Mengirim pesan TEKS via Wablas Gateway.
 * Mendukung API Key global dari .env atau API Key spesifik per-perusahaan.
 */
export async function sendWhatsAppMessage(to: string, message: string, customDomain?: string, customToken?: string, allowFallback: boolean = true) {
    const DOMAIN = customDomain || (allowFallback ? process.env.WA_GATEWAY_URL : null);
    const TOKEN = customToken || (allowFallback ? process.env.WA_API_KEY : null);

    if (!DOMAIN || !TOKEN) {
        console.error('❌ [WA API] Konfigurasi WhatsApp (Domain/Token) tidak ditemukan.');
        return { status: false, error: 'Konfigurasi WhatsApp tidak ditemukan.' };
    }

    // --- FORMAT NOMOR HP (Indo: 08xx -> 628xx) ---
    let formattedTo = to.replace(/\D/g, '');
    if (formattedTo.startsWith('0')) {
        formattedTo = '62' + formattedTo.substring(1);
    } else if (!formattedTo.startsWith('62')) {
        formattedTo = '62' + formattedTo;
    }

    try {
        const url = `${DOMAIN}/api/send-message`;
        const payload = {
            phone: formattedTo,
            message: message,
            isGroup: "0", 
        };

        console.log(`📡 [WA API] Mengirim teks ke: ${formattedTo} | URL: ${url}`);

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': TOKEN,
                'Content-Type': 'application/json'
            }
        });

        // SIMPAN LOG KE FILE UNTUK ANALISA
        const fs = require('fs');
        const logData = {
            timestamp: new Date().toISOString(),
            to: formattedTo,
            url: url,
            requestBody: payload,
            response: response.data
        };
        fs.appendFileSync('wablas_log.json', JSON.stringify(logData, null, 2) + '\n');

        if (response.data.status === true || response.data.status === 'success') {
            console.log(`✅ [WA API - Wablas] Pesan teks terkirim ke ${formattedTo}.`);
        } else {
            console.error(`⚠️ [WA API - Wablas] Gagal mengirim ke ${formattedTo}. Respon:`, response.data);
        }
        
        return response.data;
    } catch (error: any) {
        const fs = require('fs');
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: error.message,
            response: error.response?.data
        };
        fs.appendFileSync('wablas_log.json', JSON.stringify(errorLog, null, 2) + '\n');
        
        console.error(`❌ [WA API Error] Gagal menghubungi gateway: ${error.message}`);
        return { status: false, error: error.message };
    }
}

/**
 * sendWhatsAppImage
 * Mengirim GAMBAR via Wablas Gateway menggunakan endpoint /api/send-image.
 * Digunakan untuk mengirim gambar QRIS sebagai foto langsung (bukan link).
 */
export async function sendWhatsAppImage(to: string, imageUrl: string, caption: string = '', customDomain?: string, customToken?: string, allowFallback: boolean = true) {
    const DOMAIN = customDomain || (allowFallback ? process.env.WA_GATEWAY_URL : null);
    const TOKEN = customToken || (allowFallback ? process.env.WA_API_KEY : null);

    if (!DOMAIN || !TOKEN) {
        console.error('❌ [WA API Image] Konfigurasi WhatsApp (Domain/Token) tidak ditemukan.');
        return { status: false, error: 'Konfigurasi WhatsApp tidak ditemukan.' };
    }

    // --- FORMAT NOMOR HP (Indo: 08xx -> 628xx) ---
    let formattedTo = to.replace(/\D/g, '');
    if (formattedTo.startsWith('0')) {
        formattedTo = '62' + formattedTo.substring(1);
    } else if (!formattedTo.startsWith('62')) {
        formattedTo = '62' + formattedTo;
    }

    try {
        const url = `${DOMAIN}/api/send-image`;
        const payload = {
            phone: formattedTo,
            image: imageUrl,
            caption: caption,
            isGroup: "0"
        };

        console.log(`🖼️ [WA API Image] Mengirim gambar ke: ${formattedTo} | Image: ${imageUrl}`);

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': TOKEN,
                'Content-Type': 'application/json'
            }
        });

        const fs = require('fs');
        const logData = {
            timestamp: new Date().toISOString(),
            type: 'IMAGE',
            to: formattedTo,
            url: url,
            requestBody: payload,
            response: response.data
        };
        fs.appendFileSync('wablas_log.json', JSON.stringify(logData, null, 2) + '\n');

        if (response.data.status === true || response.data.status === 'success') {
            console.log(`✅ [WA API Image] Gambar terkirim ke ${formattedTo}.`);
        } else {
            console.error(`⚠️ [WA API Image] Gagal mengirim gambar ke ${formattedTo}. Respon:`, response.data);
        }

        return response.data;
    } catch (error: any) {
        const fs = require('fs');
        const errorLog = {
            timestamp: new Date().toISOString(),
            type: 'IMAGE_ERROR',
            error: error.message,
            response: error.response?.data
        };
        fs.appendFileSync('wablas_log.json', JSON.stringify(errorLog, null, 2) + '\n');
        
        console.error(`❌ [WA API Image Error] Gagal mengirim gambar: ${error.message}`);
        return { status: false, error: error.message };
    }
}

const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const {
    isBeverage,
    buildReceiptBuffer,
    buildKitchenBuffer,
    buildBarBuffer,
    buildTestBuffer,
    buildClosingBuffer
} = require('./escpos');

const CONFIG_FILE = path.join(__dirname, 'config.json');

// Default Configuration
let config = {
    port: 18181,
    kasir: { enabled: true, ip: '192.168.1.200', port: 9100, copies: 1 },
    dapur: { enabled: true, ip: '192.168.1.201', port: 9100, copies: 1 },
    bar: { enabled: true, ip: '192.168.1.202', port: 9100, copies: 1 }
};

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
            config = { ...config, ...JSON.parse(raw) };
        }
    } catch (e) {
        console.error('[CONFIG] Gagal membaca config.json:', e.message);
    }
}

function saveConfig(newConfig) {
    if (newConfig.kasir) config.kasir = { ...config.kasir, ...newConfig.kasir };
    if (newConfig.dapur) config.dapur = { ...config.dapur, ...newConfig.dapur };
    if (newConfig.bar) config.bar = { ...config.bar, ...newConfig.bar };
    if (newConfig.port) config.port = newConfig.port;
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        console.log('[CONFIG] Konfigurasi IP printer diperbarui:', {
            kasir: config.kasir?.ip,
            dapur: config.dapur?.ip,
            bar: config.bar?.ip
        });
    } catch (err) {
        console.error('[CONFIG] Gagal menyimpan config.json:', err.message);
    }
}

loadConfig();

// Send raw ESC/POS Buffer to TCP/IP Thermal Printer (Single attempt)
function sendToPrinterOnce(ip, port = 9100, buffer, timeoutMs = 3500) {
    return new Promise((resolve) => {
        if (!ip || ip === '0.0.0.0') {
            return resolve({ success: false, error: 'IP printer belum disetel' });
        }

        const socket = new net.Socket();
        let isDone = false;

        socket.setTimeout(timeoutMs);

        socket.connect(Number(port), String(ip).trim(), () => {
            socket.write(buffer, () => {
                socket.end();
            });
        });

        socket.on('close', () => {
            if (!isDone) {
                isDone = true;
                resolve({ success: true });
            }
        });

        socket.on('error', (err) => {
            if (!isDone) {
                isDone = true;
                socket.destroy();
                resolve({ success: false, error: err.message });
            }
        });

        socket.on('timeout', () => {
            if (!isDone) {
                isDone = true;
                socket.destroy();
                resolve({ success: false, error: 'Koneksi timeout (Printer mati / kabel LAN kendor)' });
            }
        });
    });
}

// Send raw ESC/POS Buffer with Auto-Retry (Up to maxRetries attempts)
async function sendToPrinter(ip, port = 9100, buffer, timeoutMs = 3500, maxRetries = 2) {
    let lastResult = { success: false, error: 'Unknown' };
    for (let attempt = 1; attempt <= 1 + maxRetries; attempt++) {
        lastResult = await sendToPrinterOnce(ip, port, buffer, timeoutMs);
        if (lastResult.success) {
            if (attempt > 1) {
                console.log(`[Print Agent] Sukses kirim ke ${ip}:${port} pada percobaan ke-${attempt}`);
            }
            return { ...lastResult, attempts: attempt };
        }
        if (attempt <= maxRetries) {
            console.warn(`[Print Agent] Percobaan ke-${attempt} ke ${ip}:${port} gagal (${lastResult.error}), mengulang dalam 400ms...`);
            await new Promise(r => setTimeout(r, 400));
        }
    }
    console.error(`[Print Agent] Gagal kirim ke ${ip}:${port} setelah ${1 + maxRetries} percobaan: ${lastResult.error}`);
    return { ...lastResult, attempts: 1 + maxRetries };
}

const server = http.createServer((req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    const sendJson = (statusCode, data) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    // 1. GET /status or /health
    if (req.method === 'GET' && (req.url === '/status' || req.url === '/health' || req.url === '/')) {
        return sendJson(200, {
            status: 'online',
            agent: 'Aivola LAN Print Agent',
            version: '1.0.0',
            config
        });
    }

    // Parse JSON Body for POST
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            let payload = {};
            try {
                payload = body ? JSON.parse(body) : {};
            } catch (e) {
                return sendJson(400, { error: 'Invalid JSON body' });
            }

            // 2. POST /config - Update Configuration
            if (req.url === '/config') {
                saveConfig(payload);
                return sendJson(200, { success: true, message: 'Konfigurasi disimpan', config });
            }

            // Helper to send buffer N times sequentially with a short delay between cuts
            const sendCopiesToPrinter = async (ip, port, buf, copies = 1) => {
                const count = Math.max(1, Math.min(5, Number(copies) || 1));
                let lastResult = { success: false };
                for (let i = 0; i < count; i++) {
                    lastResult = await sendToPrinter(ip, port, buf);
                    if (!lastResult.success) return lastResult;
                    if (i < count - 1) {
                        await new Promise(resolve => setTimeout(resolve, 350));
                    }
                }
                return { ...lastResult, copiesPrinted: count };
            };

            // 3. POST /test-print - Test Print per Target
            if (req.url === '/test-print') {
                const target = payload.target || 'kasir'; // 'kasir' | 'dapur' | 'bar'
                const targetConfig = config[target] || {};
                const ip = payload.ip || targetConfig.ip;
                const port = payload.port || targetConfig.port || 9100;
                const copies = payload.copies || targetConfig.copies || 1;

                const buffer = buildTestBuffer(target.toUpperCase(), ip);
                const result = await sendCopiesToPrinter(ip, port, buffer, copies);
                return sendJson(result.success ? 200 : 500, { ...result, target, ip });
            }

            // 4. POST /print - 1 Button Multi-Printer Dispatch!
            if (req.url === '/print') {
                const { sale = {}, cart = [], companyName = 'AIVOLA POS', store = {}, config: overrideConfig, targets = null } = payload;
                if (overrideConfig) {
                    saveConfig(overrideConfig);
                }
                const results = {};

                // Filter target spesifik jika diminta (contoh: ['dapur'] atau ['bar'] atau ['kasir'])
                const shouldPrint = (targetName) => {
                    if (!Array.isArray(targets) || targets.length === 0) return true;
                    return targets.includes(targetName);
                };

                // A. Kasir Receipt (All Items)
                if (shouldPrint('kasir')) {
                    if (config.kasir && config.kasir.enabled !== false && config.kasir.ip) {
                        const receiptBuf = buildReceiptBuffer(sale, cart, companyName, store);
                        results.kasir = await sendCopiesToPrinter(config.kasir.ip, config.kasir.port, receiptBuf, config.kasir.copies);
                    } else {
                        results.kasir = { skipped: true, reason: 'Kasir dinonaktifkan' };
                    }
                }

                // B. Kitchen Ticket (Food Only, atau Semua Item jika Printer Bar dinonaktifkan)
                if (shouldPrint('dapur')) {
                    const barActive = config.bar && config.bar.enabled !== false && Boolean(config.bar.ip);
                    const foodItems = barActive ? cart.filter(it => !isBeverage(it)) : cart;
                    if (config.dapur && config.dapur.enabled !== false && config.dapur.ip && foodItems.length > 0) {
                        const kitchenBuf = buildKitchenBuffer(sale, foodItems);
                        if (kitchenBuf) {
                            results.dapur = await sendCopiesToPrinter(config.dapur.ip, config.dapur.port, kitchenBuf, config.dapur.copies);
                        }
                    } else {
                        results.dapur = { skipped: true, reason: foodItems.length === 0 ? 'Tidak ada makanan' : 'Dapur dinonaktifkan' };
                    }
                }

                // C. Bar Ticket (Beverage Only)
                if (shouldPrint('bar')) {
                    const beverageItems = cart.filter(it => isBeverage(it));
                    if (config.bar && config.bar.enabled !== false && config.bar.ip && beverageItems.length > 0) {
                        const barBuf = buildBarBuffer(sale, beverageItems);
                        if (barBuf) {
                            results.bar = await sendCopiesToPrinter(config.bar.ip, config.bar.port, barBuf, config.bar.copies);
                        }
                    } else {
                        results.bar = { skipped: true, reason: beverageItems.length === 0 ? 'Tidak ada minuman' : 'Bar dinonaktifkan' };
                    }
                }

                return sendJson(200, {
                    success: true,
                    message: 'Perintah cetak dikirim ke printer jaringan',
                    results
                });
            }

            // 5. POST /print-closing - Cetak Struk Closing Kasir
            if (req.url === '/print-closing') {
                const { closing = {}, cashierName = '-', companyName = 'AIVOLA POS', store = {} } = payload;
                if (!config.kasir || !config.kasir.ip) {
                    return sendJson(400, { success: false, error: 'Printer kasir belum dikonfigurasi' });
                }
                const buffer = buildClosingBuffer(closing, cashierName, companyName, store);
                const result = await sendToPrinter(config.kasir.ip, config.kasir.port, buffer);
                return sendJson(result.success ? 200 : 500, {
                    ...result,
                    target: 'kasir',
                    ip: config.kasir.ip
                });
            }

            return sendJson(404, { error: 'Endpoint tidak ditemukan' });
        });
        return;
    }

    sendJson(404, { error: 'Not Found' });
});

const PORT = config.port || 18181;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`  🚀 AIVOLA LAN PRINT AGENT AKTIF di Port: ${PORT}`);
    console.log(`  🔗 Status Endpoint: http://localhost:${PORT}/status`);
    console.log(`  🖨️  Printer Kasir : ${config.kasir?.ip || '-'}:${config.kasir?.port || 9100}`);
    console.log(`  🍳 Printer Dapur : ${config.dapur?.ip || '-'}:${config.dapur?.port || 9100}`);
    console.log(`  ☕ Printer Bar   : ${config.bar?.ip || '-'}:${config.bar?.port || 9100}`);
    console.log(`====================================================`);
});


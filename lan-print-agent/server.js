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
    kasir: { enabled: true, ip: '192.168.1.200', port: 9100 },
    dapur: { enabled: true, ip: '192.168.1.201', port: 9100 },
    bar:   { enabled: true, ip: '192.168.1.202', port: 9100 }
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

// Send raw ESC/POS Buffer to TCP/IP Thermal Printer
function sendToPrinter(ip, port = 9100, buffer, timeoutMs = 4000) {
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
                resolve({ success: false, error: 'Koneksi timeout (Printer mati / IP salah)' });
            }
        });
    });
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

            // 3. POST /test-print - Test Print per Target
            if (req.url === '/test-print') {
                const target = payload.target || 'kasir'; // 'kasir' | 'dapur' | 'bar'
                const targetConfig = config[target] || {};
                const ip = payload.ip || targetConfig.ip;
                const port = payload.port || targetConfig.port || 9100;

                const buffer = buildTestBuffer(target.toUpperCase(), ip);
                const result = await sendToPrinter(ip, port, buffer);
                return sendJson(result.success ? 200 : 500, { ...result, target, ip });
            }

            // 4. POST /print - 1 Button Multi-Printer Dispatch!
            if (req.url === '/print') {
                const { sale = {}, cart = [], companyName = 'AIVOLA POS', store = {}, config: overrideConfig } = payload;
                if (overrideConfig) {
                    saveConfig(overrideConfig);
                }
                const results = {};

                // A. Kasir Receipt (All Items)
                if (config.kasir && config.kasir.enabled !== false) {
                    const receiptBuf = buildReceiptBuffer(sale, cart, companyName, store);
                    results.kasir = await sendToPrinter(config.kasir.ip, config.kasir.port, receiptBuf);
                }

                // B. Kitchen Ticket (Food Only)
                const foodItems = cart.filter(it => !isBeverage(it));
                if (config.dapur && config.dapur.enabled !== false && foodItems.length > 0) {
                    const kitchenBuf = buildKitchenBuffer(sale, foodItems);
                    if (kitchenBuf) {
                        results.dapur = await sendToPrinter(config.dapur.ip, config.dapur.port, kitchenBuf);
                    }
                } else {
                    results.dapur = { skipped: true, reason: foodItems.length === 0 ? 'Tidak ada makanan' : 'Dapur dinonaktifkan' };
                }

                // C. Bar Ticket (Beverage Only)
                const beverageItems = cart.filter(it => isBeverage(it));
                if (config.bar && config.bar.enabled !== false && beverageItems.length > 0) {
                    const barBuf = buildBarBuffer(sale, beverageItems);
                    if (barBuf) {
                        results.bar = await sendToPrinter(config.bar.ip, config.bar.port, barBuf);
                    }
                } else {
                    results.bar = { skipped: true, reason: beverageItems.length === 0 ? 'Tidak ada minuman' : 'Bar dinonaktifkan' };
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


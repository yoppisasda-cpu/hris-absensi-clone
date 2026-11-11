// ESC/POS Protocol Helper for 58mm / 80mm Thermal Printers
// Zero External Dependencies - Uses native Node.js Buffers

const CMD = {
    INIT: Buffer.from([0x1B, 0x40]),
    ALIGN_LEFT: Buffer.from([0x1B, 0x61, 0x00]),
    ALIGN_CENTER: Buffer.from([0x1B, 0x61, 0x01]),
    ALIGN_RIGHT: Buffer.from([0x1B, 0x61, 0x02]),
    BOLD_ON: Buffer.from([0x1B, 0x45, 0x01]),
    BOLD_OFF: Buffer.from([0x1B, 0x45, 0x00]),
    SIZE_LARGE: Buffer.from([0x1D, 0x21, 0x11]), // 2x width, 2x height
    SIZE_MEDIUM: Buffer.from([0x1D, 0x21, 0x01]), // 2x height
    SIZE_NORMAL: Buffer.from([0x1D, 0x21, 0x00]),
    FEED_3: Buffer.from([0x1B, 0x64, 0x03]),
    FEED_5: Buffer.from([0x1B, 0x64, 0x05]),
    CUT: Buffer.from([0x1D, 0x56, 0x41, 0x03]), // Feed 3 lines & Cut
    LF: Buffer.from([0x0A]),
};

function text(str) {
    return Buffer.from(str || '', 'latin1');
}

function line(str = '') {
    return Buffer.concat([text(str), CMD.LF]);
}

function hr(width = 32) {
    return line('-'.repeat(width));
}

function row(left, right, width = 32) {
    left = String(left || '');
    right = String(right || '');
    const space = width - left.length - right.length;
    if (space >= 0) {
        return line(left + ' '.repeat(space) + right);
    } else {
        // If too long, put on two lines
        return Buffer.concat([line(left), Buffer.concat([CMD.ALIGN_RIGHT, line(right), CMD.ALIGN_LEFT])]);
    }
}

// Check if item is beverage
function isBeverage(item) {
    if (item.fnbType === 'BEVERAGE') return true;
    if (item.fnbType === 'FOOD') return false;
    const name = (item.name || '').toLowerCase();
    const cat = (item.category?.name || item.categoryName || '').toLowerCase();
    const bevKeywords = [
        'minum', 'beverage', 'drink', 'kopi', 'coffee', 'tea', 'teh', 'jus', 'juice',
        'latte', 'espresso', 'cappuccino', 'americano', 'matcha', 'boba', 'smoothie',
        'soda', 'syrup', 'ice', 'es ', 'shake', 'mocktail', 'cocktail', 'water', 'mineral', 'air'
    ];
    return bevKeywords.some(kw => name.includes(kw) || cat.includes(kw));
}

// 1. RECEIPT PRINTER BUFFER (Kasir & Pelanggan)
function buildReceiptBuffer(sale, cart, companyName = 'AIVOLA POS', store = {}) {
    const buffers = [];
    const width = 32;

    buffers.push(CMD.INIT);
    buffers.push(CMD.ALIGN_CENTER);
    buffers.push(CMD.BOLD_ON);
    buffers.push(CMD.SIZE_MEDIUM);
    buffers.push(line(companyName));
    buffers.push(CMD.SIZE_NORMAL);
    buffers.push(CMD.BOLD_OFF);

    if (store.address) buffers.push(line(store.address));
    if (store.phone) buffers.push(line('Telp: ' + store.phone));
    buffers.push(line('STRUK PEMBAYARAN RESMI'));
    buffers.push(hr(width));

    buffers.push(CMD.ALIGN_LEFT);
    const dateStr = sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID');
    const timeStr = sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    buffers.push(row('Tgl: ' + dateStr, timeStr, width));
    buffers.push(line('No  : ' + (sale.invoiceNumber || '-')));
    const saleTypeStr = sale.saleType === 'TAKE_AWAY' ? 'Take Away' : (sale.saleType === 'DINE_IN' ? 'Dine In' : (sale.saleType || 'Dine In'));
    buffers.push(row('Tipe: ' + saleTypeStr, sale.cashierName ? 'Kasir: ' + sale.cashierName : '', width));
    if (sale.customerName) buffers.push(line('Plg : ' + sale.customerName));
    buffers.push(hr(width));

    // Items
    for (const item of cart) {
        buffers.push(CMD.BOLD_ON);
        buffers.push(line(item.name));
        buffers.push(CMD.BOLD_OFF);

        // Modifiers
        if (item.modifiers && typeof item.modifiers === 'object') {
            const modEntries = Object.entries(item.modifiers);
            for (const [k, v] of modEntries) {
                const modVal = typeof v === 'object' && v ? (v.name || JSON.stringify(v)) : v;
                buffers.push(line('  - ' + k + ': ' + modVal));
            }
        }

        const qty = Number(item.qty || item.quantity || 1);
        const price = Number(item.price || 0);
        const total = qty * price;
        buffers.push(row(`  ${qty} x ${price.toLocaleString('id-ID')}`, total.toLocaleString('id-ID'), width));
    }
    buffers.push(hr(width));

    // Totals
    const totalAmount = Number(sale.totalAmount || 0);
    const taxAmount = Number(sale.taxAmount || 0);
    const subtotal = totalAmount - taxAmount;

    buffers.push(row('Subtotal', 'Rp ' + subtotal.toLocaleString('id-ID'), width));
    if (taxAmount > 0) {
        buffers.push(row(`Pajak (${sale.taxRate || 0}%)`, 'Rp ' + taxAmount.toLocaleString('id-ID'), width));
    }
    if (sale.discountAmount && Number(sale.discountAmount) > 0) {
        buffers.push(row('Diskon', '-Rp ' + Number(sale.discountAmount).toLocaleString('id-ID'), width));
    }

    buffers.push(CMD.BOLD_ON);
    buffers.push(row('TOTAL', 'Rp ' + totalAmount.toLocaleString('id-ID'), width));
    buffers.push(CMD.BOLD_OFF);
    buffers.push(hr(width));

    // Payment Info
    buffers.push(CMD.ALIGN_RIGHT);
    const paid = Number(sale.paidAmount || totalAmount);
    const change = Number(sale.changeAmount || 0);
    buffers.push(line(`Bayar (${sale.paymentMethod || 'TUNAI'}): Rp ${paid.toLocaleString('id-ID')}`));
    if (change > 0) {
        buffers.push(CMD.BOLD_ON);
        buffers.push(line(`Kembalian: Rp ${change.toLocaleString('id-ID')}`));
        buffers.push(CMD.BOLD_OFF);
    }
    if (sale.paymentReference) {
        buffers.push(line(`Ref/EDC: ${sale.paymentReference}`));
    }

    // Footer
    buffers.push(CMD.ALIGN_CENTER);
    buffers.push(CMD.LF);
    buffers.push(line(store.footer || 'Terima kasih atas kunjungan Anda!'));
    buffers.push(line('Powered by Aivola POS'));
    buffers.push(CMD.FEED_5);
    buffers.push(CMD.CUT);

    return Buffer.concat(buffers);
}

// 2. KITCHEN ORDER TICKET BUFFER (Dapur - Khusus Food)
function buildKitchenBuffer(sale, foodItems) {
    if (!foodItems || foodItems.length === 0) return null;

    const buffers = [];
    const width = 32;

    buffers.push(CMD.INIT);
    buffers.push(CMD.ALIGN_CENTER);
    buffers.push(CMD.BOLD_ON);
    buffers.push(CMD.SIZE_LARGE);
    buffers.push(line('*** DAPUR ***'));
    buffers.push(CMD.SIZE_NORMAL);
    buffers.push(line('KITCHEN ORDER TICKET'));
    buffers.push(CMD.BOLD_OFF);
    buffers.push(hr(width));

    buffers.push(CMD.ALIGN_LEFT);
    const timeStr = sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    buffers.push(row('Inv: ' + (sale.invoiceNumber || '-'), timeStr, width));

    if (sale.customerName) {
        buffers.push(CMD.BOLD_ON);
        buffers.push(CMD.SIZE_MEDIUM);
        buffers.push(line('Meja/Tamu: ' + sale.customerName));
        buffers.push(CMD.SIZE_NORMAL);
        buffers.push(CMD.BOLD_OFF);
    }

    const saleTypeStr = sale.saleType === 'TAKE_AWAY' ? 'Take Away' : (sale.saleType === 'DINE_IN' ? 'Dine In' : (sale.saleType || 'Dine In'));
    buffers.push(line('Tipe: ' + saleTypeStr));

    if (sale.notes) {
        buffers.push(CMD.BOLD_ON);
        buffers.push(line('CATATAN: ' + sale.notes));
        buffers.push(CMD.BOLD_OFF);
    }
    buffers.push(hr(width));

    // Items
    for (const item of foodItems) {
        const qty = Number(item.qty || item.quantity || 1);
        buffers.push(CMD.BOLD_ON);
        buffers.push(CMD.SIZE_MEDIUM);
        buffers.push(line(`${qty}x ${item.name}`));
        buffers.push(CMD.SIZE_NORMAL);
        buffers.push(CMD.BOLD_OFF);

        if (item.modifiers && typeof item.modifiers === 'object') {
            const modEntries = Object.entries(item.modifiers);
            for (const [k, v] of modEntries) {
                const modVal = typeof v === 'object' && v ? (v.name || JSON.stringify(v)) : v;
                buffers.push(line(`   [ ] ${k}: ${modVal}`));
            }
        }
        if (item.notes) {
            buffers.push(line(`   Ket: ${item.notes}`));
        }
        buffers.push(CMD.LF);
    }

    buffers.push(hr(width));
    buffers.push(CMD.ALIGN_CENTER);
    buffers.push(line('--- Selesai Tiket Dapur ---'));
    buffers.push(CMD.FEED_5);
    buffers.push(CMD.CUT);

    return Buffer.concat(buffers);
}

// 3. BAR ORDER TICKET BUFFER (Bar - Khusus Minuman)
function buildBarBuffer(sale, beverageItems) {
    if (!beverageItems || beverageItems.length === 0) return null;

    const buffers = [];
    const width = 32;

    buffers.push(CMD.INIT);
    buffers.push(CMD.ALIGN_CENTER);
    buffers.push(CMD.BOLD_ON);
    buffers.push(CMD.SIZE_LARGE);
    buffers.push(line('*** BAR / MINUMAN ***'));
    buffers.push(CMD.SIZE_NORMAL);
    buffers.push(line('BAR DRINKS TICKET'));
    buffers.push(CMD.BOLD_OFF);
    buffers.push(hr(width));

    buffers.push(CMD.ALIGN_LEFT);
    const timeStr = sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    buffers.push(row('Inv: ' + (sale.invoiceNumber || '-'), timeStr, width));

    if (sale.customerName) {
        buffers.push(CMD.BOLD_ON);
        buffers.push(CMD.SIZE_MEDIUM);
        buffers.push(line('Meja/Tamu: ' + sale.customerName));
        buffers.push(CMD.SIZE_NORMAL);
        buffers.push(CMD.BOLD_OFF);
    }

    const saleTypeStr = sale.saleType === 'TAKE_AWAY' ? 'Take Away' : (sale.saleType === 'DINE_IN' ? 'Dine In' : (sale.saleType || 'Dine In'));
    buffers.push(line('Tipe: ' + saleTypeStr));

    if (sale.notes) {
        buffers.push(CMD.BOLD_ON);
        buffers.push(line('CATATAN: ' + sale.notes));
        buffers.push(CMD.BOLD_OFF);
    }
    buffers.push(hr(width));

    // Items
    for (const item of beverageItems) {
        const qty = Number(item.qty || item.quantity || 1);
        buffers.push(CMD.BOLD_ON);
        buffers.push(CMD.SIZE_MEDIUM);
        buffers.push(line(`${qty}x ${item.name}`));
        buffers.push(CMD.SIZE_NORMAL);
        buffers.push(CMD.BOLD_OFF);

        if (item.modifiers && typeof item.modifiers === 'object') {
            const modEntries = Object.entries(item.modifiers);
            for (const [k, v] of modEntries) {
                const modVal = typeof v === 'object' && v ? (v.name || JSON.stringify(v)) : v;
                buffers.push(line(`   [ ] ${k}: ${modVal}`));
            }
        }
        if (item.notes) {
            buffers.push(line(`   Ket: ${item.notes}`));
        }
        buffers.push(CMD.LF);
    }

    buffers.push(hr(width));
    buffers.push(CMD.ALIGN_CENTER);
    buffers.push(line('--- Selesai Tiket Bar ---'));
    buffers.push(CMD.FEED_5);
    buffers.push(CMD.CUT);

    return Buffer.concat(buffers);
}

// 4. TEST PRINT BUFFER
function buildTestBuffer(targetName, ip) {
    const buffers = [];
    const width = 32;

    buffers.push(CMD.INIT);
    buffers.push(CMD.ALIGN_CENTER);
    buffers.push(CMD.BOLD_ON);
    buffers.push(CMD.SIZE_LARGE);
    buffers.push(line(`TEST ${targetName.toUpperCase()}`));
    buffers.push(CMD.SIZE_NORMAL);
    buffers.push(line('AIVOLA PRINT AGENT LAN'));
    buffers.push(CMD.BOLD_OFF);
    buffers.push(hr(width));
    buffers.push(CMD.ALIGN_LEFT);
    buffers.push(line('Printer  : ' + targetName));
    buffers.push(line('Target IP: ' + ip + ':9100'));
    buffers.push(line('Waktu    : ' + new Date().toLocaleString('id-ID')));
    buffers.push(line('Status   : KONEKSI OK'));
    buffers.push(hr(width));
    buffers.push(CMD.ALIGN_CENTER);
    buffers.push(line('Print Agent LAN Siap Digunakan!'));
    buffers.push(CMD.FEED_5);
    buffers.push(CMD.CUT);

    return Buffer.concat(buffers);
}

module.exports = {
    CMD,
    isBeverage,
    buildReceiptBuffer,
    buildKitchenBuffer,
    buildBarBuffer,
    buildTestBuffer,
};


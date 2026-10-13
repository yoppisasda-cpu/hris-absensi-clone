'use client';
// Active B2B Invoice Protocol

import { useState, useEffect, Fragment } from "react";
import { X, Printer, Download, Mail, Phone, MapPin, Package, CreditCard, CheckCircle, Clock } from "lucide-react";
import api from "@/lib/api";
import { format } from "date-fns";
import { id } from "date-fns/locale";


function terbilang(n: number): string {
    const s = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
    let temp = "";
    if (n < 12) {
        temp = " " + s[n];
    } else if (n < 20) {
        temp = terbilang(n - 10) + " belas";
    } else if (n < 100) {
        temp = terbilang(Math.floor(n / 10)) + " puluh" + terbilang(n % 10);
    } else if (n < 200) {
        temp = " seratus" + terbilang(n - 100);
    } else if (n < 1000) {
        temp = terbilang(Math.floor(n / 100)) + " ratus" + terbilang(n % 100);
    } else if (n < 2000) {
        temp = " seribu" + terbilang(n - 1000);
    } else if (n < 1000000) {
        temp = terbilang(Math.floor(n / 1000)) + " ribu" + terbilang(n % 1000);
    } else if (n < 1000000000) {
        temp = terbilang(Math.floor(n / 1000000)) + " juta" + terbilang(n % 1000000);
    } else if (n < 1000000000000) {
        temp = terbilang(Math.floor(n / 1000000000)) + " milyar" + terbilang(n % 1000000000);
    } else if (n < 1000000000000000) {
        temp = terbilang(Math.floor(n / 1000000000000)) + " trilyun" + terbilang(n % 1000000000000);
    }
    return temp.trim();
}

function formatTerbilang(num: number): string {
    if (num === 0) return "Nol Rupiah";
    const hasil = terbilang(Math.floor(num));
    return hasil.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") + " Rupiah";
}

export default function InvoiceModal({ isOpen, onClose, saleId }: { isOpen: boolean, onClose: () => void, saleId: number }) {
    const [sale, setSale] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && saleId) {
            fetchSaleDetail();
        }
    }, [isOpen, saleId]);

    const fetchSaleDetail = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/sales/${saleId}`);
            setSale(res.data);
        } catch (error) {
            console.error("Gagal mengambil detail invoice", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('printable-invoice');
        if (!printContent) return;

        const printWindow = window.open('', '_blank', 'width=1000,height=800');
        if (!printWindow) {
            alert("Gagal membuka jendela cetak. Pastikan pop-up blocker dinatikan.");
            return;
        }

        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(style => style.outerHTML)
            .join('\n');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice - ${sale.invoiceNumber}</title>
                    ${styles}
                    <style>
                        @page {
                            size: A4 portrait;
                            margin: 8mm 10mm;
                        }
                        @media print {
                            body {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                        }
                        body {
                            background: white !important;
                            color: black !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            height: auto !important;
                            overflow: visible !important;
                            visibility: visible !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        body * {
                            visibility: visible !important;
                        }
                        #printable-invoice {
                            display: block !important;
                            width: 100% !important;
                            max-width: none !important;
                            box-shadow: none !important;
                            border: none !important;
                            max-height: none !important;
                            overflow: visible !important;
                            position: static !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        table {
                            page-break-inside: auto;
                        }
                        tr {
                            page-break-inside: avoid;
                            page-break-after: auto;
                        }
                        thead {
                            display: table-header-group;
                        }
                        tfoot {
                            display: table-footer-group;
                        }
                        .print-hidden, .print\\:hidden, #do-controls, #invoice-controls, .print\\:hidden *, #invoice-controls * {
                            display: none !important;
                            visibility: hidden !important;
                        }
                    </style>
                </head>
                <body>
                    <div id="printable-invoice">
                        ${printContent.innerHTML}
                    </div>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:static print:p-0 print:block print:w-full print:h-auto print:overflow-visible">
            {/* Backdrop - never printed */}
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md print:hidden" onClick={onClose} />

            {/* Control Buttons - OUTSIDE printable area, always print:hidden */}
            <div id="invoice-controls" className="absolute top-8 right-8 flex items-center gap-3 z-[200] print:hidden">
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 border border-white/10"
                >
                    <Printer className="h-4 w-4 stroke-[2.5px]" /> Cetak Invoice
                </button>
                <button
                    onClick={onClose}
                    className="h-10 w-10 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200/60 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                    title="Tutup"
                >
                    <X className="h-4 w-4 stroke-[2.5px]" />
                </button>
            </div>

            {/* Printable Invoice Card — only this is captured by @media print */}
            <div id="printable-invoice" className="bg-white w-full max-w-3xl rounded-[2.5rem] border border-slate-200 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:rounded-none print:border-none print:block print:overflow-visible">
                <div className="overflow-y-auto p-6 md:p-8 print:p-0 print:overflow-visible no-scrollbar print:block">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <div className="h-16 w-16 border-4 border-slate-200 border-t-slate-950 rounded-full animate-spin mb-6"></div>
                            <p className="text-slate-500 font-black italic uppercase tracking-widest text-[10px]">Memuat Data Transaksi...</p>
                        </div>
                    ) : sale ? (
                        <div className="flex flex-col gap-4 print:gap-2 text-slate-950">
                            
                            {/* Branding Section */}
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 print:gap-2 relative z-10">
                                <div className="space-y-1.5 print:space-y-1">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 md:h-12 md:w-12 print:h-10 print:w-10 border border-slate-200 rounded-xl flex items-center justify-center shadow-sm overflow-hidden bg-white shrink-0">
                                            {sale.company?.logoUrl ? (
                                                <img 
                                                    src={sale.company.logoUrl} 
                                                    alt="Company Logo" 
                                                    className="h-full w-full object-contain"
                                                />
                                            ) : (
                                                <div className="h-full w-full bg-slate-950 flex items-center justify-center print:bg-black">
                                                    <Package className="h-5 w-5 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h1 className="text-lg md:text-xl print:text-lg font-black italic text-slate-950 leading-none tracking-tighter uppercase print:text-black">
                                                {sale.company?.name || 'Aivola Merchant'}
                                            </h1>
                                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500 mt-0.5 italic">Solusi Bisnis Cerdas</p>
                                        </div>
                                    </div>
                                    <div className="space-y-0.5 pl-13 md:pl-15 print:pl-13">
                                        <div className="flex items-center gap-2 text-slate-500 text-[9.5px] print:text-[8.5px] font-black uppercase tracking-wider italic print:text-black/60">
                                            <MapPin className="h-3 w-3 shrink-0" />
                                            <span>{sale.company?.address || 'Jl. Raya Digital No. 123, Indonesia'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500 text-[9.5px] print:text-[8.5px] font-black uppercase tracking-wider italic print:text-black/60">
                                            <Phone className="h-3 w-3 shrink-0" />
                                            <span>{sale.company?.picPhone || '+62 812 3456 789'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Header Section (Reorganized as requested) */}
                            <div className="border-t border-b border-slate-200 py-3 print:py-1.5 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 print:gap-4 print:border-black">
                                {/* Left Side: Customer & Billing Info */}
                                <div className="space-y-1.5 print:space-y-0.5">
                                    <h3 className="text-[9px] print:text-[8px] font-black uppercase tracking-[0.25em] text-slate-400 print:text-black/50">Detail Pelanggan / Outlet</h3>
                                    <div className="grid grid-cols-4 gap-x-2 text-[10px] print:text-[9px] leading-tight">
                                        <span className="font-black text-slate-500 uppercase tracking-wider print:text-black/60 col-span-1">OUTLET:</span>
                                        <span className="font-extrabold text-slate-950 uppercase col-span-3 print:text-black">
                                            {sale.customerName || 'UMUM / GUEST'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-x-2 text-[10px] print:text-[9px] leading-tight">
                                        <span className="font-black text-slate-500 uppercase tracking-wider print:text-black/60 col-span-1">PIC / TLP:</span>
                                        <span className="font-bold text-slate-950 col-span-3 print:text-black">
                                            {sale.customerPhone || sale.customer?.phone || '-'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-x-2 text-[10px] print:text-[9px] leading-tight">
                                        <span className="font-black text-slate-500 uppercase tracking-wider print:text-black/60 col-span-1">BILL TO:</span>
                                        <span className="text-slate-600 col-span-3 print:text-black leading-snug">
                                            {sale.customer?.address || 'Tidak ada alamat terdaftar'}
                                        </span>
                                    </div>
                                </div>

                                {/* Right Side: Invoice Meta Info */}
                                <div className="space-y-1.5 print:space-y-0.5 md:pl-6 md:border-l border-slate-100 print:border-black/10 print:pl-4">
                                    <h3 className="text-[9px] print:text-[8px] font-black uppercase tracking-[0.25em] text-slate-400 print:text-black/50">Detail Invoice</h3>
                                    <div className="grid grid-cols-4 gap-x-2 text-[10px] print:text-[9px] leading-tight">
                                        <span className="font-black text-slate-500 uppercase tracking-wider print:text-black/60 col-span-2">INVOICE NO.:</span>
                                        <span className="font-black text-slate-950 col-span-2 print:text-black">
                                            #{sale.invoiceNumber}
                                        </span>
                                    </div>
                                    {sale.poNumber && (
                                        <div className="grid grid-cols-4 gap-x-2 text-[10px] print:text-[9px] leading-tight">
                                            <span className="font-black text-slate-500 uppercase tracking-wider print:text-black/60 col-span-2">PO NO.:</span>
                                            <span className="font-black text-slate-950 col-span-2 print:text-black">
                                                {sale.poNumber}
                                            </span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-4 gap-x-2 text-[10px] print:text-[9px] leading-tight">
                                        <span className="font-black text-slate-500 uppercase tracking-wider print:text-black/60 col-span-2">TANGGAL INVOICE:</span>
                                        <span className="font-bold text-slate-950 col-span-2 print:text-black">
                                            {format(new Date(sale.date), 'dd/MM/yyyy')}
                                        </span>
                                    </div>
                                    {sale.dueDate && (
                                        <div className="grid grid-cols-4 gap-x-2 text-[10px] print:text-[9px] leading-tight animate-pulse print:animate-none">
                                            <span className="font-black text-rose-500 uppercase tracking-wider print:text-black/60 col-span-2">JATUH TEMPO:</span>
                                            <span className="font-extrabold text-rose-600 col-span-2 print:text-black">
                                                {format(new Date(sale.dueDate), 'dd/MM/yyyy')}
                                            </span>
                                        </div>
                                    )}
                                    {sale.shippedAt && (
                                        <div className="grid grid-cols-4 gap-x-2 text-[10px] print:text-[9px] leading-tight">
                                            <span className="font-black text-slate-500 uppercase tracking-wider print:text-black/60 col-span-2">TANGGAL KIRIM:</span>
                                            <span className="font-bold text-slate-950 col-span-2 print:text-black">
                                                {format(new Date(sale.shippedAt), 'dd/MM/yyyy')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Manifest Table */}
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm relative z-10 print:border-black print:rounded-none">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-[8.5px] print:text-[8px] font-black uppercase text-slate-950 tracking-[0.15em] border-b border-slate-200 print:bg-white print:text-black">
                                        <tr>
                                            <th className="px-4 py-1.5 print:px-2 print:py-1 text-slate-950 font-black">Nama Produk</th>
                                            <th className="px-4 py-1.5 print:px-2 print:py-1 text-center text-slate-950 font-black">Jumlah</th>
                                            <th className="px-4 py-1.5 print:px-2 print:py-1 text-right text-slate-950 font-black">Harga Satuan</th>
                                            <th className="px-4 py-1.5 print:px-2 print:py-1 text-right text-slate-950 font-black">Total (IDR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 italic print:divide-black/20 text-slate-950">
                                        {sale.items.map((item: any, idx: number) => {
                                            const parsedModifiers = item.modifiers ? (Array.isArray(item.modifiers) ? item.modifiers : Object.values(item.modifiers)) : [];
                                            const hasModifiers = parsedModifiers.length > 0;
                                            const isBuy1Get1 = item.product_name.toLowerCase().includes('buy 1 get 1');
                                            const mainUnit = isBuy1Get1 ? 'PAKET' : item.product_unit;

                                            return (
                                                <Fragment key={idx}>
                                                    <tr className="group hover:bg-slate-50 transition-colors print:text-black">
                                                        <td className="px-4 py-1.5 print:px-2 print:py-0.5">
                                                            <p className="font-black text-slate-950 text-[10.5px] print:text-[9px] uppercase tracking-tighter print:text-black leading-tight">{item.product_name}</p>
                                                        </td>
                                                        <td className="px-4 py-1.5 print:px-2 print:py-0.5 text-center">
                                                            <span className="font-black text-slate-950 text-[10.5px] print:text-[9px] print:text-black leading-tight">{item.quantity}</span>
                                                            <span className="ml-1.5 text-[8.5px] print:text-[7.5px] text-slate-500 font-black uppercase tracking-widest print:text-black/60">{mainUnit}</span>
                                                        </td>
                                                        <td className="px-4 py-1.5 print:px-2 print:py-0.5 text-right font-black text-slate-500 text-[10.5px] print:text-[9px] tracking-widest print:text-black leading-tight">
                                                            {parseFloat(item.price).toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-1.5 print:px-2 print:py-0.5 text-right font-black text-slate-950 text-[10.5px] print:text-[9px] tracking-widest print:text-black leading-tight">
                                                            {parseFloat(item.total).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                    {hasModifiers && parsedModifiers.map((mod: any, mIdx: number) => (
                                                        <tr key={`mod-${idx}-${mIdx}`} className="border-b border-slate-50 last:border-0 print:border-black/10 bg-slate-50/50 print:bg-transparent">
                                                            <td className="px-4 py-1 pl-8 print:px-2 print:pl-6 print:py-0.5">
                                                                <p className="text-[9.5px] print:text-[8px] text-slate-600 italic font-black uppercase tracking-tighter print:text-black/80 leading-tight">
                                                                    - {mod.optionName || mod.name}
                                                                </p>
                                                            </td>
                                                            <td className="px-4 py-1 print:px-2 print:py-0.5 text-center">
                                                                <span className="font-black text-slate-500 text-[9.5px] print:text-[8px] print:text-black/80 leading-tight">{item.quantity}</span>
                                                                <span className="ml-1 text-[7.5px] print:text-[7px] text-slate-400 font-black uppercase tracking-widest print:text-black/50">CUP</span>
                                                            </td>
                                                            <td className="px-4 py-1 print:px-2 print:py-0.5 text-right font-black text-slate-400 text-[9.5px] print:text-[8px] tracking-widest print:text-black/60 leading-tight">
                                                                0
                                                            </td>
                                                            <td className="px-4 py-1 print:px-2 print:py-0.5 text-right font-black text-slate-400 text-[9.5px] print:text-[8px] tracking-widest print:text-black/60 leading-tight">
                                                                0
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary Totals */}
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 print:gap-3 relative z-10">
                                <div className="flex-1 space-y-2.5 print:space-y-1 w-full">
                                    <div className="space-y-1 print:space-y-0.5">
                                        <h4 className="text-[9px] print:text-[8px] font-black text-slate-400 uppercase tracking-widest print:text-black/50">Terbilang</h4>
                                        <p className="text-[10.5px] print:text-[9px] font-bold text-slate-900 italic bg-slate-50 border border-slate-100 rounded-xl p-2.5 print:p-1.5 leading-snug print:bg-white print:border-black/10 print:text-black">
                                            "{formatTerbilang(sale.totalAmount)}"
                                        </p>
                                    </div>
                                    {sale.notes && (
                                        <div className="space-y-1 print:space-y-0.5 animate-in slide-in-from-top-2 duration-300">
                                            <h4 className="text-[9px] print:text-[8px] font-black text-slate-400 uppercase tracking-widest print:text-black/50">Catatan Transaksi</h4>
                                            <p className="text-[10px] print:text-[8.5px] font-medium text-slate-700 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-2.5 print:p-1.5 leading-snug print:bg-white print:border-black/10 print:text-black">
                                                {sale.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="w-full md:w-80 print:w-64 space-y-2 print:space-y-1">
                                    <div className="flex justify-between items-center text-slate-500 text-[9.5px] print:text-[8.5px] font-black uppercase tracking-widest italic print:text-black">
                                        <span>Subtotal</span>
                                        <span className="text-slate-950 font-black">
                                            {(parseFloat(sale.totalAmount) - parseFloat(sale.taxAmount || 0)).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-500 text-[9.5px] print:text-[8.5px] font-black uppercase tracking-widest italic print:text-black">
                                        <span>Pajak ({sale.taxRate || 0}%)</span>
                                        <span className={`font-black ${(sale.taxRate || 0) > 0 ? 'text-amber-600' : 'text-slate-950'}`}>
                                            {parseFloat(sale.taxAmount || 0).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="h-[1px] bg-slate-200 my-1 print:my-0.5 print:bg-black"></div>
                                    <div className="p-3 px-4 print:p-1.5 print:px-3 bg-white border-2 border-slate-950 rounded-xl text-slate-950 shadow-sm print:border-black print:border-2">
                                        <p className="text-[7.5px] font-black uppercase tracking-[0.2em] mb-0.5 print:text-black">Total Bersih</p>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[9.5px] print:text-[8.5px] font-black opacity-50 print:text-black">Rp</span>
                                            <span className="text-lg print:text-base font-black italic tracking-tighter print:text-black">{parseFloat(sale.totalAmount).toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Professional Footer */}
                            <div className="flex flex-col sm:flex-row justify-between items-end pt-3 mt-3 print:pt-1.5 print:mt-1.5 border-t border-slate-200 relative z-10 print:border-black">
                                <div className="text-[6.5px] font-bold text-slate-400 uppercase tracking-[0.15em] print:text-black/50 space-y-0.5">
                                    <p>ID SISTEM: AIVOLA_CORE_V1</p>
                                    <p>WAKTU: {new Date().toLocaleDateString('id-ID')} // {new Date().toLocaleTimeString('id-ID')}</p>
                                </div>
                                
                                {/* Bank Transfer Instructions beside Signature */}
                                {sale.bankAccounts && sale.bankAccounts.length > 0 && (
                                    <div className="flex flex-col gap-1.5 mt-3 sm:mt-0 print:mt-0">
                                        {sale.bankAccounts.map((acc: any) => (
                                            <div key={acc.id} className="p-2 px-3 print:p-1.5 print:px-2 bg-white rounded-xl border border-slate-200 flex flex-col shadow-sm print:border-black print:bg-white print:border w-[240px] print:w-[200px]">
                                                <div>
                                                    <span className="text-[8.5px] print:text-[7.5px] font-black text-slate-500 uppercase tracking-[0.1em] print:text-black">{acc.bankName}</span>
                                                    <p className="text-[13px] print:text-[11px] font-extrabold text-slate-950 tracking-widest print:text-black mt-0.5 leading-none">{acc.accountNumber}</p>
                                                </div>
                                                <p className="text-[8.5px] print:text-[7.5px] font-black text-slate-500 uppercase tracking-wider mt-1.5 print:mt-1 print:text-black">a.n. {acc.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="text-center w-40 mt-4 sm:mt-0 print:mt-0">
                                    <div className="h-8 print:h-6"></div>
                                    <div className="h-[1px] bg-slate-200 w-full mb-1.5 print:mb-1 print:bg-black"></div>
                                    <p className="text-[9px] print:text-[8px] font-black text-slate-950 uppercase tracking-[0.2em] print:text-black">FINANCE</p>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="text-center py-24 group">
                            <p className="text-rose-500 font-black italic uppercase tracking-[0.5em] text-sm animate-pulse">DATA_KOSONG_EXCEPTION</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
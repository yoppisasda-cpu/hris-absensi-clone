'use client';
// Active B2B Invoice Protocol

import { useState, useEffect } from "react";
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
        const controls = document.getElementById('invoice-controls');
        if (controls) controls.style.display = 'none';
        
        const afterPrint = () => {
            if (controls) controls.style.display = '';
            window.removeEventListener('afterprint', afterPrint);
        };
        window.addEventListener('afterprint', afterPrint);
        
        window.print();
    };

    const getStatusLabel = (status: string) => {
        if (status === 'PAID') return 'LUNAS';
        if (status === 'PARTIALLY_PAID') return 'DICICIL';
        return 'BELUM LUNAS';
    };

    const getFundingLabel = (accountId: any) => {
        return accountId ? 'TRANSFER BANK' : 'TUNAI / KAS';
    };

    if (!isOpen) return null;

    return (
        <div id="printable-invoice" className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl print:hidden" onClick={onClose} />
            <div className="bg-white w-full max-w-3xl rounded-[2.5rem] border border-slate-200 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:rounded-none print:border-none">
                {/* Floating Control Panel (Hidden on Print) */}
                <div id="invoice-controls" className="absolute top-8 right-8 flex items-center gap-3 z-50 print:hidden">
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

                <div className="overflow-y-auto p-12 print:overflow-visible print:p-0 no-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <div className="h-16 w-16 border-4 border-slate-200 border-t-slate-950 rounded-full animate-spin mb-6"></div>
                            <p className="text-slate-500 font-black italic uppercase tracking-widest text-[10px]">Memuat Data Transaksi...</p>
                        </div>
                    ) : sale ? (
                        <div className="flex flex-col gap-6 text-slate-950">
                            
                            {/* Branding Section */}
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 relative z-10">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 border border-slate-200 rounded-xl flex items-center justify-center shadow-sm overflow-hidden bg-white">
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
                                            <h1 className="text-xl font-black italic text-slate-950 leading-none tracking-tighter uppercase print:text-black">
                                                {sale.company?.name || 'Aivola Merchant'}
                                            </h1>
                                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500 mt-1 italic">Solusi Bisnis Cerdas</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1 pl-16">
                                        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-wider italic print:text-black/60">
                                            <MapPin className="h-3 w-3" />
                                            <span>{sale.company?.address || 'Jl. Raya Digital No. 123, Indonesia'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-wider italic print:text-black/60">
                                            <Phone className="h-3 w-3" />
                                            <span>{sale.company?.picPhone || '+62 812 3456 789'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Header Section (Reorganized as requested) */}
                            <div className="border-t border-b border-slate-200 py-4 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 print:border-black print:py-4">
                                {/* Left Side: Customer & Billing Info */}
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 print:text-black/50">Detail Pelanggan / Outlet</h3>
                                    <div className="grid grid-cols-4 gap-x-2 text-[11px] leading-relaxed">
                                        <span className="font-black text-slate-500 uppercase tracking-wider print:text-black/60 col-span-1">OUTLET:</span>
                                        <span className="font-extrabold text-slate-950 uppercase col-span-3 print:text-black">
                                            {sale.customerName || 'UMUM / GUEST'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-x-2 text-[11px] leading-relaxed">
                                        <span className="font-black text-slate-500 uppercase tracking-wider print:text-black/60 col-span-1">PIC / TLP:</span>
                                        <span className="font-bold text-slate-950 col-span-3 print:text-black">
                                            {sale.customerPhone || sale.customer?.phone || '-'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-x-2 text-[11px] leading-relaxed">
                                        <span className="font-black text-slate-500 uppercase tracking-wider print:text-black/60 col-span-1">BILL TO:</span>
                                        <span className="text-slate-600 col-span-3 print:text-black leading-normal">
                                            {sale.customer?.address || 'Tidak ada alamat terdaftar'}
                                        </span>
                                    </div>
                                </div>

                                {/* Right Side: Invoice Meta Info */}
                                <div className="space-y-3 md:pl-8 md:border-l border-slate-100 print:border-black/10 print:pl-8">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 print:text-black/50">Detail Invoice</h3>
                                    <div className="grid grid-cols-4 gap-x-2 text-[11px] leading-relaxed">
                                        <span className="font-black text-slate-500 uppercase tracking-wider print:text-black/60 col-span-2">INVOICE NO.:</span>
                                        <span className="font-black text-slate-950 col-span-2 print:text-black">
                                            #{sale.invoiceNumber}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-x-2 text-[11px] leading-relaxed">
                                        <span className="font-black text-slate-500 uppercase tracking-wider print:text-black/60 col-span-2">TANGGAL INVOICE:</span>
                                        <span className="font-bold text-slate-950 col-span-2 print:text-black">
                                            {format(new Date(sale.date), 'dd/MM/yyyy')}
                                        </span>
                                    </div>
                                    {sale.dueDate && (
                                        <div className="grid grid-cols-4 gap-x-2 text-[11px] leading-relaxed animate-pulse">
                                            <span className="font-black text-rose-500 uppercase tracking-wider print:text-black/60 col-span-2">JATUH TEMPO:</span>
                                            <span className="font-extrabold text-rose-600 col-span-2 print:text-black">
                                                {format(new Date(sale.dueDate), 'dd/MM/yyyy')}
                                            </span>
                                        </div>
                                    )}
                                    {sale.shippedAt && (
                                        <div className="grid grid-cols-4 gap-x-2 text-[11px] leading-relaxed">
                                            <span className="font-black text-slate-500 uppercase tracking-wider print:text-black/60 col-span-2">TANGGAL KIRIM:</span>
                                            <span className="font-bold text-slate-950 col-span-2 print:text-black">
                                                {format(new Date(sale.shippedAt), 'dd/MM/yyyy')}
                                            </span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-4 gap-x-2 text-[11px] leading-relaxed">
                                        <span className="font-black text-slate-500 uppercase tracking-wider print:text-black/60 col-span-2">METODE BAYAR:</span>
                                        <span className="font-bold text-slate-950 col-span-2 print:text-black">
                                            {getFundingLabel(sale.accountId)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-x-2 text-[11px] leading-relaxed">
                                        <span className="font-black text-slate-500 uppercase tracking-wider print:text-black/60 col-span-2">STATUS:</span>
                                        <span className="font-extrabold text-slate-950 col-span-2 print:text-black">
                                            {getStatusLabel(sale.status)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Manifest Table */}
                            <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm relative z-10 print:border-black print:rounded-none">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-950 tracking-[0.2em] border-b border-slate-200 print:bg-white print:text-black">
                                        <tr>
                                            <th className="px-8 py-5 text-slate-950 font-black">Nama Produk / SKU</th>
                                            <th className="px-8 py-5 text-center text-slate-950 font-black">Jumlah</th>
                                            <th className="px-8 py-5 text-right text-slate-950 font-black">Harga Satuan</th>
                                            <th className="px-8 py-5 text-right text-slate-950 font-black">Total (IDR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 italic print:divide-black text-slate-950">
                                        {sale.items.map((item: any, idx: number) => (
                                            <tr key={idx} className="group hover:bg-slate-50 transition-colors print:text-black">
                                                <td className="px-8 py-5">
                                                    <p className="font-black text-slate-950 text-[11px] uppercase tracking-tighter print:text-black">{item.product_name}</p>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1 print:text-black/60">{item.product_sku || 'NON_SPECIFIED'}</p>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className="font-black text-slate-950 text-[11px] print:text-black">{item.quantity}</span>
                                                    <span className="ml-2 text-[9px] text-slate-500 font-black uppercase tracking-widest print:text-black/60">{item.product_unit}</span>
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-slate-500 text-[11px] tracking-widest print:text-black">
                                                    {parseFloat(item.price).toLocaleString()}
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-slate-950 text-[11px] tracking-widest print:text-black">
                                                    {parseFloat(item.total).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary Totals */}
                            <div className="flex flex-col md:flex-row justify-between items-start gap-12 relative z-10">
                                <div className="flex-1 space-y-4 w-full">
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black/50">Terbilang</h4>
                                        <p className="text-[12px] font-bold text-slate-900 italic bg-slate-50 border border-slate-100 rounded-2xl p-4 leading-relaxed print:bg-white print:border-black/10 print:text-black">
                                            "{formatTerbilang(sale.totalAmount)}"
                                        </p>
                                    </div>
                                    {sale.notes && (
                                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black/50">Catatan / Keterangan</h4>
                                            <p className="text-[11px] font-medium text-slate-700 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-4 leading-relaxed print:bg-white print:border-black/10 print:text-black">
                                                {sale.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="w-full md:w-80 space-y-3">
                                    <div className="flex justify-between items-center text-slate-500 text-[10px] font-black uppercase tracking-widest italic print:text-black">
                                        <span>Subtotal</span>
                                        <span className="text-slate-950 font-black">
                                            {(parseFloat(sale.totalAmount) - parseFloat(sale.taxAmount || 0)).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-500 text-[10px] font-black uppercase tracking-widest italic print:text-black">
                                        <span>Pajak ({sale.taxRate || 0}%)</span>
                                        <span className={`font-black ${(sale.taxRate || 0) > 0 ? 'text-amber-600' : 'text-slate-950'}`}>
                                            {parseFloat(sale.taxAmount || 0).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="h-[1px] bg-slate-200 my-2 print:bg-black"></div>
                                    <div className="p-4 px-6 bg-white border-2 border-slate-950 rounded-2xl text-slate-950 shadow-sm print:border-black print:border-2">
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-1 print:text-black">Total Bersih</p>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black opacity-50 print:text-black">Rp</span>
                                            <span className="text-xl font-black italic tracking-tighter print:text-black">{parseFloat(sale.totalAmount).toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Professional Footer */}
                            <div className="flex flex-col sm:flex-row justify-between items-end pt-8 mt-8 border-t border-slate-200 relative z-10 print:border-black">
                                <div className="text-[6.5px] font-bold text-slate-400 uppercase tracking-[0.15em] print:text-black/50 space-y-0.5">
                                    <p>ID SISTEM: AIVOLA_CORE_V1</p>
                                    <p>WAKTU: {new Date().toLocaleDateString('id-ID')} // {new Date().toLocaleTimeString('id-ID')}</p>
                                </div>
                                
                                {/* Bank Transfer Instructions beside Signature */}
                                {sale.bankAccounts && sale.bankAccounts.length > 0 && (
                                    <div className="flex flex-col gap-2 mt-4 sm:mt-0">
                                        {sale.bankAccounts.map((acc: any) => (
                                            <div key={acc.id} className="p-3 px-4 bg-white rounded-xl border border-slate-200 flex flex-col shadow-sm print:border-black print:bg-white print:border w-[250px]">
                                                <div>
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] print:text-black">{acc.bankName}</span>
                                                    <p className="text-[14px] font-extrabold text-slate-950 tracking-widest print:text-black mt-1 leading-none">{acc.accountNumber}</p>
                                                </div>
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mt-2.5 print:text-black">a.n. {acc.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="text-center w-48 mt-8 sm:mt-0">
                                    <div className="h-12"></div>
                                    <div className="h-[1px] bg-slate-200 w-full mb-3 print:bg-black"></div>
                                    <p className="text-[10px] font-black text-slate-950 uppercase tracking-[0.2em] print:text-black">{sale.company?.name || 'OPERATOR_TOKO'}</p>
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
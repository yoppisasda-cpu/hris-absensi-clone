'use client';

import { useState, useEffect } from "react";
import { X, Printer, Download, Mail, Phone, MapPin, Package, CreditCard, CheckCircle, Clock } from "lucide-react";
import api from "@/lib/api";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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
        window.print();
    };

    if (!isOpen) return null;

    return (
        <div id="printable-invoice" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static print:inset-auto">
            <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:rounded-none">
                
                {/* Modal Header - Hidden on Print */}
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0 print:hidden">
                    <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-orange-400" />
                        <h2 className="text-lg font-black uppercase tracking-tight">Invoice Detail</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                        >
                            <Printer className="h-4 w-4" /> Cetak / PDF
                        </button>
                        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto p-8 md:p-12 print:overflow-visible print:p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <div className="h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-400 font-bold italic">Memuat Invoice...</p>
                        </div>
                    ) : sale ? (
                        <div className="flex flex-col gap-10">
                            
                            {/* Company Branding & Info */}
                            <div className="flex justify-between items-start gap-6 border-b border-slate-100 pb-8 print:pb-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        {sale.company?.logoUrl ? (
                                            <img src={sale.company.logoUrl} alt="Logo" className="h-12 w-auto" />
                                        ) : (
                                            <div className="h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center">
                                                <Package className="h-8 w-8 text-orange-500" />
                                            </div>
                                        )}
                                        <div>
                                            <h1 className="text-2xl font-black italic text-slate-900 leading-tight">
                                                {sale.company?.name || 'Aivola Merchant'}
                                            </h1>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Smart Business Solutions</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 pt-2">
                                        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                            <span>{sale.company?.address || 'Jl. Raya Digital No. 123, Indonesia'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                                            <span>{sale.company?.picPhone || '+62 812 3456 789'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Invoice ID & Order Box */}
                                <div className="relative text-right">
                                    <div className="absolute -top-12 -right-4 text-[110px] font-black text-slate-100 uppercase tracking-[15px] pointer-events-none -z-10 opacity-20 print:opacity-10 italic select-none">
                                        Invoice
                                    </div>
                                    <div className="bg-slate-50 px-5 py-4 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200 shadow-sm print:shadow-none">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Nomor Pesanan</p>
                                        <p className="text-lg font-black text-slate-900 italic tracking-tight">{sale.invoiceNumber}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Sale Header Info */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal</p>
                                    <p className="text-sm font-bold text-slate-900">
                                        {format(new Date(sale.date), 'dd MMMM yyyy', { locale: id })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                    <span className={`inline-flex items-center gap-1 text-sm font-black italic ${sale.status === 'PAID' ? 'text-emerald-600' : 'text-orange-600'}`}>
                                        {sale.status === 'PAID' ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                        {sale.status === 'PAID' ? 'LUNAS' : 'PENDING'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                                    <p className="text-sm font-bold text-slate-900">
                                        {sale.customerName || 'General Customer'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Metode Bayar</p>
                                    <p className="text-sm font-bold text-slate-900 uppercase">
                                        {sale.accountId ? 'Kas / Bank' : 'Tunei'}
                                    </p>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-900 text-white">
                                        <tr>
                                            <th className="px-5 py-3 font-black uppercase tracking-widest text-[10px]">Item / SKU</th>
                                            <th className="px-5 py-3 font-black uppercase tracking-widest text-[10px] text-center">Qty</th>
                                            <th className="px-5 py-3 font-black uppercase tracking-widest text-[10px] text-right">Harga</th>
                                            <th className="px-5 py-3 font-black uppercase tracking-widest text-[10px] text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sale.items.map((item: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="px-5 py-4">
                                                    <p className="font-bold text-slate-900">{item.product_name}</p>
                                                    <p className="text-[10px] font-mono text-slate-400 font-bold uppercase">{item.product_sku || '-'}</p>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className="font-bold text-slate-700">{item.quantity}</span>
                                                    <span className="ml-1 text-[10px] text-slate-400 font-bold uppercase">{item.product_unit}</span>
                                                </td>
                                                <td className="px-5 py-4 text-right font-medium text-slate-600 italic">
                                                    Rp {parseFloat(item.price).toLocaleString()}
                                                </td>
                                                <td className="px-5 py-4 text-right font-black text-slate-900">
                                                    Rp {parseFloat(item.total).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary Totals */}
                            <div className="flex flex-col md:flex-row justify-between items-start gap-10">
                                <div className="flex-1 max-w-sm">
                                    <div className="p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Catatan</p>
                                        <p className="text-xs text-slate-500 italic font-medium leading-relaxed">
                                            {sale.notes || 'Terima kasih atas kepercayaan Anda berbelanja di toko kami. Simpan invoice ini sebagai bukti transaksi yang sah.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full md:w-72 space-y-3">
                                    <div className="flex justify-between items-center text-slate-500 text-sm font-medium">
                                        <span>Subtotal</span>
                                        <span>Rp {parseFloat(sale.totalAmount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-500 text-sm font-medium">
                                        <span>Pajak (0%)</span>
                                        <span>Rp 0</span>
                                    </div>
                                    <div className="h-[1px] bg-slate-100 my-2"></div>
                                    <div className="flex justify-between items-center py-2 px-4 bg-orange-600 rounded-xl text-white shadow-lg shadow-orange-100">
                                        <span className="text-[10px] font-black uppercase tracking-widest">Total Bayar</span>
                                        <span className="text-xl font-black italic">Rp {parseFloat(sale.totalAmount).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Signature - Visible only on Print or as Footer */}
                            <div className="flex justify-between items-end pt-10 mt-10 border-t border-slate-100">
                                <div className="text-[10px] font-medium text-slate-400">
                                    <p>Invoice generated at {new Date().toLocaleDateString()}</p>
                                    <p>aivola.id | Smart Finance & Inventory</p>
                                </div>
                                <div className="text-center w-40">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-12">Hormat Kami,</p>
                                    <div className="h-[1px] bg-slate-900 w-full mb-1"></div>
                                    <p className="text-xs font-bold text-slate-900">{sale.company?.name || 'Authorized Store'}</p>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <p className="text-red-500 font-bold">Data tidak ditemukan.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

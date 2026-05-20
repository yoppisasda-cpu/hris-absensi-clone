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
                
                {/* Floating Buttons - Modern UI */}
                <div className="absolute top-6 right-6 flex items-center gap-3 z-30 print:hidden print-hidden">
                    <button 
                        onClick={handlePrint}
                        className="h-10 w-10 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-950 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-slate-950/10 group"
                        title="Cetak Invoice"
                    >
                        <Printer className="h-4.5 w-4.5 group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                        onClick={onClose} 
                        className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center border border-slate-200 text-slate-600 hover:text-slate-900 transition-all active:scale-95"
                    >
                        <X className="h-4.5 w-4.5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-12 print:overflow-visible print:p-0 no-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <div className="h-16 w-16 border-4 border-slate-200 border-t-slate-950 rounded-full animate-spin mb-6"></div>
                            <p className="text-slate-500 font-black italic uppercase tracking-widest text-[10px]">Memuat Data Transaksi...</p>
                        </div>
                    ) : sale ? (
                        <div className="flex flex-col gap-12 text-slate-950">
                            
                            {/* Branding Section */}
                            <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-slate-950 border border-slate-200 rounded-xl flex items-center justify-center shadow-sm print:bg-black print:text-white">
                                            <Package className="h-5 w-5 text-white print:text-white" />
                                        </div>
                                        <div>
                                            <h1 className="text-xl font-black italic text-slate-950 leading-none tracking-tighter uppercase print:text-black">
                                                {sale.company?.name || 'Aivola Merchant'}
                                            </h1>
                                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500 mt-1 italic">Solusi Bisnis Cerdas</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 pt-2 border-l-2 border-slate-200 pl-6 print:border-black/10">
                                        <div className="flex items-center gap-3 text-slate-500 text-[10px] font-black uppercase tracking-wider italic print:text-black/60">
                                            <MapPin className="h-3.5 w-3.5" />
                                            <span>{sale.company?.address || 'Jl. Raya Digital No. 123, Indonesia'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-500 text-[10px] font-black uppercase tracking-wider italic print:text-black/60">
                                            <Phone className="h-3.5 w-3.5" />
                                            <span>{sale.company?.picPhone || '+62 812 3456 789'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-5 gap-2 relative z-10">
                                <div className="bg-white p-2 px-3 rounded-xl border border-slate-200 shadow-sm print:border-black print:shadow-none">
                                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5 print:text-black">Nomor Invoice</p>
                                    <p className="text-[10px] font-black text-slate-950 uppercase tracking-tighter print:text-black truncate">
                                        #{sale.invoiceNumber}
                                    </p>
                                </div>
                                <div className="bg-white p-2 px-3 rounded-xl border border-slate-200 shadow-sm print:border-black print:shadow-none">
                                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5 print:text-black">Tanggal Transaksi</p>
                                    <p className="text-[10px] font-black text-slate-950 uppercase tracking-tighter print:text-black truncate">
                                        {format(new Date(sale.date), 'dd MMM yyyy', { locale: id })}
                                    </p>
                                </div>
                                <div className="bg-white p-2 px-3 rounded-xl border border-slate-200 shadow-sm print:border-black print:shadow-none">
                                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5 print:text-black">Nama Pelanggan</p>
                                    <p className="text-[10px] font-black text-slate-950 uppercase tracking-tighter print:text-black truncate">
                                        {sale.customerName?.toUpperCase() || 'UMUM / GUEST'}
                                    </p>
                                </div>
                                <div className="bg-white p-2 px-3 rounded-xl border border-slate-200 shadow-sm print:border-black print:shadow-none">
                                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5 print:text-black">Status Pembayaran</p>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-tighter text-slate-950 print:text-black truncate">
                                        {sale.status === 'PAID' ? <CheckCircle className="h-3 w-3 flex-shrink-0" /> : <Clock className="h-3 w-3 flex-shrink-0" />}
                                        {getStatusLabel(sale.status)}
                                    </span>
                                </div>
                                <div className="bg-white p-2 px-3 rounded-xl border border-slate-200 shadow-sm print:border-black print:shadow-none">
                                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5 print:text-black">Metode Pembayaran</p>
                                    <p className="text-[10px] font-black text-slate-950 uppercase tracking-tighter print:text-black truncate">
                                        {getFundingLabel(sale.accountId)}
                                    </p>
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
                                <div className="flex-1">
                                    {/* Left side empty for standard layout balance */}
                                </div>
                                <div className="w-full md:w-80 space-y-3">
                                    <div className="flex justify-between items-center text-slate-500 text-[10px] font-black uppercase tracking-widest italic print:text-black">
                                        <span>Subtotal</span>
                                        <span className="text-slate-950 font-black">{parseFloat(sale.totalAmount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-500 text-[10px] font-black uppercase tracking-widest italic print:text-black">
                                        <span>Pajak (0%)</span>
                                        <span className="text-slate-950 font-black">0</span>
                                    </div>
                                    <div className="h-[1px] bg-slate-200 my-2 print:bg-black"></div>
                                    <div className="p-4 px-6 bg-white border-2 border-slate-950 rounded-2xl text-slate-950 shadow-sm print:border-black print:border-2">
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-1 print:text-black">Total Bersih</p>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black opacity-50 print:text-black">Rp</span>
                                            <span className="text-xl font-black italic tracking-tighter print:text-black">{parseFloat(sale.totalAmount).toLocaleString()}</span>
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
                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] mb-12 print:text-black">Tanda Tangan Resmi</p>
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
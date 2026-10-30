'use client';

import { useState, useEffect } from "react";
import { X, Receipt, Save, AlertCircle, ArrowUpRight, ArrowDownRight, CheckCircle2, Calendar, FileText } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    po: any;
    onSuccess: () => void;
}

export default function VerifyInvoiceModal({ isOpen, onClose, po, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceDueDate, setInvoiceDueDate] = useState("");
    const [invoiceNotes, setInvoiceNotes] = useState("");
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && po) {
            setSupplierInvoiceNumber(po.supplierInvoiceNumber || "");
            
            const initInvDate = po.invoiceDate 
                ? new Date(po.invoiceDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            setInvoiceDate(initInvDate);

            if (po.invoiceDueDate) {
                setInvoiceDueDate(new Date(po.invoiceDueDate).toISOString().split('T')[0]);
            } else {
                const defaultDue = new Date(new Date(initInvDate).getTime() + 7 * 24 * 60 * 60 * 1000);
                setInvoiceDueDate(defaultDue.toISOString().split('T')[0]);
            }

            setInvoiceNotes(po.invoiceNotes || "");

            if (po.items && Array.isArray(po.items)) {
                setItems(po.items.map((item: any) => ({
                    id: item.id,
                    productId: item.productId,
                    name: item.product?.name || "Produk",
                    sku: item.product?.sku || "-",
                    unit: item.product?.purchaseUnit || item.product?.unit || "Unit",
                    quantity: item.quantity || 0,
                    receivedQty: item.receivedQty || 0,
                    initialPrice: item.initialPrice && item.initialPrice > 0 ? item.initialPrice : (item.price || 0),
                    price: item.price || 0
                })));
            }
        }
    }, [isOpen, po]);

    if (!isOpen || !po) return null;

    const handlePriceChange = (id: number, val: string) => {
        const num = parseFloat(val) || 0;
        setItems(prev => prev.map(item => item.id === id ? { ...item, price: num } : item));
    };

    // Calculate totals based on receivedQty (or quantity if not yet received)
    const initialTotal = items.reduce((sum, item) => {
        const qty = item.receivedQty > 0 ? item.receivedQty : item.quantity;
        return sum + (qty * (item.initialPrice || 0));
    }, 0);

    const invoiceTotal = items.reduce((sum, item) => {
        const qty = item.receivedQty > 0 ? item.receivedQty : item.quantity;
        return sum + (qty * (item.price || 0));
    }, 0);

    const totalDiff = invoiceTotal - initialTotal;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!supplierInvoiceNumber.trim()) {
            return toast.error("Nomor Faktur / Invoice Supplier wajib diisi.");
        }

        try {
            setLoading(true);
            await api.post(`/inventory/purchase-orders/${po.id}/verify-invoice`, {
                supplierInvoiceNumber: supplierInvoiceNumber.trim(),
                invoiceDate,
                invoiceDueDate: invoiceDueDate || null,
                invoiceNotes: invoiceNotes.trim() || null,
                items: items.map(item => ({
                    id: item.id,
                    price: Number(item.price) || 0
                }))
            });

            toast.success("Faktur supplier berhasil diverifikasi & harga diperbarui!");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "Gagal memverifikasi faktur");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <div className="relative w-full max-w-5xl rounded-[32px] bg-slate-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur-xl z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
                            <Receipt className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                                    Verifikasi Faktur & Update Harga Supplier
                                </h2>
                                {po.isInvoiceVerified && (
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        Sudah Terverifikasi
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic mt-0.5">
                                PO #{po.orderNumber} &bull; Pemasok: {po.supplier?.name}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2.5 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    <form id="verifyInvoiceForm" onSubmit={handleSubmit} className="space-y-6">
                        {/* Notice Alert */}
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-bold text-amber-200 uppercase tracking-wider text-[11px]">
                                    Pencatatan Faktur Resmi & Penyesuaian HPP
                                </p>
                                <p className="text-slate-300 leading-relaxed text-[11px]">
                                    Masukkan nomor faktur supplier dan sesuaikan harga satuan aktual per barang jika terdapat selisih dari PO awal. Sistem akan <strong>otomatis merevisi nilai Hutang Usaha di Modul Keuangan</strong> dan <strong>menyesuaikan HPP (Moving Average Cost)</strong> bahan baku tanpa mengganggu stok fisik.
                                </p>
                            </div>
                        </div>

                        {/* Invoice Header Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-5 rounded-2xl border border-white/5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">
                                    No. Faktur / Invoice Supplier <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: INV-CK-2026/10/01"
                                    value={supplierInvoiceNumber}
                                    onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:border-amber-500/50 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">
                                    Tanggal Faktur Supplier
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-amber-500/50 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">
                                    Jatuh Tempo Pembayaran
                                </label>
                                <input
                                    type="date"
                                    value={invoiceDueDate}
                                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-amber-500/50 outline-none transition-all"
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">
                                    Catatan / Keterangan Tagihan (Opsional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Misal: Penyesuaian harga supplier per November, termasuk PPN 11%"
                                    value={invoiceNotes}
                                    onChange={(e) => setInvoiceNotes(e.target.value)}
                                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Items Price Adjustment Table */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-white italic uppercase tracking-widest flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-amber-400" /> Penyesuaian Harga Barang
                                </h3>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider italic">
                                    {items.length} Barang Terdaftar
                                </span>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/50">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/5">
                                            <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-slate-400 italic">Nama Barang</th>
                                            <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-slate-400 italic text-center">Qty Dipesan</th>
                                            <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-emerald-400 italic text-center">Qty Diterima</th>
                                            <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-slate-400 italic text-right">Harga PO Awal</th>
                                            <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-amber-400 italic text-center w-48">Harga Faktur Riil</th>
                                            <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-slate-400 italic text-center">Selisih Satuan</th>
                                            <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-slate-300 italic text-right">Subtotal Tagihan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {items.map((item) => {
                                            const billQty = item.receivedQty > 0 ? item.receivedQty : item.quantity;
                                            const unitDiff = (item.price || 0) - (item.initialPrice || 0);
                                            const subtotal = billQty * (item.price || 0);

                                            return (
                                                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-4 py-3 text-white">
                                                        <div className="font-bold text-xs text-white">{item.name}</div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {item.sku && (
                                                                <span className="text-[9px] font-black text-slate-400 font-mono">
                                                                    {item.sku}
                                                                </span>
                                                            )}
                                                            <span className="text-[9px] text-slate-500 font-bold uppercase">
                                                                &bull; {item.unit}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-slate-400 font-semibold text-xs">
                                                        {item.quantity} {item.unit}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-emerald-400 font-bold text-xs">
                                                        {item.receivedQty > 0 ? `${item.receivedQty} ${item.unit}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-400 font-mono text-xs">
                                                        Rp {(item.initialPrice || 0).toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="relative flex items-center justify-center">
                                                            <span className="absolute left-3 text-slate-500 font-bold text-xs">Rp</span>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                min="0"
                                                                required
                                                                value={item.price}
                                                                onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                                                className="w-36 rounded-xl bg-slate-900 border border-slate-700 pl-9 pr-3 py-1.5 text-right text-xs font-black text-amber-300 font-mono focus:border-amber-500 outline-none transition-all"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {unitDiff === 0 ? (
                                                            <span className="text-[10px] font-bold text-slate-500">Sesuai</span>
                                                        ) : unitDiff > 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-mono">
                                                                <ArrowUpRight className="h-3 w-3" /> +Rp {unitDiff.toLocaleString('id-ID')}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                                                                <ArrowDownRight className="h-3 w-3" /> -Rp {Math.abs(unitDiff).toLocaleString('id-ID')}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-black text-white font-mono text-xs">
                                                        Rp {subtotal.toLocaleString('id-ID')}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="space-y-1 text-center sm:text-left">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Total PO Awal</span>
                                <p className="text-sm font-bold text-slate-400 font-mono">
                                    Rp {initialTotal.toLocaleString('id-ID')}
                                </p>
                            </div>

                            <div className="space-y-1 text-center sm:text-left">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Selisih Penyesuaian</span>
                                <p className={`text-sm font-bold font-mono ${totalDiff > 0 ? 'text-rose-400' : totalDiff < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                    {totalDiff > 0 ? `+ Rp ${totalDiff.toLocaleString('id-ID')}` : totalDiff < 0 ? `- Rp ${Math.abs(totalDiff).toLocaleString('id-ID')}` : 'Rp 0'}
                                </p>
                            </div>

                            <div className="space-y-1 text-center sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 border-white/5 w-full sm:w-auto">
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 italic">Total Tagihan Final (Invoice)</span>
                                <p className="text-2xl font-black text-white font-mono tracking-tight text-glow-sm">
                                    Rp {invoiceTotal.toLocaleString('id-ID')}
                                </p>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-white/5 bg-slate-900/90 backdrop-blur-xl flex items-center justify-end gap-3 sticky bottom-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-widest italic transition-all disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="verifyInvoiceForm"
                        disabled={loading}
                        className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest italic transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4 stroke-[2.5px]" />
                        )}
                        Simpan &amp; Verifikasi Faktur
                    </button>
                </div>
            </div>
        </div>
    );
}

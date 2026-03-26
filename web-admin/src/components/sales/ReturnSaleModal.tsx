'use client';

import { useState, useEffect } from "react";
import { X, RotateCcw, Package, AlertCircle, CheckCircle, CreditCard, Save } from "lucide-react";
import api from "@/lib/api";
import { format } from "date-fns";

export default function ReturnSaleModal({ isOpen, onClose, saleId, onRefresh }: { 
    isOpen: boolean, 
    onClose: () => void, 
    saleId: number,
    onRefresh: () => void
}) {
    const [sale, setSale] = useState<any>(null);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [returnItems, setReturnItems] = useState<any[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && saleId) {
            fetchData();
        }
    }, [isOpen, saleId]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [saleRes, accountsRes, returnsRes] = await Promise.all([
                api.get(`/sales/${saleId}`),
                api.get("/finance/accounts"),
                api.get(`/sales/${saleId}/returns`)
            ]);

            const saleData = saleRes.data;
            setSale(saleData);
            setAccounts(accountsRes.data);

            // Calculate remaining quantities
            const previousReturns = returnsRes.data || [];
            const itemsWithRemaining = saleData.items.map((item: any) => {
                const totalReturned = previousReturns.reduce((sum: number, ret: any) => {
                    const retItem = ret.items?.find((ri: any) => ri.productId === item.productId);
                    return sum + (retItem ? retItem.quantity : 0);
                }, 0);
                return {
                    ...item,
                    remainingQty: item.quantity - totalReturned,
                    returnQty: 0
                };
            });

            setReturnItems(itemsWithRemaining.filter((i: any) => i.remainingQty > 0));
            
            // Default account
            if (saleData.accountId) {
                setSelectedAccountId(saleData.accountId.toString());
            }
        } catch (err: any) {
            setError("Gagal memuat data transaksi.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleQtyChange = (productId: number, val: string) => {
        const qty = parseFloat(val) || 0;
        setReturnItems(prev => prev.map(item => {
            if (item.productId === productId) {
                const finalQty = Math.min(qty, item.remainingQty);
                return { ...item, returnQty: finalQty };
            }
            return item;
        }));
    };

    const handleSubmit = async () => {
        const itemsToReturn = returnItems.filter(i => i.returnQty > 0);
        if (itemsToReturn.length === 0) {
            setError("Pilih minimal 1 barang untuk diretur.");
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            await api.post(`/sales/${saleId}/return`, {
                items: itemsToReturn.map(i => ({ productId: i.productId, quantity: i.returnQty })),
                accountId: selectedAccountId ? parseInt(selectedAccountId) : null,
                notes,
                date: new Date()
            });
            onRefresh();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || "Gagal memproses retur.");
        } finally {
            setSubmitting(false);
        }
    };

    const calculateTotalRefund = () => {
        return returnItems.reduce((sum, item) => sum + (item.returnQty * item.price), 0);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                
                <div className="bg-orange-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <RotateCcw className="h-5 w-5" />
                        <h2 className="text-lg font-black uppercase tracking-tight">Proses Retur Penjualan</h2>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 flex flex-col gap-6">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center gap-4 animate-pulse">
                            <div className="h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-400 font-bold italic">Menyiapkan data retur...</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-600 font-medium">{error}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoice</p>
                                    <p className="text-sm font-bold text-slate-900">{sale?.invoiceNumber}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                                    <p className="text-sm font-bold text-slate-900">{sale?.customerName || 'General Customer'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                                    <Package className="h-4 w-4 text-orange-500" /> Pilih Barang & Jumlah Retur
                                </h3>
                                
                                <div className="space-y-3">
                                    {returnItems.map((item) => (
                                        <div key={item.productId} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-colors">
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-900 text-sm leading-tight">{item.product_name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                                    Sisa bisa retur: <span className="text-orange-600">{item.remainingQty} {item.product_unit}</span>
                                                </p>
                                            </div>
                                            <div className="w-24 px-3 py-2 bg-white rounded-xl border border-slate-200">
                                                <input 
                                                    type="number"
                                                    value={item.returnQty || ''}
                                                    onChange={(e) => handleQtyChange(item.productId, e.target.value)}
                                                    className="w-full text-center font-black text-slate-900 outline-none placeholder:text-slate-200"
                                                    placeholder="0"
                                                    max={item.remainingQty}
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {returnItems.length === 0 && (
                                        <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                                            <p className="text-slate-400 font-bold italic">Semua barang sudah diretur.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-900 block flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-orange-500" /> Akun Refund (Kembalian Dana)
                                </label>
                                <select 
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    className="w-full p-4 rounded-2xl border border-slate-200 bg-white font-bold text-slate-900 outline-none focus:border-orange-500 transition-all"
                                >
                                    <option value="">Tanpa Refund Dana</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} (Saldo: Rp {acc.balance?.toLocaleString()})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-900 block">Catatan Retur</label>
                                <textarea 
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full p-4 rounded-2xl border border-slate-200 bg-white font-medium text-slate-700 outline-none focus:border-orange-500 transition-all h-24 resize-none"
                                    placeholder="Masukkan alasan retur..."
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Refund</p>
                        <p className="text-lg font-black text-orange-600">Rp {calculateTotalRefund().toLocaleString()}</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            disabled={loading || submitting}
                            onClick={onClose}
                            className="px-6 py-3 rounded-2xl font-bold text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            Batal
                        </button>
                        <button 
                            disabled={loading || submitting || returnItems.length === 0}
                            onClick={handleSubmit}
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 text-white px-8 py-3 rounded-2xl font-black transition-all shadow-lg shadow-orange-100"
                        >
                            {submitting ? (
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Simpan Retur
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

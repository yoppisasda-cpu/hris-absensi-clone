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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
            <div className="glass w-full max-w-2xl rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                
                <div className="bg-slate-950/50 border-b border-orange-500/20 px-10 py-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-lg shadow-orange-500/10">
                            <RotateCcw className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Credit Reclamation Hub</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Commercial Return Protocol</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-10 flex flex-col gap-8 no-scrollbar">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center gap-6 animate-pulse">
                            <div className="h-16 w-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                            <p className="text-slate-500 font-black italic uppercase tracking-widest text-[9px]">Initializing Reconciliation Data...</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="bg-rose-500/5 border border-rose-500/20 p-6 rounded-[2rem] flex items-start gap-4 animate-in fade-in duration-300">
                                    <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-rose-400 font-black uppercase italic tracking-widest">{error}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-8 bg-slate-950/40 p-8 rounded-[2.5rem] border border-white/5 shadow-inner">
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] italic ml-1">Target Invoice</p>
                                    <p className="text-xs font-black text-white italic tracking-widest uppercase">{sale?.invoiceNumber}</p>
                                </div>
                                <div className="space-y-2 text-right">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] italic mr-1">Origin Entity</p>
                                    <p className="text-xs font-black text-white italic tracking-widest uppercase">{sale?.customerName || 'GENERAL_GUEST'}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-3 italic ml-1">
                                    <Package className="h-4 w-4 text-orange-500 stroke-[2.5px]" /> Inventory Restitution Items
                                </h3>
                                
                                <div className="space-y-4">
                                    {returnItems.map((item) => (
                                        <div key={item.productId} className="flex items-center gap-6 p-6 rounded-[2.5rem] border border-slate-900 bg-slate-950/50 hover:bg-slate-900 transition-all group shadow-inner">
                                            <div className="flex-1 space-y-2">
                                                <p className="font-black text-white text-[11px] uppercase tracking-tighter group-hover:text-orange-400 transition-colors">{item.product_name}</p>
                                                <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] italic">
                                                    Available for Return: <span className="text-white">{item.remainingQty} {item.product_unit}</span>
                                                </p>
                                            </div>
                                            <div className="w-28 px-4 py-3 bg-slate-900 rounded-xl border border-white/5 focus-within:border-orange-500/50 transition-all shadow-inner">
                                                <input 
                                                    type="number"
                                                    value={item.returnQty || ''}
                                                    onChange={(e) => handleQtyChange(item.productId, e.target.value)}
                                                    className="w-full bg-transparent text-center font-black text-white outline-none placeholder:text-slate-800 italic uppercase"
                                                    placeholder="0"
                                                    max={item.remainingQty}
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {returnItems.length === 0 && (
                                        <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-[3.5rem] group">
                                            <CheckCircle className="h-12 w-12 text-emerald-500/20 mx-auto mb-4 group-hover:text-emerald-500 group-hover:scale-110 transition-all duration-500" />
                                            <p className="text-slate-700 font-black italic uppercase tracking-[0.3em] text-[10px]">ALL_ITEMS_RESTITUTED // PROTOCOL_COMPLETE</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block flex items-center gap-3 italic ml-1">
                                    <CreditCard className="h-4 w-4 text-orange-500 stroke-[2.5px]" /> Refund Settlement Vault
                                </label>
                                <select 
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-orange-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer"
                                >
                                    <option value="">NO_REFUND_SETTLEMENT</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id} className="bg-slate-900">{acc.name.toUpperCase()} (AVL: Rp {acc.balance?.toLocaleString()})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block italic ml-1">Reclamation Directives / Memo</label>
                                <textarea 
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-[2.5rem] px-8 py-6 text-xs font-black text-white focus:border-orange-500/50 outline-none transition-all h-28 resize-none no-scrollbar uppercase italic tracking-widest placeholder:text-slate-900 shadow-inner"
                                    placeholder="INPUT REASON FOR RECLAMATION..."
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="p-10 bg-slate-950/50 border-t border-white/5 flex items-center justify-between shrink-0">
                    <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] italic mb-1">Total Refund Value</p>
                        <p className="text-2xl font-black text-orange-500 italic tracking-tighter uppercase">Rp {calculateTotalRefund().toLocaleString()}</p>
                    </div>
                    <div className="flex gap-5">
                        <button 
                            disabled={loading || submitting}
                            onClick={onClose}
                            className="px-8 py-4 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.2em] italic transition-all"
                        >
                            Abort
                        </button>
                        <button 
                            disabled={loading || submitting || returnItems.length === 0}
                            onClick={handleSubmit}
                            className="flex items-center gap-3 bg-orange-600 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-orange-900/20 hover:bg-orange-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed italic border border-white/10"
                        >
                            {submitting ? (
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <><Save className="h-4 w-4 stroke-[3px]" /> COMMIT_RECALAMATION</>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

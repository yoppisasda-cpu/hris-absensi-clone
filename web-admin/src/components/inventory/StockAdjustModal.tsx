'use client';

import { useState, useEffect } from "react";
import { X, Box, ArrowRight, Info, History, Wallet, CreditCard, Truck, MapPin } from "lucide-react";
import api from "@/lib/api";

export default function StockAdjustModal({ product, isOpen, onClose, onSuccess }: any) {
    const [formData, setFormData] = useState({
        productId: product?.id,
        type: "IN", // 'IN', 'OUT', 'ADJUST'
        quantity: 0,
        reference: "Penyesuaian stok manual",
        recordExpense: false,
        accountId: "",
        expenseType: "COGS", // Default to Bahan Baku
        supplierId: "",
        warehouseId: ""
    });
    const [accounts, setAccounts] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchAccounts();
            fetchSuppliers();
            fetchWarehouses();
        }
    }, [isOpen]);

    const fetchWarehouses = async () => {
        try {
            const res = await api.get('/inventory/warehouses');
            setWarehouses(res.data);
            if (res.data.length > 0) {
                const main = res.data.find((w: any) => w.isMain) || res.data[0];
                setFormData(prev => ({ ...prev, warehouseId: main.id.toString() }));
            }
        } catch (error) {
            console.error("Gagal mengambil gudang", error);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('/suppliers');
            setSuppliers(res.data);
        } catch (error) {
            console.error("Gagal mengambil supplier", error);
        }
    };

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/finance/accounts');
            setAccounts(res.data);
            if (res.data.length > 0) {
                setFormData(prev => ({ ...prev, accountId: res.data[0].id.toString() }));
            }
        } catch (error) {
            console.error("Gagal mengambil akun", error);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/inventory/adjust', { ...formData, productId: product.id });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Gagal update stok", error);
            alert("Gagal update stok.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" />
            <div className="glass w-full max-w-lg rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-slate-950/50 border-b border-amber-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
                            <History className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Protokol Sinkronisasi Stok (Opname)</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic truncate max-w-[200px]">{product?.name?.toUpperCase()}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
                    {/* STATUS MODULE */}
                    <div className="p-8 bg-slate-950 border border-white/5 rounded-[2.5rem] flex items-center justify-between shadow-inner relative overflow-hidden group">
                        <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-indigo-500/10 transition-colors"></div>
                        <div className="text-center flex-1 border-r border-white/5 relative z-10">
                            <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-2 italic">Stok_Saat_Ini</p>
                            <p className="text-2xl font-black text-white italic tracking-tighter uppercase">{product?.stock} <span className="text-[10px] text-slate-800 not-italic ml-1">U</span></p>
                        </div>
                        <div className="px-5 text-indigo-500/20 font-black italic relative z-10 animate-pulse">➤</div>
                        <div className="text-center flex-1 relative z-10">
                            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-2 italic">Estimasi_Akhir</p>
                            <p className="text-2xl font-black text-indigo-500 italic tracking-tighter">
                                {formData.type === 'IN' ? (product?.stock || 0) + (formData.quantity || 0) :
                                 formData.type === 'OUT' ? (product?.stock || 0) - (formData.quantity || 0) :
                                 (formData.quantity || 0)}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Adjustment Vector</label>
                        <div className="grid grid-cols-3 gap-3 p-1.5 bg-slate-950 border border-white/5 rounded-[22px] shadow-inner">
                            {['IN', 'OUT', 'ADJUST'].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: t })}
                                    className={`py-3 text-[9px] font-black rounded-xl transition-all uppercase tracking-widest italic ${
                                        formData.type === t 
                                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/20 shadow-lg' 
                                        : 'text-slate-600 hover:text-white'
                                    }`}
                                >
                                    {t === 'IN' ? 'MASUK' : t === 'OUT' ? 'KELUAR' : 'OPNAME (TOTAL)'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Jumlah Perubahan</label>
                            <div className="relative">
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-4 px-6 text-xs font-black text-white focus:border-amber-500/50 outline-none transition-all shadow-inner italic uppercase tracking-widest"
                                    value={formData.quantity || ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, quantity: val === "" ? 0 : parseFloat(val) });
                                    }}
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-700 italic uppercase">
                                    {product?.unit || 'UNT'}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Target Lokasi</label>
                            <select
                                required
                                className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-4 px-6 text-[10px] font-black text-white focus:border-amber-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer"
                                value={formData.warehouseId}
                                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                            >
                                <option value="" disabled>-- SELECT STORAGE --</option>
                                {warehouses.map((w) => (
                                    <option key={w.id} value={w.id} className="bg-slate-900">{w.name.toUpperCase()} {w.isMain ? '(MAIN)' : ''}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {formData.type === 'IN' && (
                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Sumber (Supplier)</label>
                                <select
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-4 px-6 text-[10px] font-black text-white focus:border-amber-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer"
                                    value={formData.supplierId}
                                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                                >
                                    <option value="">-- GENERAL / NO VENDOR --</option>
                                    {suppliers.map((s) => (
                                        <option key={s.id} value={s.id} className="bg-slate-900">{s.name.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>

                            {formData.quantity > 0 && (
                                <div className="bg-amber-500/5 border border-amber-500/10 rounded-[2.5rem] p-8 space-y-6 animate-in zoom-in-95 duration-500 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 h-40 w-40 bg-amber-500/5 blur-3xl -mr-20 -mt-20 rounded-full group-hover:bg-amber-500/10 transition-colors"></div>
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
                                                <Wallet className="h-5 w-5 stroke-[2.5px]" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-white uppercase italic tracking-widest leading-none">Integrasi Biaya Finance</p>
                                                <p className="text-[9px] text-amber-500/60 font-black uppercase mt-2 italic tracking-[0.1em]">EST_VALUATION: Rp {(formData.quantity * product?.costPrice).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className="relative">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer" 
                                                    checked={formData.recordExpense}
                                                    onChange={(e) => setFormData({ ...formData, recordExpense: e.target.checked })}
                                                />
                                                <div className="w-12 h-6 bg-slate-950 border border-white/5 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600 after:shadow-lg"></div>
                                            </div>
                                        </label>
                                    </div>

                                    {formData.recordExpense && (
                                        <div className="space-y-6 pt-6 border-t border-white/5 animate-in slide-in-from-top-2 duration-500 relative z-10">
                                            <div className="space-y-3">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic ml-1">Payload Classification</p>
                                                <div className="flex p-1 bg-slate-950 border border-white/5 rounded-2xl shadow-inner">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, expenseType: 'COGS' })}
                                                        className={`flex-1 py-3 text-[9px] font-black rounded-xl transition-all italic tracking-widest uppercase ${
                                                            formData.expenseType === 'COGS'
                                                            ? 'bg-amber-600/20 text-amber-400 border border-amber-500/20 shadow-lg'
                                                            : 'text-slate-600 hover:text-white'
                                                        }`}
                                                    >
                                                        HPP / COGS
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, expenseType: 'OPERATIONAL' })}
                                                        className={`flex-1 py-3 text-[9px] font-black rounded-xl transition-all italic tracking-widest uppercase ${
                                                            formData.expenseType === 'OPERATIONAL'
                                                            ? 'bg-amber-600/20 text-amber-400 border border-amber-500/20 shadow-lg'
                                                            : 'text-slate-600 hover:text-white'
                                                        }`}
                                                    >
                                                        OPERATIONAL
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic ml-1">Source Account</p>
                                                <select 
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-[10px] font-black text-white outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer"
                                                    value={formData.accountId}
                                                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                                                >
                                                    {accounts.map((acc) => (
                                                        <option key={acc.id} value={acc.id} className="bg-slate-900">{acc.name.toUpperCase()} (AVL: Rp {acc.balance.toLocaleString()})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Referensi / Catatan</label>
                        <textarea
                            className="w-full rounded-[2rem] bg-slate-950 border border-slate-800 py-6 px-8 text-xs font-black text-white focus:border-amber-500/50 outline-none transition-all shadow-inner italic placeholder:text-slate-900 min-h-[120px] no-scrollbar uppercase tracking-[0.1em] resize-none"
                            placeholder="INPUT_SYNC_ANCHORS..."
                            value={formData.reference}
                            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl bg-white/5 border border-white/5 py-5 text-[10px] font-black text-slate-500 hover:text-white hover:bg-white/10 transition-all uppercase tracking-[0.3em] italic"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] rounded-2xl bg-amber-600 py-5 text-[10px] font-black text-white shadow-2xl shadow-amber-900/40 hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.3em] italic border border-white/10"
                        >
                            {loading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><History className="h-4 w-4 stroke-[3px]" /> Laksanakan Sinkronisasi Stok</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

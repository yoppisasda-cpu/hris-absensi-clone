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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/95 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-slate-900 rounded-[40px] shadow-[0_0_100px_rgba(79,70,229,0.1)] overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-700/50 flex flex-col">
                <div className="bg-slate-950/50 border-b border-white/5 px-8 py-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
                            <History className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Dataset Stock Sync</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic truncate max-w-[200px]">{product?.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto flex-grow custom-scrollbar bg-slate-950/20">
                    <div className="space-y-6">
                        <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-[32px] flex items-center justify-between shadow-inner">
                            <div className="text-center flex-1 border-r border-white/5">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2 italic">Current</p>
                                <p className="text-2xl font-black text-white italic tracking-tighter">{product?.stock} <span className="text-[10px] text-slate-700 not-italic ml-1">UNITS</span></p>
                            </div>
                            <div className="px-5 text-indigo-500/30 font-black italic">➤</div>
                            <div className="text-center flex-1">
                                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-2 italic">Projected</p>
                                <p className="text-2xl font-black text-indigo-500 italic tracking-tighter text-glow-sm">
                                    {formData.type === 'IN' ? (product?.stock || 0) + (formData.quantity || 0) :
                                     formData.type === 'OUT' ? (product?.stock || 0) - (formData.quantity || 0) :
                                     (formData.quantity || 0)}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Lifecycle Correction Mode</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['IN', 'OUT', 'ADJUST'].map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: t })}
                                        className={`py-3 text-[10px] font-black rounded-2xl border transition-all uppercase tracking-widest italic ${
                                            formData.type === t 
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-500/20' 
                                            : 'bg-slate-900 border-white/5 text-slate-500 hover:border-slate-700 hover:text-white'
                                        }`}
                                    >
                                        {t === 'IN' ? 'STOK MASUK' : t === 'OUT' ? 'STOK KELUAR' : 'SET ULANG'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">
                                Effective Quantity ({product?.unit})
                            </label>
                            <input
                                required
                                type="number"
                                className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-5 text-sm font-black text-white focus:border-indigo-500/50 outline-none transition-all shadow-inner text-glow-sm tracking-widest font-mono"
                                value={formData.quantity || ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData({ ...formData, quantity: val === "" ? 0 : parseFloat(val) });
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Facility Destination</label>
                            <div className="relative group">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors pointer-events-none z-10" />
                                <select
                                    required
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 pl-12 pr-4 text-[10px] font-black text-slate-400 group-focus-within:text-white outline-none transition-all italic tracking-widest uppercase appearance-none"
                                    value={formData.warehouseId}
                                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                                >
                                    <option value="">SELECT WAREHOUSE...</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id}>{w.name.toUpperCase()} {w.isMain ? '(MAIN FACILITY)' : ''}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 text-[8px] pointer-events-none">▼</div>
                            </div>
                        </div>

                        {formData.type === 'IN' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">
                                    Origin Supplier (Vendor)
                                </label>
                                <div className="relative group">
                                    <Truck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors pointer-events-none z-10" />
                                    <select
                                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 pl-12 pr-4 text-[10px] font-black text-slate-400 group-focus-within:text-white outline-none transition-all italic tracking-widest uppercase appearance-none"
                                        value={formData.supplierId}
                                        onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                                    >
                                        <option value="">SELECT VENDOR (OPTIONAL)</option>
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name.toUpperCase()} – {s.category?.toUpperCase() || 'GENERAL'}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 text-[8px] pointer-events-none">▼</div>
                                </div>
                            </div>
                        )}

                        {/* FINANCE SYNC SECTION (ONLY FOR IN) */}
                        {formData.type === 'IN' && formData.quantity > 0 && (
                            <div className="bg-indigo-500/5 border border-white/5 rounded-[32px] p-6 space-y-5 animate-in slide-in-from-top-4 duration-300 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Wallet className="h-16 w-16 text-indigo-400" />
                                </div>
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                            <Wallet className="h-4 w-4 stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-white uppercase italic tracking-widest leading-none">Finance Sync</p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">HPP: Rp {(formData.quantity * product?.costPrice).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={formData.recordExpense}
                                                onChange={(e) => setFormData({ ...formData, recordExpense: e.target.checked })}
                                            />
                                            <div className="w-10 h-5 bg-slate-800 border border-white/5 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 after:shadow-lg"></div>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${formData.recordExpense ? 'text-indigo-400' : 'text-slate-600'}`}>RECORD</span>
                                    </label>
                                </div>

                                {formData.recordExpense && (
                                    <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in duration-300 relative z-10">
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] italic ml-1">Expense Protocol</p>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, expenseType: 'COGS' })}
                                                    className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all italic tracking-widest uppercase ${
                                                        formData.expenseType === 'COGS'
                                                        ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                                                        : 'bg-slate-900 border-white/5 text-slate-500 hover:text-white'
                                                    }`}
                                                >
                                                    DIRECT COGS
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, expenseType: 'OPERATIONAL' })}
                                                    className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all italic tracking-widest uppercase ${
                                                        formData.expenseType === 'OPERATIONAL'
                                                        ? 'bg-slate-800 border-slate-700 text-white shadow-lg'
                                                        : 'bg-slate-900 border-white/5 text-slate-500 hover:text-white'
                                                    }`}
                                                >
                                                    OPERATIONAL
                                                </button>
                                            </div>
                                        </div>
                                        <div className="relative group">
                                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600 group-focus-within:text-amber-400 transition-colors pointer-events-none z-10" />
                                            <select 
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-8 pr-4 text-[9px] font-black text-slate-400 hover:text-white focus:outline-none transition-all italic tracking-widest uppercase appearance-none"
                                                value={formData.accountId}
                                                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                                            >
                                                {accounts.map((acc) => (
                                                    <option key={acc.id} value={acc.id}>{acc.name.toUpperCase()} (IDR {acc.balance.toLocaleString()})</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 text-[6px] pointer-events-none">▼</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Internal Reference Log</label>
                            <input
                                type="text"
                                className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-5 text-sm font-black text-white focus:border-indigo-500/50 outline-none transition-all shadow-inner italic placeholder:text-slate-800"
                                placeholder="..."
                                value={formData.reference}
                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mt-10 flex gap-4 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 text-[10px] font-black text-slate-500 bg-white/5 border border-white/5 hover:text-white hover:bg-white/10 rounded-2xl transition-all uppercase tracking-[0.2em] italic"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-4 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl disabled:opacity-50 transition-all shadow-2xl shadow-indigo-500/20 uppercase tracking-[0.2em] border border-white/10 italic"
                        >
                            {loading ? "COMMITTING DATA..." : "COMMIT STOCK SYNC"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

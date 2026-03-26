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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white border-b border-orange-500/30">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                            <History className="h-6 w-6 text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic tracking-tight uppercase">Update Stok</h2>
                            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase truncate max-w-[180px]">{product?.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                            <div className="text-center flex-1 border-r border-slate-200">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Stok Saat Ini</p>
                                <p className="text-2xl font-black text-slate-900 italic">{product?.stock}</p>
                            </div>
                            <div className="px-4 text-slate-300"><ArrowRight className="h-6 w-6" /></div>
                            <div className="text-center flex-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Stok Setelah Update</p>
                                <p className="text-2xl font-black text-orange-600 italic">
                                    {formData.type === 'IN' ? (product?.stock || 0) + (formData.quantity || 0) :
                                     formData.type === 'OUT' ? (product?.stock || 0) - (formData.quantity || 0) :
                                     (formData.quantity || 0)}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Jenis Koreksi</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['IN', 'OUT', 'ADJUST'].map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: t })}
                                        className={`py-2 text-[11px] font-black rounded-xl border transition-all ${
                                            formData.type === t 
                                            ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-100' 
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        {t === 'IN' ? 'STOK MASUK' : t === 'OUT' ? 'STOK KELUAR' : 'SET ULANG'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">
                                Jumlah (Unit)
                            </label>
                            <input
                                required
                                type="number"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold focus:border-orange-500 focus:bg-white focus:outline-none transition-all"
                                value={formData.quantity || ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData({ ...formData, quantity: val === "" ? 0 : parseFloat(val) });
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Gudang Sumber/Tujuan</label>
                            <div className="relative">
                                <select
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-bold focus:border-orange-500 focus:bg-white focus:outline-none transition-all appearance-none cursor-pointer"
                                    value={formData.warehouseId}
                                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                                >
                                    <option value="">Pilih Gudang...</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id}>{w.name} {w.isMain ? '(Utama)' : ''}</option>
                                    ))}
                                </select>
                                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            </div>
                        </div>

                        {formData.type === 'IN' && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">
                                    Supplier / Pemasok
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-bold focus:border-amber-500 focus:bg-white focus:outline-none transition-all appearance-none"
                                        value={formData.supplierId}
                                        onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                                    >
                                        <option value="">Pilih Supplier (Opsional)</option>
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.category || 'General'})</option>
                                        ))}
                                    </select>
                                    <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                </div>
                            </div>
                        )}

                        {/* FINANCE SYNC SECTION (ONLY FOR IN) */}
                        {formData.type === 'IN' && formData.quantity > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-4 duration-300">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 h-9 w-9 rounded-lg bg-orange-200 flex items-center justify-center shrink-0">
                                        <Wallet className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black text-slate-900 uppercase italic">Catat Pengeluaran</p>
                                            <label className="relative inline-flex items-center cursor-pointer scale-75">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer" 
                                                    checked={formData.recordExpense}
                                                    onChange={(e) => setFormData({ ...formData, recordExpense: e.target.checked })}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                            </label>
                                        </div>
                                        <p className="text-[9px] text-slate-500 font-medium leading-tight mt-1">
                                            Total: <span className="font-black text-orange-600 italic">Rp {(formData.quantity * product?.costPrice).toLocaleString()}</span>
                                        </p>
                                    </div>
                                </div>

                                {formData.recordExpense && (
                                    <div className="space-y-3 pt-2 border-t border-orange-200 animate-in fade-in duration-300">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipe Pengeluaran</p>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, expenseType: 'COGS' })}
                                                    className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg border transition-all ${
                                                        formData.expenseType === 'COGS'
                                                        ? 'bg-orange-600 border-orange-600 text-white'
                                                        : 'bg-white border-orange-200 text-orange-600 hover:bg-orange-100'
                                                    }`}
                                                >
                                                    Bahan Baku (HPP)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, expenseType: 'OPERATIONAL' })}
                                                    className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg border transition-all ${
                                                        formData.expenseType === 'OPERATIONAL'
                                                        ? 'bg-slate-900 border-slate-900 text-white'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    Operasional
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="h-3.5 w-3.5 text-orange-400" />
                                            <select 
                                                className="flex-1 bg-white border border-orange-200 rounded-lg py-1 px-2 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                                value={formData.accountId}
                                                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                                            >
                                                {accounts.map((acc) => (
                                                    <option key={acc.id} value={acc.id}>{acc.name} (Rp {acc.balance.toLocaleString()})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Catatan / Referensi</label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold focus:border-orange-500 focus:bg-white focus:outline-none transition-all"
                                placeholder="..."
                                value={formData.reference}
                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mt-10 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all font-mono"
                        >
                            CLOSE
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] rounded-xl bg-orange-600 py-3.5 text-sm font-bold text-white shadow-xl shadow-orange-100 hover:bg-orange-700 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? "MENYIMPAN..." : "UPDATE DATABASE"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

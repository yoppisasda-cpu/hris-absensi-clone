'use client';

import { useState, useEffect } from "react";
import { X, Box, ArrowRight, ChefHat, Info, History, MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function ProductionModal({ product, isOpen, onClose, onSuccess }: any) {
    const [formData, setFormData] = useState({
        productId: product?.id,
        quantity: product?.recipeYield && product?.recipeYield > 0 ? product.recipeYield : 1,
        warehouseId: "",
        notes: "Produksi manual"
    });
    const [recipe, setRecipe] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingRecipe, setFetchingRecipe] = useState(false);

    useEffect(() => {
        if (isOpen && product?.id) {
            fetchWarehouses();
            setFormData(prev => ({
                ...prev,
                productId: product.id,
                quantity: product.recipeYield && product.recipeYield > 0 ? product.recipeYield : 1,
                notes: "Produksi manual"
            }));
        }
    }, [isOpen, product]);

    useEffect(() => {
        if (isOpen && product?.id && formData.warehouseId) {
            fetchRecipe(formData.warehouseId);
        }
    }, [formData.warehouseId, isOpen]);

    const fetchRecipe = async (wId?: string) => {
        setFetchingRecipe(true);
        try {
            const res = await api.get(`/inventory/products/${product.id}/recipe${wId ? `?warehouseId=${wId}` : ''}`);
            setRecipe(res.data);
        } catch (error) {
            console.error("Gagal mengambil resep", error);
        } finally {
            setFetchingRecipe(false);
        }
    };

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

    if (!isOpen) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/inventory/produce', { 
                ...formData, 
                productId: product.id 
            });
            toast.success(`Berhasil mencatatkan produksi ${formData.quantity} ${product.unit}`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Gagal catat produksi", error);
            toast.error(error.response?.data?.error || "Gagal memproses produksi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
            <div className="glass w-full max-w-lg rounded-[3rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
                <div className="bg-slate-950/50 border-b border-indigo-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <ChefHat className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Proses Produksi</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic truncate max-w-[200px]">{product?.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto flex-grow custom-scrollbar bg-slate-950/20">
                    <div className="space-y-6">
                        <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-[32px] flex items-center justify-between shadow-inner">
                            <div className="text-center flex-1 border-r border-white/5">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2 italic">Total Hasil</p>
                                <p className="text-2xl font-black text-white italic tracking-tighter">{formData.quantity} <span className="text-[10px] text-slate-700 not-italic ml-1">SATUAN</span></p>
                            </div>
                            <div className="px-5 text-indigo-500/30 font-black italic">➤</div>
                            <div className="text-center flex-1">
                                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-2 italic">Stok Akhir</p>
                                <p className="text-2xl font-black text-indigo-500 italic tracking-tighter text-glow-sm">
                                    {(product?.stock || 0) + (formData.quantity || 0)}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">
                                Total Hasil Produksi
                            </label>
                            <div className="flex gap-4">
                                <input
                                    required
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    className="flex-1 rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-6 text-sm font-black text-white focus:border-indigo-500/50 outline-none transition-all shadow-inner text-glow-sm tracking-widest font-mono"
                                    value={formData.quantity || ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, quantity: val === "" ? 0 : parseFloat(val) });
                                    }}
                                />
                                <div className="flex items-center px-6 bg-slate-800/50 border border-white/5 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                                    {product?.unit}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Lokasi Produksi (Gudang/Dapur)</label>
                            <div className="relative group">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors pointer-events-none z-10" />
                                <select
                                    required
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 pl-12 pr-4 text-[10px] font-black text-slate-400 group-focus-within:text-white outline-none transition-all italic tracking-widest uppercase appearance-none"
                                    value={formData.warehouseId}
                                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                                >
                                    <option value="">PILIH LOKASI...</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id}>{w.name.toUpperCase()} {w.isMain ? '(CORE)' : ''}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 text-[8px] pointer-events-none">▼</div>
                            </div>
                            <p className="mt-2 text-[9px] text-slate-600 font-bold italic leading-tight uppercase tracking-widest">
                                * STOK BAHAN BAKU AKAN DIPOTONG DARI LOKASI INI
                            </p>
                        </div>

                        {/* RECIPE PREVIEW SECTION */}
                        <div className="rounded-[32px] border border-white/5 overflow-hidden bg-slate-950/30">
                            <div className="bg-slate-900/50 px-6 py-4 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                        <ChefHat className="h-3.5 w-3.5 stroke-[2.5px]" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Daftar Bahan Baku (Resep)</span>
                                </div>
                                {fetchingRecipe && (
                                    <div className="h-3 w-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
                                )}
                            </div>
                            <div className="p-6 space-y-4">
                                {recipe.length > 0 ? (
                                    recipe.map((item: any) => {
                                        const yieldDivisor = product.recipeYield && product.recipeYield > 0 ? product.recipeYield : 1;
                                        const required = (parseFloat(item.quantity) / yieldDivisor) * formData.quantity;
                                        const isInsufficient = item.availableStock < required;
                                        
                                        return (
                                            <div key={item.materialId} className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-1.5 w-1.5 rounded-full ${isInsufficient ? 'bg-red-500 animate-ping' : 'bg-slate-700'}`}></div>
                                                    <div>
                                                        <p className={`text-[11px] font-black uppercase tracking-tighter italic ${isInsufficient ? 'text-red-400' : 'text-slate-400'}`}>
                                                            {item.material_name}
                                                        </p>
                                                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">
                                                            Kebutuhan: <span className="text-white italic">{required.toLocaleString()} {item.material_unit}</span>
                                                            {formData.warehouseId && (
                                                                <>
                                                                    <span className={`ml-2 px-1.5 py-0.5 rounded bg-white/5 ${isInsufficient ? 'text-red-500 font-black' : 'text-slate-500'}`}>
                                                                        (Lokasi: {item.availableStock?.toLocaleString()})
                                                                    </span>
                                                                    <span className="ml-1 text-[8px] text-slate-700">
                                                                        / Total: {item.globalStock?.toLocaleString()}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </p>
                                                        {isInsufficient && item.globalStock >= required && (
                                                            <p className="text-[7px] text-amber-500 font-bold italic mt-1 uppercase tracking-wider leading-none">
                                                                ⚠ Stok tersedia di lokasi lain. Mohon lakukan mutasi stok!
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right flex items-center gap-3">
                                                    {isInsufficient && <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />}
                                                    <span className={`text-[10px] font-black px-3 py-1 rounded-xl italic tracking-widest text-glow-sm border ${isInsufficient ? 'bg-red-500/20 border-red-500/30 text-red-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                                                        -{required.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center py-6 text-slate-700 italic text-center">
                                        <AlertTriangle className="h-8 w-8 mb-2 opacity-10" />
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em]">Resep Belum Diatur</p>
                                        <p className="text-[8px] font-bold uppercase mt-1">BELUM ADA DATA RESEP UNTUK PRODUK INI.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Catatan Produksi</label>
                            <input
                                type="text"
                                className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-6 text-sm font-black text-white focus:border-indigo-500/50 outline-none transition-all shadow-inner italic placeholder:text-slate-800"
                                placeholder="..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mt-10 flex gap-4 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 text-[10px] font-black text-slate-500 bg-white/5 border border-white/5 hover:text-white hover:bg-white/10 rounded-2xl transition-all uppercase tracking-[0.2em] italic"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading || recipe.length === 0 || recipe.some(item => {
                                const yieldDivisor = product.recipeYield && product.recipeYield > 0 ? product.recipeYield : 1;
                                const required = (parseFloat(item.quantity) / yieldDivisor) * formData.quantity;
                                return item.availableStock < required;
                            })}
                            className="flex-[2] flex items-center justify-center gap-3 py-4 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl disabled:opacity-50 transition-all shadow-2xl shadow-indigo-500/20 uppercase tracking-[0.2em] border border-white/10 italic"
                        >
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><CheckCircle2 className="h-4 w-4 stroke-[3px]" /> MULAI PROSES PRODUKSI</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

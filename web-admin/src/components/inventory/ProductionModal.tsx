'use client';

import { useState, useEffect } from "react";
import { X, Box, ArrowRight, ChefHat, Info, History, MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function ProductionModal({ product, isOpen, onClose, onSuccess }: any) {
    const [formData, setFormData] = useState({
        productId: product?.id,
        quantity: 1,
        warehouseId: "",
        notes: "Produksi manual"
    });
    const [recipe, setRecipe] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingRecipe, setFetchingRecipe] = useState(false);

    useEffect(() => {
        if (isOpen && product?.id) {
            fetchRecipe();
            fetchWarehouses();
        }
    }, [isOpen, product]);

    const fetchRecipe = async () => {
        setFetchingRecipe(true);
        try {
            const res = await api.get(`/inventory/products/${product.id}/recipe`);
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
            await api.post('/api/inventory/produce', { 
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/95 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-slate-900 rounded-[40px] shadow-[0_0_100px_rgba(79,70,229,0.1)] overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-700/50 flex flex-col">
                <div className="bg-slate-950/50 border-b border-white/5 px-8 py-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <ChefHat className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Dataset Production</h3>
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
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2 italic">Target Output</p>
                                <p className="text-2xl font-black text-white italic tracking-tighter">{formData.quantity} <span className="text-[10px] text-slate-700 not-italic ml-1">UNITS</span></p>
                            </div>
                            <div className="px-5 text-indigo-500/30 font-black italic">➤</div>
                            <div className="text-center flex-1">
                                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-2 italic">Net Lifecycle</p>
                                <p className="text-2xl font-black text-indigo-500 italic tracking-tighter text-glow-sm">
                                    {(product?.stock || 0) + (formData.quantity || 0)}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">
                                Manufacturing Yield (Batch Size)
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
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Operational Facility (Factory)</label>
                            <div className="relative group">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors pointer-events-none z-10" />
                                <select
                                    required
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 pl-12 pr-4 text-[10px] font-black text-slate-400 group-focus-within:text-white outline-none transition-all italic tracking-widest uppercase appearance-none"
                                    value={formData.warehouseId}
                                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                                >
                                    <option value="">SELECT FACILITY...</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id}>{w.name.toUpperCase()} {w.isMain ? '(CORE)' : ''}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 text-[8px] pointer-events-none">▼</div>
                            </div>
                            <p className="mt-2 text-[9px] text-slate-600 font-bold italic leading-tight uppercase tracking-widest">
                                * RAW MATERIALS WILL BE DEPLETED FROM THIS FACILITY INVENTORY
                            </p>
                        </div>

                        {/* RECIPE PREVIEW SECTION */}
                        <div className="rounded-[32px] border border-white/5 overflow-hidden bg-slate-950/30">
                            <div className="bg-slate-900/50 px-6 py-4 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                        <ChefHat className="h-3.5 w-3.5 stroke-[2.5px]" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Bill of Materials (BOM)</span>
                                </div>
                                {fetchingRecipe && (
                                    <div className="h-3 w-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
                                )}
                            </div>
                            <div className="p-6 space-y-4">
                                {recipe.length > 0 ? (
                                    recipe.map((item: any) => {
                                        const required = parseFloat(item.quantity) * formData.quantity;
                                        return (
                                            <div key={item.materialId} className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-700 animate-pulse"></div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter italic">{item.material_name}</p>
                                                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">
                                                            Requirement: <span className="text-white italic">{required.toLocaleString()} {item.material_unit}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl italic tracking-widest text-glow-sm">
                                                        -{required.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center py-6 text-slate-700 italic text-center">
                                        <AlertTriangle className="h-8 w-8 mb-2 opacity-10" />
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em]">Decomposition Matrix Empty</p>
                                        <p className="text-[8px] font-bold uppercase mt-1">NO RECIPE DATA DETECTED FOR THIS SKU.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Process Analytics / Logistics Notes</label>
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
                            Abortion
                        </button>
                        <button
                            type="submit"
                            disabled={loading || recipe.length === 0}
                            className="flex-[2] flex items-center justify-center gap-3 py-4 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl disabled:opacity-50 transition-all shadow-2xl shadow-indigo-500/20 uppercase tracking-[0.2em] border border-white/10 italic"
                        >
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><CheckCircle2 className="h-4 w-4 stroke-[3px]" /> EXECUTE PRODUCTION ENGINE</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

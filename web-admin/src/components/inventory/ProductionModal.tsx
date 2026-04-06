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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white border-b border-orange-500/30">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                            <ChefHat className="h-6 w-6 text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic tracking-tight uppercase">Catat Produksi</h2>
                            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase truncate max-w-[220px]">{product?.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-6">
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-between">
                            <div className="text-center flex-1 border-r border-orange-200">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Target Produksi</p>
                                <p className="text-2xl font-black text-slate-900 italic">{formData.quantity} {product?.unit}</p>
                            </div>
                            <div className="px-4 text-orange-300"><ArrowRight className="h-6 w-6" /></div>
                            <div className="text-center flex-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Stok Setelahnya</p>
                                <p className="text-2xl font-black text-orange-600 italic">
                                    {(product?.stock || 0) + (formData.quantity || 0)}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">
                                Jumlah yang Diproduksi
                            </label>
                            <div className="flex gap-2">
                                <input
                                    required
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold focus:border-orange-500 focus:bg-white focus:outline-none transition-all"
                                    value={formData.quantity || ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, quantity: val === "" ? 0 : parseFloat(val) });
                                    }}
                                />
                                <div className="flex items-center px-4 bg-slate-100 rounded-xl text-xs font-black text-slate-500">
                                    {product?.unit}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Lokasi Produksi (Gudang)</label>
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
                            <p className="mt-1.5 text-[9px] text-slate-400 font-bold italic leading-tight">
                                * Bahan baku akan dikurangi dari gudang ini, dan hasil jadi akan ditambahkan ke gudang ini.
                            </p>
                        </div>

                        {/* RECIPE PREVIEW SECTION */}
                        <div className="rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ChefHat className="h-4 w-4 text-slate-400" />
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Kebutuhan Bahan Baku (BOM)</span>
                                </div>
                                {fetchingRecipe && (
                                    <div className="h-3 w-3 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
                                )}
                            </div>
                            <div className="p-4 space-y-3 bg-white">
                                {recipe.length > 0 ? (
                                    recipe.map((item: any) => {
                                        const required = parseFloat(item.quantity) * formData.quantity;
                                        return (
                                            <div key={item.materialId} className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700">{item.material_name}</p>
                                                    <p className="text-[9px] text-slate-400 font-medium italic">
                                                        Kebutuhan: <span className="font-black text-slate-600">{required.toLocaleString()} {item.material_unit}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    {/* In a real app we might show live stock per warehouse here */}
                                                    <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                                                        -{required.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center py-4 text-slate-300 italic">
                                        <AlertTriangle className="h-6 w-6 mb-1 opacity-20" />
                                        <p className="text-[10px] font-bold">Produk ini belum memiliki resep.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Keterangan Produksi</label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold focus:border-orange-500 focus:bg-white focus:outline-none transition-all"
                                placeholder="Misal: Batch Pagi, Shift 1..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mt-10 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all font-mono"
                        >
                            BATAL
                        </button>
                        <button
                            type="submit"
                            disabled={loading || recipe.length === 0}
                            className="flex-[2] rounded-xl bg-orange-600 py-3.5 text-sm font-bold text-white shadow-xl shadow-orange-100 hover:bg-orange-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    MEMPROSES...
                                </>
                            ) : (
                                "KONFIRMASI PRODUKSI"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

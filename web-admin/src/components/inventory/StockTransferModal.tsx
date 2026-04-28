'use client';

import { useState, useEffect } from "react";
import { X, ArrowRight, Package, MapPin, Truck, AlertTriangle, Send } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function StockTransferModal({ product, isOpen, onClose, onSuccess }: any) {
    const [formData, setFormData] = useState({
        productId: product?.id || "",
        fromWarehouseId: "",
        toWarehouseId: "",
        quantity: 0,
        notes: ""
    });

    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [sourceStock, setSourceStock] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchWarehouses();
            if (!product) fetchProducts();
            else setFormData(prev => ({ ...prev, productId: product.id }));
        }
    }, [isOpen, product]);

    useEffect(() => {
        if (formData.productId && formData.fromWarehouseId) {
            fetchSourceStock();
        }
    }, [formData.productId, formData.fromWarehouseId]);

    const fetchWarehouses = async () => {
        try {
            const res = await api.get('/inventory/warehouses');
            setWarehouses(res.data);
            if (res.data.length > 0) {
                // Default from to Main if available
                const main = res.data.find((w: any) => w.isMain) || res.data[0];
                setFormData(prev => ({ ...prev, fromWarehouseId: main.id.toString() }));
            }
        } catch (error) {
            console.error("Gagal mengambil data gudang", error);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await api.get('/inventory/products');
            setProducts(res.data);
        } catch (error) {
            console.error("Gagal mengambil data produk", error);
        }
    };

    const fetchSourceStock = async () => {
        const currentProduct = product || products.find(p => p.id.toString() === formData.productId.toString());
        if (!currentProduct) {
            setSourceStock(0);
            return;
        }

        // Find the stock for this product in the selected fromWarehouse
        const ws = currentProduct.WarehouseStock?.find(
            (ws: any) => ws.warehouseId.toString() === formData.fromWarehouseId.toString()
        );
        
        setSourceStock(ws ? ws.quantity : 0);
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        
        if (!formData.productId) return toast.error("Pilih produk terlebih dahulu.");
        if (!formData.fromWarehouseId || !formData.toWarehouseId) return toast.error("Pilih gudang asal dan tujuan.");
        if (formData.fromWarehouseId === formData.toWarehouseId) return toast.error("Gudang asal dan tujuan tidak boleh sama.");
        if (formData.quantity <= 0) return toast.error("Jumlah harus lebih dari 0.");
        if (formData.quantity > sourceStock) return toast.error("Stok di gudang asal tidak mencukupi.");

        setLoading(true);
        try {
            await api.post('/inventory/transfer', formData);
            toast.success("Mutasi stok berhasil diselesaikan.");
            onSuccess();
            onClose();
            // Reset quantity
            setFormData(prev => ({ ...prev, quantity: 0, notes: "" }));
        } catch (error: any) {
            console.error("Mutasi gagal", error);
            toast.error(error.response?.data?.error || "Gagal melakukan mutasi stok.");
        } finally {
            setLoading(false);
        }
    };

    const selectedProduct = product || products.find(p => p.id.toString() === formData.productId.toString());

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" />
            <div className="glass w-full max-w-lg rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-slate-950/50 border-b border-indigo-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <Truck className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Stock Mutation (Transfer)</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Relokasi Inventori Antar Fasilitas</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
                    {/* VISUAL FLOW COMPONENT */}
                    <div className="p-8 bg-slate-950 border border-white/5 rounded-[2.5rem] shadow-inner relative overflow-hidden">
                        <div className="flex items-center justify-between gap-4 relative z-10">
                            <div className="text-center flex-1">
                                <p className="text-[8px] font-black uppercase text-slate-600 tracking-[0.2em] mb-3 italic">Source_Node</p>
                                <div className="h-14 w-14 mx-auto rounded-2xl bg-indigo-500/5 border border-white/5 flex items-center justify-center text-indigo-500/40 mb-3">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <p className="text-[10px] font-black text-white italic truncate max-w-[80px] mx-auto uppercase">
                                    {warehouses.find(w => w.id.toString() === formData.fromWarehouseId.toString())?.name || 'ASAL'}
                                </p>
                            </div>
                            
                            <div className="flex flex-col items-center gap-2 flex-1">
                                <ArrowRight className="text-indigo-500/20 h-8 w-8 animate-pulse" />
                                <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                                    <p className="text-[8px] font-black text-indigo-400 italic">TRANSFERRING</p>
                                </div>
                            </div>

                            <div className="text-center flex-1">
                                <p className="text-[8px] font-black uppercase text-slate-600 tracking-[0.2em] mb-3 italic">Dest_Node</p>
                                <div className="h-14 w-14 mx-auto rounded-2xl bg-emerald-500/5 border border-white/5 flex items-center justify-center text-emerald-500/40 mb-3">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <p className="text-[10px] font-black text-white italic truncate max-w-[80px] mx-auto uppercase">
                                    {warehouses.find(w => w.id.toString() === formData.toWarehouseId.toString())?.name || 'TUJUAN'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* PRODUCT SELECT (Only if not fixed) */}
                        {!product && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Payload Identification</label>
                                <select
                                    required
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-4 px-6 text-[10px] font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer"
                                    value={formData.productId}
                                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                                >
                                    <option value="" disabled>-- SELECT PRODUCT --</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id} className="bg-slate-900">{p.name.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">From Facility</label>
                                <select
                                    required
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-4 px-6 text-[10px] font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer"
                                    value={formData.fromWarehouseId}
                                    onChange={(e) => setFormData({ ...formData, fromWarehouseId: e.target.value })}
                                >
                                    <option value="" disabled>-- SOURCE --</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id} className="bg-slate-900">{w.name.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">To Facility</label>
                                <select
                                    required
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-4 px-6 text-[10px] font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer"
                                    value={formData.toWarehouseId}
                                    onChange={(e) => setFormData({ ...formData, toWarehouseId: e.target.value })}
                                >
                                    <option value="" disabled>-- DESTINATION --</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id} className="bg-slate-900">{w.name.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* QUANTITY AND STOCK INFO */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Mutation Volume</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-4 px-6 text-xs font-black text-white focus:border-indigo-500/50 outline-none transition-all shadow-inner italic tracking-widest uppercase"
                                        value={formData.quantity || ""}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-700 italic uppercase">
                                        {selectedProduct?.unit || 'UNT'}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 flex flex-col justify-center">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic mb-1">AVAILABLE_IN_SOURCE</p>
                                <p className={`text-sm font-black italic tracking-tighter ${sourceStock > 0 ? 'text-indigo-400' : 'text-red-500/50'}`}>
                                    {sourceStock.toLocaleString()} {selectedProduct?.unit || 'UNIT'}
                                </p>
                            </div>
                        </div>

                        {formData.quantity > sourceStock && sourceStock > 0 && (
                            <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-xl animate-in fade-in duration-300">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <p className="text-[9px] font-black text-red-500/80 uppercase italic tracking-widest">ERROR: Volume exceeds available source capacity.</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Operation Memo</label>
                            <textarea
                                className="w-full rounded-[2rem] bg-slate-950 border border-slate-800 py-6 px-8 text-[10px] font-black text-white focus:border-indigo-500/50 outline-none transition-all shadow-inner italic placeholder:text-slate-900 min-h-[100px] resize-none uppercase tracking-widest"
                                placeholder="..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl bg-white/5 border border-white/5 py-5 text-[10px] font-black text-slate-500 hover:text-white hover:bg-white/10 transition-all uppercase tracking-[0.3em] italic"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (formData.quantity > sourceStock && sourceStock > 0)}
                            className="flex-[2] rounded-2xl bg-indigo-600 py-5 text-[10px] font-black text-white shadow-2xl shadow-indigo-900/40 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.3em] italic border border-white/10"
                        >
                            {loading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><Send className="h-4 w-4 stroke-[3.5px]" /> Start Mutation</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

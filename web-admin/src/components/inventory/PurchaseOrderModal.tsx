'use client';

import { useState, useEffect } from "react";
import { X, ShoppingBag, Plus, Trash2, Search, Package, User, FileText, Calendar } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import SearchableSelect from "../common/SearchableSelect";

export default function PurchaseOrderModal({ isOpen, onClose, onSuccess }: any) {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [warehouses, setWarehouses] = useState<any[]>([]);
    
    const [formData, setFormData] = useState({
        supplierId: "",
        warehouseId: "",
        date: new Date().toISOString().split('T')[0],
        notes: "",
        items: [{ productId: "", quantity: 1, price: 0 }]
    });

    useEffect(() => {
        if (isOpen) {
            fetchSuppliers();
            fetchProducts();
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
            console.error("Gagal mengambil data gudang", error);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('/suppliers');
            setSuppliers(res.data);
        } catch (error) {
            console.error("Gagal mengambil data supplier", error);
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

    if (!isOpen) return null;

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { productId: "", quantity: 1, price: 0 }]
        });
    };

    const removeItem = (index: number) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        
        // Auto-fill price if productId changes
        if (field === 'productId') {
            const product = products.find(p => p.id === parseInt(value));
            if (product) {
                newItems[index].price = product.costPrice || 0;
            }
        }
        
        setFormData({ ...formData, items: newItems });
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        
        // Validation
        if (!formData.supplierId) return toast.error("Pilih supplier terlebih dahulu.");
        if (!formData.warehouseId) return toast.error("Pilih gudang tujuan terlebih dahulu.");
        if (formData.items.some(item => !item.productId || item.quantity <= 0)) {
            return toast.error("Lengkapi data barang dan jumlah pesanan.");
        }

        setLoading(true);
        try {
            await api.post('/inventory/purchase-orders', formData);
            toast.success("Pesanan Pembelian (PO) berhasil diajukan untuk disetujui.");
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                supplierId: "",
                warehouseId: warehouses.find((w: any) => w.isMain)?.id.toString() || (warehouses[0]?.id.toString() || ""),
                date: new Date().toISOString().split('T')[0],
                notes: "",
                items: [{ productId: "", quantity: 1, price: 0 }]
            });
        } catch (error: any) {
            console.error("Gagal membuat PO", error);
            toast.error("Gagal membuat PO: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" />
            <div className="glass w-full max-w-4xl max-h-[95vh] rounded-[3rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
                <div className="bg-slate-950/50 border-b border-indigo-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <ShoppingBag className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Pipeline Pengadaan (PO)</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Pengajuan Pesanan Pembelian Resmi</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar bg-slate-950/20">
                    <div className="space-y-6">
                        {/* Section 1: Header Info */}
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Sumber Pemenuhan (Vendor / Supplier)</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors z-10" />
                                    <SearchableSelect
                                        options={suppliers.map((s) => ({
                                            id: s.id.toString(),
                                            name: s.name
                                        }))}
                                        value={formData.supplierId}
                                        onChange={(val) => setFormData({ ...formData, supplierId: val.toString() })}
                                        placeholder="Pilih Vendor..."
                                        className="pl-8"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 text-[8px] pointer-events-none">▼</div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Tanggal Pengajuan</label>
                                <div className="relative group">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors z-10" />
                                    <input
                                        required
                                        type="date"
                                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 pl-12 pr-6 text-[10px] font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Target Warehouse Selection */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1 text-glow-sm">Gudang Tujuan (Alokasi Stok Masuk)</label>
                            <div className="relative group">
                                <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors z-10" />
                                <select
                                    required
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 pl-12 pr-4 text-[10px] font-black text-slate-400 group-focus-within:text-white outline-none transition-all italic tracking-widest uppercase appearance-none"
                                    value={formData.warehouseId}
                                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                                >
                                    <option value="">PILIH GUDANG TUJUAN...</option>
                                    {warehouses.map((w: any) => (
                                        <option key={w.id} value={w.id}>{w.name.toUpperCase()} {w.isMain ? '(UTAMA)' : ''}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 text-[8px] pointer-events-none italic font-black uppercase tracking-widest">
                                    {warehouses.find(w => w.id.toString() === formData.warehouseId)?.type || 'Select'}
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Items List */}
                        <div className="bg-slate-950/40 -mx-8 px-10 py-8 border-y border-white/5 relative overflow-visible">
                            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                            
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <Package className="h-4 w-4 stroke-[2.5px]" />
                                    </div>
                                    <h3 className="text-[11px] font-black uppercase text-white tracking-[0.2em] italic">Daftar Barang</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="px-5 py-2.5 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 tracking-widest italic border border-white/10 shadow-lg shadow-indigo-500/20"
                                >
                                    <Plus className="h-3.5 w-3.5 stroke-[3px]" /> Tambah Barang
                                </button>
                            </div>

                            <div className="flex gap-4 mb-4 px-4 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] italic relative z-10">
                                <div className="flex-[3.5]">Deskripsi Produk / Bahan</div>
                                <div className="flex-[1.8] text-center">Jumlah</div>
                                <div className="flex-[1.8] text-right">Harga Satuan (IDR)</div>
                                <div className="w-10"></div>
                            </div>
                            {/* Items list container - needs high z-index to break out dropdowns */}
                            <div className="space-y-4 relative z-50">
                                {formData.items.map((item, index) => (
                                    <div key={index} style={{ zIndex: 50 - index }} className="flex gap-4 animate-in slide-in-from-left-4 duration-300 group items-center bg-slate-900/50 p-2 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all relative">
                                        <div className="flex-[3.5]">
                                            <SearchableSelect
                                                options={products
                                                    .filter(p => p.type === 'RAW_MATERIAL')
                                                    .map((p) => ({
                                                        id: p.id.toString(),
                                                        name: p.name
                                                    }))
                                                }
                                                value={item.productId}
                                                onChange={(val) => updateItem(index, 'productId', val.toString())}
                                                placeholder="Pilih Barang..."
                                            />
                                        </div>
                                        <div className="flex-[1.8] relative group/qty">
                                            <input
                                                required
                                                type="number"
                                                step="any"
                                                placeholder="0"
                                                className="w-full rounded-xl bg-slate-950 border border-slate-800 py-3 pl-3 pr-10 text-[10px] font-black text-white text-left focus:border-indigo-500/50 outline-none transition-all shadow-inner tracking-widest"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[7px] font-black text-indigo-500/40 uppercase tracking-widest italic pointer-events-none">
                                                {products.find(p => p.id.toString() === item.productId.toString())?.unit || 'MOD'}
                                            </div>
                                        </div>
                                        <div className="flex-[1.8]">
                                            <input
                                                required
                                                type="number"
                                                placeholder="0"
                                                className="w-full rounded-xl bg-slate-950 border border-slate-800 py-3 px-4 text-[10px] font-black text-indigo-400 text-right focus:border-indigo-500/50 outline-none transition-all shadow-inner tracking-widest"
                                                value={item.price}
                                                onChange={(e) => updateItem(index, 'price', e.target.value)}
                                            />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            disabled={formData.items.length === 1}
                                            className="h-10 w-10 flex items-center justify-center text-slate-700 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all border border-transparent hover:border-red-400/20 shrink-0 disabled:opacity-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Conversion Hint & Total Calculation */}
                            <div className="mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                                <div className="space-y-3">
                                    <div className="flex flex-wrap gap-4">
                                        <div className="px-3 py-1.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">1.000 GRAM = 1 KG</span>
                                        </div>
                                        <div className="px-3 py-1.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">1.000 ML = 1 LITER</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Total Nilai Pengadaan</p>
                                        <p className="text-[9px] font-bold uppercase text-slate-700 mt-1">Estimasi Total Tagihan Terkalkulasi</p>
                                    </div>
                                </div>
                                <p className="text-3xl font-black italic text-white tracking-tighter text-glow-lg">Rp {calculateTotal().toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Section 3: Notes */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Catatan Logistik / Pengiriman</label>
                            <div className="relative group">
                                <FileText className="absolute left-4 top-4 h-4 w-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors pointer-events-none z-10" />
                                <textarea
                                    className="w-full rounded-[32px] bg-slate-950 border border-slate-800 py-4 pl-12 pr-6 text-[11px] font-black text-white focus:border-indigo-500/50 outline-none transition-all h-28 resize-none italic placeholder:text-slate-800 shadow-inner"
                                    placeholder="E.G. PRIORITY DELIVERY BEFORE 10:00 AM..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 flex gap-4 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 text-[10px] font-black text-slate-500 bg-white/5 border border-white/5 hover:text-white hover:bg-white/10 rounded-2xl transition-all uppercase tracking-[0.2em] italic"
                        >
                            Batalkan Pengajuan
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] flex items-center justify-center gap-3 py-4 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl disabled:opacity-50 transition-all shadow-2xl shadow-indigo-500/20 uppercase tracking-[0.2em] border border-white/10 italic"
                        >
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><ShoppingBag className="h-4 w-4 stroke-[3px]" /> KIRIM PESANAN PEMBELIAN (PO)</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

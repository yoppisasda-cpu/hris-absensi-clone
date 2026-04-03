'use client';

import { useState, useEffect } from "react";
import { X, ShoppingBag, Plus, Trash2, Search, Package, User, FileText, Calendar } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function PurchaseOrderModal({ isOpen, onClose, onSuccess }: any) {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        supplierId: "",
        date: new Date().toISOString().split('T')[0],
        notes: "",
        items: [{ productId: "", quantity: 1, price: 0 }]
    });

    useEffect(() => {
        if (isOpen) {
            fetchSuppliers();
            fetchProducts();
        }
    }, [isOpen]);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white border-b border-blue-500/30 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic tracking-tight uppercase">Order Barang (PO)</h2>
                            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Pengajuan Operational</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto flex-1">
                    <div className="space-y-6">
                        {/* Section 1: Header Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Supplier</label>
                                <div className="relative group">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <select
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-bold focus:border-blue-500 focus:bg-white focus:outline-none transition-all appearance-none cursor-pointer"
                                        value={formData.supplierId}
                                        onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                                    >
                                        <option value="">-- Pilih Supplier --</option>
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Tanggal Order</label>
                                <div className="relative group">
                                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        required
                                        type="date"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-bold focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Items List */}
                        <div className="bg-slate-50 -mx-8 px-8 py-6 border-y border-slate-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Package className="h-5 w-5 text-blue-600" />
                                    <h3 className="text-sm font-black uppercase text-slate-700 tracking-tight">Daftar Barang</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1.5"
                                >
                                    <Plus className="h-3 w-3" /> Tambah Barang
                                </button>
                            </div>

                            <div className="flex gap-2 mb-2 px-1 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                <div className="flex-[3]">Produk / Bahan</div>
                                <div className="flex-1">Jumlah</div>
                                <div className="flex-[1.5]">Harga Satuan (Rp)</div>
                                <div className="w-[36px]"></div>
                            </div>

                            <div className="space-y-3">
                                {formData.items.map((item, index) => (
                                    <div key={index} className="flex gap-2 animate-in slide-in-from-left-2 duration-200 group">
                                        <div className="flex-[3] relative">
                                            <select
                                                required
                                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-bold focus:border-blue-500 focus:outline-none transition-all appearance-none"
                                                value={item.productId}
                                                onChange={(e) => updateItem(index, 'productId', e.target.value)}
                                            >
                                                <option value="">Pilih Produk...</option>
                                                {products.map((p) => (
                                                    <option key={p.id} value={p.id}>{p.name} ({p.unit}) - Rp {p.costPrice?.toLocaleString()}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                required
                                                type="number"
                                                step="any"
                                                placeholder="0"
                                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-bold focus:border-blue-500 focus:outline-none transition-all"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex-[1.5]">
                                            <input
                                                required
                                                type="number"
                                                placeholder="0"
                                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-bold focus:border-blue-500 focus:outline-none transition-all"
                                                value={item.price}
                                                onChange={(e) => updateItem(index, 'price', e.target.value)}
                                            />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            disabled={formData.items.length === 1}
                                            className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0 disabled:opacity-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Total Calculation */}
                            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center text-slate-900">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estimasi Total Tagihan</p>
                                <p className="text-2xl font-black italic">Rp {calculateTotal().toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Section 3: Notes */}
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Catatan Tambahan</label>
                            <div className="relative group">
                                <FileText className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <textarea
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-bold focus:border-blue-500 focus:bg-white focus:outline-none transition-all h-24 resize-none"
                                    placeholder="Harap dikirim sebelum jam 10 pagi..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] rounded-xl bg-slate-900 py-4 text-sm font-bold text-white shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                        >
                            {loading ? "Memproses..." : (
                                <>
                                    <ShoppingBag className="h-4 w-4" /> Ajukan Pesanan PO
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

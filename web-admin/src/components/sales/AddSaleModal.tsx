'use client';

import { useState, useEffect } from "react";
import { X, Save, Plus, Trash2, ShoppingBag, Wallet } from "lucide-react";
import api from "@/lib/api";

interface AddSaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddSaleModal({ isOpen, onClose, onSuccess }: AddSaleModalProps) {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        accountId: '',
        customerId: '',
        date: new Date().toISOString().split('T')[0],
        status: 'PAID',
        notes: '',
        items: [{ productId: '', quantity: 1, price: 0 }]
    });

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        try {
            const [accRes, prodRes, custRes] = await Promise.all([
                api.get('/finance/accounts'),
                api.get('/inventory/products'),
                api.get('/customers')
            ]);
            setAccounts(accRes.data);
            setProducts(prodRes.data);
            setCustomers(custRes.data);
            
            if (accRes.data.length > 0) {
                setFormData(prev => ({ ...prev, accountId: accRes.data[0].id.toString() }));
            }
        } catch (error) {
            console.error("Gagal mengambil data referensi", error);
        }
    };

    const handleAddItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { productId: '', quantity: 1, price: 0 }]
        }));
    };

    const handleRemoveItem = (index: number) => {
        if (formData.items.length === 1) return;
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index], [field]: value };
        
        // Auto-fill price if productId changed
        if (field === 'productId') {
            const product = products.find(p => p.id.toString() === value);
            if (product) {
                item.price = product.price || 0;
            }
        }
        
        newItems[index] = item;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const grandTotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Validation
            if (formData.items.some(item => !item.productId || item.quantity <= 0)) {
                throw new Error("Daftar barang tidak valid");
            }

            await api.post('/sales', formData);
            onSuccess();
            onClose();
            // Reset items
            setFormData(prev => ({ ...prev, items: [{ productId: '', quantity: 1, price: 0 }] }));
        } catch (error: any) {
            alert(error.message || "Gagal menyimpan penjualan");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
            <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden my-auto">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-blue-500" />
                        </div>
                        <h3 className="text-xl font-black italic tracking-tight uppercase">Catat Penjualan Baru</h3>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5 text-white" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Pelanggan (Optional)</label>
                            <select
                                value={formData.customerId}
                                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-indigo-50 text-indigo-800 px-4 py-2.5 text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="">--- Umum / Guest ---</option>
                                {customers.map(cust => (
                                    <option key={cust.id} value={cust.id}>{cust.name} ({cust.phone || 'No Phone'})</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Transaksi</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Pembayaran</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                            >
                                <option value="PAID">Lunas (Langsung Masuk Kas)</option>
                                <option value="UNPAID">Belum Bayar (Piutang)</option>
                            </select>
                        </div>
                    </div>

                    {formData.status === 'PAID' && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                <Wallet className="h-3 w-3" /> Masuk ke Akun
                            </label>
                            <select
                                required
                                value={formData.accountId}
                                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-emerald-50 text-emerald-800 px-4 py-2.5 text-sm font-bold focus:border-emerald-500 outline-none transition-all"
                            >
                                <option value="">Pilih Akun Kas/Bank</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name} (Saldo: Rp {acc.balance.toLocaleString()})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Barang</label>
                            <button 
                                type="button" 
                                onClick={handleAddItem}
                                className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                <Plus className="h-3 w-3" /> Tambah Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {formData.items.map((item, index) => (
                                <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group animate-in slide-in-from-left-2 transition-all">
                                    <div className="flex-[3] space-y-1">
                                        <select
                                            required
                                            value={item.productId}
                                            onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                                        >
                                            <option value="">Pilih Produk</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.sku}) - Stok: {p.stock}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            placeholder="Qty"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="flex-[1.5] space-y-1">
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            placeholder="Harga Unit"
                                            value={item.price}
                                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="flex-1 text-right flex items-center justify-end font-black text-slate-900 text-[11px] pr-8">
                                        Rp {(item.quantity * item.price).toLocaleString()}
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-6 flex justify-between items-center text-white">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grand Total</p>
                            <h4 className="text-3xl font-black italic tracking-tighter">Rp {grandTotal.toLocaleString()}</h4>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item</p>
                            <h4 className="text-xl font-bold">{formData.items.length} Barang</h4>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catatan / Keterangan</label>
                        <textarea
                            placeholder="Contoh: Pembelian grosir, Pelanggan lama, dsb."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none transition-all min-h-[60px]"
                        />
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl border border-slate-200 py-4 text-sm font-black text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] rounded-2xl bg-blue-600 py-4 text-sm font-black text-white shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                        >
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><Save className="h-5 w-5" /> Simpan Penjualan</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

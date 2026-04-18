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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
            <div className="glass w-full max-w-3xl rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-slate-950/50 border-b border-blue-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-lg shadow-blue-500/10">
                            <ShoppingBag className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Commerce Entry Hub</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Point of Sales Manual Records</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[80vh] overflow-y-auto no-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Market Segment</label>
                            <div className="relative group">
                                <select
                                    value={formData.customerId}
                                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-blue-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer"
                                >
                                    <option value="">PASAR UMUM / GUEST</option>
                                    {customers.map(cust => (
                                        <option key={cust.id} value={cust.id} className="text-white bg-slate-900">{cust.name.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Temporal Directive</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-blue-500/50 outline-none transition-all italic tracking-widest uppercase shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Settlement Protocol</label>
                        <div className="grid grid-cols-2 gap-4 p-1.5 bg-slate-950 border border-white/5 rounded-[22px]">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, status: 'PAID' })}
                                className={`py-4 text-[9px] font-black rounded-xl transition-all uppercase tracking-widest italic ${
                                    formData.status === 'PAID' 
                                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 shadow-lg' 
                                    : 'text-slate-600 hover:text-white'
                                }`}
                            >
                                SETTLED (LUNAS)
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, status: 'UNPAID' })}
                                className={`py-4 text-[9px] font-black rounded-xl transition-all uppercase tracking-widest italic ${
                                    formData.status === 'UNPAID' 
                                    ? 'bg-amber-600/20 text-amber-400 border border-amber-500/20 shadow-lg' 
                                    : 'text-slate-600 hover:text-white'
                                }`}
                            >
                                CREDIT (INVOICE)
                            </button>
                        </div>
                    </div>

                    {formData.status === 'PAID' && (
                        <div className="space-y-2 animate-in slide-in-from-top-4 duration-500">
                            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] italic ml-1 flex items-center gap-2">
                                <Wallet className="h-3 w-3" /> Target Vault (Cash-In)
                            </label>
                            <select
                                required
                                value={formData.accountId}
                                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                                className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-6 py-4 text-xs font-black text-emerald-400 focus:border-emerald-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer"
                            >
                                <option value="">-- SELECT VAULT --</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id} className="text-white bg-slate-950">{acc.name.toUpperCase()} (Rp {acc.balance.toLocaleString()})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Itemized Basket</label>
                            <button 
                                type="button" 
                                onClick={handleAddItem}
                                className="text-[9px] font-black text-blue-400 hover:text-blue-300 flex items-center gap-2 uppercase tracking-[0.2em] italic transition-colors"
                            >
                                <Plus className="h-4 w-4 bg-blue-500/10 rounded-lg p-0.5 border border-blue-500/20" /> ADD_PRODUCT
                            </button>
                        </div>

                        <div className="space-y-4">
                            {formData.items.map((item, index) => (
                                <div key={index} className="flex flex-col lg:flex-row gap-5 p-6 bg-slate-950 border border-slate-900 rounded-[2.5rem] relative group animate-in slide-in-from-left-4 transition-all hover:bg-slate-900/50 hover:border-blue-500/20 shadow-inner">
                                    <div className="flex-[3] space-y-2">
                                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic ml-1">SKU Nomenclature</label>
                                        <select
                                            required
                                            value={item.productId}
                                            onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-black italic text-white outline-none focus:border-blue-500/50 uppercase appearance-none cursor-pointer"
                                        >
                                            <option value="">-- SELECT UNIT --</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name.toUpperCase()} (STK: {p.stock})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic ml-1">Vol</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-black italic text-white outline-none focus:border-blue-500/50 shadow-inner"
                                        />
                                    </div>
                                    <div className="flex-[1.5] space-y-2">
                                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic ml-1">Rate</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                value={item.price}
                                                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-black italic text-blue-400 outline-none focus:border-blue-500/50 shadow-inner"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end lg:items-center lg:flex-none lg:min-w-[120px] pb-1 lg:pb-0">
                                        <div className="text-right font-black text-white text-[12px] italic tracking-tight">
                                            Rp {(item.quantity * item.price).toLocaleString()}
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="absolute -right-2 -top-2 h-8 w-8 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-600/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 border border-white/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 flex flex-col sm:flex-row justify-between items-center text-white shadow-2xl shadow-indigo-900/40 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 h-40 w-40 bg-white/5 blur-3xl -mr-20 -mt-20 rounded-full"></div>
                        <div className="z-10 text-center sm:text-left">
                            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-2 italic">Gross Transaction Value</p>
                            <h4 className="text-4xl font-black italic tracking-tighter flex items-center gap-4">
                                <span className="text-xl text-white/40">IDR</span>
                                {grandTotal.toLocaleString()}
                            </h4>
                        </div>
                        <div className="z-10 mt-6 sm:mt-0 text-center sm:text-right">
                            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-2 italic">Basket Capacity</p>
                            <h4 className="text-xl font-black italic tracking-tight uppercase">{formData.items.length} Modules_Active</h4>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Internal Directives / Notes</label>
                        <textarea
                            placeholder="INPUT TRANSACTIONAL DATA ANCHORS..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-[2rem] px-6 py-5 text-xs font-black text-white focus:border-blue-500/50 outline-none transition-all min-h-[100px] italic no-scrollbar uppercase tracking-widest placeholder:text-slate-800 shadow-inner resize-none"
                        />
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl bg-white/5 border border-white/5 py-5 text-[10px] font-black text-slate-500 hover:text-white hover:bg-white/10 transition-all uppercase tracking-[0.3em] italic"
                        >
                            Abort
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] rounded-2xl bg-blue-600 py-5 text-[10px] font-black text-white shadow-2xl shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.3em] italic border border-white/10"
                        >
                            {loading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><Save className="h-4 w-4 stroke-[3px]" /> Transmit Schema</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

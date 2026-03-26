'use client';

import { useState, useEffect } from "react";
import { X, Save, Plus, ArrowDownLeft } from "lucide-react";
import api from "@/lib/api";

interface AddExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    expenseToEdit?: any;
}

export default function AddExpenseModal({ isOpen, onClose, onSuccess, expenseToEdit }: AddExpenseModalProps) {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [expenseMode, setExpenseMode] = useState<'OPERATIONAL' | 'BAHAN_BAKU'>('OPERATIONAL');
    
    const [formData, setFormData] = useState({
        accountId: '',
        categoryId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: '',
        supplierId: '',
        status: 'PAID',
        description: '',
        paidTo: '',
        productId: '',
        quantity: '0'
    });

    useEffect(() => {
        if (isOpen) {
            fetchData().then(() => {
                if (expenseToEdit) {
                    setFormData({
                        accountId: expenseToEdit.accountId?.toString() || '',
                        categoryId: expenseToEdit.categoryId?.toString() || '',
                        amount: expenseToEdit.amount.toString(),
                        date: new Date(expenseToEdit.date).toISOString().split('T')[0],
                        dueDate: expenseToEdit.dueDate ? new Date(expenseToEdit.dueDate).toISOString().split('T')[0] : '',
                        supplierId: expenseToEdit.supplierId?.toString() || '',
                        status: expenseToEdit.status,
                        description: expenseToEdit.description || '',
                        paidTo: expenseToEdit.paidTo || '',
                        productId: '', // We don't track this in Expense model yet
                        quantity: '0'
                    });
                    // Detect mode from category type if possible
                    if (expenseToEdit.category?.type === 'COGS') {
                        setExpenseMode('BAHAN_BAKU');
                    } else {
                        setExpenseMode('OPERATIONAL');
                    }
                } else {
                    // Reset to default for new expense
                    setFormData({
                        accountId: accounts[0]?.id.toString() || '',
                        categoryId: categories.find(c => c.type === 'OPERATIONAL')?.id.toString() || '',
                        amount: '',
                        date: new Date().toISOString().split('T')[0],
                        dueDate: '',
                        supplierId: '',
                        status: 'PAID',
                        description: '',
                        paidTo: '',
                        productId: '',
                        quantity: '0'
                    });
                    setExpenseMode('OPERATIONAL');
                }
            });
        }
    }, [isOpen, expenseToEdit]);

    const fetchData = async () => {
        try {
            const [accRes, catRes, prodRes, suppRes] = await Promise.all([
                api.get('/finance/accounts'),
                api.get('/finance/expense-categories'),
                api.get('/inventory/products'),
                api.get('/suppliers')
            ]);
            setAccounts(accRes.data);
            setCategories(catRes.data);
            setProducts(prodRes.data);
            setSuppliers(suppRes.data);
            
            if (!expenseToEdit && accRes.data.length > 0) setFormData(prev => ({ ...prev, accountId: accRes.data[0].id.toString() }));
            if (!expenseToEdit && catRes.data.length > 0) {
                const defaultCat = catRes.data.find((c: any) => c.type === 'OPERATIONAL') || catRes.data[0];
                setFormData(prev => ({ ...prev, categoryId: defaultCat.id.toString() }));
            }
        } catch (error) {
            console.error("Gagal mengambil data referensi finance", error);
        }
    };

    const handleProductChange = (id: string) => {
        const product = products.find(p => p.id.toString() === id);
        if (product) {
            const qty = parseFloat(formData.quantity) || 0;
            const autoAmount = (product.costPrice * qty).toString();
            setFormData(prev => ({ 
                ...prev, 
                productId: id,
                amount: autoAmount !== '0' ? autoAmount : prev.amount
            }));
        } else {
            setFormData(prev => ({ ...prev, productId: id }));
        }
    }

    const handleQtyChange = (qty: string) => {
        const product = products.find(p => p.id.toString() === formData.productId);
        if (product) {
            const autoAmount = (product.costPrice * parseFloat(qty)).toString();
            setFormData(prev => ({ 
                ...prev, 
                quantity: qty,
                amount: autoAmount !== '0' ? autoAmount : prev.amount
            }));
        } else {
            setFormData(prev => ({ ...prev, quantity: qty }));
        }
    }

    const [catLoading, setCatLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryType, setNewCategoryType] = useState('OPERATIONAL');

    const handleCreateCategory = async () => {
        if (!newCategoryName) return;
        setCatLoading(true);
        try {
            const res = await api.post('/finance/expense-categories', { 
                name: newCategoryName, 
                type: newCategoryType 
            });
            const newCat = res.data;
            setCategories(prev => [...prev, newCat]);
            setFormData(prev => ({ ...prev, categoryId: newCat.id.toString() }));
            setShowNewCategory(false);
            setNewCategoryName('');
        } catch (error: any) {
            console.error("Gagal membuat kategori:", error);
            alert("Gagal membuat kategori: " + (error.response?.data?.error || error.message));
        } finally {
            setCatLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const submitData = {
                ...formData,
                accountId: formData.status === 'PENDING' ? null : formData.accountId,
                productId: expenseMode === 'BAHAN_BAKU' ? formData.productId : null,
                quantity: expenseMode === 'BAHAN_BAKU' ? parseFloat(formData.quantity) : 0,
                categoryId: expenseMode === 'BAHAN_BAKU' ? categories.find(c => c.type === 'COGS')?.id : formData.categoryId
            };

            if (expenseToEdit) {
                await api.patch(`/finance/expense/${expenseToEdit.id}`, submitData);
            } else {
                await api.post('/finance/expense', submitData);
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Gagal menyimpan pengeluaran", error);
            alert("Gagal menyimpan pengeluaran. Cek kembali data Anda.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const selectedProduct = products.find(p => p.id.toString() === formData.productId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-red-500/30">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                            <ArrowDownLeft className="h-6 w-6 text-red-500" />
                        </div>
                        <h3 className="text-xl font-black italic tracking-tight uppercase">
                            {expenseToEdit ? 'Edit Pengeluaran' : 'Catat Pengeluaran'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5 text-white" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    {/* MODE TOGGLE */}
                    <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                        <button
                            type="button"
                            onClick={() => {
                                setExpenseMode('OPERATIONAL');
                                setFormData(prev => ({ ...prev, supplierId: '' }));
                            }}
                            className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${expenseMode === 'OPERATIONAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                        >
                            OPERASIONAL
                        </button>
                        <button
                            type="button"
                            onClick={() => setExpenseMode('BAHAN_BAKU')}
                            className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${expenseMode === 'BAHAN_BAKU' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400'}`}
                        >
                            BAHAN BAKU & STOK
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Transaksi</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold focus:border-red-500 focus:bg-white focus:outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jumlah {expenseMode === 'BAHAN_BAKU' ? '(Rp)' : '(Rp)'}</label>
                            <input
                                type="number"
                                required
                                placeholder="0"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-red-50/30 px-4 py-2.5 text-sm font-black text-red-600 focus:border-red-500 focus:bg-white focus:outline-none transition-all font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Pembayaran</label>
                            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'PAID' })}
                                    className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${formData.status === 'PAID' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                                >
                                    LUNAS
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'PENDING' })}
                                    className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${formData.status === 'PENDING' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}
                                >
                                    TEMPO
                                </button>
                            </div>
                        </div>
                        {formData.status === 'PENDING' && (
                            <div className="space-y-1.5 animate-in slide-in-from-right-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jatuh Tempo</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold focus:border-amber-500 outline-none text-amber-900"
                                />
                            </div>
                        )}
                    </div>

                    <div className={`space-y-1.5 transition-opacity duration-300 ${formData.status === 'PENDING' ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Bayar Pakai Akun
                        </label>
                        <select
                            disabled={formData.status === 'PENDING'}
                            required={formData.status === 'PAID'}
                            value={formData.accountId}
                            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold focus:border-red-500 focus:bg-white focus:outline-none transition-all"
                        >
                            <option value="">Pilih Akun Kas/Bank</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} (Saldo: Rp {acc.balance.toLocaleString()})</option>
                            ))}
                        </select>
                    </div>

                    {/* DYNAMIC SECTION BASED ON MODE */}
                    {/* SECTION 1: MODE SPECIFIC INPUTS (PRODUCT or CATEGORY) */}
                    {expenseMode === 'BAHAN_BAKU' ? (
                        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-4 duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-1">Pilih Barang (Stok)</label>
                                    <select
                                        required
                                        value={formData.productId}
                                        onChange={(e) => handleProductChange(e.target.value)}
                                        className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold focus:border-red-500 outline-none transition-all"
                                    >
                                        <option value="">-- Pilih Barang --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-1">Jumlah Masuk</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            required
                                            value={formData.quantity}
                                            onChange={(e) => handleQtyChange(e.target.value)}
                                            className="flex-1 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold focus:border-red-500 outline-none transition-all"
                                        />
                                        <div className="bg-red-100 text-red-600 px-4 py-2.5 rounded-xl flex items-center justify-center font-black text-[10px] tracking-widest min-w-[60px]">
                                            {selectedProduct?.unit || '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori Pengeluaran</label>
                                {!showNewCategory && (
                                    <button type="button" onClick={() => setShowNewCategory(true)} className="text-[9px] font-black text-blue-600 hover:underline flex items-center gap-1 uppercase tracking-tighter">
                                        <Plus className="h-2 w-2" /> Kategori Baru
                                    </button>
                                )}
                            </div>
                            
                            {showNewCategory ? (
                                <div className="space-y-2 p-4 border border-blue-100 bg-blue-50/30 rounded-2xl animate-in fade-in duration-300">
                                    <input
                                        type="text"
                                        placeholder="Nama kategori..."
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="w-full rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold focus:border-blue-500 outline-none"
                                    />
                                    <div className="flex gap-2">
                                        <select
                                            value={newCategoryType}
                                            onChange={(e) => setNewCategoryType(e.target.value)}
                                            className="flex-1 rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold"
                                        >
                                            <option value="OPERATIONAL">Operasional</option>
                                            <option value="COGS">Bahan Baku / HPP</option>
                                        </select>
                                        <button 
                                            type="button" 
                                            onClick={handleCreateCategory} 
                                            disabled={catLoading}
                                            className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                        >
                                            Simpan
                                        </button>
                                        <button type="button" onClick={() => setShowNewCategory(false)} className="text-slate-400 px-2 py-2 text-[10px] font-bold">BATAL</button>
                                    </div>
                                </div>
                            ) : (
                                <select
                                    required
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold focus:border-red-500 focus:bg-white focus:outline-none transition-all"
                                >
                                    <option value="" disabled>Pilih Kategori</option>
                                    <optgroup label="Biaya Operasional">
                                        {categories.filter(c => c.type === 'OPERATIONAL').map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            )}
                        </div>
                    )}
                    
                    {/* SECTION 2: VENDOR / SUPPLIER INFO */}
                    {expenseMode === 'BAHAN_BAKU' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Supplier (Dropdown)</label>
                                <select
                                    value={formData.supplierId}
                                    onChange={(e) => {
                                        const supp = suppliers.find(s => s.id.toString() === e.target.value);
                                        setFormData({ 
                                            ...formData, 
                                            supplierId: e.target.value,
                                            paidTo: supp ? supp.name : formData.paidTo 
                                        });
                                    }}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold focus:border-red-500 focus:bg-white focus:outline-none transition-all"
                                >
                                    <option value="">-- Pilih Supplier --</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Penerima (Manual/Vendor)</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Nama toko/vendor"
                                    value={formData.paidTo}
                                    onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold focus:border-red-500 focus:bg-white focus:outline-none transition-all"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1.5 animate-in fade-in duration-300">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dibayar Kepada (Penerima)</label>
                            <input
                                type="text"
                                placeholder="Contoh: PLN, PDAM, Gaji Karyawan, dsb."
                                value={formData.paidTo}
                                onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold focus:border-red-500 focus:bg-white focus:outline-none transition-all"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan / Memo</label>
                        <textarea
                            placeholder="Detail pengeluaran..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold focus:border-red-500 focus:bg-white focus:outline-none transition-all min-h-[80px]"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-200 py-3.5 text-sm font-black text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest"
                        >
                            BATAL
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] rounded-xl bg-slate-900 py-3.5 text-sm font-black text-white shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                        >
                            {loading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><Save className="h-4 w-4" /> {expenseToEdit ? 'Update Transaksi' : 'Simpan Transaksi'}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

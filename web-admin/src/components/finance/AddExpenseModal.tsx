'use client';

import { useState, useEffect } from "react";
import { X, Save, Plus, ArrowDownLeft, Wallet } from "lucide-react";
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
            <div className="glass w-full max-w-2xl rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-slate-950/50 border-b border-rose-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/10">
                            <ArrowDownLeft className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Pengeluaran / Pembelian</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">{expenseToEdit ? 'Pembaruan Data Transaksi' : 'Pencatatan Pengeluaran Kas'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
                    {/* MODE TOGGLE PREMIUM */}
                    <div className="flex p-2 bg-slate-950/80 rounded-[24px] border border-white/5 shadow-inner">
                        <button
                            type="button"
                            onClick={() => {
                                setExpenseMode('OPERATIONAL');
                                setFormData(prev => ({ ...prev, supplierId: '' }));
                            }}
                            className={`flex-1 py-4 text-[9px] font-black rounded-xl transition-all italic tracking-[0.2em] uppercase ${expenseMode === 'OPERATIONAL' ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-slate-600 hover:text-white'}`}
                        >
                            Operasional_Umum
                        </button>
                        <button
                            type="button"
                            onClick={() => setExpenseMode('BAHAN_BAKU')}
                            className={`flex-1 py-4 text-[9px] font-black rounded-xl transition-all italic tracking-[0.2em] uppercase ${expenseMode === 'BAHAN_BAKU' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'text-slate-600 hover:text-white'}`}
                        >
                            Bahan_Baku_HPP
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Tanggal Transaksi</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-rose-500/50 outline-none transition-all italic tracking-widest uppercase shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] italic ml-1 font-black">Nominal Pengeluaran (IDR)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    placeholder="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full bg-rose-500/5 border border-rose-500/20 rounded-2xl px-6 py-4 text-xs font-black text-rose-400 focus:border-rose-500/50 outline-none transition-all italic tracking-widest uppercase shadow-inner placeholder:text-rose-950"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Skema Pelunasan</label>
                            <div className="flex p-1.5 bg-slate-950 border border-white/5 rounded-[22px]">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'PAID' })}
                                    className={`flex-1 py-4 text-[9px] font-black rounded-xl transition-all italic tracking-widest uppercase ${formData.status === 'PAID' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 shadow-lg' : 'text-slate-600 hover:text-white'}`}
                                >
                                    LUNAS
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'PENDING' })}
                                    className={`flex-1 py-4 text-[9px] font-black rounded-xl transition-all italic tracking-widest uppercase ${formData.status === 'PENDING' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/20 shadow-lg' : 'text-slate-600 hover:text-white'}`}
                                >
                                    TEMPO / HUTANG
                                </button>
                            </div>
                        </div>
                        {formData.status === 'PENDING' && (
                            <div className="space-y-2 animate-in slide-in-from-right-4 duration-300">
                                <label className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] italic ml-1">Tanggal Jatuh Tempo</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    className="w-full bg-amber-500/5 border border-amber-500/20 rounded-2xl px-6 py-4 text-xs font-black text-amber-400 focus:border-amber-500/50 outline-none transition-all italic tracking-widest uppercase shadow-inner"
                                />
                            </div>
                        )}
                    </div>

                    <div className={`space-y-2 transition-all duration-500 ${formData.status === 'PENDING' ? 'opacity-30 pointer-events-none filter blur-[1px]' : 'opacity-100'}`}>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1 flex items-center gap-2">
                            <Wallet className="h-3 w-3" /> Sumber Dana (Kas/Bank)
                        </label>
                        <select
                            disabled={formData.status === 'PENDING'}
                            required={formData.status === 'PAID'}
                            value={formData.accountId}
                            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-rose-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer"
                        >
                            <option value="">-- PILIH REKENING --</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id} className="bg-slate-900">{acc.name.toUpperCase()} (AVL: Rp {acc.balance.toLocaleString()})</option>
                            ))}
                        </select>
                    </div>

                    {/* DYNAMIC SECTION PREMIUM */}
                    {expenseMode === 'BAHAN_BAKU' ? (
                        <div className="bg-rose-500/5 border border-rose-500/10 rounded-[2.5rem] p-8 space-y-8 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 h-40 w-40 bg-rose-500/5 blur-3xl -mr-20 -mt-20 rounded-full group-hover:bg-rose-500/10 transition-colors"></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] italic ml-1">Pilih Bahan Baku</label>
                                    <select
                                        required
                                        value={formData.productId}
                                        onChange={(e) => handleProductChange(e.target.value)}
                                        className="w-full bg-slate-950 border border-rose-500/30 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-rose-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer shadow-xl"
                                    >
                                        <option value="">-- PILIH BARANG --</option>
                                        {products
                                            .filter(p => p.type === 'RAW_MATERIAL')
                                            .map(p => (
                                                <option key={p.id} value={p.id} className="bg-slate-900">{p.name.toUpperCase()} ({p.sku})</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] italic ml-1">Vol</label>
                                    <div className="flex gap-4">
                                        <input
                                            type="number"
                                            required
                                            value={formData.quantity}
                                            onChange={(e) => handleQtyChange(e.target.value)}
                                            className="flex-1 bg-slate-950 border border-rose-500/30 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-rose-500/50 outline-none italic uppercase tracking-widest shadow-xl"
                                        />
                                        <div className="bg-rose-500/10 text-rose-500 px-6 py-4 rounded-2xl flex items-center justify-center font-black text-[10px] tracking-widest border border-rose-500/20 italic uppercase">
                                            {selectedProduct?.unit || 'MOD'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Kategori Pengeluaran</label>
                                {!showNewCategory && (
                                    <button type="button" onClick={() => setShowNewCategory(true)} className="text-[9px] font-black text-rose-400 hover:text-rose-300 flex items-center gap-2 uppercase tracking-[0.2em] italic transition-colors">
                                        <Plus className="h-3 w-3 stroke-[3px]" /> KATEGORI_BARU
                                    </button>
                                )}
                            </div>
                            
                            {showNewCategory ? (
                                <div className="space-y-6 p-8 border border-white/5 bg-slate-950 rounded-[2.5rem] animate-in fade-in duration-500 shadow-inner">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic ml-1">Nama Kategori Baru</label>
                                        <input
                                            type="text"
                                            placeholder="EX: UTILITY_SEWA // LOGistics..."
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            className="w-full bg-slate-900 border border-white/5 rounded-xl px-6 py-4 text-xs font-black text-white outline-none focus:border-rose-500/50 italic uppercase tracking-widest shadow-inner placeholder:text-slate-800"
                                        />
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <select
                                            value={newCategoryType}
                                            onChange={(e) => setNewCategoryType(e.target.value)}
                                            className="flex-[2] bg-slate-900 border border-white/5 rounded-xl px-6 py-4 text-[10px] font-black italic text-rose-400 uppercase tracking-widest appearance-none cursor-pointer"
                                        >
                                            <option value="OPERATIONAL">OPERASIONAL</option>
                                            <option value="COGS">BAHAN BAKU / HPP</option>
                                        </select>
                                        <div className="flex gap-2">
                                            <button 
                                                type="button" 
                                                onClick={handleCreateCategory} 
                                                disabled={catLoading}
                                                className="flex-1 sm:flex-none bg-rose-600 text-white px-8 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-600/20 italic border border-white/10"
                                            >
                                                SAVE
                                            </button>
                                            <button type="button" onClick={() => setShowNewCategory(false)} className="text-slate-600 px-4 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <select
                                    required
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-rose-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>-- RESOLVE CLASSIFICATION --</option>
                                    <optgroup label="OPERATIONAL_TYPE" className="bg-slate-900 text-slate-700 font-black text-[9px] uppercase tracking-widest">
                                        {categories.filter(c => c.type === 'OPERATIONAL').map(cat => (
                                            <option key={cat.id} value={cat.id} className="text-white font-black">{cat.name.toUpperCase()}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            )}
                        </div>
                    )}
                    
                    {/* SECTION: VENDOR / PAYEE INFO */}
                    <div className="space-y-4 animate-in fade-in duration-500">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Penerima / Supplier</label>
                        {expenseMode === 'BAHAN_BAKU' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
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
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-rose-500/50 outline-none appearance-none cursor-pointer transition-all italic tracking-widest uppercase"
                                >
                                    <option value="">-- PILIH SUPPLIER --</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id} className="bg-slate-900">{s.name.toUpperCase()}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    placeholder="NAMA PENERIMA LANGSUNG..."
                                    value={formData.paidTo}
                                    onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-rose-500/50 outline-none transition-all italic tracking-widest uppercase shadow-inner placeholder:text-slate-900"
                                />
                            </div>
                        ) : (
                            <input
                                type="text"
                                placeholder="EX: ELECTRICAL_GRID // VENDOR_X..."
                                value={formData.paidTo}
                                onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-rose-500/50 outline-none transition-all italic tracking-widest uppercase shadow-inner placeholder:text-slate-900"
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Catatan Internal</label>
                        <textarea
                            placeholder="MASUKKAN DETAIL TRANSAKSI / CATATAN..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-[2rem] px-8 py-6 text-xs font-black text-white focus:border-rose-500/50 outline-none transition-all min-h-[120px] italic no-scrollbar uppercase tracking-widest placeholder:text-slate-900 shadow-inner resize-none"
                        />
                    </div>

                    <div className="flex gap-4 pt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl bg-white/5 border border-white/5 py-5 text-[10px] font-black text-slate-500 hover:text-white hover:bg-white/10 transition-all uppercase tracking-[0.3em] italic"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] rounded-2xl bg-rose-600 py-5 text-[10px] font-black text-white shadow-2xl shadow-rose-900/40 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.3em] italic border border-white/10"
                        >
                            {loading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><Save className="h-4 w-4 stroke-[3px]" /> {expenseToEdit ? 'Simpan Perubahan' : 'Simpan Transaksi'}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

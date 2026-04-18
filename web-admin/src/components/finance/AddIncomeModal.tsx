'use client';

import { useState, useEffect } from "react";
import { X, Save, Plus, TrendingUp, Wallet } from "lucide-react";
import api from "@/lib/api";

interface AddIncomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export default function AddIncomeModal({ isOpen, onClose, onSuccess, initialData }: AddIncomeModalProps) {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        accountId: '',
        categoryId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        receivedFrom: ''
    });
    const [loading, setLoading] = useState(false);
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                accountId: initialData.accountId.toString(),
                categoryId: initialData.categoryId.toString(),
                amount: initialData.amount.toString(),
                date: new Date(initialData.date).toISOString().split('T')[0],
                description: initialData.description || '',
                receivedFrom: initialData.receivedFrom || ''
            });
        } else if (isOpen && !initialData) {
            setFormData({
                accountId: accounts[0]?.id.toString() || '',
                categoryId: categories[0]?.id.toString() || '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                receivedFrom: ''
            });
        }
    }, [isOpen, initialData, accounts, categories]);

    const fetchData = async () => {
        try {
            const [accRes, catRes] = await Promise.all([
                api.get('/finance/accounts'),
                api.get('/finance/income-categories')
            ]);
            setAccounts(accRes.data);
            setCategories(catRes.data);
            
            if (!initialData) {
                if (accRes.data.length > 0) setFormData(prev => ({ ...prev, accountId: accRes.data[0].id.toString() }));
                if (catRes.data.length > 0) setFormData(prev => ({ ...prev, categoryId: catRes.data[0].id.toString() }));
            }
        } catch (error) {
            console.error("Gagal mengambil data referensi finance", error);
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName) return;
        try {
            const res = await api.post('/finance/income-categories', { name: newCategoryName });
            setCategories([...categories, res.data]);
            setFormData({ ...formData, categoryId: res.data.id.toString() });
            setShowNewCategory(false);
            setNewCategoryName('');
        } catch (error) {
            alert("Gagal membuat kategori");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (initialData) {
                await api.patch(`/finance/income/${initialData.id}`, formData);
            } else {
                await api.post('/finance/income', formData);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Gagal menyimpan pemasukan", error);
            alert(error.response?.data?.error || "Gagal menyimpan data pemasukan.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
            <div className="glass w-full max-w-2xl rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-slate-950/50 border-b border-emerald-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                            <TrendingUp className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Fiscal Accretion Node</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">{initialData ? 'Update Record Protocol' : 'Cash-In Initialization'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Temporal Directive</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-emerald-500/50 outline-none transition-all italic tracking-widest uppercase shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] italic ml-1 font-black">Accretion Magnitude (IDR)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    placeholder="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-6 py-4 text-xs font-black text-emerald-400 focus:border-emerald-500/50 outline-none transition-all italic tracking-widest uppercase shadow-inner placeholder:text-emerald-950"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1 flex items-center gap-2">
                            <Wallet className="h-3 w-3" /> Target Vault (Cash-In)
                        </label>
                        <select
                            required
                            value={formData.accountId}
                            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-emerald-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer"
                        >
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id} className="bg-slate-900">{acc.name.toUpperCase()} (Rp {acc.balance.toLocaleString()})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Classification Vector</label>
                            {!showNewCategory && (
                                <button type="button" onClick={() => setShowNewCategory(true)} className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-2 uppercase tracking-[0.2em] italic transition-colors">
                                    <Plus className="h-3 w-3 stroke-[3px]" /> NEW_TAG
                                </button>
                            )}
                        </div>
                        
                        {showNewCategory ? (
                            <div className="flex gap-4 animate-in fade-in slide-in-from-top-2 duration-300 p-2 bg-slate-950 border border-emerald-500/20 rounded-[2rem]">
                                <input
                                    type="text"
                                    placeholder="INPUT NEW SCHE MA..."
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="flex-1 bg-transparent px-6 py-3 text-xs font-black text-white outline-none italic uppercase tracking-widest placeholder:text-slate-900"
                                />
                                <button type="button" onClick={handleCreateCategory} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest italic shadow-lg shadow-emerald-600/20">COMMIT</button>
                                <button type="button" onClick={() => setShowNewCategory(false)} className="text-slate-500 px-3 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
                            </div>
                        ) : (
                            <select
                                required
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-emerald-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer"
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id} className="bg-slate-900">{cat.name.toUpperCase()}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Entity Source / Origin</label>
                        <input
                            type="text"
                            placeholder="EX: CORPORATE_CLIENT // INTERNAL_TRANSFER..."
                            value={formData.receivedFrom}
                            onChange={(e) => setFormData({ ...formData, receivedFrom: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-emerald-500/50 outline-none transition-all italic tracking-widest uppercase shadow-inner placeholder:text-slate-900"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Internal Directives / Notes</label>
                        <textarea
                            placeholder="INPUT TRANSACTIONAL DATA ANCHORS..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-[2rem] px-8 py-6 text-xs font-black text-white focus:border-emerald-500/50 outline-none transition-all min-h-[120px] italic no-scrollbar uppercase tracking-widest placeholder:text-slate-900 shadow-inner resize-none"
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
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
                            className="flex-[2] rounded-2xl bg-emerald-600 py-5 text-[10px] font-black text-white shadow-2xl shadow-emerald-900/40 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.3em] italic border border-white/10"
                        >
                            {loading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><Save className="h-4 w-4 stroke-[3px]" /> {initialData ? 'Update Record' : 'Transmit Schema'}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

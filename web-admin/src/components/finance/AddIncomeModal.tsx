'use client';

import { useState, useEffect } from "react";
import { X, Save, Plus } from "lucide-react";
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h3 className="text-lg font-bold text-slate-900">
                        {initialData ? 'Ubah Pemasukan' : 'Catat Pemasukan Baru'}
                    </h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jumlah (Rp)</label>
                            <input
                                type="number"
                                required
                                placeholder="0"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono text-blue-600 font-bold"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Masuk ke Akun</label>
                        <select
                            required
                            value={formData.accountId}
                            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none transition-all"
                        >
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} (Saldo: Rp {acc.balance.toLocaleString()})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori Pemasukan</label>
                            {!showNewCategory && (
                                <button type="button" onClick={() => setShowNewCategory(true)} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                                    <Plus className="h-2 w-2" /> Kategori Baru
                                </button>
                            )}
                        </div>
                        
                        {showNewCategory ? (
                            <div className="flex gap-2 animate-in slide-in-from-top-1 duration-200">
                                <input
                                    type="text"
                                    placeholder="Nama kategori..."
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                />
                                <button type="button" onClick={handleCreateCategory} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold">Simpan</button>
                                <button type="button" onClick={() => setShowNewCategory(false)} className="text-slate-400 px-2 py-2 rounded-lg text-xs">Batal</button>
                            </div>
                        ) : (
                            <select
                                required
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 transition-all font-medium"
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Diterima Dari (Opsional)</label>
                        <input
                            type="text"
                            placeholder="Contoh: Customer A, PT. Maju Jaya"
                            value={formData.receivedFrom}
                            onChange={(e) => setFormData({ ...formData, receivedFrom: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Keterangan / Memo</label>
                        <textarea
                            placeholder="Detail transaksi..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 outline-none transition-all min-h-[80px]"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><Save className="h-4 w-4" /> {initialData ? 'Perbarui Transaksi' : 'Simpan Transaksi'}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

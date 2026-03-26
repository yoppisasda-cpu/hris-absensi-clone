'use client';

import { useState, useEffect } from "react";
import { X, Save, Landmark, Wallet } from "lucide-react";
import api from "@/lib/api";

interface AddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: {
        id: number;
        name: string;
        type: string;
        balance: number;
    } | null;
}

export default function AddAccountModal({ isOpen, onClose, onSuccess, initialData }: AddAccountModalProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        type: initialData?.type || 'BANK',
        balance: initialData?.balance.toString() || '0'
    });
    const [loading, setLoading] = useState(false);

    // Update form when initialData changes (when modal opens for edit)
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                type: initialData.type,
                balance: initialData.balance.toString()
            });
        } else {
            setFormData({ name: '', type: 'BANK', balance: '0' });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (initialData) {
                // Edit mode
                await api.patch(`/finance/accounts/${initialData.id}`, {
                    name: formData.name,
                    type: formData.type
                });
            } else {
                // Create mode
                await api.post('/finance/accounts', formData);
            }
            onSuccess();
            onClose();
            if (!initialData) setFormData({ name: '', type: 'BANK', balance: '0' });
        } catch (error: any) {
            console.error("Gagal menyimpan akun", error);
            alert(error.response?.data?.error || "Gagal menyimpan akun keuangan.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h3 className="text-lg font-bold text-slate-900">
                        {initialData ? 'Edit Akun Kas & Bank' : 'Tambah Akun Kas & Bank'}
                    </h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Akun</label>
                        <input
                            type="text"
                            required
                            placeholder="Contoh: Bank BCA, Kas Kecil, Tunai"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipe Akun</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'BANK' })}
                                className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-all ${
                                    formData.type === 'BANK' 
                                    ? 'border-blue-600 bg-blue-50 text-blue-600' 
                                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                            >
                                <Landmark className="h-4 w-4" /> Bank
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'CASH' })}
                                className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-all ${
                                    formData.type === 'CASH' 
                                    ? 'border-blue-600 bg-blue-50 text-blue-600' 
                                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                            >
                                <Wallet className="h-4 w-4" /> Kas/Tunai
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5 opacity-80">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {initialData ? 'Saldo Saat Ini (Rp)' : 'Saldo Awal (Rp)'}
                        </label>
                        <input
                            type="number"
                            required
                            disabled={!!initialData}
                            placeholder="0"
                            value={formData.balance}
                            onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                            className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 outline-none transition-all font-mono font-bold text-blue-600 ${initialData ? 'bg-slate-50 cursor-not-allowed opacity-70' : ''}`}
                        />
                        {initialData && (
                            <p className="text-[10px] text-slate-400 italic">* Saldo hanya bisa diubah melalui transaksi pemasukan/pengeluaran.</p>
                        )}
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
                                <><Save className="h-4 w-4" /> {initialData ? 'Simpan Perubahan' : 'Simpan Akun'}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

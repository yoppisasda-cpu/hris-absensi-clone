'use client';

import { useState, useEffect } from "react";
import { X, ArrowRight, Save, Loader2, AlertCircle } from "lucide-react";
import api from "@/lib/api";

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function TransferModal({ isOpen, onClose, onSuccess }: TransferModalProps) {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: 'Setoran Kasir ke Bank'
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchAccounts();
        }
    }, [isOpen]);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/accounts');
            setAccounts(res.data);
            if (res.data.length >= 2) {
                setFormData(prev => ({
                    ...prev,
                    fromAccountId: res.data[0].id.toString(),
                    toAccountId: res.data[1].id.toString()
                }));
            }
        } catch (err) {
            console.error("Gagal mengambil daftar akun", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (formData.fromAccountId === formData.toAccountId) {
            setError("Akun sumber dan tujuan tidak boleh sama.");
            return;
        }

        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) {
            setError("Masukkan jumlah transfer yang valid.");
            return;
        }

        const sourceAcc = accounts.find(a => a.id.toString() === formData.fromAccountId);
        if (sourceAcc && sourceAcc.balance < amount) {
            setError(`Saldo tidak mencukupi (Tersedia: Rp ${sourceAcc.balance.toLocaleString()})`);
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/finance/transfer', formData);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || "Gagal melakukan transfer dana.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <ArrowRight className="h-5 w-5 text-blue-600" /> Transfer Dana / Setoran
                    </h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-bold text-red-600 animate-in slide-in-from-top-1">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
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

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sumber Dana</label>
                            <select
                                required
                                value={formData.fromAccountId}
                                onChange={(e) => setFormData({ ...formData, fromAccountId: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:border-red-400 focus:bg-white focus:outline-none transition-all appearance-none"
                            >
                                <option value="" disabled>Pilih Akun Sumber</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} (Saldo: Rp {acc.balance.toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-center -my-2 relative z-10">
                            <div className="bg-white p-2 rounded-full border border-slate-100 shadow-sm">
                                <ArrowRight className="h-4 w-4 text-slate-300 transform rotate-90 sm:rotate-0" />
                            </div>
                        </div>

                        <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tujuan Dana</label>
                            <select
                                required
                                value={formData.toAccountId}
                                onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:border-blue-400 focus:bg-white focus:outline-none transition-all appearance-none"
                            >
                                <option value="" disabled>Pilih Akun Tujuan</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} (Saldo: Rp {acc.balance.toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Keterangan / Memo</label>
                        <textarea
                            placeholder="Detail transfer..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 outline-none transition-all min-h-[60px]"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all font-primary"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || loading}
                            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 font-primary"
                        >
                            {submitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <><Save className="h-4 w-4" /> Proses Transfer</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
            <div className="glass w-full max-w-md rounded-[3rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-slate-950/50 border-b border-indigo-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <ArrowRight className="h-6 w-6 stroke-[3px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Journal Transfer</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Liquidity Deployment Protocol</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
                    {error && (
                        <div className="flex items-center gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-[10px] font-black text-rose-500 uppercase italic tracking-widest animate-in slide-in-from-top-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Effective Date</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-4 px-5 text-sm font-black text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all italic shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Quantum (IDR)</label>
                            <input
                                type="number"
                                required
                                placeholder="0"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-4 px-5 text-sm font-black text-indigo-400 focus:ring-1 focus:ring-indigo-500 outline-none transition-all italic shadow-inner text-glow-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-4 py-2 relative">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Source Interface</label>
                            <select
                                required
                                value={formData.fromAccountId}
                                onChange={(e) => setFormData({ ...formData, fromAccountId: e.target.value })}
                                className="w-full rounded-[2rem] border border-slate-800 bg-slate-950 px-6 py-5 text-xs font-black text-white focus:border-rose-500/50 outline-none transition-all appearance-none cursor-pointer italic uppercase tracking-tighter"
                            >
                                <option value="" disabled>-- SELECT SOURCE ACCOUNT --</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id} className="bg-slate-900">
                                        {acc.name.toUpperCase()} (Rp {acc.balance.toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-center -my-3 relative z-10">
                            <div className="bg-slate-950 p-3 rounded-full border border-slate-800 shadow-xl">
                                <ArrowRight className="h-4 w-4 text-slate-600 rotate-90" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Destination Target</label>
                            <select
                                required
                                value={formData.toAccountId}
                                onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })}
                                className="w-full rounded-[2rem] border border-slate-800 bg-slate-950 px-6 py-5 text-xs font-black text-white focus:border-emerald-500/50 outline-none transition-all appearance-none cursor-pointer italic uppercase tracking-tighter"
                            >
                                <option value="" disabled>-- SELECT TARGET ACCOUNT --</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id} className="bg-slate-900">
                                        {acc.name.toUpperCase()} (Rp {acc.balance.toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Reference Log / Memo</label>
                        <textarea
                            placeholder="Enter transaction details..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full rounded-[2rem] bg-slate-950 border border-slate-800 py-5 px-6 text-sm font-black text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all min-h-[100px] no-scrollbar italic placeholder:text-slate-800"
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-[24px] border border-white/5 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:bg-white/5 transition-all italic"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || loading}
                            className="flex-[2] rounded-[24px] bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 py-5 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/10 hover:bg-indigo-600 hover:text-white active:scale-95 transition-all flex items-center justify-center gap-3 italic"
                        >
                            {submitting ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500"></div>
                            ) : (
                                <><Save className="h-5 w-5" /> Execute Transfer</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

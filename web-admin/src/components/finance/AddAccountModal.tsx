'use client';

import { useState, useEffect } from "react";
import { X, Save, Landmark, Wallet, Building2 } from "lucide-react";
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
        branchId?: number | null;
    } | null;
}

export default function AddAccountModal({ isOpen, onClose, onSuccess, initialData }: AddAccountModalProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        type: initialData?.type || 'BANK',
        balance: initialData?.balance.toString() || '0',
        branchId: initialData?.branchId?.toString() || ''
    });
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch branches
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await api.get('/branches');
                setBranches(res.data);
            } catch (error) {
                console.error("Gagal mengambil daftar cabang", error);
            }
        };
        if (isOpen) fetchBranches();
    }, [isOpen]);

    // Update form when initialData changes (when modal opens for edit)
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                type: initialData.type,
                balance: initialData.balance.toString(),
                branchId: initialData.branchId?.toString() || ''
            });
        } else {
            setFormData({ name: '', type: 'BANK', balance: '0', branchId: '' });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                type: formData.type,
                balance: formData.balance,
                branchId: formData.branchId ? parseInt(formData.branchId) : null
            };

            if (initialData) {
                // Edit mode
                await api.patch(`/finance/accounts/${initialData.id}`, payload);
            } else {
                // Create mode
                await api.post('/finance/accounts', payload);
            }
            onSuccess();
            onClose();
            if (!initialData) setFormData({ name: '', type: 'BANK', balance: '0', branchId: '' });
        } catch (error: any) {
            console.error("Gagal menyimpan akun", error);
            alert(error.response?.data?.error || "Gagal menyimpan akun keuangan.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
            <div className="glass w-full max-w-lg rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-slate-950/50 border-b border-indigo-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <Landmark className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Fiscal Nexus Node</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">{initialData ? 'Update Profile Protocol' : 'Account Initialization'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Account Nomenclature</label>
                            <input
                                type="text"
                                required
                                placeholder="EX: MAIN_RESERVE // PETTY_CASH..."
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase shadow-inner placeholder:text-slate-900"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1 flex items-center gap-2">
                                <Building2 className="h-3 w-3 text-indigo-400" /> Branch Affiliation
                            </label>
                            <select
                                value={formData.branchId}
                                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer"
                            >
                                <option value="">ENTITAS PUSAT / GLOBAL</option>
                                {branches.map(branch => (
                                    <option key={branch.id} value={branch.id} className="bg-slate-900">{branch.name.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Nexus Classification</label>
                            <div className="grid grid-cols-2 gap-4 p-1.5 bg-slate-950 border border-white/5 rounded-[22px]">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'BANK' })}
                                    className={`flex items-center justify-center gap-3 rounded-2xl py-4 text-[10px] font-black transition-all italic tracking-widest uppercase ${
                                        formData.type === 'BANK' 
                                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 shadow-lg' 
                                        : 'text-slate-600 hover:text-white'
                                    }`}
                                >
                                    <Landmark className="h-4 w-4" /> PERBANKAN
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'CASH' })}
                                    className={`flex items-center justify-center gap-3 rounded-2xl py-4 text-[10px] font-black transition-all italic tracking-widest uppercase ${
                                        formData.type === 'CASH' 
                                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 shadow-lg' 
                                        : 'text-slate-600 hover:text-white'
                                    }`}
                                >
                                    <Wallet className="h-4 w-4" /> KAS / TUNAI
                                </button>
                            </div>
                        </div>

                        <div className={`space-y-2 transition-all ${initialData ? 'opacity-40 filter blur-[0.5px]' : 'opacity-100'}`}>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">
                                {initialData ? 'Liquid Assets (Read-Only)' : 'Initial Reserve Magnitude (IDR)'}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    required
                                    disabled={!!initialData}
                                    placeholder="0"
                                    value={formData.balance}
                                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase shadow-inner placeholder:text-slate-900"
                                />
                            </div>
                            {initialData && (
                                <p className="text-[8px] text-slate-600 italic ml-1 tracking-widest uppercase font-black uppercase">* Balance adjustments must be finalized via Journal Entries protocol.</p>
                            )}
                        </div>
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
                            className="flex-[2] rounded-2xl bg-indigo-600 py-5 text-[10px] font-black text-white shadow-2xl shadow-indigo-900/40 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.3em] italic border border-white/10"
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

'use client';

import { useState, useEffect } from "react";
import { X, Copy, Check, Building2, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

interface ImportExpenseCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ImportExpenseCategoryModal({ isOpen, onClose, onSuccess }: ImportExpenseCategoryModalProps) {
    const [companies, setCompanies] = useState<any[]>([]);
    const [sourceCompanyId, setSourceCompanyId] = useState<string>("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchCompanies();
        }
    }, [isOpen]);

    const fetchCompanies = async () => {
        try {
            const res = await api.get('/companies');
            setCompanies(res.data);
        } catch (error) {
            console.error("Gagal mengambil data perusahaan", error);
        }
    };

    const handleImport = async () => {
        if (!sourceCompanyId) return;
        setLoading(true);
        try {
            const res = await api.post('/finance/expense-categories/import', {
                sourceCompanyId
            });
            toast.success(res.data.message);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Gagal import kategori pengeluaran", error);
            toast.error(error.response?.data?.error || "Gagal melakukan import kategori pengeluaran");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#0A0A0B] border border-white/10 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-8 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <Copy className="h-6 w-6 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic tracking-tight text-white uppercase">Import Kategori</h2>
                            <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mt-1 italic">Kloning Dari Cabang Lain</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block italic">Pilih Perusahaan Sumber</label>
                        <div className="relative group">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-indigo-500 transition-colors" />
                            <select 
                                className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-4 pl-12 pr-4 text-sm text-white focus:border-indigo-500/50 outline-none transition-all appearance-none italic font-bold uppercase tracking-wider"
                                value={sourceCompanyId}
                                onChange={(e) => setSourceCompanyId(e.target.value)}
                            >
                                <option value="">--- PILIH PERUSAHAAN ASAL ---</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl flex gap-4">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                        <p className="text-[10px] text-amber-500/80 font-bold uppercase italic leading-relaxed tracking-wide">
                            Perhatian: Kategori dengan nama yang persis sama di database saat ini akan dilewati secara otomatis untuk menghindari duplikasi.
                        </p>
                    </div>
                </div>

                <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
                    <button 
                        onClick={onClose}
                        className="flex-1 px-8 py-4 rounded-2xl border border-slate-800 text-[10px] font-black text-slate-500 hover:text-white hover:bg-slate-800 transition-all uppercase tracking-widest italic"
                    >
                        Batalkan
                    </button>
                    <button 
                        onClick={handleImport}
                        disabled={loading || !sourceCompanyId}
                        className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/20 active:scale-95 transition-all border border-indigo-400/20 italic flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Copy className="h-4 w-4" /> 
                                Import Semua Kategori
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

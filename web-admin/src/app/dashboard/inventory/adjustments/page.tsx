'use client';

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search, Filter, History, ArrowUpRight, ArrowDownRight, RefreshCcw, Package, Calendar } from "lucide-react";
import api from "@/lib/api";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function AdjustmentsPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventory/transactions');
            setTransactions(res.data);
        } catch (error) {
            console.error("Gagal mengambil histori stok", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const filteredTransactions = transactions.filter(t => 
        t.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.reference?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTypeDetails = (type: string) => {
        switch (type) {
            case 'IN':
                return { label: 'Stok Masuk', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: ArrowUpRight };
            case 'OUT':
                return { label: 'Stok Keluar', color: 'text-red-600', bg: 'bg-red-50', icon: ArrowDownRight };
            case 'ADJUST':
                return { label: 'Koreksi', color: 'text-orange-600', bg: 'bg-orange-50', icon: RefreshCcw };
            default:
                return { label: type, color: 'text-slate-600', bg: 'bg-slate-50', icon: History };
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                        <History className="h-6 w-6 stroke-[2.5px]" />
                    </div>
                    <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase text-glow-sm">
                        Analisis <span className="text-indigo-500">Pergerakan</span>
                    </h1>
                </div>
                <p className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase italic max-w-2xl leading-relaxed">
                    Jalur audit rinci dari pergerakan stok global. Pantau setiap penambahan, pengurangan, dan koreksi di seluruh jaringan logistik.
                </p>
            </div>

            <div className="rounded-[40px] border border-white/5 bg-slate-900/50 shadow-2xl overflow-hidden mb-20 backdrop-blur-xl">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 border-b border-white/5 p-8 bg-slate-950/30">
                    <div className="relative w-full lg:w-[450px] group">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors z-10" />
                        <input
                            type="text"
                            placeholder="CARI PRODUK, SKU, ATAU REFERENSI LOG..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 pl-12 pr-6 text-[10px] font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase placeholder:text-slate-800 shadow-inner"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-5 py-2 rounded-full bg-slate-800/50 border border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest italic flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div> LOG_SYNC_ESTABLISHED
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead>
                            <tr className="bg-slate-950/50">
                                <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[9px] text-slate-500 italic border-b border-white/5">Penanda Waktu</th>
                                <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[9px] text-slate-500 italic border-b border-white/5">SKU / Deskripsi</th>
                                <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[9px] text-slate-500 italic border-b border-white/5">Tipe Pergerakan</th>
                                <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[9px] text-slate-500 italic text-center border-b border-white/5">Jumlah</th>
                                <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[9px] text-slate-500 italic border-b border-white/5">Referensi / Catatan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                             {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse border-b border-white/5">
                                        <td colSpan={5} className="px-8 py-6"><div className="h-10 w-full rounded-2xl bg-white/5"></div></td>
                                    </tr>
                                ))
                            ) : filteredTransactions.length > 0 ? (
                                filteredTransactions.map((t) => {
                                    const details = getTypeDetails(t.type);
                                    const Icon = details.icon;
                                    return (
                                        <tr key={t.id} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <div className="flex items-center gap-3 text-slate-400 font-black uppercase tracking-[0.1em] text-[9px] italic group-hover:text-indigo-400 transition-colors">
                                                    <Calendar className="h-3.5 w-3.5 opacity-50 stroke-[2.5px]" />
                                                    {format(new Date(t.createdAt), 'dd MMM yyyy, HH:mm', { locale: id }).toUpperCase()}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all shadow-inner">
                                                        <Package className="h-5 w-5 stroke-[1.5px]" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-white text-[11px] leading-tight italic uppercase tracking-tighter group-hover:text-indigo-400 transition-colors">{t.product_name}</p>
                                                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mt-1 italic">{t.product_sku || 'UNTRACKED_SKU'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`inline-flex items-center gap-2 rounded-xl px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] border italic ${t.type === 'IN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : t.type === 'OUT' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                    <Icon className="h-3 w-3 stroke-[2.5px]" />
                                                    {details.label.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`text-2xl font-black italic tracking-tighter text-glow-sm ${t.type === 'OUT' ? 'text-red-500' : t.type === 'IN' ? 'text-emerald-400' : 'text-amber-500'}`}>
                                                    {t.type === 'OUT' ? '−' : t.type === 'IN' ? '+' : ''}{t.quantity}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-slate-500 font-black italic text-[10px] uppercase tracking-widest max-w-xs truncate group-hover:text-slate-300 transition-colors">"{t.reference || 'SYSTEM_LOG'}"</p>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-32 text-center text-slate-600 uppercase tracking-[0.2em] font-black italic text-xs">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="h-20 w-20 rounded-[32px] bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-800">
                                                <History className="h-10 w-10" />
                                            </div>
                                            TIDAK ADA PROTOKOL PERGERAKAN TERDETEKSI
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 py-12 border-t border-white/5 italic">
                <div className="flex items-center gap-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    <p>© 2026 AIVOLA CORE - ANALITIK LOGISTIK GLOBAL</p>
                    <span className="h-1 w-1 bg-indigo-500 rounded-full animate-ping"></span>
                    <p>INTEGRITAS STOK TERVERIFIKASI</p>
                </div>
                <div className="flex gap-3">
                    <div className="h-2 w-10 rounded-full bg-indigo-500/20 border border-indigo-500/30"></div>
                    <div className="h-2 w-2 rounded-full bg-slate-800"></div>
                </div>
            </div>
        </DashboardLayout>
    );
}

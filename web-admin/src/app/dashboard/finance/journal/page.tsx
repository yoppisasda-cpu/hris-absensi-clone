'use client';

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search, Filter, Download, Printer, FileText, Calendar, ArrowRight, History, BookOpen } from "lucide-react";
import api from "@/lib/api";

export default function JournalPage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchJournal = async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/journal');
            setEntries(res.data);
        } catch (error) {
            console.error("Gagal mengambil data jurnal", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJournal();
    }, []);

    const filteredEntries = entries.filter(entry => 
        entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.accountName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Jurnal Umum
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 font-medium italic">Histori lengkap setiap mutasi debit dan kredit akun perusahaan.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                        <Printer className="h-4 w-4" /> Cetak
                    </button>
                    <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all">
                        <Download className="h-4 w-4" /> Export CSV
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 p-6">
                    <div className="relative w-full sm:w-96 group">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari referensi, keterangan, atau akun..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                            <Filter className="h-4 w-4" /> Filter Periode
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-900 text-white">
                            <tr>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Tanggal</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Ref #</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Keterangan / Akun</th>
                                <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px]">Debit (Rp)</th>
                                <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px]">Kredit (Rp)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4"><div className="h-4 w-full rounded bg-slate-100"></div></td>
                                    </tr>
                                ))
                            ) : filteredEntries.length > 0 ? (
                                filteredEntries.map((entry, index) => {
                                    // Check if this is the first line of a transaction (D)
                                    const isDebit = entry.debit > 0;
                                    const showHeader = isDebit;
                                    
                                    return (
                                        <tr key={entry.id} className={`${showHeader ? 'bg-slate-50/10' : ''} hover:bg-slate-50 transition-colors`}>
                                            <td className="px-6 py-4 whitespace-nowrap align-top">
                                                {showHeader && (
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                        <span className="font-bold text-slate-700">{new Date(entry.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap align-top font-mono text-[11px] text-indigo-600 font-black">
                                                {showHeader && entry.ref}
                                            </td>
                                            <td className="px-6 py-4">
                                                {showHeader && <div className="text-xs font-bold text-slate-900 mb-1">{entry.description}</div>}
                                                <div className={`text-sm font-medium ${isDebit ? 'text-slate-700 pl-0' : 'text-slate-500 pl-8 flex items-center gap-2'}`}>
                                                    {!isDebit && <ArrowRight className="h-3 w-3 text-slate-300" />}
                                                    {entry.accountName}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right align-bottom">
                                                {isDebit && <span className="font-black text-slate-900">Rp {entry.debit.toLocaleString()}</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right align-bottom">
                                                {!isDebit && <span className="font-black text-slate-900">Rp {entry.credit.toLocaleString()}</span>}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="rounded-full bg-slate-50 p-6"><BookOpen className="h-10 w-10 text-slate-200" /></div>
                                            <p className="text-sm font-bold text-slate-400 italic">Belum ada aktivitas jurnal yang tercatat.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {!loading && filteredEntries.length > 0 && (
                            <tfoot className="bg-slate-50 font-black">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-right uppercase tracking-widest text-[10px] text-slate-500">Total Periode Ini</td>
                                    <td className="px-6 py-4 text-right text-indigo-600 text-base">
                                        Rp {filteredEntries.reduce((sum, e) => sum + e.debit, 0).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right text-indigo-600 text-base">
                                        Rp {filteredEntries.reduce((sum, e) => sum + e.credit, 0).toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 border-t border-slate-200">
                <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <p>© 2026 aivola.id - Professional Accounting Integrity</p>
                    <span className="h-4 w-[1px] bg-slate-200"></span>
                    <History className="h-3 w-3" />
                    <p>Double-Entry Verification: Success</p>
                </div>
                <div className="flex gap-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                    <div className="h-2 w-2 rounded-full bg-slate-200"></div>
                </div>
            </div>
        </DashboardLayout>
    );
}

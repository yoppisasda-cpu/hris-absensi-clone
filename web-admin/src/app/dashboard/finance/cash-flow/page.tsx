'use client';

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Calendar, Download, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet, Banknote, Printer, FileText, Activity } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function CashFlowPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/finance/reports/cash-flow?month=${month}&year=${year}`);
            setData(res.data);
        } catch (error) {
            console.error("Gagal mengambil laporan Arus Kas", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [month, year]);

    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const handleExport = async () => {
        const toastId = toast.loading('Menyiapkan file Excel...');
        try {
            const response = await api.get(`/finance/reports/cash-flow/export?month=${month}&year=${year}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Arus_Kas_${month}_${year}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Laporan berhasil diunduh.', { id: toastId });
        } catch (error) {
            console.error("Gagal mengekspor data", error);
            toast.error("Gagal mengunduh laporan Excel", { id: toastId });
        }
    };

    if (loading && !data) {
        return (
            <DashboardLayout>
                <div className="flex h-[60vh] items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"></div>
                        <p className="text-sm font-bold text-slate-500 italic">Menganalisis Arus Kas...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Laporan Arus Kas
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 font-medium">Lacak setiap Rupiah yang masuk dan keluar periode {months[month-1]} {year}.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                    >
                        <Printer className="h-4 w-4" /> Cetak
                    </button>
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                        <Download className="h-4 w-4" /> Export Excel
                    </button>
                </div>
            </div>

            <div className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white dark:bg-slate-800 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Pilih Periode:</span>
                </div>
                <select 
                    value={month} 
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                    className="rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    {months.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                    ))}
                </select>
                <select 
                    value={year} 
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            <div className="printable-content">
                {/* Summary Highlights */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
                    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm group hover:border-emerald-500 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Awal</p>
                            <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-emerald-50 transition-colors"><Wallet className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" /></div>
                        </div>
                        <p className="text-2xl font-black text-slate-900 italic">Rp {data?.startingBalance.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm group hover:border-blue-500 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kas Bersih (Net Change)</p>
                            <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                {data?.netCashFlow >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                            </div>
                        </div>
                        <p className={`text-2xl font-black italic ${data?.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {data?.netCashFlow >= 0 ? '+' : ''} Rp {data?.netCashFlow.toLocaleString()}
                        </p>
                    </div>
                    <div className="rounded-2xl bg-emerald-600 p-6 shadow-xl shadow-emerald-100 text-white relative overflow-hidden group">
                        <Activity className="absolute -right-4 -top-4 h-24 w-24 text-white/10 group-hover:scale-110 transition-transform" />
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Saldo Akhir</p>
                            <p className="text-3xl font-black italic drop-shadow-md">Rp {data?.endingBalance.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Detailed Flow Table */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden mb-12">
                    <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                            <FileText className="h-4 w-4 text-emerald-400" /> Rincian Arus Kas
                        </h2>
                        <span className="text-[10px] font-bold text-white/50 italic">Basis Kas (Cash Basis)</span>
                    </div>
                    
                    <table className="w-full border-collapse text-left">
                        <tbody className="divide-y divide-slate-100 italic">
                            {/* Section: Inflow */}
                            <tr className="bg-slate-50/80 not-italic">
                                <td className="px-6 py-3 font-black text-slate-900 uppercase tracking-widest text-[11px] flex items-center gap-2">
                                    <ArrowUpRight className="h-3 w-3 text-emerald-600" /> ARUS KAS MASUK (INFLOW)
                                </td>
                                <td className="px-6 py-3 text-right"></td>
                            </tr>
                            {Object.entries(data?.inflow.categories || {}).length > 0 ? (
                                Object.entries(data?.inflow.categories || {}).map(([name, amount]: [string, any]) => (
                                    <tr key={name} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-10 py-3 text-sm font-semibold text-slate-600">{name}</td>
                                        <td className="px-6 py-3 text-right text-sm font-bold text-emerald-600">Rp {amount.toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td className="px-10 py-3 text-xs text-slate-400">Tidak ada pemasukan tercatat</td>
                                    <td></td>
                                </tr>
                            )}
                            <tr className="not-italic bg-emerald-50/20">
                                <td className="px-6 py-4 font-bold text-emerald-700 text-sm italic">TOTAL KAS MASUK</td>
                                <td className="px-6 py-4 text-right font-black text-emerald-700 text-base underline decoration-double">Rp {data?.inflow.total.toLocaleString()}</td>
                            </tr>

                            <tr className="h-4 bg-white border-none"><td></td><td></td></tr>

                            {/* Section: Outflow */}
                            <tr className="bg-slate-50/80 not-italic">
                                <td className="px-6 py-3 font-black text-slate-900 uppercase tracking-widest text-[11px] flex items-center gap-2">
                                    <ArrowDownRight className="h-3 w-3 text-red-600" /> ARUS KAS KELUAR (OUTFLOW)
                                </td>
                                <td className="px-6 py-3 text-right"></td>
                            </tr>
                            {Object.entries(data?.outflow.categories || {}).map(([name, amount]: [string, any]) => (
                                <tr key={name} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-10 py-3 text-sm font-semibold text-slate-600">{name}</td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-red-600">(Rp {amount.toLocaleString()})</td>
                                </tr>
                            ))}
                            <tr className="not-italic bg-red-50/20">
                                <td className="px-6 py-4 font-bold text-red-700 text-sm italic">TOTAL KAS KELUAR</td>
                                <td className="px-6 py-4 text-right font-black text-red-700 text-base underline decoration-double">(Rp {data?.outflow.total.toLocaleString()})</td>
                            </tr>

                            <tr className="h-8 bg-white border-none"><td></td><td></td></tr>

                            <tr className="bg-slate-900 not-italic">
                                <td className="px-6 py-5 font-black text-white text-base tracking-tight uppercase">KENAIKAN / (PENURUNAN) KAS BERSIH</td>
                                <td className={`px-6 py-5 text-right font-black text-xl italic underline ${data?.netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    Rp {data?.netCashFlow.toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 border-t border-slate-200 italic">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <p>© 2026 aivola.id - High Transparency Cash Management</p>
                    <span className="h-4 w-[1px] bg-slate-200"></span>
                    <p>Financial Integrity Verified</p>
                </div>
                <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                    <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                </div>
            </div>
        </DashboardLayout>
    );
}

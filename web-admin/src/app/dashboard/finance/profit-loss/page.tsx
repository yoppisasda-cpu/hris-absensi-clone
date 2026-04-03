'use client';

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Calendar, Download, TrendingUp, TrendingDown, PieChart, ChevronDown, ChevronRight, Calculator, FileText, Printer, BarChart3 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function ProfitLossPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/finance/reports/profit-loss?month=${month}&year=${year}`);
            setData(res.data);
        } catch (error) {
            console.error("Gagal mengambil laporan Laba Rugi", error);
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
            const response = await api.get(`/finance/reports/profit-loss/export?month=${month}&year=${year}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Laba_Rugi_${month}_${year}.xlsx`);
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
                        <p className="text-sm font-bold text-slate-500 italic">Menghitung Laba Rugi...</p>
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
                        Laporan Laba / Rugi
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 font-medium">Ringkasan performa keuangan perusahaan periode {months[month-1]} {year}.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
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
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Periode:</span>
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
                {loading && <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600"></div>}
            </div>

            <div className="printable-content">
                {/* Summary Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 mb-8">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-emerald-500">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pendapatan</p>
                        <p className="text-xl font-black text-slate-900 italic">Rp {data?.revenue.total.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-red-500">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total HPP (Bahan)</p>
                        <p className="text-xl font-black text-red-600 italic">Rp {data?.cogs.total.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-blue-500">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Beban Operasional</p>
                        <p className="text-xl font-black text-blue-600 italic">Rp {data?.opex.total.toLocaleString()}</p>
                    </div>
                    <div className={`rounded-2xl border border-slate-200 p-5 shadow-sm border-l-4 ${data?.netProfit >= 0 ? 'bg-emerald-50 border-l-emerald-600' : 'bg-red-50 border-l-red-600'}`}>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Laba Bersih</p>
                        <p className={`text-xl font-black italic ${data?.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            Rp {data?.netProfit.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Detailed Report Table */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden mb-12">
                    <div className="bg-slate-900 px-6 py-4">
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                            <FileText className="h-4 w-4 text-emerald-400" /> Rincian Laporan Operasional
                        </h2>
                    </div>
                    
                    <table className="w-full border-collapse text-left">
                        <tbody className="divide-y divide-slate-100 italic">
                            {/* Section: Pendapatan */}
                            <tr className="bg-slate-50/80 not-italic">
                                <td className="px-6 py-3 font-black text-slate-900 uppercase tracking-widest text-[11px]">I. Pendapatan</td>
                                <td className="px-6 py-3 text-right"></td>
                            </tr>
                            {Object.entries(data?.revenue.categories || {}).map(([name, amount]: [string, any]) => (
                                <tr key={name} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-10 py-3 text-sm font-semibold text-slate-600">{name}</td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">Rp {amount.toLocaleString()}</td>
                                </tr>
                            ))}
                            <tr className="not-italic bg-emerald-50/30">
                                <td className="px-6 py-4 font-bold text-emerald-700 text-sm">TOTAL PENDAPATAN</td>
                                <td className="px-6 py-4 text-right font-black text-emerald-700 text-base underline decoration-double">Rp {data?.revenue.total.toLocaleString()}</td>
                            </tr>

                            <tr className="h-4 bg-white border-none"><td></td><td></td></tr>

                            {/* Section: HPP */}
                            <tr className="bg-slate-50/80 not-italic">
                                <td className="px-6 py-3 font-black text-slate-900 uppercase tracking-widest text-[11px]">II. Beban Pokok Penjualan (HPP)</td>
                                <td className="px-6 py-3 text-right"></td>
                            </tr>
                            {Object.entries(data?.cogs.categories || {}).map(([name, amount]: [string, any]) => (
                                <tr key={name} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-10 py-3 text-sm font-semibold text-slate-600 font-mono tracking-tighter text-red-500/80">{name}</td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-red-600">(Rp {amount.toLocaleString()})</td>
                                </tr>
                            ))}
                            <tr className="not-italic bg-red-50/20">
                                <td className="px-6 py-4 font-bold text-red-700 text-sm italic">TOTAL HARGA POKOK PENJUALAN</td>
                                <td className="px-6 py-4 text-right font-black text-red-700 text-base">(Rp {data?.cogs.total.toLocaleString()})</td>
                            </tr>

                            {/* Gross Profit Row */}
                            <tr className="bg-slate-900 not-italic">
                                <td className="px-6 py-5 font-black text-white text-base tracking-tight uppercase">LABA KOTOR (GROSS PROFIT)</td>
                                <td className="px-6 py-5 text-right font-black text-emerald-400 text-xl italic underline">Rp {data?.grossProfit.toLocaleString()}</td>
                            </tr>

                            <tr className="h-4 bg-white border-none"><td></td><td></td></tr>

                            {/* Section: Expenses (OpEx) */}
                            <tr className="bg-slate-50/80 not-italic">
                                <td className="px-6 py-3 font-black text-slate-900 uppercase tracking-widest text-[11px]">III. Beban Operasional</td>
                                <td className="px-6 py-3 text-right"></td>
                            </tr>
                            {Object.entries(data?.opex.categories || {}).map(([name, amount]: [string, any]) => (
                                <tr key={name} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-10 py-3 text-sm font-semibold text-slate-600 font-mono tracking-tighter text-blue-500/80">{name}</td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-blue-600">(Rp {amount.toLocaleString()})</td>
                                </tr>
                            ))}
                            <tr className="not-italic bg-blue-50/20">
                                <td className="px-6 py-4 font-bold text-blue-700 text-sm">TOTAL BEBAN OPERASIONAL</td>
                                <td className="px-6 py-4 text-right font-black text-blue-700 text-base underline">(Rp {data?.opex.total.toLocaleString()})</td>
                            </tr>

                            <tr className="h-8 bg-white border-none"><td></td><td></td></tr>

                            {/* Net Profit Row */}
                            <tr className={`not-italic border-t-4 ${data?.netProfit >= 0 ? 'bg-emerald-600 border-t-emerald-800' : 'bg-red-600 border-t-red-800'}`}>
                                <td className="px-6 py-6 font-black text-white text-xl tracking-wider uppercase flex items-center gap-3">
                                    {data?.netProfit >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                                    LABA / (RUGI) BERSIH TAHUN BERJALAN
                                </td>
                                <td className="px-6 py-6 text-right font-black text-white text-2xl drop-shadow-lg shadow-black italic">
                                    Rp {data?.netProfit.toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 border-t border-slate-200">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <p>© 2026 aivola.id - Professional Finance System</p>
                    <span className="h-4 w-[1px] bg-slate-200"></span>
                    <p>Waktu Print: {new Date().toLocaleString()}</p>
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



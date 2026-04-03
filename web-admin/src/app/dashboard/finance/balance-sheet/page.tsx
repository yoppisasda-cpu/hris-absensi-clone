'use client';

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Landmark, Wallet, ShieldCheck, Scale, FileText, Download, Printer, AlertCircle, Info, Building, HandCoins } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function BalanceSheetPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/finance/reports/balance-sheet`);
            setData(res.data);
        } catch (error) {
            console.error("Gagal mengambil laporan Neraca", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    const handleExport = async () => {
        const toastId = toast.loading('Menyiapkan file Excel...');
        try {
            const response = await api.get('/finance/reports/balance-sheet/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Neraca_${new Date().toISOString().split('T')[0]}.xlsx`);
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
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
                        <p className="text-sm font-bold text-slate-500 italic">Menyusun Neraca Keuangan...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const today = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <DashboardLayout>
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Neraca Keuangan
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 font-medium italic">Posisi keuangan perusahaan per tanggal {today}.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Printer className="h-4 w-4" /> Cetak
                    </button>
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
                    >
                        <Download className="h-4 w-4" /> Export Excel
                    </button>
                </div>
            </div>

            <div className="printable-content">
                {/* Accounting Equation Banner */}
                <div className="mb-8 flex items-center justify-between gap-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-xs font-black uppercase tracking-[0.3em] opacity-80 mb-2">Persamaan Akuntansi</p>
                        <div className="flex items-center gap-4 sm:gap-8 flex-wrap">
                            <div className="text-center sm:text-left">
                                <p className="text-[10px] font-bold opacity-70">TOTAL AKTIVA (ASET)</p>
                                <p className="text-2xl font-black">Rp {data?.assets.total.toLocaleString()}</p>
                            </div>
                            <div className="text-2xl font-light opacity-50 hidden sm:block">=</div>
                            <div className="text-center sm:text-left">
                                <p className="text-[10px] font-bold opacity-70">TOTAL PASIVA (KEWAJIBAN + MODAL)</p>
                                <p className="text-2xl font-black">Rp {(data?.liabilities.total + data?.equity.total).toLocaleString()}</p>
                            </div>
                            <div className="ml-auto flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                                <span className="text-xs font-black tracking-tighter uppercase italic">Balance Verified</span>
                            </div>
                        </div>
                    </div>
                    <Scale className="absolute -right-8 -bottom-8 h-48 w-48 text-white opacity-10 rotate-12" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    {/* AKTIVA (ASSETS) */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-lg font-black text-slate-900 border-b-2 border-blue-600 pb-1 uppercase">AKTIVA (ASET)</h2>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Akun / Kategori</th>
                                        <th className="px-6 py-3 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Nilai (Rp)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 italic">
                                    {/* ASSET LANCAR */}
                                    <tr>
                                        <td className="px-6 py-3 font-black text-slate-900 text-xs tracking-wider uppercase bg-blue-50/10 not-italic">ASET LANCAR (Current Assets)</td>
                                        <td className="px-6 py-3 text-right text-xs font-bold text-slate-400 italic">Rp {data?.assets.totalCurrent.toLocaleString()}</td>
                                    </tr>
                                    {data?.assets.accounts.map((acc: any) => (
                                        <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-10 py-3 text-sm font-semibold text-slate-600 flex items-center gap-2">
                                                {acc.type === 'BANK' ? <Landmark className="h-3 w-3 text-blue-500" /> : <Wallet className="h-3 w-3 text-amber-500" />}
                                                {acc.name}
                                            </td>
                                            <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">Rp {acc.balance.toLocaleString()}</td>
                                        </tr>
                                    ))}

                                    {/* PIUTANG KARYAWAN */}
                                    <tr>
                                        <td className="px-6 py-3 font-black text-slate-900 text-xs tracking-wider uppercase bg-amber-50/10 not-italic">PIUTANG (Receivables)</td>
                                        <td className="px-6 py-3 text-right text-xs font-bold text-amber-600 italic">Rp {data?.assets.totalLoans.toLocaleString()}</td>
                                    </tr>
                                    {data?.assets.totalLoans > 0 ? (
                                        <tr className="hover:bg-slate-50 transition-colors">
                                            <td className="px-10 py-3 text-sm font-semibold text-slate-600 flex items-center gap-2">
                                                <HandCoins className="h-3 w-3 text-amber-500" />
                                                Pinjaman Karyawan (Aktif)
                                            </td>
                                            <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">Rp {data?.assets.totalLoans.toLocaleString()}</td>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <td colSpan={2} className="px-10 py-2 text-[10px] text-slate-300 italic">Tidak ada piutang aktif</td>
                                        </tr>
                                    )}

                                    {/* ASSET TETAP */}
                                    <tr>
                                        <td className="px-6 py-3 font-black text-slate-900 text-xs tracking-wider uppercase bg-emerald-50/10 not-italic border-t border-slate-100">ASET TETAP (Fixed Assets)</td>
                                        <td className="px-6 py-3 text-right text-xs font-bold text-emerald-600 italic border-t border-slate-100">Rp {data?.assets.totalFixed.toLocaleString()}</td>
                                    </tr>
                                    {data?.assets.fixedAssets?.map((asset: any) => (
                                        <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-10 py-3 text-sm font-semibold text-slate-600 italic">
                                                {asset.name} 
                                                <span className="ml-2 text-[10px] bg-slate-100 px-1 rounded not-italic text-slate-400">{asset.category}</span>
                                            </td>
                                            <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">Rp {asset.bookValue.toLocaleString()}</td>
                                        </tr>
                                    )) || (
                                        <tr>
                                            <td colSpan={2} className="px-10 py-2 text-xs italic text-slate-300">Belum ada aset tetap terdaftar</td>
                                        </tr>
                                    )}

                                    <tr className="bg-blue-600 border-t-2 border-white">
                                        <td className="px-6 py-4 font-black text-white text-sm uppercase tracking-tighter not-italic">TOTAL AKTIVA (Total Assets)</td>
                                        <td className="px-6 py-4 text-right font-black text-white text-lg italic underline decoration-double">Rp {data?.assets.total.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 rounded-xl bg-blue-50/50 flex gap-3 items-start border border-blue-100">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                            <p className="text-[11px] font-medium text-slate-500 italic leading-relaxed">
                                Aset Lancar mencakup Saldo Kas & Bank. Piutang mencakup dana pinjaman karyawan yang belum lunas. Aset Tetap mencakup nilai buku (harga beli - depresiasi) dari gedung dan peralatan.
                            </p>
                        </div>
                    </div>

                    {/* PASIVA (LIABILITIES & EQUITY) */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                                <h2 className="text-lg font-black text-slate-900 border-b-2 border-indigo-600 pb-1 uppercase">PASIVA (KEWAJIBAN & MODAL)</h2>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden border-t-4 border-t-indigo-600">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Kewajiban & Modal</th>
                                        <th className="px-6 py-3 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Nilai (Rp)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 italic">
                                    <tr>
                                        <td className="px-6 py-3 font-black text-slate-900 text-xs tracking-wider uppercase bg-red-50/30 not-italic">KEWAJIBAN (LIABILITIES)</td>
                                        <td></td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="px-10 py-3 text-sm font-semibold text-red-600 flex items-center gap-2">
                                            <AlertCircle className="h-3 w-3" />
                                            Hutang Usaha (Expense Pending)
                                        </td>
                                        <td className="px-6 py-3 text-right text-sm font-bold text-red-700">Rp {data?.liabilities.total.toLocaleString()}</td>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        <td className="px-6 py-3 font-bold text-slate-700 text-xs italic not-italic">TOTAL KEWAJIBAN</td>
                                        <td className="px-6 py-3 text-right font-black text-slate-900 text-sm italic underline">Rp {data?.liabilities.total.toLocaleString()}</td>
                                    </tr>
                                    
                                    <tr className="h-4 bg-white border-none"><td></td><td></td></tr>

                                    <tr>
                                        <td className="px-6 py-3 font-black text-indigo-700 text-xs tracking-wider uppercase bg-indigo-50/30 not-italic">MODAL & EKUITAS</td>
                                        <td></td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="px-10 py-3 text-sm font-semibold text-slate-600 italic">Ekuitas / Modal Bersih</td>
                                        <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">Rp {data?.equity.total.toLocaleString()}</td>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        <td className="px-6 py-3 font-bold text-slate-700 text-xs italic not-italic">TOTAL MODAL</td>
                                        <td className="px-6 py-3 text-right font-black text-slate-900 text-sm italic underline">Rp {data?.equity.total.toLocaleString()}</td>
                                    </tr>

                                    <tr className="h-4 bg-white border-none"><td></td><td></td></tr>

                                    <tr className="bg-indigo-700">
                                        <td className="px-6 py-5 font-black text-white text-sm uppercase tracking-tighter not-italic">TOTAL PASIVA</td>
                                        <td className="px-6 py-5 text-right font-black text-white text-lg italic underline decoration-double">
                                            Rp {(data?.liabilities.total + data?.equity.total).toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 rounded-xl bg-indigo-50/50 flex gap-3 items-start border border-indigo-100">
                            <HandCoins className="h-4 w-4 text-indigo-500 mt-0.5" />
                            <p className="text-[11px] font-medium text-slate-500 italic">
                                Kewajiban dihitung dari Tagihan Pending. Modal otomatis menyesuaikan berdasarkan selisih seluruh aset (termasuk piutang keryawan) dan kewajiban.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 border-t border-slate-200">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <p>© 2026 aivola.id - Smart Accounting System</p>
                    <span className="h-4 w-[1px] bg-slate-200"></span>
                    <p>Financial Integrity Verified</p>
                </div>
                <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                    <div className="h-3 w-3 rounded-full bg-indigo-500"></div>
                    <div className="h-3 w-3 rounded-full bg-slate-200"></div>
                </div>
            </div>
        </DashboardLayout>
    );
}

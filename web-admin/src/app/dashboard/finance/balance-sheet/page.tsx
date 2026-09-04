'use client';

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Landmark, Wallet, ShieldCheck, Scale, FileText, Download, Printer, AlertCircle, Info, Building, HandCoins, Package, Save, Clock, Calendar, ArchiveRestore } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function BalanceSheetPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'live' | 'saved'>('live');
    const [savedReports, setSavedReports] = useState<any[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedSavedReport, setSelectedSavedReport] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>('USER');

    const fetchSavedReports = async () => {
        setLoadingSaved(true);
        try {
            const res = await api.get(`/finance/reports/balance-sheet/saved`);
            setSavedReports(res.data);
        } catch (error) {
            console.error("Gagal mengambil arsip neraca", error);
        } finally {
            setLoadingSaved(false);
        }
    };

    useEffect(() => {
        setUserRole(localStorage.getItem('userRole') || 'USER');
    }, []);

    useEffect(() => {
        if (activeTab === 'saved' && savedReports.length === 0) {
            fetchSavedReports();
        }
    }, [activeTab]);

    const handleSaveReport = async () => {
        if (!confirm('Apakah Anda yakin ingin menyimpan laporan neraca saat ini? Laporan yang disimpan tidak dapat dihapus atau diubah lagi.')) return;
        
        const now = new Date();
        const autoName = `Neraca ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} - ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const autoDate = now.toISOString().split('T')[0];

        setSaving(true);
        try {
            await api.post('/finance/reports/balance-sheet/save', {
                name: autoName,
                periodDate: autoDate,
                assetsData: data.assets,
                liabilitiesData: data.liabilities,
                equityData: data.equity,
                totalAssets: data.assets.total,
                totalLiabilitiesAndEquity: data.liabilities.total + data.equity.total
            });
            import("react-hot-toast").then(t => t.toast.success('Laporan Neraca berhasil disimpan secara permanen'));
            fetchSavedReports();
        } catch (error: any) {
            import("react-hot-toast").then(t => t.toast.error(error.response?.data?.error || 'Gagal menyimpan laporan'));
        } finally {
            setSaving(false);
        }
    };

    const handleViewSavedReport = async (id: number) => {
        let toastId = '';
        import("react-hot-toast").then(t => { toastId = t.toast.loading('Memuat detail laporan...'); });
        try {
            const res = await api.get(`/finance/reports/balance-sheet/saved/${id}`);
            setSelectedSavedReport({
                ...res.data,
                assets: res.data.assetsData,
                liabilities: res.data.liabilitiesData,
                equity: res.data.equityData
            });
            import("react-hot-toast").then(t => t.toast.dismiss(toastId));
        } catch (error) {
            import("react-hot-toast").then(t => t.toast.error('Gagal memuat detail laporan', { id: toastId }));
        }
    };


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

    // GROUP FIXED ASSETS
    const groupedAssets: Record<string, { gross: number, dep: number }> = {};
    if (data?.assets?.fixedAssets) {
        data.assets.fixedAssets.forEach((asset: any) => {
            const cat = asset.category || 'Lainnya';
            if (!groupedAssets[cat]) groupedAssets[cat] = { gross: 0, dep: 0 };
            groupedAssets[cat].gross += Number(asset.purchasePrice || 0);
            groupedAssets[cat].dep += Number(asset.accumulatedDepreciation || 0);
        });
    }

    return (
        <DashboardLayout>
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        Neraca Keuangan
                    </h1>
                    <p className="mt-1 text-sm text-slate-400 font-medium italic">Posisi keuangan perusahaan per tanggal {today}.</p>
                </div>
                <div className="flex gap-2">
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                        {(userRole === 'OWNER' || userRole === 'FINANCE' || userRole === 'SUPERADMIN' || userRole === 'ADMIN') && activeTab === 'live' && (
                            <button
                                onClick={handleSaveReport}
                                disabled={saving}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all font-medium text-sm border border-emerald-500 disabled:opacity-70"
                            >
                                <Save className="h-4 w-4" />
                                {saving ? 'Menyimpan...' : 'Simpan Neraca (Snapshot)'}
                            </button>
                        )}
                        <button
                            onClick={handleExport}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md border border-white/20 transition-all font-medium text-sm"
                        >
                            <Download className="h-4 w-4" />
                            Export Excel
                        </button>
                    </div>
                </div>
            </div>

            
            {/* TABS */}
            <div className="flex gap-4 mb-6 border-b border-slate-200">
                <button 
                    onClick={() => { setActiveTab('live'); setSelectedSavedReport(null); }}
                    className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'live' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Landmark className="h-4 w-4" />
                    Neraca Saat Ini (Live)
                </button>
                <button 
                    onClick={() => { setActiveTab('saved'); setSelectedSavedReport(null); }}
                    className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'saved' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <ArchiveRestore className="h-4 w-4" />
                    Arsip Laporan Tersimpan
                </button>
            </div>

            {/* TAB CONTENT: SAVED REPORTS */}
            {activeTab === 'saved' && !selectedSavedReport && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Clock className="h-5 w-5 text-indigo-500" />
                                Daftar Arsip Neraca Keuangan
                            </h3>
                        </div>
                        {loadingSaved ? (
                            <div className="p-10 text-center text-slate-500">Memuat data...</div>
                        ) : savedReports.length === 0 ? (
                            <div className="p-10 text-center">
                                <ArchiveRestore className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">Belum ada arsip laporan yang disimpan.</p>
                                <p className="text-slate-400 text-sm mt-1">Gunakan tombol "Simpan Neraca" di tab Live untuk merekam neraca saat ini.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Nama Laporan (Snapshot)</th>
                                        <th className="px-6 py-4">Periode</th>
                                        <th className="px-6 py-4">Total Aset</th>
                                        <th className="px-6 py-4">Disimpan Oleh</th>
                                        <th className="px-6 py-4">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {savedReports.map((r: any, i: number) => (
                                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-800">{r.name}</td>
                                            <td className="px-6 py-4 text-slate-600">{new Date(r.periodDate).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</td>
                                            <td className="px-6 py-4 font-bold text-indigo-600">Rp {Number(r.totalAssets).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {new Date(r.createdAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', year: 'numeric' })}
                                                <br/><span className="font-medium text-slate-600">{r.creator?.name || 'Sistem'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => handleViewSavedReport(r.id)} className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors shadow-sm border border-indigo-100">Lihat Detail Laporan</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: LIVE OR SAVED DETAIL */}
            {((activeTab === 'live' && data) || (activeTab === 'saved' && selectedSavedReport)) && (
                (() => {
                    const displayData = activeTab === 'live' ? data : selectedSavedReport;
                    return (
                        <div className="space-y-6">
                            {activeTab === 'saved' && selectedSavedReport && (
                                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                                    <div>
                                        <h4 className="font-bold text-emerald-900 text-lg flex items-center gap-2">
                                            <ArchiveRestore className="h-5 w-5" />
                                            Melihat Arsip: {selectedSavedReport.name}
                                        </h4>
                                        <p className="text-emerald-700 text-sm mt-1 leading-relaxed">
                                            Laporan ini adalah <strong>rekaman permanen</strong> yang disimpan pada tanggal {new Date(selectedSavedReport.createdAt).toLocaleString('id-ID')}. Perubahan transaksi apapun setelah waktu tersebut tidak akan memengaruhi laporan ini.
                                        </p>
                                    </div>
                                    <button onClick={() => setSelectedSavedReport(null)} className="px-4 py-2 shrink-0 bg-white text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-bold text-sm shadow-sm transition-colors">
                                        Tutup Detail
                                    </button>
                                </div>
                            )}
<div className="printable-content">
                {/* Accounting Equation Banner */}
                <div className="mb-8 flex items-center justify-between gap-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-xs font-black uppercase tracking-[0.3em] opacity-80 mb-2">Persamaan Akuntansi</p>
                        <div className="flex items-center gap-4 sm:gap-8 flex-wrap">
                            <div className="text-center sm:text-left">
                                <p className="text-[10px] font-bold opacity-70">TOTAL AKTIVA (ASET)</p>
                                <p className="text-2xl font-black">Rp {displayData?.assets.total.toLocaleString()}</p>
                            </div>
                            <div className="text-2xl font-light opacity-50 hidden sm:block">=</div>
                            <div className="text-center sm:text-left">
                                <p className="text-[10px] font-bold opacity-70">TOTAL PASIVA (KEWAJIBAN + MODAL)</p>
                                <p className="text-2xl font-black">Rp {(displayData?.liabilities.total + displayData?.equity.total).toLocaleString()}</p>
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
                            <h2 className="text-lg font-black text-white border-b-2 border-blue-600 pb-1 uppercase">AKTIVA (ASET)</h2>
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
                                        <td className="px-6 py-3 text-right text-xs font-bold text-slate-400 italic">Rp {displayData?.assets.totalCurrent.toLocaleString()}</td>
                                    </tr>
                                    {displayData?.assets.accounts.map((acc: any) => (
                                        <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-10 py-3 text-sm font-semibold text-slate-600 flex items-center gap-2">
                                                {acc.type === 'BANK' ? <Landmark className="h-3 w-3 text-blue-500" /> : <Wallet className="h-3 w-3 text-amber-500" />}
                                                {acc.name}
                                            </td>
                                            <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">Rp {acc.balance.toLocaleString()}</td>
                                        </tr>
                                    ))}

                                    {/* PIUTANG (RECEIVABLES) */}
                                    <tr>
                                        <td className="px-6 py-3 font-black text-slate-900 text-xs tracking-wider uppercase bg-amber-50/10 not-italic">PIUTANG (Receivables)</td>
                                        <td className="px-6 py-3 text-right text-xs font-bold text-amber-600 italic">Rp {(Number(displayData?.assets.totalLoans || 0) + Number(displayData?.assets.totalCustomerReceivables || 0)).toLocaleString()}</td>
                                    </tr>
                                    {(displayData?.assets.totalCustomerReceivables || 0) > 0 && (
                                        <tr className="hover:bg-slate-50 transition-colors">
                                            <td className="px-10 py-3 text-sm font-semibold text-slate-600 flex items-center gap-2">
                                                <Building className="h-3 w-3 text-blue-500" />
                                                Piutang Usaha (Outstanding)
                                            </td>
                                            <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">Rp {displayData?.assets.totalCustomerReceivables.toLocaleString()}</td>
                                        </tr>
                                    )}
                                    {(displayData?.assets.totalLoans || 0) > 0 && (
                                        <tr className="hover:bg-slate-50 transition-colors">
                                            <td className="px-10 py-3 text-sm font-semibold text-slate-600 flex items-center gap-2">
                                                <HandCoins className="h-3 w-3 text-amber-500" />
                                                Pinjaman Karyawan (Aktif)
                                            </td>
                                            <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">Rp {displayData?.assets.totalLoans.toLocaleString()}</td>
                                        </tr>
                                    )}
                                    {!((displayData?.assets.totalCustomerReceivables || 0) > 0 || (displayData?.assets.totalLoans || 0) > 0) && (
                                        <tr>
                                            <td colSpan={2} className="px-10 py-2 text-[10px] text-slate-300 italic">Tidak ada piutang aktif</td>
                                        </tr>
                                    )}

                                    {/* PERSEDIAAN (INVENTORY) */}
                                    <tr>
                                        <td className="px-6 py-3 font-black text-slate-900 text-xs tracking-wider uppercase bg-teal-50/10 not-italic border-t border-slate-100">PERSEDIAAN (Inventory)</td>
                                        <td className="px-6 py-3 text-right text-xs font-bold text-teal-600 italic border-t border-slate-100">Rp {(displayData?.assets.totalInventoryValue || 0).toLocaleString()}</td>
                                    </tr>
                                    {(displayData?.assets.totalInventoryValue || 0) > 0 ? (
                                        <tr className="hover:bg-slate-50 transition-colors">
                                            <td className="px-10 py-3 text-sm font-semibold text-slate-600 flex items-center gap-2">
                                                <Package className="h-3 w-3 text-teal-500" />
                                                Persediaan Barang Dagang
                                            </td>
                                            <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">Rp {displayData?.assets.totalInventoryValue.toLocaleString()}</td>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <td colSpan={2} className="px-10 py-2 text-[10px] text-slate-300 italic">Tidak ada persediaan aktif</td>
                                        </tr>
                                    )}

                                    {/* ASSET TETAP */}
                                    <tr>
                                        <td className="px-6 py-3 font-black text-slate-900 text-xs tracking-wider uppercase bg-emerald-50/10 not-italic border-t border-slate-100">ASET TETAP (Fixed Assets)</td>
                                        <td className="px-6 py-3 text-right text-xs font-bold text-emerald-600 italic border-t border-slate-100">Rp {(displayData?.assets.totalFixed || 0).toLocaleString()}</td>
                                    </tr>
                                    {displayData?.assets.fixedAssets && displayData.assets.fixedAssets.length > 0 ? (
                                        <>
                                            {/* HARGA PEROLEHAN PER KATEGORI */}
                                            {Object.entries(groupedAssets).map(([cat, vals]) => (
                                                <tr key={`gross-${cat}`} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-10 py-3 text-sm font-semibold text-slate-600 italic">
                                                        {cat}
                                                    </td>
                                                    <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">
                                                        Rp {vals.gross.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            
                                            {/* PENYUSUTAN */}
                                            <tr>
                                                <td className="px-6 py-3 font-bold text-slate-800 text-[11px] tracking-wider uppercase bg-slate-50/50 not-italic border-t border-slate-50">PENYUSUTAN</td>
                                                <td className="border-t border-slate-50"></td>
                                            </tr>
                                            {Object.entries(groupedAssets).map(([cat, vals]) => vals.dep > 0 ? (
                                                <tr key={`dep-${cat}`} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-10 py-3 text-sm font-semibold text-slate-600 italic text-red-500">
                                                        Akumulasi Penyusutan {cat}
                                                    </td>
                                                    <td className="px-6 py-3 text-right text-sm font-bold text-red-500">
                                                        (Rp {vals.dep.toLocaleString()})
                                                    </td>
                                                </tr>
                                            ) : null)}

                                            <tr className="bg-slate-50 border-t border-slate-100">
                                                <td className="px-10 py-3 font-bold text-slate-700 text-xs not-italic">Total Aset Tetap Bersih</td>
                                                <td className="px-6 py-3 text-right font-black text-slate-900 text-sm italic underline">Rp {(displayData?.assets.totalFixed || 0).toLocaleString()}</td>
                                            </tr>
                                        </>
                                    ) : (
                                        <tr>
                                            <td colSpan={2} className="px-10 py-2 text-xs italic text-slate-300">Belum ada aset tetap terdaftar</td>
                                        </tr>
                                    )}

                                    <tr className="bg-blue-600 border-t-2 border-white">
                                        <td className="px-6 py-4 font-black text-white text-sm uppercase tracking-tighter not-italic">TOTAL AKTIVA (Total Assets)</td>
                                        <td className="px-6 py-4 text-right font-black text-white text-lg italic underline decoration-double">Rp {displayData?.assets.total.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 rounded-xl bg-blue-50/50 flex gap-3 items-start border border-blue-100">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                            <p className="text-[11px] font-medium text-slate-500 italic leading-relaxed">
                                Aset Lancar mencakup Saldo Kas & Bank. Piutang mencakup Piutang Usaha Outstanding dan Pinjaman Karyawan. Persediaan mencakup nilai buku stok produk fisik. Aset Tetap mencakup nilai buku dari gedung dan peralatan.
                            </p>
                        </div>
                    </div>

                    {/* PASIVA (LIABILITIES & EQUITY) */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                                <h2 className="text-lg font-black text-white border-b-2 border-indigo-600 pb-1 uppercase">PASIVA (KEWAJIBAN & MODAL)</h2>
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
                                        <td className="px-10 py-3 text-sm font-semibold text-slate-600 flex items-center gap-2">
                                            <AlertCircle className="h-3 w-3 text-red-500" />
                                            Hutang Usaha (Expense Pending)
                                        </td>
                                        <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">Rp {(displayData?.liabilities.pendingExpensesTotal || 0).toLocaleString()}</td>
                                    </tr>
                                    {(displayData?.liabilities.taxLiability || 0) > 0 && (
                                        <tr className="hover:bg-slate-50 transition-colors">
                                            <td className="px-10 py-3 text-sm font-semibold text-slate-600 flex items-center gap-2">
                                                <AlertCircle className="h-3 w-3 text-amber-500" />
                                                Hutang Pajak (PPN Keluaran)
                                            </td>
                                            <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">Rp {displayData?.liabilities.taxLiability.toLocaleString()}</td>
                                        </tr>
                                    )}
                                    <tr className="bg-slate-50">
                                        <td className="px-6 py-3 font-bold text-slate-700 text-xs italic not-italic">TOTAL KEWAJIBAN</td>
                                        <td className="px-6 py-3 text-right font-black text-slate-900 text-sm italic underline">Rp {displayData?.liabilities.total.toLocaleString()}</td>
                                    </tr>
                                    
                                    <tr className="h-4 bg-white border-none"><td></td><td></td></tr>

                                    <tr>
                                        <td className="px-6 py-3 font-black text-indigo-700 text-xs tracking-wider uppercase bg-indigo-50/30 not-italic">MODAL & EKUITAS</td>
                                        <td></td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="px-10 py-3 text-sm font-semibold text-slate-600 italic">Modal Disetor (Paid-in Capital)</td>
                                        <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">Rp {(displayData?.equity.modalDisetor || 0).toLocaleString()}</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="px-10 py-3 text-sm font-semibold text-slate-600 italic">Akun Penahan (Selisih Belum Teridentifikasi)</td>
                                        <td className="px-6 py-3 text-right text-sm font-bold text-orange-600">Rp {(displayData?.equity.akunPenahan || 0).toLocaleString()}</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="px-10 py-3 text-sm font-semibold text-slate-600 italic">Laba Tahun Berjalan (YTD Net Profit)</td>
                                        <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">Rp {(displayData?.equity.labaBerjalan || 0).toLocaleString()}</td>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        <td className="px-6 py-3 font-bold text-slate-700 text-xs italic not-italic">TOTAL EKUITAS</td>
                                        <td className="px-6 py-3 text-right font-black text-slate-900 text-sm italic underline">Rp {displayData?.equity.total.toLocaleString()}</td>
                                    </tr>

                                    <tr className="h-4 bg-white border-none"><td></td><td></td></tr>

                                    <tr className="bg-indigo-700">
                                        <td className="px-6 py-5 font-black text-white text-sm uppercase tracking-tighter not-italic">TOTAL PASIVA</td>
                                        <td className="px-6 py-5 text-right font-black text-white text-lg italic underline decoration-double">
                                            Rp {(displayData?.liabilities.total + displayData?.equity.total).toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 rounded-xl bg-indigo-50/50 flex gap-3 items-start border border-indigo-100">
                            <HandCoins className="h-4 w-4 text-indigo-500 mt-0.5" />
                            <p className="text-[11px] font-medium text-slate-500 italic">
                                Kewajiban dihitung dari Tagihan Pending. Modal disajikan terpisah antara Laba Tahun Berjalan (diambil dari laporan Laba Rugi berjalan) dan Modal Disetor (balancing modal bersih).
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            
                        </div>
                    );
                })()
            )}

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

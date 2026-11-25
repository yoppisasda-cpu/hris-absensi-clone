'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { ChefHat, BarChart3, Clock, Calendar, CalendarDays, History, ArrowUpDown, Download, FileSpreadsheet } from 'lucide-react';

export default function KitchenReports() {
    const [reports, setReports] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
    const [reportFilter, setReportFilter] = useState<'ALL' | 'FOOD' | 'BEVERAGE'>('ALL');

    const sortedHistory = [...(reports?.history || [])].sort((a, b) => {
        if (sortOrder === 'asc') return (a.durationSeconds || 0) - (b.durationSeconds || 0);
        if (sortOrder === 'desc') return (b.durationSeconds || 0) - (a.durationSeconds || 0);
        return 0;
    });

    const toggleSort = () => {
        if (sortOrder === 'none') setSortOrder('desc');
        else if (sortOrder === 'desc') setSortOrder('asc');
        else setSortOrder('none');
    };

    const setQuickFilter = (type: 'today' | 'week' | 'month' | 'all') => {
        const today = new Date();
        if (type === 'today') {
            const str = today.toISOString().split('T')[0];
            setStartDate(str);
            setEndDate(str);
        } else if (type === 'week') {
            const first = today.getDate() - today.getDay();
            const start = new Date(today.setDate(first));
            setStartDate(start.toISOString().split('T')[0]);
            setEndDate(new Date().toISOString().split('T')[0]);
        } else if (type === 'month') {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            setStartDate(start.toISOString().split('T')[0]);
            setEndDate(new Date().toISOString().split('T')[0]);
        } else if (type === 'all') {
            setStartDate('');
            setEndDate('');
        }
    };

    const fetchReports = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('jwt_token');
            const tenantId = localStorage.getItem('currentTenantId');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kitchen/reports?startDate=${startDate}&endDate=${endDate}&fnbType=${reportFilter}`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    ...(tenantId ? { 'x-tenant-id': tenantId } : {})
                }
            });
            setReports(res.data);
        } catch (error: any) {
            console.error('Error fetching kitchen reports', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [startDate, endDate, reportFilter]);

    const formatSeconds = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return '0 detik';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        if (m > 0) return `${m} mnt ${s} dtk`;
        return `${s} dtk`;
    };

    const formatTime = (isoString: string) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (isoString: string) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const exportToExcel = () => {
        try {
            if (!sortedHistory || sortedHistory.length === 0) {
                toast.error('Tidak ada data riwayat produksi untuk diekspor');
                return;
            }

            // 1. Data Sheet 1: Riwayat Produksi
            const exportRows = sortedHistory.map((sale: any, idx: number) => ({
                'No': idx + 1,
                'No. Antrean': `#${sale.queueNumber || sale.id}`,
                'No. Invoice': sale.invoiceNumber || '-',
                'Pelanggan': sale.customerName || 'Umum',
                'Menu / Item yang Dimasak': sale.items || '-',
                'Tanggal Transaksi': formatDate(sale.date || sale.createdAt),
                'Jam Masuk': formatTime(sale.createdAt),
                'Jam Selesai': formatTime(sale.preparedAt),
                'Durasi Masak': formatSeconds(sale.durationSeconds),
                'Durasi (Menit)': Number(((sale.durationSeconds || 0) / 60).toFixed(1)),
                'Durasi (Detik)': sale.durationSeconds || 0
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportRows);
            worksheet['!cols'] = [
                { wch: 6 },   // No
                { wch: 14 },  // No. Antrean
                { wch: 22 },  // No. Invoice
                { wch: 20 },  // Pelanggan
                { wch: 38 },  // Menu / Item
                { wch: 18 },  // Tanggal Transaksi
                { wch: 14 },  // Jam Masuk
                { wch: 14 },  // Jam Selesai
                { wch: 16 },  // Durasi Masak
                { wch: 15 },  // Durasi (Menit)
                { wch: 15 }   // Durasi (Detik)
            ];

            // 2. Data Sheet 2: Ringkasan KPI
            const totalOrders = sortedHistory.length;
            const totalDurationSecs = sortedHistory.reduce((acc: number, curr: any) => acc + (curr.durationSeconds || 0), 0);
            const avgSelectedPeriod = totalOrders > 0 ? Math.round(totalDurationSecs / totalOrders) : 0;

            const categoryLabel = reportFilter === 'ALL' 
                ? 'Semua Pesanan' 
                : reportFilter === 'FOOD' 
                ? 'Dapur (Makanan)' 
                : 'Bar (Minuman)';

            const summaryRows = [
                { 'Informasi / Metrik': 'Periode Laporan', 'Nilai': `${startDate || 'Semua'} s/d ${endDate || 'Semua'}` },
                { 'Informasi / Metrik': 'Kategori F&B', 'Nilai': categoryLabel },
                { 'Informasi / Metrik': 'Total Pesanan Selesai', 'Nilai': `${totalOrders} Pesanan` },
                { 'Informasi / Metrik': 'Rata-rata Waktu Masak (Periode Terpilih)', 'Nilai': formatSeconds(avgSelectedPeriod) },
                { 'Informasi / Metrik': 'Rata-rata Masak Hari Ini', 'Nilai': formatSeconds(reports?.averages?.today) },
                { 'Informasi / Metrik': 'Rata-rata Masak Minggu Ini', 'Nilai': formatSeconds(reports?.averages?.week) },
                { 'Informasi / Metrik': 'Rata-rata Masak Bulan Ini', 'Nilai': formatSeconds(reports?.averages?.month) },
                { 'Informasi / Metrik': 'Waktu Ekspor', 'Nilai': new Date().toLocaleString('id-ID') }
            ];

            const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
            summarySheet['!cols'] = [
                { wch: 38 },
                { wch: 30 }
            ];

            // 3. Create Workbook
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Produksi');
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan KPI Dapur');

            const dateStr = startDate && endDate ? `${startDate}_sd_${endDate}` : (startDate || 'semua');
            const fileName = `Laporan_Produksi_KDS_${reportFilter}_${dateStr}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            toast.success('Laporan produksi KDS berhasil diekspor ke Excel');
        } catch (err) {
            console.error('Gagal export excel laporan dapur:', err);
            toast.error('Gagal mengekspor laporan ke Excel');
        }
    };

    if (loading) return <div className="p-8 text-center text-white/50 animate-pulse">Memuat laporan...</div>;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <BarChart3 className="text-blue-400" size={32} />
                        Laporan Produksi Dapur
                    </h1>
                    <p className="text-white/60 mt-1">Pantau rata-rata waktu masak dan riwayat pesanan</p>
                    <div className="flex bg-slate-800/50 p-1 rounded-xl mt-4 w-max">
                        <button 
                            onClick={() => setReportFilter('ALL')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${reportFilter === 'ALL' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Semua Pesanan
                        </button>
                        <button 
                            onClick={() => setReportFilter('FOOD')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${reportFilter === 'FOOD' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Dapur (Makanan)
                        </button>
                        <button 
                            onClick={() => setReportFilter('BEVERAGE')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${reportFilter === 'BEVERAGE' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Bar (Minuman)
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setQuickFilter('today')} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">Hari Ini</button>
                        <button onClick={() => setQuickFilter('week')} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">Minggu Ini</button>
                        <button onClick={() => setQuickFilter('month')} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">Bulan Ini</button>
                        <button onClick={() => setQuickFilter('all')} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">Semua</button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg"
                        />
                        <span className="text-white/60">-</span>
                        <input 
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg"
                        />
                        <button 
                            onClick={exportToExcel}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition-all text-sm"
                            title="Ekspor Laporan Produksi ke Excel"
                        >
                            <FileSpreadsheet size={16} />
                            <span>Export Excel</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* STATISTICS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 border border-blue-500/20 rounded-2xl p-6 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-blue-400 font-semibold mb-2">
                        <Clock size={20} />
                        Rata-rata Hari Ini
                    </div>
                    <div className="text-4xl font-bold text-white">
                        {formatSeconds(reports?.averages?.today)}
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-blue-500/20 rounded-2xl p-6 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-blue-400 font-semibold mb-2">
                        <Calendar size={20} />
                        Rata-rata Minggu Ini
                    </div>
                    <div className="text-4xl font-bold text-white">
                        {formatSeconds(reports?.averages?.week)}
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-blue-500/20 rounded-2xl p-6 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-blue-400 font-semibold mb-2">
                        <CalendarDays size={20} />
                        Rata-rata Bulan Ini
                    </div>
                    <div className="text-4xl font-bold text-white">
                        {formatSeconds(reports?.averages?.month)}
                    </div>
                </div>
            </div>

            {/* HISTORY TABLE */}
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <History className="text-white/60" size={20} />
                        <h2 className="text-xl font-bold text-white">Riwayat Waktu Masak</h2>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-mono">
                            {sortedHistory.length} pesanan
                        </span>
                    </div>
                    <button 
                        onClick={exportToExcel}
                        className="hidden sm:flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        title="Ekspor Riwayat Produksi ke Excel"
                    >
                        <Download size={14} />
                        <span>Unduh Excel</span>
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-white/60 text-sm">
                                <th className="p-4 font-semibold">No. Pesanan</th>
                                <th className="p-4 font-semibold">Pelanggan</th>
                                <th className="p-4 font-semibold text-center">Tanggal Transaksi</th>
                                <th className="p-4 font-semibold text-center">Jam Masuk</th>
                                <th className="p-4 font-semibold text-center">Jam Selesai</th>
                                <th className="p-4 font-semibold text-right">
                                    <button 
                                        onClick={toggleSort} 
                                        className="inline-flex items-center gap-1 hover:text-white transition-colors"
                                        title="Urutkan berdasarkan durasi"
                                    >
                                        Durasi Masak 
                                        <ArrowUpDown size={14} className={sortOrder !== 'none' ? 'text-amber-400' : 'text-white/40'} />
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sortedHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-white/40">Belum ada data produksi</td>
                                </tr>
                            ) : (
                                sortedHistory.map((sale: any) => (
                                    <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-white">
                                            <div className="flex flex-col">
                                                <span className="font-bold">#{sale.queueNumber || sale.id}</span>
                                                <span className="text-xs text-white/40">{sale.invoiceNumber}</span>
                                                {sale.items && (
                                                    <span className="text-xs text-slate-400 mt-1 max-w-xs truncate" title={sale.items}>
                                                        {sale.items}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-white/80">{sale.customerName || '-'}</td>
                                        <td className="p-4 text-center text-white/80">{formatDate(sale.date || sale.createdAt)}</td>
                                        <td className="p-4 text-center text-white/80">{formatTime(sale.createdAt)}</td>
                                        <td className="p-4 text-center text-white/80">{formatTime(sale.preparedAt)}</td>
                                        <td className="p-4 text-right">
                                            <span className="inline-block bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg font-mono font-medium">
                                                {formatSeconds(sale.durationSeconds)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

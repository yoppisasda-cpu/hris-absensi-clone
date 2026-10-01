'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { ChefHat, BarChart3, Clock, Calendar, CalendarDays, History, ArrowUpDown } from 'lucide-react';

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
                    <div className="flex items-center gap-3">
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
                <div className="p-6 border-b border-white/10 flex items-center gap-2">
                    <History className="text-white/60" size={20} />
                    <h2 className="text-xl font-bold text-white">Riwayat Waktu Masak</h2>
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

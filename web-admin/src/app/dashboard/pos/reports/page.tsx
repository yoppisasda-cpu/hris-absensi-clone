'use client';

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";
import InvoiceModal from "@/components/sales/InvoiceModal";
import { 
    Search, Monitor, Download, Eye, Printer, 
    Building2, Calendar, Filter, CreditCard, 
    TrendingUp, ShoppingCart, ArrowUpRight, ArrowDownRight,
    Trophy, Sparkles, Receipt
} from "lucide-react";
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { id } from 'date-fns/locale';

export default function POSReportsPage() {
    // Data State
    const [sales, setSales] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>({
        topProducts: [],
        salesTrend: [],
        paymentMethods: []
    });
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState<any[]>([]);
    
    // Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [paymentFilter, setPaymentFilter] = useState("all");
    
    // UI State
    const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isRestricted, setIsRestricted] = useState(false);

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        const branchId = localStorage.getItem('userBranchId');
        
        if (role === 'POS_VIEWER' && branchId && branchId !== '') {
            setSelectedBranchId(branchId);
            setIsRestricted(true);
        }
    }, []);

    const fetchBranches = async () => {
        try {
            const res = await api.get('/branches');
            setBranches(res.data);
        } catch (error) {
            console.error("Gagal mengambil data cabang", error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Sales with Full Filters
            const salesRes = await api.get('/sales', {
                params: { 
                    branchId: selectedBranchId,
                    startDate,
                    endDate,
                    paymentMethod: paymentFilter
                }
            });
            setSales(salesRes.data);

            // Fetch Analytics Summary
            const analyticsRes = await api.get('/pos/analytics/summary', {
                params: { 
                    branchId: selectedBranchId,
                    startDate,
                    endDate,
                    paymentMethod: paymentFilter
                }
            });
            setAnalytics(analyticsRes.data);
        } catch (error) {
            console.error("Gagal mengambil data laporan", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        fetchData();
    }, [selectedBranchId, startDate, endDate, paymentFilter]);

    const stats = useMemo(() => {
        const gross = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const commission = sales.reduce((sum, s) => sum + (s.totalCommission || 0), 0);
        const net = gross - commission;
        const avgValue = sales.length > 0 ? gross / sales.length : 0;
        
        return { gross, commission, net, count: sales.length, avgValue };
    }, [sales]);

    const filteredSales = sales.filter(sale => 
        sale.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleViewInvoice = (id: number) => {
        setSelectedSaleId(id);
        setIsInvoiceModalOpen(true);
    };

    const handleExport = () => {
        const token = localStorage.getItem('jwt_token');
        const url = `${api.defaults.baseURL}/sales/export?branchId=${selectedBranchId}&startDate=${startDate}&endDate=${endDate}&paymentMethod=${paymentFilter}&token=${token}`;
        window.open(url, '_blank');
    };

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <DashboardLayout>
            {/* Header Section */}
            <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        <Monitor className="h-8 w-8 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
                            Laporan Kasir <span className="text-emerald-400">POS</span>
                        </h1>
                        <p className="text-sm text-slate-400 font-medium flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-emerald-500" />
                            Analitik performa retail dan rekonsiliasi pembayaran.
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <button 
                        onClick={handleExport}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-700 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 hover:border-emerald-500/50 transition-all shadow-lg active:scale-95"
                    >
                        <Download className="h-4 w-4" /> Export Excel
                    </button>
                    <button 
                        onClick={() => window.print()}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
                    >
                        <Printer className="h-4 w-4" /> Cetak Ringkasan
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-24 w-24 text-blue-500" />
                    </div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        Total Omzet (Gross)
                    </div>
                    <p className="text-2xl font-black text-white tracking-tight">Rp {stats.gross.toLocaleString()}</p>
                    <div className="mt-2 text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                        Dari {stats.count} Transaksi
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                        <Filter className="h-24 w-24 text-red-500" />
                    </div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Potongan Platform
                    </div>
                    <p className="text-2xl font-black text-red-400 tracking-tight">Rp {stats.commission.toLocaleString()}</p>
                    <div className="mt-2 text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        Platform Fee & Komisi
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                        <Sparkles className="h-24 w-24 text-emerald-500" />
                    </div>
                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                        Net Settlement
                    </div>
                    <p className="text-3xl font-black text-emerald-400 tracking-tight">Rp {stats.net.toLocaleString()}</p>
                    <div className="mt-2 text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        Dana Bersih Cabang
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                        <ShoppingCart className="h-24 w-24 text-purple-500" />
                    </div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                        Rerata per Struk
                    </div>
                    <p className="text-2xl font-black text-white tracking-tight">Rp {Math.round(stats.avgValue).toLocaleString()}</p>
                    <div className="mt-2 text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        AOV (Average Order Value)
                    </div>
                </div>
            </div>

            {/* Middle Section: Trends & Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Sales Trend Chart */}
                <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-white">Tren Penjualan</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Revenue harian sepanjang periode</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                            <TrendingUp className="h-3 w-3 text-emerald-400" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active Trend</span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics.salesTrend}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#475569" 
                                    fontSize={10} 
                                    fontWeight="bold"
                                    tickFormatter={(val) => format(new Date(val), 'dd MMM', { locale: id })} 
                                />
                                <YAxis stroke="#475569" fontSize={10} fontWeight="bold" tickFormatter={(val) => `Rp ${val/1000}k`} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                                    formatter={(val: any) => [`Rp ${val.toLocaleString()}`, 'Omzet']}
                                    labelFormatter={(val) => format(new Date(val), 'dd MMMM yyyy', { locale: id })}
                                />
                                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Best Selling Products */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm flex flex-col">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-yellow-500" />
                                Produk Laris
                            </h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Top 5 Berdasarkan Qty</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4 flex-1">
                        {analytics.topProducts.map((p: any, i: number) => (
                            <div key={i} className="group cursor-default">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs font-black text-slate-300 group-hover:text-emerald-400 transition-colors truncate pr-4">{p.name}</span>
                                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{p.totalSold} terjual</span>
                                </div>
                                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                     <div 
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000 group-hover:brightness-125" 
                                        style={{ width: `${(p.totalSold / analytics.topProducts[0].totalSold) * 100}%` }} 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-800/50">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kontribusi Rank 1</span>
                            <span className="text-xs font-black text-white">
                                {analytics.topProducts.length > 0 ? (
                                    (analytics.topProducts[0].totalRevenue / stats.gross * 100).toFixed(1)
                                ) : '0'}% Omzet
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl mb-8">
                <div className="p-6 border-b border-slate-800/50 flex flex-wrap items-center justify-between gap-6">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="relative w-full sm:w-64 group">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Cari invoice/pelanggan..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 py-2.5 pl-10 pr-4 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-slate-600 font-medium"
                            />
                        </div>

                        {/* Branch Filter */}
                        <div className="relative w-full sm:w-56 group">
                            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors pointer-events-none z-10" />
                            <select
                                value={selectedBranchId}
                                onChange={(e) => setSelectedBranchId(e.target.value)}
                                disabled={isRestricted}
                                className={`w-full appearance-none rounded-xl border border-slate-800 bg-slate-950/50 py-2.5 pl-10 pr-10 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-all font-bold ${isRestricted ? 'opacity-50' : 'cursor-pointer hover:bg-slate-800'}`}
                            >
                                {!isRestricted && (
                                    <>
                                        <option value="all">Semua Cabang</option>
                                        <option value="null">Kantor Pusat</option>
                                    </>
                                )}
                                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        {/* Payment Filter */}
                        <div className="relative w-full sm:w-48 group">
                            <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors pointer-events-none z-10" />
                            <select
                                value={paymentFilter}
                                onChange={(e) => setPaymentFilter(e.target.value)}
                                className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950/50 py-2.5 pl-10 pr-10 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-all font-bold cursor-pointer hover:bg-slate-800"
                            >
                                <option value="all">Semua Pembayaran</option>
                                <option value="TUNAI">TUNAI</option>
                                <option value="QRIS">QRIS</option>
                                <option value="DEBIT">DEBIT / KREDIT</option>
                                <option value="TRANSFER">TRANSFER BANK</option>
                                <option value="GOFOOD">GOFOOD</option>
                                <option value="GRABFOOD">GRABFOOD</option>
                                <option value="SHOPEE">SHOPEEFOOD</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-950/50 p-1.5 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-2 px-3">
                            <Calendar className="h-4 w-4 text-emerald-500" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Periode</span>
                        </div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent border-none text-xs text-white font-bold focus:ring-0 cursor-pointer hover:text-emerald-400 transition-colors"
                        />
                        <span className="text-slate-700 font-bold">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent border-none text-xs text-white font-bold focus:ring-0 cursor-pointer hover:text-emerald-400 transition-colors"
                        />
                    </div>
                </div>

                {/* Table Section */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="bg-slate-950/40">
                                <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[9px] border-b border-slate-800">Waktu & Tanggal</th>
                                <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[9px] border-b border-slate-800">Detail Transaksi</th>
                                <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[9px] border-b border-slate-800">Metode & Sumber</th>
                                <th className="px-6 py-4 text-right font-black text-slate-500 uppercase tracking-widest text-[9px] border-b border-slate-800">Gross</th>
                                <th className="px-6 py-4 text-right font-black text-slate-500 uppercase tracking-widest text-[9px] border-b border-slate-800">Potongan</th>
                                <th className="px-6 py-4 text-right font-black text-slate-500 uppercase tracking-widest text-[9px] border-b border-slate-800">Net Cair</th>
                                <th className="px-6 py-4 text-center font-black text-slate-500 uppercase tracking-widest text-[9px] border-b border-slate-800">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-6 py-6"><div className="h-4 w-full rounded bg-slate-800/50"></div></td>
                                    </tr>
                                ))
                            ) : filteredSales.length > 0 ? (
                                filteredSales.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-slate-800/20 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-200">{format(new Date(sale.date), 'dd/MM/yyyy')}</div>
                                            <div className="text-[10px] text-slate-500 font-medium">{format(new Date(sale.createdAt), 'HH:mm:ss')}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-emerald-500 font-mono tracking-tighter text-sm">{sale.invoiceNumber}</div>
                                            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                                ID: #{sale.id} 
                                                {sale.customerName && <span className="text-slate-600">• {sale.customerName}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className={`w-fit px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                                    (sale.accountName?.toUpperCase().includes('QRIS') || sale.notes?.includes('QRIS')) ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    (sale.accountName?.toUpperCase().includes('GOFOOD') || sale.notes?.includes('GOFOOD')) ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                    (sale.accountName?.toUpperCase().includes('GRABFOOD') || sale.notes?.includes('GRABFOOD')) ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    (sale.accountName?.toUpperCase().includes('SHOPEE') || sale.notes?.includes('SHOPEE')) ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                    (sale.accountName?.toUpperCase().includes('TRANSFER') || sale.notes?.includes('TRANSFER')) ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                    (sale.accountName?.toUpperCase().includes('DEBIT') || sale.accountName?.toUpperCase().includes('EDC') || sale.notes?.includes('DEBIT')) ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                }`}>
                                                    {sale.accountName || sale.notes?.match(/\[Metode: (.*?)\]/)?.[1] || 'TUNAI'}
                                                </div>
                                                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest pl-1">
                                                    {sale.saleType || 'Direct'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-300">
                                            Rp {sale.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {sale.totalCommission > 0 ? (
                                                <span className="text-[11px] font-black text-red-500">-Rp {sale.totalCommission.toLocaleString()}</span>
                                            ) : (
                                                <span className="text-slate-700 text-[10px] font-bold">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-black text-emerald-400 text-sm">
                                                Rp {(sale.totalAmount - (sale.totalCommission || 0)).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all">
                                                <button 
                                                    onClick={() => handleViewInvoice(sale.id)}
                                                    className="p-2 rounded-xl bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all shadow-xl active:scale-90"
                                                    title="Detail PDF / Invoice"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleViewInvoice(sale.id)}
                                                    className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500/20 transition-all shadow-xl shadow-emerald-900/20 active:scale-90"
                                                    title="Lihat Data"
                                                >
                                                    <Sparkles className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-slate-800/30 rounded-full border border-slate-700">
                                                <Receipt className="h-10 w-10 text-slate-600" />
                                            </div>
                                            <div>
                                                <p className="text-slate-400 font-black text-sm">Data Tidak Ditemukan</p>
                                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">Coba sesuaikan filter atau rentang tanggal Anda</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <InvoiceModal 
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                saleId={selectedSaleId!}
            />
        </DashboardLayout>
    );
}

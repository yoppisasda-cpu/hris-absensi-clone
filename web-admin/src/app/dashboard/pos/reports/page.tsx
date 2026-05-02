'use client';

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";
import InvoiceModal from "@/components/sales/InvoiceModal";
import { 
    Search, Monitor, Download, Eye, Printer, 
    Building2, Calendar, Filter, CreditCard, 
    TrendingUp, ShoppingCart, ArrowUpRight, ArrowDownRight,
    Trophy, Sparkles, Receipt, BrainCircuit
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
    const [comprehensive, setComprehensive] = useState<any>(null);
    const [aiInsights, setAiInsights] = useState<string[]>([]);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState<any[]>([]);
    
    // Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [paymentFilter, setPaymentFilter] = useState("all");
    const [saleTypeFilter, setSaleTypeFilter] = useState("all");
    
    // UI State
    const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isRestricted, setIsRestricted] = useState(false);
    const [activeTab, setActiveTab] = useState<'sales' | 'shifts'>('sales');
    const [shiftClosings, setShiftClosings] = useState<any[]>([]);

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
                    paymentMethod: paymentFilter,
                    saleType: saleTypeFilter
                }
            });
            setSales(salesRes.data);

            // Fetch Analytics Summary (needed for topProducts and salesTrend)
            const analyticsRes = await api.get('/pos/analytics/summary', {
                params: { 
                    branchId: selectedBranchId,
                    startDate,
                    endDate,
                    paymentMethod: paymentFilter,
                    saleType: saleTypeFilter
                }
            });
            setAnalytics(analyticsRes.data);

            // Fetch Comprehensive Analytics
            const compRes = await api.get('/pos/analytics/comprehensive', {
                params: { 
                    branchId: selectedBranchId,
                    startDate,
                    endDate
                }
            });
            setComprehensive(compRes.data);

            // Fetch AI Insights
            setIsAiLoading(true);
            try {
                const aiRes = await api.get('/pos/analytics/ai-insights', {
                    params: { branchId: selectedBranchId, startDate, endDate }
                });
                setAiInsights(aiRes.data.insights || []);
            } catch (err) {
                console.error("AI Insights fail", err);
            } finally {
                setIsAiLoading(false);
            }

            // Fetch Shift Closings
            const closingsRes = await api.get('/pos/closings', {
                params: { branchId: selectedBranchId, startDate, endDate }
            });
            setShiftClosings(closingsRes.data);
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
    }, [selectedBranchId, startDate, endDate, paymentFilter, saleTypeFilter]);

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
        const url = `${api.defaults.baseURL}/sales/export?branchId=${selectedBranchId}&startDate=${startDate}&endDate=${endDate}&paymentMethod=${paymentFilter}&saleType=${saleTypeFilter}&token=${token}`;
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
                {/* Revenue Card */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 p-8 opacity-[0.03] group-hover:scale-110 group-hover:opacity-[0.05] transition-all duration-500">
                        <TrendingUp className="h-32 w-32 text-blue-500" />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                            Total Omzet
                        </div>
                        {comprehensive && (
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${
                                comprehensive.summary.current.revenue >= comprehensive.summary.previous.revenue 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                                {comprehensive.summary.current.revenue >= comprehensive.summary.previous.revenue ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {Math.abs(((comprehensive.summary.current.revenue - comprehensive.summary.previous.revenue) / (comprehensive.summary.previous.revenue || 1)) * 100).toFixed(1)}%
                            </div>
                        )}
                    </div>
                    <p className="text-3xl font-black text-white tracking-tight leading-none mb-2">Rp {stats.gross.toLocaleString()}</p>
                    <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                        Periode Ini ({stats.count} Transaksi)
                    </div>
                </div>

                {/* Platform Fee Card */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 p-8 opacity-[0.03] group-hover:scale-110 group-hover:opacity-[0.05] transition-all duration-500">
                        <Filter className="h-32 w-32 text-red-500" />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                            Fee & Komisi
                        </div>
                    </div>
                    <p className="text-3xl font-black text-red-400 tracking-tight leading-none mb-2">Rp {stats.commission.toLocaleString()}</p>
                    <div className="text-[10px] font-bold text-slate-500">
                        Potongan Platform Pihak Ke-3
                    </div>
                </div>

                {/* Net Profit Card */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 p-8 opacity-[0.03] group-hover:scale-110 group-hover:opacity-[0.05] transition-all duration-500">
                        <Sparkles className="h-32 w-32 text-emerald-500" />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                            Net Settlement
                        </div>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                        <p className="text-4xl font-black tracking-tight leading-none mb-2">Rp {stats.net.toLocaleString()}</p>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">
                        Dana Bersih Siap Cair
                    </div>
                </div>

                {/* AOV Card */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 p-8 opacity-[0.03] group-hover:scale-110 group-hover:opacity-[0.05] transition-all duration-500">
                        <ShoppingCart className="h-32 w-32 text-purple-500" />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_8px_#8b5cf6]" />
                            Average Order Value
                        </div>
                        {comprehensive && (
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${
                                comprehensive.summary.current.aov >= comprehensive.summary.previous.aov 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                                {comprehensive.summary.current.aov >= comprehensive.summary.previous.aov ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {Math.abs(((comprehensive.summary.current.aov - comprehensive.summary.previous.aov) / (comprehensive.summary.previous.aov || 1)) * 100).toFixed(1)}%
                            </div>
                        )}
                    </div>
                    <p className="text-3xl font-black text-white tracking-tight leading-none mb-2">Rp {Math.round(stats.avgValue).toLocaleString()}</p>
                    <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        {comprehensive && comprehensive.summary.current.orders >= comprehensive.summary.previous.orders ? (
                            <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                        ) : (
                            <ArrowDownRight className="h-3 w-3 text-red-500" />
                        )}
                        Rata-rata belanja per pelanggan
                    </div>
                </div>
            </div>

            {/* AI Smart Insights Section */}
            {(aiInsights.length > 0 || isAiLoading) && (
                <div className="mb-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10">
                        <Sparkles className="h-24 w-24 text-emerald-400 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-500 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                            <BrainCircuit className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight">Aivola AI <span className="text-emerald-400 text-xs font-black ml-2 px-2 py-0.5 border border-emerald-400/30 rounded-full">BETA</span></h2>
                            <p className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-widest">Smart Business Recommendations</p>
                        </div>
                    </div>

                    {isAiLoading ? (
                        <div className="flex flex-col gap-3">
                            <div className="h-4 w-3/4 bg-emerald-500/20 animate-pulse rounded-full" />
                            <div className="h-4 w-1/2 bg-emerald-500/20 animate-pulse rounded-full" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {aiInsights.map((insight, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all flex gap-3 group/item">
                                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400 text-[10px] font-black group-hover/item:bg-emerald-500 group-hover/item:text-white transition-all">
                                        {idx + 1}
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                        {insight}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Middle Section: Trends & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                {/* Sales Trend Chart */}
                <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-white">Tren Pendapatan</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Revenue harian sepanjang periode</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                            <TrendingUp className="h-3 w-3 text-blue-400" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Revenue Flow</span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics.salesTrend}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                                <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Peak Hours Analysis */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm">
                    <div className="mb-8">
                        <h3 className="text-lg font-black text-white">Jam Sibuk</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Distribusi transaksi per jam</p>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comprehensive?.hourly || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="hour" stroke="#475569" fontSize={10} fontWeight="bold" tickFormatter={(h) => `${h}:00`} />
                                <YAxis hide />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                                    formatter={(val: any) => [`${val} Pesanan`, 'Volume']}
                                    labelFormatter={(val) => `Jam ${val}:00`}
                                />
                                <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                                    {(comprehensive?.hourly || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.orders > 10 ? '#8b5cf6' : '#475569'} opacity={0.8} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Contribution */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm flex flex-col">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-emerald-500" />
                                Kategori
                            </h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kontribusi Pendapatan</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                        {(comprehensive?.categories || []).map((c: any, i: number) => (
                            <div key={i} className="group cursor-default">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs font-black text-slate-300 group-hover:text-emerald-400 transition-colors truncate pr-2">{c.category}</span>
                                    <span className="text-[10px] font-black text-slate-500">Rp {c.revenue.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                     <div 
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000 group-hover:brightness-125" 
                                        style={{ width: `${(c.revenue / (comprehensive.categories[0]?.revenue || 1)) * 100}%` }} 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payment Methods Chart */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm flex flex-col">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-blue-500" />
                                Metode Bayar
                            </h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sinkronisasi Kasir</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                        {(analytics.paymentMethods || []).map((m: any, i: number) => (
                            <div key={i} className="group cursor-default">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs font-black text-slate-300 group-hover:text-blue-400 transition-colors truncate pr-2">{m.method}</span>
                                    <span className="text-[10px] font-black text-slate-500">Rp {m.total.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                     <div 
                                        className="h-full bg-blue-500 rounded-full transition-all duration-1000 group-hover:brightness-125" 
                                        style={{ width: `${(m.total / (analytics.paymentMethods[0]?.total || 1)) * 100}%` }} 
                                    />
                                </div>
                            </div>
                        ))}
                        {(!analytics.paymentMethods || analytics.paymentMethods.length === 0) && (
                            <div className="flex flex-col items-center justify-center h-full opacity-50">
                                <p className="text-[10px] font-black text-slate-600 uppercase">Belum ada data pembayaran</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            {/* Tabs Selection */}
            <div className="flex items-center gap-4 mb-6 border-b border-slate-800">
                <button 
                    onClick={() => setActiveTab('sales')}
                    className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'sales' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Daftar Penjualan
                    {activeTab === 'sales' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-t-full" />}
                </button>
                <button 
                    onClick={() => setActiveTab('shifts')}
                    className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'shifts' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Riwayat Shift (Closing)
                    {activeTab === 'shifts' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-t-full" />}
                </button>
            </div>

            {activeTab === 'sales' ? (
                <div className="bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
                    <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
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

                        {/* Sale Type Filter */}
                        <div className="relative w-full sm:w-48 group">
                            <ShoppingCart className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors pointer-events-none z-10" />
                            <select
                                value={saleTypeFilter}
                                onChange={(e) => setSaleTypeFilter(e.target.value)}
                                className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950/50 py-2.5 pl-10 pr-10 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-all font-bold cursor-pointer hover:bg-slate-800"
                            >
                                <option value="all">Semua Tipe Jual</option>
                                <option value="WALK_IN">WALK-IN</option>
                                <option value="GOFOOD">GOFOOD</option>
                                <option value="GRABFOOD">GRABFOOD</option>
                                <option value="SHOPEEFOOD">SHOPEEFOOD</option>
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
                                <option value="all">Semua Bayar</option>
                                <option value="TUNAI">TUNAI</option>
                                <option value="QRIS">QRIS</option>
                                <option value="DEBIT">DEBIT / KREDIT</option>
                                <option value="TRANSFER">TRANSFER BANK</option>
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
            ) : (
                <div className="bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
                    <table className="w-full text-left">
                        <thead className="bg-slate-950/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-5">Shift & Kasir</th>
                                <th className="px-6 py-5">Waktu</th>
                                <th className="px-6 py-5 text-right">Penjualan Kotor</th>
                                <th className="px-6 py-5 text-right">Expected (Tunai)</th>
                                <th className="px-6 py-5 text-right">Actual (Laci)</th>
                                <th className="px-6 py-5 text-right">Selisih</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {shiftClosings.length > 0 ? (
                                shiftClosings.map((closing: any) => (
                                    <tr key={closing.id} className="group hover:bg-slate-800/20 transition-all cursor-pointer">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white">{closing.cashier?.name}</div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">{closing.branch?.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-slate-300 font-medium">
                                                {format(new Date(closing.startTime), 'dd MMM yyyy HH:mm', { locale: id })}
                                            </div>
                                            <div className="text-[10px] text-slate-500">s/d {format(new Date(closing.endTime), 'HH:mm')}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-300">
                                            Rp {closing.totalGrossSales.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-blue-400">
                                            Rp {closing.expectedCash.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-400">
                                            Rp {closing.actualCash.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`font-black text-sm ${closing.cashDifference === 0 ? 'text-slate-500' : (closing.cashDifference > 0 ? 'text-blue-400' : 'text-red-500')}`}>
                                                {closing.cashDifference > 0 ? '+' : ''} Rp {closing.cashDifference.toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center">
                                        <div className="text-slate-500 font-bold italic">Belum ada riwayat shift</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <InvoiceModal 
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                saleId={selectedSaleId!}
            />
        </DashboardLayout>
    );
}

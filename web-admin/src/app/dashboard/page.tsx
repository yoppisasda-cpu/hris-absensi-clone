'use client';

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout"
import { Users, UserCheck, Clock, FileWarning, TrendingUp, AlertTriangle, ShieldCheck, BarChart3, Coins, PieChart, ArrowUpRight, ArrowDownRight, Wallet as WalletIcon, Briefcase, Box } from "lucide-react"
import api from "@/lib/api";
import { useRouter } from 'next/navigation';
import AttendanceChart from "@/components/dashboard/AttendanceChart";
import FinanceVisualChart from "@/components/dashboard/FinanceVisualChart";
import InventoryVisualStats from "@/components/dashboard/InventoryVisualStats";
import AIInsights from "@/components/dashboard/AIInsights";
import MorningBrief from "@/components/dashboard/MorningBrief";
import ExecutiveForecast from "@/components/dashboard/ExecutiveForecast";
import CashflowSankey from "@/components/dashboard/CashflowSankey";
import PayrollProductivityInsight from "@/components/dashboard/PayrollProductivityInsight";
import FinancialHealthScore from "@/components/dashboard/FinancialHealthScore";

export default function DashboardPage() {
    const router = useRouter();
    const [adminName, setAdminName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userName') || 'Admin' : 'Admin'));
    const [companyName, setCompanyName] = useState('Perusahaan Anda');
    const [activeModule, setActiveModule] = useState<'ABSENSI' | 'FINANCE' | 'INVENTORY' | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [stats, setStats] = useState([
        { title: "Total Karyawan", value: "0", icon: <Users className="h-6 w-6 text-blue-500" />, trend: "..." },
        { title: "Hadir Hari Ini", value: "0", icon: <UserCheck className="h-6 w-6 text-green-500" />, trend: "..." },
        { title: "Terlambat", value: "0", icon: <Clock className="h-6 w-6 text-orange-500" />, trend: "..." },
        { title: "Cuti / Sakit", value: "0", icon: <FileWarning className="h-6 w-6 text-red-500" />, trend: "..." },
    ]);
    const [activities, setActivities] = useState<any[]>([]);
    const [trends, setTrends] = useState<any[]>([]);
    const [contractAlerts, setContractAlerts] = useState<any[]>([]);
    const [companyContract, setCompanyContract] = useState<any>(null);
    const [visualFinance, setVisualFinance] = useState<any[]>([]);
    const [visualInventory, setVisualInventory] = useState<any>(null);
    const [summaryStats, setSummaryStats] = useState<any>(null);
    const [aiInsights, setAiInsights] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setIsMounted(true);
        // 0. Check for Active Module
        const mod = localStorage.getItem('activeModule') as any;
        if (!mod) {
            router.push('/dashboard/select-module');
            return;
        }
        setActiveModule(mod);

        // 1. Ambil Profil Admin dari LocalStorage
        const storedName = localStorage.getItem('userName');
        if (storedName) setAdminName(storedName);

        // 2. Tarik Statistik Real dari Backend
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const [statsRes, activityRes, trendsRes, contractRes, finRes, invRes, aiRes] = await Promise.all([
                    api.get('/stats/summary'),
                    api.get('/attendance'),
                    api.get('/stats/trends'),
                    api.get('/stats/contract-alerts'),
                    api.get('/stats/visual-finance'),
                    api.get('/stats/visual-inventory'),
                    api.get('/stats/ai-insights')
                ]);
                setAiInsights(aiRes.data);
                setContractAlerts(contractRes.data);
                setVisualFinance(finRes.data);
                setVisualInventory(invRes.data);
                setSummaryStats(statsRes.data);

                const s = statsRes.data;
                setTrends(trendsRes.data);
                if (s.companyName) setCompanyName(s.companyName);
                if (s.companyContract) setCompanyContract(s.companyContract);
                setStats([
                    { title: "Total Karyawan", value: s.totalEmployees.toString(), icon: <Users className="h-6 w-6 text-blue-500" />, trend: "Aktif" },
                    { title: "Hadir Hari Ini", value: s.presentCount.toString(), icon: <UserCheck className="h-6 w-6 text-green-500" />, trend: `${Math.round((s.presentCount / s.totalEmployees) * 100) || 0}%` },
                    { title: "Terlambat", value: s.lateCount.toString(), icon: <Clock className="h-6 w-6 text-orange-500" />, trend: "Kritikal" },
                    { title: "Cuti / Sakit", value: s.leaveCount.toString(), icon: <FileWarning className="h-6 w-6 text-red-500" />, trend: "Izin" },
                ]);

                setActivities(activityRes.data.slice(0, 5)); // Ambil 5 terbaru
            } catch (error) {
                console.error("Gagal mengambil data dashboard", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [router]);

    if (!activeModule) return null;

    if (activeModule === 'FINANCE') {
        return (
            <DashboardLayout>
                <div className="mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                    <div>
                        <div className="flex items-center gap-5 mb-5">
                            <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-lg shadow-indigo-500/10">
                                <PieChart className="h-8 w-8 stroke-[2.5px]" />
                            </div>
                            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase text-glow-sm">
                                Pusat <span className="text-indigo-500">Keuangan</span>
                            </h1>
                        </div>
                        <p className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase italic max-w-2xl leading-relaxed">
                            Ringkasan keuangan dan inventaris real-time untuk <span className="text-indigo-400 font-bold border-b border-indigo-500/30 pb-0.5">{companyName}</span>. Pantau arus kas, laba rugi, dan stok dalam satu tampilan.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 bg-slate-950 border border-white/5 p-4 rounded-3xl shadow-inner">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-600 tracking-widest uppercase italic">System Identity</p>
                            <p className="text-xs font-black text-white italic tracking-tighter uppercase">{adminName}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 border border-white/10 shadow-lg"></div>
                    </div>
                </div>
                
                {/* AI SMART DASHBOARD SUMMARY (MORNING BRIEF) */}
                <div className="mb-12 relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-transparent to-blue-500/20 blur-2xl opacity-30"></div>
                    <MorningBrief 
                        stats={summaryStats} 
                        insights={aiInsights} 
                        loading={loading} 
                        adminName={adminName} 
                    />
                </div>

                {/* AI RADAR GRID */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
                     <ExecutiveForecast />
                     <FinancialHealthScore />
                </div>

                {/* AI PERFORMANCE ENGINE */}
                <div className="mb-12">
                    <PayrollProductivityInsight />
                </div>

                {/* AI ANALYTICS BEAT */}
                <div className="mb-12">
                    <AIInsights insights={aiInsights} loading={loading} />
                </div>

                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 mb-12">
                    <div className="rounded-[40px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl transition-all hover:bg-slate-900/60 group relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic mb-3 flex items-center gap-2">
                                    <span className="inline-block h-1 w-4 bg-blue-600 rounded-full"></span> Total Saldo Kas
                                </div>
                                <p className="text-4xl font-black text-white leading-tight italic tracking-tighter text-glow-md">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summaryStats?.totalBalance || 0)}
                                </p>
                            </div>
                            <div className="h-16 w-16 rounded-[24px] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-xl group-hover:bg-blue-600 transition-all group-hover:text-white group-hover:scale-110 duration-500">
                                <WalletIcon className="h-8 w-8 stroke-[2px]" />
                            </div>
                        </div>
                        <div className="mt-6 flex items-center text-[9px] text-blue-500 font-black uppercase tracking-[0.2em] italic pt-6 border-t border-white/5">
                            Saldo kas aktif terdeteksi
                        </div>
                        <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-blue-500/5 blur-3xl rounded-full"></div>
                    </div>

                    <div className="rounded-[40px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl transition-all hover:bg-slate-900/60 group relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic mb-3 flex items-center gap-2">
                                    <span className="inline-block h-1 w-4 bg-emerald-600 rounded-full"></span> Laba / Rugi Bulan Ini
                                </div>
                                <p className={`text-4xl font-black leading-tight italic tracking-tighter text-glow-md ${(summaryStats?.monthlyProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summaryStats?.monthlyProfit || 0)}
                                </p>
                            </div>
                            <div className="h-16 w-16 rounded-[24px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-xl group-hover:bg-emerald-600 transition-all group-hover:text-white group-hover:scale-110 duration-500">
                                <TrendingUp className="h-8 w-8 stroke-[2px]" />
                            </div>
                        </div>
                        <div className={`mt-6 flex items-center text-[9px] font-black uppercase tracking-[0.2em] italic pt-6 border-t border-white/5 ${(summaryStats?.monthlyProfit || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                             Status: { (summaryStats?.monthlyProfit || 0) >= 0 ? 'SURPLUS' : 'DEFISIT' }
                        </div>
                        <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-emerald-500/5 blur-3xl rounded-full"></div>
                    </div>
                    
                    {/* HUTANG CARD */}
                    <div 
                        onClick={() => router.push('/dashboard/finance/payables')}
                        className="rounded-[40px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl cursor-pointer hover:border-red-500/30 transition-all group relative overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic mb-3 group-hover:text-red-400 transition-colors flex items-center gap-2">
                                    <span className="inline-block h-1 w-4 bg-red-600 rounded-full"></span> Total Hutang
                                </div>
                                <p className="text-4xl font-black text-red-500 leading-tight italic tracking-tighter text-glow-md">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summaryStats?.totalPayable || 0)}
                                </p>
                            </div>
                            <div className="h-16 w-16 rounded-[24px] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-xl group-hover:bg-red-600 group-hover:text-white transition-all group-hover:scale-110 duration-500">
                                <Coins className="h-8 w-8 stroke-[2px]" />
                            </div>
                        </div>
                        <div className="mt-6 flex items-center text-[9px] text-red-400 font-black uppercase tracking-[0.2em] italic pt-6 border-t border-white/5">
                            Klik untuk lihat daftar hutang
                        </div>
                        <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-red-500/5 blur-3xl rounded-full"></div>
                    </div>

                    {/* PIUTANG CARD */}
                    <div 
                        onClick={() => router.push('/dashboard/finance/receivables')}
                        className="rounded-[40px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl cursor-pointer hover:border-blue-500/30 transition-all group relative overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic mb-3 group-hover:text-blue-400 transition-colors flex items-center gap-2">
                                    <span className="inline-block h-1 w-4 bg-blue-600 rounded-full"></span> Total Piutang
                                </div>
                                <p className="text-4xl font-black text-blue-500 leading-tight italic tracking-tighter text-glow-md">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summaryStats?.totalReceivable || 0)}
                                </p>
                            </div>
                            <div className="h-16 w-16 rounded-[24px] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-xl group-hover:bg-blue-600 group-hover:text-white transition-all group-hover:scale-110 duration-500">
                                <BarChart3 className="h-8 w-8 stroke-[2px]" />
                            </div>
                        </div>
                        <div className="mt-6 flex items-center text-[9px] text-blue-400 font-black uppercase tracking-[0.2em] italic pt-6 border-t border-white/5">
                            Klik untuk lihat daftar piutang
                        </div>
                        <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-blue-500/5 blur-3xl rounded-full"></div>
                    </div>

                    <div className="rounded-[40px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl transition-all hover:bg-slate-900/60 group relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic mb-3 flex items-center gap-2">
                                    <span className="inline-block h-1 w-4 bg-orange-600 rounded-full"></span> Nilai Stok Barang
                                </div>
                                <p className="text-4xl font-black text-orange-500 leading-tight italic tracking-tighter text-glow-md">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summaryStats?.inventoryValue || 0)}
                                </p>
                            </div>
                            <div className="h-16 w-16 rounded-[24px] bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-xl group-hover:bg-orange-600 transition-all group-hover:text-white group-hover:scale-110 duration-500">
                                <Box className="h-8 w-8 stroke-[2px]" />
                            </div>
                        </div>
                        <div className="mt-6 flex items-center text-[9px] text-orange-400 font-black uppercase tracking-[0.2em] italic pt-6 border-t border-white/5">
                            Nilai inventaris tersinkronisasi
                        </div>
                        <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-orange-500/5 blur-3xl rounded-full"></div>
                    </div>
                    <div className="rounded-[40px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl transition-all hover:bg-slate-900/60 group relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic mb-3 flex items-center gap-2">
                                    <span className="inline-block h-1 w-4 bg-amber-600 rounded-full"></span> Stok Hampir Habis
                                </div>
                                <p className="text-4xl font-black text-white leading-tight italic tracking-tighter text-glow-md">
                                    {visualInventory?.health?.find((h:any) => h.name === 'Menipis')?.value || 0}
                                </p>
                            </div>
                            <div className="h-16 w-16 rounded-[24px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-xl group-hover:bg-amber-600 transition-all group-hover:text-white group-hover:scale-110 duration-500">
                                <AlertTriangle className="h-8 w-8 stroke-[2px]" />
                            </div>
                        </div>
                        <div className="mt-6 flex items-center text-[9px] text-amber-400 font-black uppercase tracking-[0.2em] italic pt-6 border-t border-white/5">
                            Stok kritis — perlu segera diisi
                        </div>
                        <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-amber-500/5 blur-3xl rounded-full"></div>
                    </div>
                </div>

                {/* SANKY MAPPING */}
                <div className="mb-12">
                   <CashflowSankey />
                </div>

                <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
                    <div className="rounded-[48px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl transition-all group">
                        <h3 className="font-black text-white mb-10 flex items-center gap-5 uppercase tracking-tighter italic text-xl">
                             <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-lg group-hover:bg-blue-600 group-hover:text-white transition-all"><BarChart3 className="h-6 w-6 stroke-[2.5px]" /></div>
                             Grafik Pendapatan
                        </h3>
                        <div className="bg-slate-950/50 rounded-[32px] p-6 border border-white/5">
                            {loading ? (
                                <div className="h-72 flex flex-col items-center justify-center animate-pulse gap-4">
                                    <div className="h-12 w-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin"></div>
                                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">Syncing Fiscal Vectors...</p>
                                </div>
                            ) : (
                                <FinanceVisualChart data={visualFinance} />
                            )}
                        </div>
                    </div>
                    <div className="rounded-[48px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl transition-all group">
                        <h3 className="font-black text-white mb-10 flex items-center gap-5 uppercase tracking-tighter italic text-xl">
                             <div className="h-12 w-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-lg group-hover:bg-orange-600 group-hover:text-white transition-all"><Box className="h-6 w-6 stroke-[2.5px]" /></div>
                             Analitik Inventaris
                        </h3>
                        <div className="bg-slate-950/50 rounded-[32px] p-6 border border-white/5">
                            {loading ? (
                                <div className="h-72 flex flex-col items-center justify-center animate-pulse gap-4">
                                    <div className="h-12 w-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin"></div>
                                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">Analyzing Warehouse Node Matrix...</p>
                                </div>
                            ) : (
                                <InventoryVisualStats data={visualInventory} />
                            )}
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                             <button onClick={() => router.push('/dashboard/inventory/products')} className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-500 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all uppercase tracking-widest italic">Full Product Management Matrix</button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic text-glow-sm">Halo, {!isMounted ? 'ADMIN' : adminName.toUpperCase()}! 👋</h1>
                    <p className="mt-2 text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase italic leading-relaxed">
                        Precision Monitoring for <span className="text-blue-500 font-bold border-b border-blue-500/30 pb-0.5">{companyName}</span>. Synchronizing workforce throughput daily.
                    </p>
                </div>
                {companyContract && (
                    <div className={`p-6 rounded-3xl border flex items-center gap-6 shadow-2xl animate-in fade-in slide-in-from-right-8 duration-500 backdrop-blur-xl relative overflow-hidden group ${
                        new Date(companyContract.contractEnd) < new Date() 
                        ? 'bg-red-500/10 border-red-500/30 text-red-500' 
                        : (new Date(companyContract.contractEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500'
                    }`}>
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-500 ${
                            new Date(companyContract.contractEnd) < new Date() ? 'bg-red-500/20' : (new Date(companyContract.contractEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30 ? 'bg-amber-500/20' : 'bg-indigo-500/20'
                        }`}>
                            <AlertTriangle className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 italic mb-1">Contract Lifecycle Status</p>
                            <p className="text-sm font-black italic tracking-tighter uppercase text-white shadow-inner">
                                {new Date(companyContract.contractEnd) < new Date() 
                                    ? 'EXPIRED_CONTRACT' 
                                    : (new Date(companyContract.contractEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30
                                    ? 'EXPIRATION_IMMUTABLE_30D'
                                    : 'OPERATIONAL_ACTIVE'} 
                                <span className="mx-3 opacity-20">|</span>
                                <span className="text-glow-sm">{new Date(companyContract.contractEnd).toLocaleDateString('id-ID')}</span>
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 h-2 w-full bg-current opacity-10"></div>
                    </div>
                )}
            </div>

            {/* AI COMMAND UNIT */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
                <MorningBrief 
                    stats={summaryStats} 
                    insights={aiInsights} 
                    loading={loading} 
                    adminName={adminName} 
                />
                <AIInsights insights={aiInsights} loading={loading} />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-12">
                {stats.map((stat, i) => (
                    <div key={i} className="rounded-[40px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl transition-all hover:-translate-y-2 group relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shadow-inner group-hover:bg-indigo-600 transition-all group-hover:text-white group-hover:border-indigo-500 duration-500">
                                    {stat.icon}
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] italic mb-1">{stat.title}</p>
                                    <p className="text-4xl font-black text-white italic tracking-tighter text-glow-md">{stat.value}</p>
                                </div>
                            </div>
                            <div className="mt-6 flex items-center justify-between text-[9px] pt-6 border-t border-white/5">
                                <span className={`font-black uppercase tracking-[0.2em] italic ${
                                    stat.title === 'Terlambat' ? 'text-red-500 animate-pulse' : 'text-emerald-500'
                                }`}>
                                    {stat.trend}
                                </span>
                                <span className="text-slate-600 font-black italic uppercase tracking-tighter">DATA_INDEX_SYNC</span>
                            </div>
                        </div>
                        <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-white/5 blur-3xl rounded-full group-hover:bg-indigo-500/10 transition-colors"></div>
                    </div>
                ))}
                
                {/* Employee Limit Card (For Tenant) */}
                {companyContract && (
                    <div className="rounded-[40px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl transition-all hover:-translate-y-2 group relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-xl group-hover:bg-blue-600 group-hover:text-white duration-500">
                                    <ShieldCheck className="h-7 w-7 stroke-[2px]" />
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] italic mb-1">FORCE_QUOTA</p>
                                    <p className="text-4xl font-black text-white italic tracking-tighter text-glow-md">
                                        {stats[0].value} <span className="text-lg opacity-20">/</span> {companyContract.employeeLimit === 0 ? '∞' : companyContract.employeeLimit}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-8 w-full bg-slate-950 border border-white/5 rounded-full h-3 overflow-hidden shadow-inner">
                                <div 
                                    className={`h-full transition-all duration-1500 shadow-[0_0_15px_rgba(59,130,246,0.3)] ${
                                        companyContract.employeeLimit > 0 && (parseInt(stats[0].value) / companyContract.employeeLimit) >= 0.9 ? 'bg-red-500' : 'bg-blue-600'
                                    }`}
                                    style={{ 
                                        width: companyContract.employeeLimit === 0 ? '0%' : `${Math.min(100, (parseInt(stats[0].value) / companyContract.employeeLimit) * 100)}%` 
                                    }}
                                ></div>
                            </div>
                        </div>
                         <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-blue-500/5 blur-3xl rounded-full"></div>
                    </div>
                )}
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
                {/* Tren Kehadiran Chart */}
                <div className="lg:col-span-2 rounded-[48px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl transition-all group">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
                        <div className="flex items-center gap-5">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-lg group-hover:bg-indigo-600 group-hover:text-white transition-all"><TrendingUp className="h-6 w-6 stroke-[2.5px]" /></div>
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Attendance Velocity</h2>
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] italic mt-1 font-mono">CHRONO_RANGE: [LAST_7_DAYS]</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-950/50 rounded-[32px] p-6 border border-white/5">
                        {loading ? (
                            <div className="h-[350px] flex flex-col items-center justify-center gap-4 animate-pulse">
                                <div className="h-12 w-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">Syncing Chrono Vectors...</p>
                            </div>
                        ) : (
                            <AttendanceChart data={trends} />
                        )}
                    </div>
                </div>

                {/* Info Box / Summary */}
                <div className="rounded-[48px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl relative overflow-hidden flex flex-col group transition-all hover:bg-slate-900/60">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-white font-black uppercase tracking-tighter italic text-xl flex items-center gap-5">
                            <div className="relative">
                                 <div className="absolute -inset-1.5 bg-red-500 rounded-full blur-md animate-pulse opacity-40"></div>
                                 <div className="relative h-3 w-3 rounded-full bg-red-500"></div>
                            </div>
                            Contract Radar
                        </h3>
                        <div className="px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 font-black text-[10px] tracking-widest italic animate-pulse">
                            {contractAlerts.length} DETECTED
                        </div>
                    </div>

                    {contractAlerts.length > 0 ? (
                        <div className="space-y-4 flex-grow overflow-y-auto max-h-[350px] pr-4 custom-scrollbar lg:max-h-none">
                            {contractAlerts.map((alert: any) => (
                                <div key={alert.id} className="p-6 bg-slate-950/80 border border-white/5 rounded-[28px] flex items-center justify-between group/item hover:border-red-500/40 hover:bg-red-500/5 transition-all duration-500 shadow-inner">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-700 group-hover/item:text-red-400 group-hover/item:bg-slate-950 transition-colors">
                                            <Briefcase className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-black text-white text-sm italic tracking-tight uppercase group-hover/item:text-red-400 transition-colors">{alert.name}</p>
                                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-1 opacity-60">{alert.jobTitle || 'OPERATIONAL_NODE'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-tighter italic font-mono">
                                            {new Date(alert.contractEndDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                        <div className="h-1 w-12 bg-red-500/40 rounded-full mt-2 ml-auto shadow-[0_0_8px_rgba(239,68,68,0.3)]"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-center p-8 gap-6">
                            <div className="h-24 w-24 bg-emerald-500/10 rounded-[32px] flex items-center justify-center border border-emerald-500/20 shadow-2xl shadow-emerald-500/5">
                                <UserCheck className="h-10 w-10 text-emerald-400 stroke-[2px]" />
                            </div>
                            <div>
                                <p className="text-lg font-black text-white italic truncate uppercase text-glow-sm">CHRONO_STATUS_CLEAN</p>
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] mt-3 leading-loose italic max-w-xs">No contract terminations detected within the next 30-day temporal cycle.</p>
                            </div>
                        </div>
                    )}

                    <div className="mt-10 pt-10 border-t border-white/5 flex justify-between items-center relative z-10">
                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] italic">Personnel Readiness Node</span>
                        <div className="flex gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-800"></div>
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-800"></div>
                        </div>
                    </div>
                    
                    <div className="absolute -bottom-20 -left-20 h-64 w-64 bg-indigo-500/5 blur-[100px] group-hover:bg-indigo-500/10 transition-colors"></div>
                </div>
            </div>

            <div className="mt-12 rounded-[48px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl relative overflow-hidden mb-20">
                <div className="flex items-center justify-between mb-10">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic text-glow-sm">Operational Log</h2>
                    <div className="h-10 w-40 bg-slate-950 border border-white/5 rounded-2xl flex items-center justify-center">
                        <div className="flex gap-4">
                            <div className="h-1.5 w-4 bg-blue-500 rounded-full animate-pulse"></div>
                            <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest italic">REAL_TIME_STREAM</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-12 w-12 rounded-full border-4 border-white/5 border-t-blue-600 animate-spin"></div>
                    </div>
                ) : activities.length > 0 ? (
                    <div className="overflow-x-auto rounded-[32px] border border-white/5 bg-slate-950/40 shadow-inner">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-slate-950/60 border-b border-white/5">
                                    <th className="px-10 py-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Personnel Node</th>
                                    <th className="px-10 py-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Access In</th>
                                    <th className="px-10 py-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Access Out</th>
                                    <th className="px-10 py-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Verification Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {activities.map((act) => (
                                    <tr key={act.id} className="hover:bg-white/[0.03] transition-all group">
                                        <td className="whitespace-nowrap px-10 py-8">
                                            <div className="text-[13px] font-black text-white italic tracking-tight group-hover:text-blue-400 transition-colors">{act.user.name.toUpperCase()}</div>
                                            <div className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-1.5 font-mono">{act.user.email}</div>
                                        </td>
                                        <td className="whitespace-nowrap px-10 py-8 text-xs font-black text-slate-300 italic tracking-wider">
                                            {new Date(act.clockIn).toLocaleTimeString('id-ID')}
                                        </td>
                                        <td className="whitespace-nowrap px-10 py-8 text-xs font-black text-slate-300 italic tracking-wider">
                                            {act.clockOut ? new Date(act.clockOut).toLocaleTimeString('id-ID') : '--:--:--'}
                                        </td>
                                        <td className="whitespace-nowrap px-10 py-8">
                                            <span className={`inline-flex rounded-full px-4 py-1.5 text-[9px] font-black tracking-widest italic border ${act.status === 'PRESENT' 
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                                : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                            }`}>
                                                {act.status}_VERIFIED
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex h-64 flex-col items-center justify-center rounded-[40px] border border-dashed border-white/10 bg-slate-950/20 gap-6 opacity-30">
                        <div className="h-20 w-20 rounded-[32px] bg-slate-900 border border-white/5 flex items-center justify-center">
                             <Clock className="h-10 w-10 text-slate-700" />
                        </div>
                        <p className="text-[10px] font-black text-slate-700 italic uppercase tracking-[0.4em]">NO_LOG_DATA_STREAMS_DETECTED</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

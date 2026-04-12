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
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">Dashboard Keuangan & Stok 👋</h1>
                    <p className="mt-1 text-sm text-white/40 font-medium">Ringkasan kondisi finansial dan inventori <span className="text-indigo-400 font-bold italic">{companyName}</span> saat ini.</p>
                </div>
                
                {/* AI SMART DASHBOARD SUMMARY (MORNING BRIEF) */}
                <div className="mb-8">
                    <MorningBrief 
                        stats={summaryStats} 
                        insights={aiInsights} 
                        loading={loading} 
                        adminName={adminName} 
                    />
                </div>

                {/* AI PREDICTIVE RADAR (FORECASTING) */}
                <div className="mb-8">
                    <ExecutiveForecast />
                </div>

                {/* AI FINANCIAL HEALTH SCORE */}
                <div className="mb-8">
                    <FinancialHealthScore />
                </div>

                {/* AI PAYROLL PRODUCTIVITY INSIGHT */}
                <div className="mb-8">
                    <PayrollProductivityInsight />
                </div>

                {/* AI INSIGHTS SECTION */}
                <div className="mb-8">
                    <AIInsights insights={aiInsights} loading={loading} />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-[2rem] border border-white/10 bg-[#050505]/40 backdrop-blur-xl p-8 shadow-2xl transition-all hover:shadow-blue-500/10 group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic mb-3">Total Saldo Kas & Bank</p>
                                <p className="text-3xl font-black text-white leading-tight italic tracking-tighter">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summaryStats?.totalBalance || 0)}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-blue-500/10 p-4 border border-blue-500/20 shadow-lg group-hover:bg-blue-600 transition-all group-hover:text-white"><WalletIcon className="h-6 w-6 text-blue-400 group-hover:text-white" /></div>
                        </div>
                        <div className="mt-6 flex items-center text-[10px] text-blue-400 font-black uppercase tracking-widest italic pt-4 border-t border-white/5">
                            Akun Keuangan Aktif
                        </div>
                    </div>
                    <div className="rounded-[2rem] border border-white/10 bg-[#050505]/40 backdrop-blur-xl p-8 shadow-2xl transition-all hover:shadow-emerald-500/10 group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic mb-3">Laba Bersih (Bulan Ini)</p>
                                <p className={`text-3xl font-black leading-tight italic tracking-tighter ${(summaryStats?.monthlyProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summaryStats?.monthlyProfit || 0)}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-emerald-500/10 p-4 border border-emerald-500/20 shadow-lg group-hover:bg-emerald-600 transition-all group-hover:text-white"><TrendingUp className="h-6 w-6 text-emerald-400 group-hover:text-white" /></div>
                        </div>
                        <div className={`mt-6 flex items-center text-[10px] font-black uppercase tracking-widest italic pt-4 border-t border-white/5 ${(summaryStats?.monthlyProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                             { (summaryStats?.monthlyProfit || 0) >= 0 ? 'Surplus (Profit)' : 'Defisit (Loss)' }
                        </div>
                    </div>
                    
                    {/* HUTANG CARD */}
                    <div 
                        onClick={() => router.push('/dashboard/finance/payables')}
                        className="rounded-[2rem] border border-white/10 bg-[#050505]/40 backdrop-blur-xl p-8 shadow-2xl cursor-pointer hover:border-red-500/50 transition-all group"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic mb-3 group-hover:text-red-400 transition-colors">Total Hutang (Payables)</p>
                                <p className="text-3xl font-black text-red-500 leading-tight italic tracking-tighter">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summaryStats?.totalPayable || 0)}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-red-500/10 p-4 border border-red-500/20 shadow-lg group-hover:bg-red-600 group-hover:text-white transition-all"><Coins className="h-6 w-6 text-red-400 group-hover:text-white" /></div>
                        </div>
                        <div className="mt-6 flex items-center text-[10px] text-red-400 font-black uppercase tracking-widest italic pt-4 border-t border-white/5">
                            Klik untuk Detail Hutang
                        </div>
                    </div>

                    {/* PIUTANG CARD */}
                    <div 
                        onClick={() => router.push('/dashboard/finance/receivables')}
                        className="rounded-[2rem] border border-white/10 bg-[#050505]/40 backdrop-blur-xl p-8 shadow-2xl cursor-pointer hover:border-blue-500/50 transition-all group"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic mb-3 group-hover:text-blue-400 transition-colors">Total Piutang (Receivables)</p>
                                <p className="text-3xl font-black text-blue-500 leading-tight italic tracking-tighter">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summaryStats?.totalReceivable || 0)}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-blue-500/10 p-4 border border-blue-500/20 shadow-lg group-hover:bg-blue-600 group-hover:text-white transition-all"><BarChart3 className="h-6 w-6 text-blue-400 group-hover:text-white" /></div>
                        </div>
                        <div className="mt-6 flex items-center text-[10px] text-blue-400 font-black uppercase tracking-widest italic pt-4 border-t border-white/5">
                            Klik untuk Detail Piutang
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-white/10 bg-[#050505]/40 backdrop-blur-xl p-8 shadow-2xl transition-all hover:shadow-orange-500/10 group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic mb-3">Nilai Inventori (Asset)</p>
                                <p className="text-3xl font-black text-orange-500 leading-tight italic tracking-tighter">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summaryStats?.inventoryValue || 0)}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-orange-500/10 p-4 border border-orange-500/20 shadow-lg group-hover:bg-orange-600 transition-all group-hover:text-white"><Box className="h-6 w-6 text-orange-400 group-hover:text-white" /></div>
                        </div>
                        <div className="mt-6 flex items-center text-[10px] text-orange-400 font-black uppercase tracking-widest italic pt-4 border-t border-white/5">
                            Asset Lancar Barang
                        </div>
                    </div>
                    <div className="rounded-[2rem] border border-white/10 bg-[#050505]/40 backdrop-blur-xl p-8 shadow-2xl transition-all hover:shadow-amber-500/10 group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic mb-3">Kesehatan Stok</p>
                                <p className="text-3xl font-black text-white leading-tight italic tracking-tighter">
                                    {visualInventory?.health?.find((h:any) => h.name === 'Menipis')?.value || 0}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-amber-500/10 p-4 border border-amber-500/20 shadow-lg group-hover:bg-amber-600 transition-all group-hover:text-white"><AlertTriangle className="h-6 w-6 text-amber-400 group-hover:text-white" /></div>
                        </div>
                        <div className="mt-6 flex items-center text-[10px] text-white/20 font-black uppercase tracking-widest italic pt-4 border-t border-white/5">
                            Produk Perlu Restock
                        </div>
                    </div>
                </div>

                {/* VISUAL FINANCIAL FLOW (SANKEY) */}
                <CashflowSankey />

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="rounded-[2.5rem] border border-white/10 bg-[#050505]/40 backdrop-blur-xl p-8 shadow-2xl transition-all">
                        <h3 className="font-black text-white mb-8 flex items-center gap-3 uppercase tracking-tight italic">
                             <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20"><BarChart3 className="h-5 w-5 text-blue-400" /></div>
                             Arus Kas Bulanan (Revenue vs Expense)
                        </h3>
                        {loading ? (
                            <div className="h-64 flex items-center justify-center animate-pulse bg-slate-50 rounded-lg">
                                <p className="text-slate-400 text-sm">Memuat grafik...</p>
                            </div>
                        ) : (
                            <FinanceVisualChart data={visualFinance} />
                        )}
                    </div>
                    <div className="rounded-[2.5rem] border border-white/10 bg-[#050505]/40 backdrop-blur-xl p-8 shadow-2xl transition-all">
                        <h3 className="font-black text-white mb-8 flex items-center gap-3 uppercase tracking-tight italic">
                             <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20"><Box className="h-5 w-5 text-orange-400" /></div>
                             Kesehatan & Performa Stok
                        </h3>
                        {loading ? (
                            <div className="h-64 flex items-center justify-center animate-pulse bg-slate-50 rounded-lg">
                                <p className="text-slate-400 text-sm">Memuat analitik...</p>
                            </div>
                        ) : (
                            <InventoryVisualStats data={visualInventory} />
                        )}
                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                             <button onClick={() => router.push('/dashboard/inventory/products')} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all">Manajemen Produk Lengkap</button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">Halo, {!isMounted ? 'Admin' : adminName}! 👋</h1>
                    <p className="mt-1 text-sm text-white/40 font-medium italic">Berikut adalah ringkasan absensi harian untuk <span className="text-blue-400 font-bold">{companyName}</span>.</p>
                </div>
                {companyContract && (
                    <div className={`p-4 rounded-xl border flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500 ${
                        new Date(companyContract.contractEnd) < new Date() 
                        ? 'bg-red-50 border-red-200 text-red-700' 
                        : (new Date(companyContract.contractEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                        <div className={`p-2 rounded-lg ${
                            new Date(companyContract.contractEnd) < new Date() ? 'bg-red-100' : (new Date(companyContract.contractEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30 ? 'bg-amber-100' : 'bg-blue-100'
                        }`}>
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-70">Status Kontrak</p>
                            <p className="text-sm font-bold">
                                {new Date(companyContract.contractEnd) < new Date() 
                                    ? 'KONTRAK HABIS' 
                                    : (new Date(companyContract.contractEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30
                                    ? 'SEGERA HABIS'
                                    : 'AKTIF'} 
                                <span className="mx-2 opacity-30">|</span>
                                {new Date(companyContract.contractEnd).toLocaleDateString('id-ID')}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* AI SMART DASHBOARD SUMMARY (MORNING BRIEF) */}
            <div className="mb-8">
                <MorningBrief 
                    stats={summaryStats} 
                    insights={aiInsights} 
                    loading={loading} 
                    adminName={adminName} 
                />
            </div>

            {/* AI INSIGHTS SECTION */}
            <div className="mb-8">
                <AIInsights insights={aiInsights} loading={loading} />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
                {stats.map((stat, i) => (
                    <div key={i} className="rounded-[2.5rem] border border-white/10 bg-[#050505]/40 backdrop-blur-2xl p-8 shadow-2xl transition-all hover:scale-[1.02] group">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic mb-2">{stat.title}</p>
                                <p className="text-4xl font-black text-white italic tracking-tighter">{stat.value}</p>
                            </div>
                            <div className="rounded-2xl bg-white/5 p-4 border border-white/10 shadow-xl group-hover:bg-indigo-600 transition-all group-hover:text-white">{stat.icon}</div>
                        </div>
                        <div className="mt-6 flex items-center text-[10px] pt-4 border-t border-white/5">
                            <span className="font-black text-emerald-400 uppercase tracking-widest italic">
                                {stat.trend}
                            </span>
                            <span className="ml-2 text-white/20 font-bold italic">Status Saat Ini</span>
                        </div>
                    </div>
                ))}
                
                {/* Employee Limit Card (For Tenant) */}
                {companyContract && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md border-l-4 border-l-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Kuota Karyawan</p>
                                <p className="mt-2 text-3xl font-bold text-slate-900">
                                    {stats[0].value} / {companyContract.employeeLimit === 0 ? '∞' : companyContract.employeeLimit}
                                </p>
                            </div>
                            <div className="rounded-lg bg-blue-50 p-3">
                                <ShieldCheck className="h-6 w-6 text-blue-500" />
                            </div>
                        </div>
                        <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-1000 ${
                                    companyContract.employeeLimit > 0 && (parseInt(stats[0].value) / companyContract.employeeLimit) >= 0.9 ? 'bg-red-500' : 'bg-blue-500'
                                }`}
                                style={{ 
                                    width: companyContract.employeeLimit === 0 ? '0%' : `${Math.min(100, (parseInt(stats[0].value) / companyContract.employeeLimit) * 100)}%` 
                                }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tren Kehadiran Chart */}
                <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-blue-500" /> Tren Kehadiran
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">Statistik kehadiran 7 hari terakhir.</p>
                        </div>
                    </div>
                    {loading ? (
                        <div className="h-[300px] flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <AttendanceChart data={trends} />
                    )}
                </div>

                {/* Info Box / Summary */}
                <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-1 font-medium shadow-lg overflow-hidden relative">
                    <div className="bg-white/95 backdrop-blur-sm rounded-[10px] p-5 h-full relative z-10 flex flex-col">
                        <h3 className="text-slate-900 font-bold mb-3 flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                            Pengingat Kontrak
                        </h3>

                        {contractAlerts.length > 0 ? (
                            <div className="space-y-3 flex-grow overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
                                {contractAlerts.map((alert: any) => (
                                    <div key={alert.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between group hover:border-blue-200 hover:bg-white transition-all">
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">{alert.name}</p>
                                            <p className="text-[10px] text-slate-500">{alert.jobTitle || 'Staff'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-red-600">
                                                {new Date(alert.contractEndDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                            </p>
                                            <p className="text-[9px] text-slate-400">Habis</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                                <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center mb-2">
                                    <UserCheck className="h-5 w-5 text-green-600" />
                                </div>
                                <p className="text-xs font-medium text-slate-900">Semua Kontrak Aman</p>
                                <p className="text-[10px] text-slate-500 mt-1">Belum ada kontrak yang berakhir dalam 30 hari ke depan.</p>
                            </div>
                        )}

                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Siap Perpanjang</span>
                            <span className="h-5 w-5 bg-blue-100 rounded-md flex items-center justify-center text-blue-600 font-bold text-[10px]">
                                {contractAlerts.length}
                            </span>
                        </div>
                    </div>
                    {/* Background Decoration */}
                    <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl"></div>
                </div>
            </div>

            <div className="mt-8 rounded-[2rem] border border-white/10 bg-[#050505]/40 backdrop-blur-xl p-8 shadow-2xl">
                <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight italic">Aktivitas Terbaru</h2>

                {loading ? (
                    <div className="flex h-40 items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : activities.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead>
                                <tr className="bg-white/5">
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-white/40 italic">Karyawan</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-white/40 italic">Waktu In</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-white/40 italic">Waktu Out</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-white/40 italic">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 bg-transparent">
                                {activities.map((act) => (
                                    <tr key={act.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="text-sm font-black text-white italic">{act.user.name}</div>
                                            <div className="text-[10px] text-white/30 font-bold uppercase tracking-tighter">{act.user.email}</div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-white/60">
                                            {new Date(act.clockIn).toLocaleTimeString()}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-white/60">
                                            {act.clockOut ? new Date(act.clockOut).toLocaleTimeString() : '-'}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${act.status === 'PRESENT' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                                }`}>
                                                {act.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
                        <p className="text-sm text-slate-500">Belum ada aktivitas absensi hari ini.</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

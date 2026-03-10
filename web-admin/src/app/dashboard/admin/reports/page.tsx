"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
    Users, 
    Building2, 
    Banknote, 
    TrendingUp, 
    CreditCard, 
    PieChart, 
    ArrowUpRight, 
    ArrowDownRight,
    Loader2,
    Calendar,
    Filter
} from "lucide-react";
import api from "@/lib/api";

export default function AdminReportsPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get("/admin/reports/consolidated");
            setStats(res.data);
        } catch (error) {
            console.error("Gagal mengambil laporan konsolidasi:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-[60vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 font-primary tracking-tight">Laporan Konsolidasi SaaS</h1>
                    <p className="mt-1 text-sm text-slate-500">Helicopter View seluruh ekosistem aivola di semua tenant.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">Periode: Maret 2026</span>
                    </div>
                </div>
            </div>

            {/* Global Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <span className="flex items-center gap-0.5 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <ArrowUpRight className="h-3 w-3" /> +2
                        </span>
                    </div>
                    <p className="text-sm font-medium text-slate-500">Total Tenant</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.global.totalTenants} Perusahaan</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 rounded-xl">
                            <Users className="h-6 w-6 text-purple-600" />
                        </div>
                        <span className="flex items-center gap-0.5 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <ArrowUpRight className="h-3 w-3" /> +14
                        </span>
                    </div>
                    <p className="text-sm font-medium text-slate-500">Total Karyawan SaaS</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.global.totalEmployees} Orang</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-50 rounded-xl">
                            <CreditCard className="h-6 w-6 text-indigo-600" />
                        </div>
                        <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                            <TrendingUp className="h-3 w-3" /> 84%
                        </span>
                    </div>
                    <p className="text-sm font-medium text-slate-500">Total Billing (Invoiced)</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(stats?.global.totalInvoiced)}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-none">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-right">
                            <span className="block text-[10px] uppercase font-bold opacity-70">Real Revenue</span>
                        </div>
                    </div>
                    <p className="text-sm font-medium opacity-80">Total Pembayaran (Paid)</p>
                    <h3 className="text-2xl font-bold mt-1 text-white">{formatCurrency(stats?.global.totalPaid)}</h3>
                    <div className="mt-4 w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-white h-full transition-all duration-1000" 
                            style={{ width: `${(stats?.global.totalPaid / stats?.global.totalInvoiced) * 100}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Payroll Aggregate */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <Banknote className="h-5 w-5 text-green-600" /> Total Payroll Sistem (Bulan Ini)
                        </h2>
                    </div>
                    <div className="p-8 flex flex-col items-center justify-center">
                        <p className="text-sm text-slate-500 mb-2 uppercase font-bold tracking-widest">Akumulasi Gaji Seluruh Tenant</p>
                        <h2 className="text-4xl font-black text-slate-900">{formatCurrency(stats?.global.totalPayrollAmount)}</h2>
                        <div className="mt-8 grid grid-cols-2 gap-8 w-full">
                            <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Rata-rata per Tenant</p>
                                <p className="font-bold text-slate-700">{formatCurrency(stats?.global.totalPayrollAmount / stats?.global.totalTenants)}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Cost per Employee</p>
                                <p className="font-bold text-slate-700">{formatCurrency(stats?.global.totalPayrollAmount / stats?.global.totalEmployees)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Tenants Sidebar */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-indigo-600" /> Top Tenant Aktif
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="space-y-6">
                            {stats?.topTenants.map((t: any, idx: number) => (
                                <div key={t.id} className="flex items-center gap-4">
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                        idx === 0 ? 'bg-amber-100 text-amber-600' :
                                        idx === 1 ? 'bg-slate-100 text-slate-600' :
                                        'bg-blue-50 text-blue-600'
                                    }`}>
                                        #{idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 truncate">{t.name}</p>
                                        <p className="text-[10px] font-medium text-slate-400">{t.contractType} • {t.employeeCount} Karyawan</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="h-1.5 w-16 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                            <div 
                                                className="bg-indigo-500 h-full" 
                                                style={{ width: `${(t.employeeCount / stats?.global.totalEmployees) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <button className="w-full mt-10 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-bold rounded-xl transition-colors border border-slate-200">
                            Lihat Semua Tenant
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

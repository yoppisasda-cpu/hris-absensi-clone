'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Briefcase, 
  Wallet, 
  PieChart, 
  BarChart3, 
  Monitor, 
  Maximize, 
  Minimize, 
  ArrowLeft,
  Calendar,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';
import ExecutiveCard from '@/components/dashboard/ExecutiveCard';
import ExecutiveForecast from '@/components/dashboard/ExecutiveForecast';

export default function ExecutiveDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isTVMode, setIsTVMode] = useState(false);
  const [companyName, setCompanyName] = useState('Aivola Enterprise');
  const [summary, setSummary] = useState<any>(null);
  const [finData, setFinData] = useState<any[]>([]);
  const [invData, setInvData] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sumRes, finRes, invRes, aiRes] = await Promise.all([
          api.get('/stats/summary'),
          api.get('/stats/visual-finance'),
          api.get('/stats/visual-inventory'),
          api.get('/stats/ai-insights')
        ]);
        setSummary(sumRes.data);
        setFinData(finRes.data);
        setInvData(invRes.data);
        setInsights(aiRes.data);
        if (sumRes.data.companyName) setCompanyName(sumRes.data.companyName);
      } catch (err) {
        console.error("Gagal memuat data eksekutif", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    setIsMounted(true);
  }, []);

  const toggleTVMode = () => {
    if (!isTVMode) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
    setIsTVMode(!isTVMode);
  };

  useEffect(() => {
    const handleExit = () => {
        if (!document.fullscreenElement) setIsTVMode(false);
    };
    document.addEventListener('fullscreenchange', handleExit);
    return () => document.removeEventListener('fullscreenchange', handleExit);
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // Radial progression for Profitability (Simulated goal: 1B)
  const radialData = [
    { name: 'Revenue', value: summary?.monthlyProfit > 0 ? summary.monthlyProfit : 0, fill: '#3b82f6' },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center bg-slate-50/50 rounded-3xl animate-pulse">
            <div className="text-center">
                <Sparkles className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-slate-500 font-black tracking-widest uppercase">Building Executive Insights...</p>
            </div>
        </div>
      </DashboardLayout>
    );
  }

  const Content = (
    <div className={`min-h-screen transition-all duration-700 ${isTVMode ? 'bg-slate-950 p-12 text-white' : 'p-6'}`}>
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div className="flex items-center gap-6">
          {!isTVMode && (
              <button 
                onClick={() => router.back()} 
                className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </button>
          )}
          <div>
            <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isTVMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>Executive View</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className={`text-xs font-bold ${isTVMode ? 'text-slate-500' : 'text-slate-400'}`}>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <h1 className={`text-4xl font-black tracking-tighter mt-2 ${isTVMode ? 'text-white' : 'text-slate-900'}`}>
                {companyName} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Intelligence</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
            <button 
                onClick={toggleTVMode}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black transition-all active:scale-95 shadow-xl ${
                    isTVMode 
                    ? 'bg-slate-800 text-white hover:bg-slate-700' 
                    : 'bg-slate-900 text-white hover:shadow-slate-500/20'
                }`}
            >
                {isTVMode ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                {isTVMode ? 'EXIT TV MODE' : 'ENTER TV MODE'}
            </button>
        </div>
      </div>

      {/* NEW: AI PREDICTIVE RADAR */}
      {!isTVMode && <ExecutiveForecast />}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* KPI: LIQUIDITY */}
        <ExecutiveCard 
            title="Total Liquidity" 
            variant="blue" 
            icon={<Wallet className="h-6 w-6" />}
            className={isTVMode ? 'bg-slate-900/50 border-white/10' : ''}
        >
            <div className={`mt-4 text-4xl font-black tracking-tight ${isTVMode ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrency(summary?.totalBalance || 0)}
            </div>
            <p className="text-slate-400 text-sm mt-2 font-medium">Dana siap pakai di seluruh akun.</p>
        </ExecutiveCard>

        {/* KPI: PROFITABILITY */}
        <ExecutiveCard 
            title="Net Profit (Bln Ini)" 
            variant="emerald" 
            icon={<TrendingUp className="h-6 w-6" />}
            className={isTVMode ? 'bg-slate-900/50 border-white/10' : ''}
        >
            <div className={`mt-4 text-4xl font-black tracking-tight ${summary?.monthlyProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatCurrency(summary?.monthlyProfit || 0)}
            </div>
            <div className="mt-3 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">Healthy</span>
                <span className="text-slate-400 text-xs font-bold italic">Berdasarkan arus kas riil.</span>
            </div>
        </ExecutiveCard>

        {/* KPI: ATTENDANCE RATE */}
        <ExecutiveCard 
            title="Attendance Rate" 
            variant="indigo" 
            icon={<Users className="h-6 w-6" />}
            className={isTVMode ? 'bg-slate-900/50 border-white/10' : ''}
        >
            <div className={`mt-4 text-4xl font-black tracking-tight ${isTVMode ? 'text-white' : 'text-slate-900'}`}>
                {Math.round((summary?.presentCount / summary?.totalEmployees) * 100) || 0}%
            </div>
            <div className="mt-4 w-full bg-slate-200/50 rounded-full h-2.5 overflow-hidden">
                <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${(summary?.presentCount / summary?.totalEmployees) * 100 || 0}%` }} 
                />
            </div>
            <p className="text-slate-400 text-xs mt-3 flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {summary?.presentCount} dari {summary?.totalEmployees} staf hadir hari ini.
            </p>
        </ExecutiveCard>

        {/* KPI: INVENTORY HEALTH */}
        <ExecutiveCard 
            title="Inventory Value" 
            variant="slate" 
            icon={<BarChart3 className="h-6 w-6" />}
            className={isTVMode ? 'bg-slate-900/50 border-white/10' : ''}
        >
            <div className={`mt-4 text-4xl font-black tracking-tight ${isTVMode ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrency(summary?.inventoryValue || 0)}
            </div>
            <div className="mt-3 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${invData?.stockBalance < 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {invData?.stockBalance || 0} Unit Tersedia
                </span>
            </div>
        </ExecutiveCard>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
        {/* Large Cashflow Chart */}
        <div className="lg:col-span-2">
          <ExecutiveCard 
            title="Historical Cashflow Intelligence" 
            subtitle="Ringkasan 30 hari terakhir pendapatan vs beban operasional."
            variant="blue"
            className={`h-[450px] ${isTVMode ? 'bg-slate-900/50 border-white/10' : ''}`}
          >
            <div className="h-[350px] w-full flex items-center justify-center">
              {!isMounted ? (
                <div className="flex flex-col items-center gap-3 animate-pulse">
                  <div className="h-8 w-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">Initializing Canvas...</p>
                </div>
              ) : finData.length === 0 ? (
                <div className="text-center p-12 bg-slate-900/20 rounded-3xl border border-dashed border-white/5 w-full">
                  <p className="text-slate-500 text-sm font-medium italic">Belum ada data aliran kas untuk divisualisasikan.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={finData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke={isTVMode ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke={isTVMode ? '#64748b' : '#94a3b8'} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp${(v/1000000).toFixed(1)}M`} />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: isTVMode ? '#0f172a' : '#fff', 
                            borderRadius: '16px', 
                            border: 'none', 
                            boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                            color: isTVMode ? '#fff' : '#000'
                        }} 
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                    <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </ExecutiveCard>
        </div>

        {/* AI Insight Column */}
        <div className="flex flex-col gap-6">
            <ExecutiveCard 
                title="Aivola Mind - Active Insight" 
                variant="indigo" 
                className={`flex-1 ${isTVMode ? 'bg-indigo-900/20 border-indigo-500/20' : ''}`}
            >
                <div className="space-y-6">
                    {insights.length > 0 ? (
                        insights.slice(0, 3).map((insight, idx) => (
                            <div key={idx} className="flex gap-4">
                                <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${
                                    insight.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' :
                                    insight.type === 'warning' ? 'bg-amber-500/20 text-amber-500' :
                                    insight.type === 'danger' ? 'bg-red-500/20 text-red-500' :
                                    'bg-blue-500/20 text-blue-500'
                                }`}>
                                    <Zap className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className={`text-sm font-black uppercase tracking-tight ${isTVMode ? 'text-white' : 'text-slate-900'}`}>{insight.message}</p>
                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed font-medium">{insight.detail}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-500 text-sm italic">Menganalisis anomali data...</p>
                    )}
                </div>
            </ExecutiveCard>

            <div className={`p-8 rounded-[2rem] border overflow-hidden relative group transition-all duration-500 ${isTVMode ? 'bg-gradient-to-tr from-blue-600 to-indigo-900 border-white/10' : 'bg-gradient-to-tr from-blue-600 to-indigo-600 border-transparent shadow-2xl'}`}>
                <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-125 transition-transform duration-700">
                    <Sparkles className="h-24 w-24 text-white" />
                </div>
                <div className="relative z-10 text-white">
                    <h4 className="text-lg font-black tracking-tight mb-2">Siap Melangkah Lebih Jauh?</h4>
                    <p className="text-blue-100 text-sm font-medium mb-6 leading-relaxed">Gunakan Aivola Store untuk membuka modul kustomisasi laporan eksekutif lainnya.</p>
                    <button onClick={() => router.push('/dashboard/store')} className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-sm shadow-xl hover:bg-blue-50 transition-all active:scale-95 uppercase tracking-widest">Kunjungi Marketplace</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className={`transition-all duration-700 ${isTVMode ? 'fixed inset-0 z-[9999] bg-slate-950 overflow-y-auto' : ''}`}>
        {Content}
      </div>
    </DashboardLayout>
  );
}

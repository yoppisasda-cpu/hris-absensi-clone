'use client';

import React, { useEffect, useState } from 'react';
import { 
    Activity, 
    TrendingUp, 
    AlertCircle, 
    ShieldCheck, 
    Zap, 
    ArrowUpRight,
    Info,
    CheckCircle2,
    BarChart3
} from 'lucide-react';
import api from '@/lib/api';

const FinancialHealthScore = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchHealthScore = async () => {
            try {
                setLoading(true);
                const res = await api.get('/stats/financial-health');
                setData(res.data);
            } catch (err) {
                console.error("Failed to load health score", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHealthScore();
    }, []);

    if (loading) {
        return (
            <div className="rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-10 shadow-2xl animate-pulse h-80 flex items-center justify-center">
                 <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                    <span className="text-white/20 font-black uppercase text-[9px] tracking-[0.4em] italic">Diagnostics Loading...</span>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const score = data.overallScore || 0;
    const strokeDasharray = 2 * Math.PI * 45;
    const strokeDashoffset = strokeDasharray - (score / 100) * strokeDasharray;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'EXCELLENT': return 'text-emerald-400';
            case 'GOOD': return 'text-blue-400';
            case 'STABLE': return 'text-amber-400';
            case 'WARNING': return 'text-orange-400';
            case 'CRITICAL': return 'text-red-400';
            default: return 'text-white';
        }
    };

    return (
        <div className="rounded-[2.5rem] border border-white/10 bg-[#050505]/40 backdrop-blur-3xl p-8 shadow-2xl transition-all hover:border-white/20 relative overflow-hidden group">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white tracking-tighter uppercase italic">Fiscal Health Monitor</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest italic">Asset Liquidity Index</span>
                        </div>
                    </div>
                </div>
                <div className={`px-4 py-2 bg-white/5 rounded-2xl border text-[9px] font-black uppercase tracking-widest italic ${getStatusColor(data.status)} border-current/20`}>
                    Status: {data.status}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Hero: Gauge Box */}
                <div className="lg:col-span-1 p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-600/10 to-transparent border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="relative h-40 w-40 mb-4">
                        <svg className="h-full w-full rotate-[-90deg]">
                            <circle cx="80" cy="80" r="45" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                            <circle
                                cx="80" cy="80" r="45" fill="transparent" stroke="currentColor" strokeWidth="10"
                                strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                                className={`transition-all duration-1500 ease-out drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] ${getStatusColor(data.status)}`}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-6xl font-black text-white italic tracking-tighter text-glow-md">{score}</span>
                        </div>
                    </div>
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic">Overall Health Score</span>
                </div>

                {/* Info: Ratios & Analysis Box */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Ratios Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Liquidity', val: `${Math.round(data.ratios?.liquidityRatio * 100) / 100}x`, icon: <Activity className="h-3 w-3 text-blue-400" />, color: 'bg-blue-500' },
                            { label: 'Margin', val: `${Math.round(data.ratios?.profitMargin * 100)}%`, icon: <TrendingUp className="h-3 w-3 text-emerald-400" />, color: 'bg-emerald-500' },
                            { label: 'Debt', val: `${Math.round(data.ratios?.debtToRevenue * 100)}%`, icon: <BarChart3 className="h-3 w-3 text-orange-400" />, color: 'bg-orange-500' },
                        ].map((r, i) => (
                            <div key={i} className="p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                <div className="flex items-center gap-2 mb-3">
                                    {r.icon}
                                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest italic">{r.label}</span>
                                </div>
                                <p className="text-lg font-black text-white italic tracking-tighter mb-2">{r.val}</p>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full ${r.color} rounded-full transition-all duration-1500`} style={{ width: '60%' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Strategic Insight Box */}
                    <div className="p-6 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 relative overflow-hidden group/insight transition-all hover:bg-indigo-500/15">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Zap className="h-12 w-12 text-indigo-400" />
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-indigo-500 text-white shadow-xl shadow-indigo-500/20">
                                <Zap className="h-4 w-4 fill-white" />
                            </div>
                            <div>
                                <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 italic">AI Strategic Insight</h4>
                                <p className="text-xs text-indigo-100/70 leading-relaxed font-bold italic">
                                    {data.analysis.replace(/[#*]/g, '')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recommendations Bar */}
            <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
                        <Info className="h-5 w-5" />
                    </div>
                    <p className="text-[10px] font-bold text-white/40 italic">
                        {data.recommendation.replace(/[#*]/g, '')}
                    </p>
                </div>
                <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl shadow-indigo-600/20 group/btn">
                    Deep Audit Node
                    <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
            </div>
        </div>
    );
};

export default FinancialHealthScore;

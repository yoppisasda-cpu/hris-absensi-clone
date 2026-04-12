'use client';

import React, { useEffect, useState } from 'react';
import { 
    Activity, 
    TrendingUp, 
    AlertCircle, 
    CheckCircle2, 
    ShieldCheck, 
    Zap, 
    ArrowUpRight,
    HelpCircle,
    Info
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
            <div className="rounded-[2.5rem] border border-white/10 bg-[#050505]/40 backdrop-blur-3xl p-8 shadow-2xl animate-pulse">
                <div className="h-64 flex flex-col items-center justify-center">
                    <Activity className="h-12 w-12 text-blue-500/20 animate-pulse mb-4" />
                    <div className="h-4 w-48 bg-white/5 rounded-full mb-2"></div>
                    <div className="h-3 w-32 bg-white/5 rounded-full"></div>
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

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'EXCELLENT': return 'bg-emerald-500/10 border-emerald-500/20';
            case 'GOOD': return 'bg-blue-500/10 border-blue-500/20';
            case 'STABLE': return 'bg-amber-500/10 border-amber-500/20';
            case 'WARNING': return 'bg-orange-500/10 border-orange-500/20';
            case 'CRITICAL': return 'bg-red-500/10 border-red-500/20';
            default: return 'bg-white/5 border-white/10';
        }
    };

    return (
        <div className="rounded-[2.5rem] border border-white/10 bg-[#050505]/40 backdrop-blur-3xl p-8 shadow-2xl transition-all hover:border-white/20 relative overflow-hidden group">
            {/* Background Glow */}
            <div className={`absolute -top-24 -right-24 h-64 w-64 rounded-full blur-[100px] opacity-10 transition-colors duration-1000 ${
                score > 80 ? 'bg-emerald-500' : score > 60 ? 'bg-blue-500' : 'bg-amber-500'
            }`}></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
                {/* Gauge Section */}
                <div className="relative flex flex-col items-center shrink-0">
                    <div className="relative h-48 w-48">
                        {/* Shadow Progress Track */}
                        <svg className="h-full w-full rotate-[-90deg]">
                            <circle
                                cx="96"
                                cy="96"
                                r="45"
                                fill="transparent"
                                stroke="rgba(255,255,255,0.03)"
                                strokeWidth="8"
                            />
                            <circle
                                cx="96"
                                cy="96"
                                r="45"
                                fill="transparent"
                                stroke="currentColor"
                                strokeWidth="8"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className={`transition-all duration-1000 ease-out drop-shadow-[0_0_12px_rgba(59,130,246,0.5)] ${getStatusColor(data.status)}`}
                            />
                        </svg>
                        
                        {/* Central Score */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-black text-white italic tracking-tighter">{score}</span>
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">HEALTH SCORE</span>
                        </div>
                    </div>
                    
                    <div className={`mt-6 px-6 py-2 rounded-2xl border font-black text-[10px] uppercase tracking-[0.3em] italic shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-700 ${getStatusBg(data.status)} ${getStatusColor(data.status)}`}>
                        {data.status}
                    </div>
                </div>

                {/* Info Section */}
                <div className="flex-1 w-full">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Kesehatan Finansial</h3>
                            <p className="text-xs text-white/40 mt-1 font-medium capitalize italic">Berdasarkan analisis rasio modal & likuiditas bulan ini</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/40">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 group-hover:bg-white/[0.07] transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <Activity className="h-4 w-4 text-blue-400" />
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">LIKUIDITAS</span>
                            </div>
                            <p className="text-lg font-black text-white italic tracking-tight">{Math.round(data.ratios?.liquidityRatio * 100) / 100}x</p>
                            <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, data.ratios?.liquidityRatio * 20)}%` }}></div>
                            </div>
                        </div>

                        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 group-hover:bg-white/[0.07] transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-4 w-4 text-emerald-400" />
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">MARGIN</span>
                            </div>
                            <p className="text-lg font-black text-white italic tracking-tight">{Math.round(data.ratios?.profitMargin * 100)}%</p>
                            <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, data.ratios?.profitMargin * 100))}%` }}></div>
                            </div>
                        </div>

                        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 group-hover:bg-white/[0.07] transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-4 w-4 text-orange-400" />
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">DEBT RATIO</span>
                            </div>
                            <p className="text-lg font-black text-white italic tracking-tight">{Math.round(data.ratios?.debtToRevenue * 100)}%</p>
                            <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, data.ratios?.debtToRevenue * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 relative group/insight">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                                <Zap className="h-5 w-5 fill-white" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-white uppercase italic tracking-wider mb-2 flex items-center gap-2">
                                    Strategic Insight
                                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                                </h4>
                                <p className="text-xs text-indigo-100/70 leading-relaxed font-medium italic">
                                    {data.analysis}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Recommendation Bar */}
            <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                        {data.redFlags?.length > 0 ? (
                             <div className="h-10 w-10 rounded-full bg-red-500/20 border-2 border-[#151515] flex items-center justify-center">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                             </div>
                        ) : null}
                         <div className="h-10 w-10 rounded-full bg-indigo-500/20 border-2 border-[#151515] flex items-center justify-center">
                            <Info className="h-5 w-5 text-indigo-400" />
                         </div>
                    </div>
                    <p className="text-[11px] font-bold text-white/40 italic">
                        {data.recommendation}
                    </p>
                </div>
                <button className="px-6 py-3 bg-white/5 border border-white/10 text-white/40 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 cursor-not-allowed group/btn">
                    Detail Audit Luar
                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-500 text-white text-[7px] animate-pulse">SOON</span>
                    <ArrowUpRight className="h-3 w-3 opacity-20 group-hover/btn:opacity-100 transition-opacity" />
                </button>
            </div>
        </div>
    );
};

export default FinancialHealthScore;

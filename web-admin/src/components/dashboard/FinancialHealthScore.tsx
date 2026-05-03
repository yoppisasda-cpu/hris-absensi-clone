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
                                className={`transition-all duration-1000 ease-out drop-shadow-[0_0_12px_rgba(59,130,246,0.3)] ${getStatusColor(data.status)}`}
                            />
                        </svg>
                        
                        {/* Central Score */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-6xl font-black text-white italic tracking-tighter text-glow-md">{score}</span>
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">HEALTH SCORE</span>
                        </div>
                    </div>
                    
                    <div className={`mt-6 px-8 py-2.5 rounded-2xl border font-black text-[10px] uppercase tracking-[0.3em] italic shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-700 ${getStatusBg(data.status)} ${getStatusColor(data.status)}`}>
                        {data.status}
                    </div>
                </div>

                {/* Info Section */}
                <div className="flex-1 w-full">
                    <div className="flex items-center justify-between mb-10 pb-4 border-b border-white/5">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Financial Health</h3>
                            <p className="text-[10px] text-white/30 mt-1 font-black uppercase tracking-[0.1em] italic">Core Liquidity & Capital Analysis Matrix</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 shadow-inner group-hover:text-white transition-colors">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all shadow-inner group/card">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover/card:scale-110 transition-transform">
                                    <Activity className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">LIKUIDITAS</span>
                            </div>
                            <p className="text-2xl font-black text-white italic tracking-tighter">{Math.round(data.ratios?.liquidityRatio * 100) / 100}x</p>
                            <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, data.ratios?.liquidityRatio * 20)}%` }}></div>
                            </div>
                        </div>

                        <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all shadow-inner group/card">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover/card:scale-110 transition-transform">
                                    <TrendingUp className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">MARGIN</span>
                            </div>
                            <p className="text-2xl font-black text-white italic tracking-tighter">{Math.round(data.ratios?.profitMargin * 100)}%</p>
                            <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{ width: `${Math.max(0, Math.min(100, data.ratios?.profitMargin * 100))}%` }}></div>
                            </div>
                        </div>

                        <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-orange-500/30 transition-all shadow-inner group/card">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-8 w-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 group-hover/card:scale-110 transition-transform">
                                    <AlertCircle className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">DEBT RATIO</span>
                            </div>
                            <p className="text-2xl font-black text-white italic tracking-tighter">{Math.round(data.ratios?.debtToRevenue * 100)}%</p>
                            <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, data.ratios?.debtToRevenue * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-white/5 relative group/insight transition-all hover:bg-indigo-500/10">
                        <div className="flex items-start gap-6">
                            <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-[0_0_25px_rgba(79,70,229,0.4)] transition-transform group-hover/insight:scale-110">
                                <Zap className="h-6 w-6 fill-white" />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase italic tracking-[0.2em] mb-3 flex items-center gap-2">
                                    Strategic Intelligence
                                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                                </h4>
                                <p className="text-sm text-indigo-100/70 leading-relaxed font-bold italic">
                                    {data.analysis.replace(/[#*]/g, '')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Recommendation Bar */}
            <div className="mt-10 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className="flex -space-x-4">
                        {data.redFlags?.length > 0 ? (
                             <div className="h-12 w-12 rounded-full bg-red-500/10 border-2 border-[#050505] flex items-center justify-center shadow-xl">
                                <AlertCircle className="h-6 w-6 text-red-500 animate-pulse" />
                             </div>
                        ) : null}
                         <div className="h-12 w-12 rounded-full bg-indigo-500/10 border-2 border-[#050505] flex items-center justify-center shadow-xl">
                            <Info className="h-6 w-6 text-indigo-400" />
                         </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic mb-1">AI Recommendation</p>
                        <p className="text-xs font-black text-white italic tracking-tight opacity-70">
                            {data.recommendation.replace(/[#*]/g, '')}
                        </p>
                    </div>
                </div>
                <button className="px-8 py-4 bg-white/5 border border-white/10 text-white/30 rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] transition-all flex items-center gap-4 cursor-not-allowed group/btn hover:bg-white/10 hover:text-white">
                    Audit Node Matrix
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500 text-white text-[7px] animate-pulse">SOON</span>
                    <ArrowUpRight className="h-4 w-4 opacity-20 group-hover/btn:opacity-100 transition-opacity" />
                </button>
            </div>
        </div>
    );
};

export default FinancialHealthScore;

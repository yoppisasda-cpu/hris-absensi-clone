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
    CheckCircle2
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
            <div className="rounded-[3rem] border border-white/10 bg-[#050505]/40 backdrop-blur-3xl p-10 shadow-2xl animate-pulse">
                <div className="h-48 flex items-center justify-center gap-10">
                    <div className="h-32 w-32 rounded-full border-4 border-white/5 border-t-blue-500 animate-spin"></div>
                    <div className="flex-1 space-y-4">
                        <div className="h-4 w-1/2 bg-white/5 rounded-full"></div>
                        <div className="h-4 w-3/4 bg-white/5 rounded-full"></div>
                    </div>
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
        <div className="rounded-[3rem] border border-white/10 bg-[#050505]/60 backdrop-blur-3xl p-10 shadow-2xl transition-all hover:border-white/20 relative overflow-hidden group">
            {/* Background Glow */}
            <div className={`absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-[100px] opacity-10 transition-colors duration-1000 ${
                score > 80 ? 'bg-emerald-500' : score > 60 ? 'bg-blue-500' : 'bg-amber-500'
            }`}></div>
            
            <div className="relative z-10 flex flex-col xl:flex-row items-center gap-12">
                {/* Left: Gauge */}
                <div className="flex-shrink-0 flex flex-col items-center">
                    <div className="relative h-44 w-44">
                        <svg className="h-full w-full rotate-[-90deg]">
                            <circle cx="88" cy="88" r="45" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                            <circle
                                cx="88" cy="88" r="45" fill="transparent" stroke="currentColor" strokeWidth="8"
                                strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                                className={`transition-all duration-1000 ease-out drop-shadow-[0_0_12px_rgba(59,130,246,0.3)] ${getStatusColor(data.status)}`}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-6xl font-black text-white italic tracking-tighter text-glow-md">{score}</span>
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] italic">HEALTH SCORE</span>
                        </div>
                    </div>
                    <div className={`mt-4 px-6 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-[0.2em] italic shadow-lg ${getStatusColor(data.status)} border-current bg-white/5`}>
                        {data.status}
                    </div>
                </div>

                {/* Middle: Key Ratios */}
                <div className="flex-grow min-w-0 border-x border-white/5 px-12 space-y-8">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                             <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Financial Health</h3>
                             <ShieldCheck className="h-5 w-5 text-white/20" />
                        </div>
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.1em] italic">Core Liquidity & Capital Analysis Matrix</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="group/ratio">
                            <div className="flex items-center gap-2 mb-3">
                                <Activity className="h-3.5 w-3.5 text-blue-400" />
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest italic">LIKUIDITAS</span>
                            </div>
                            <p className="text-xl font-black text-white italic tracking-tighter mb-3">{Math.round(data.ratios?.liquidityRatio * 100) / 100}x</p>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, data.ratios?.liquidityRatio * 20)}%` }}></div>
                            </div>
                        </div>

                        <div className="group/ratio">
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest italic">MARGIN</span>
                            </div>
                            <p className="text-xl font-black text-white italic tracking-tighter mb-3">{Math.round(data.ratios?.profitMargin * 100)}%</p>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${Math.max(0, Math.min(100, data.ratios?.profitMargin * 100))}%` }}></div>
                            </div>
                        </div>

                        <div className="group/ratio">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertCircle className="h-3.5 w-3.5 text-orange-400" />
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest italic">DEBT RATIO</span>
                            </div>
                            <p className="text-xl font-black text-white italic tracking-tighter mb-3">{Math.round(data.ratios?.debtToRevenue * 100)}%</p>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, data.ratios?.debtToRevenue * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Strategic Intelligence */}
                <div className="flex-shrink-0 w-full xl:w-96">
                    <div className="p-8 rounded-[2rem] bg-blue-600/5 border border-blue-500/10 relative group/insight transition-all hover:bg-blue-600/10">
                        <div className="flex items-start gap-5">
                            <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-[0_0_25px_rgba(59,130,246,0.4)]">
                                <Zap className="h-5 w-5 fill-white" />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-blue-400 uppercase italic tracking-[0.2em] mb-3 flex items-center gap-2">
                                    Strategic Insight
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping"></span>
                                </h4>
                                <p className="text-sm text-blue-100/70 leading-relaxed font-bold italic">
                                    {data.analysis.replace(/[#*]/g, '')}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex items-center justify-between px-6">
                        <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                <Info className="h-4 w-4" />
                             </div>
                             <p className="text-[10px] font-bold text-white/40 italic">Audit recommended</p>
                        </div>
                        <button className="px-4 py-2 bg-white/5 border border-white/10 text-white/30 rounded-xl font-black text-[8px] uppercase tracking-widest hover:text-white transition-all">Details <ArrowUpRight className="h-3 w-3 inline ml-1" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialHealthScore;

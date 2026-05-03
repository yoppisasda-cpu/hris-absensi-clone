
'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Info, BrainCircuit, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

interface ForecastData {
    forecast: {
        next30DaysBalance: number;
        trend: 'UP' | 'DOWN' | 'STABLE';
        confidence: number;
    };
    anomalies: {
        date: string;
        amount: number;
        category: string;
        reason: string;
    }[];
    strategicAdvice: string;
}

export default function ExecutiveForecast() {
    const [data, setData] = useState<ForecastData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchForecast = async () => {
            try {
                const res = await api.get('/stats/predictive-insights');
                setData(res.data);
            } catch (err) {
                console.error("Failed to load AI Forecast", err);
            } finally {
                setLoading(false);
            }
        };
        fetchForecast();
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
    };

    if (loading) return (
        <div className="w-full h-32 bg-[#050505]/40 border border-white/10 rounded-[2.5rem] flex items-center justify-center animate-pulse backdrop-blur-3xl">
            <div className="flex items-center gap-3">
                <BrainCircuit className="h-5 w-5 text-indigo-400 animate-bounce" />
                <span className="text-white/40 font-black uppercase text-xs tracking-[0.2em] italic">AI sedang memproyeksikan masa depan...</span>
            </div>
        </div>
    );

    if (!data) return null;

    return (
        <div className="w-full mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="relative overflow-hidden rounded-[3rem] border border-indigo-500/20 bg-[#050505]/60 backdrop-blur-3xl p-10 shadow-2xl">
                {/* Decoration */}
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/5 blur-[100px]" />
                
                <div className="relative z-10 flex flex-col xl:flex-row gap-12 items-center">
                    {/* Left: Main Figure */}
                    <div className="flex-shrink-0 lg:min-w-[300px]">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                <Sparkles className="h-4 w-4 text-indigo-400" />
                            </div>
                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic">Projection 30D</h3>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <h2 className="text-6xl font-black text-white tracking-tighter italic text-glow-md">
                                {formatCurrency(data.forecast.next30DaysBalance)}
                            </h2>
                            <div className="flex items-center gap-3 mt-2">
                                <div className={`flex items-center gap-2 px-4 py-1 rounded-full text-[10px] font-black uppercase italic border ${
                                    data.forecast.trend === 'UP' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                    data.forecast.trend === 'DOWN' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                    {data.forecast.trend === 'UP' ? <TrendingUp className="h-3 w-3" /> : 
                                     data.forecast.trend === 'DOWN' ? <TrendingDown className="h-3 w-3" /> : 
                                     <Info className="h-3 w-3" />}
                                    {data.forecast.trend}
                                </div>
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">Confidence: {data.forecast.confidence}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Middle: Strategic Intelligence (THE "SIDEWAYS" PART) */}
                    <div className="flex-grow min-w-0 border-x border-white/5 px-12">
                         <div className="flex items-start gap-6">
                            <div className="p-4 rounded-[1.5rem] bg-indigo-600 text-white shadow-[0_0_30px_rgba(79,70,229,0.4)] hidden lg:block">
                                <BrainCircuit className="h-7 w-7" />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 italic flex items-center gap-2">
                                    Strategic Intelligence Matrix
                                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                                </h4>
                                <div className="text-base text-indigo-100/70 leading-relaxed font-bold italic space-y-3">
                                    {data.strategicAdvice.replace(/[#*]/g, '').split('\n').filter(line => line.trim()).map((line, i) => (
                                        <p key={i}>{line.trim()}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Anomaly Guard */}
                    <div className="flex-shrink-0 w-full xl:w-72">
                         <div className="flex items-center justify-between mb-6">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] italic">Anomaly Guard</span>
                            <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Scanning</div>
                        </div>
                        
                        {data.anomalies.length > 0 ? (
                            <div className="space-y-4">
                                {data.anomalies.map((anom, idx) => (
                                    <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-500/20 transition-all group/item">
                                        <div className="flex gap-3 items-start">
                                            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-black text-white italic leading-tight uppercase">{anom.reason}</p>
                                                <p className="text-[8px] text-white/30 font-bold uppercase mt-1 font-mono">{formatCurrency(anom.amount)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 border border-dashed border-white/5 rounded-3xl">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500/20 mb-3" />
                                <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] italic">No Anomalies</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

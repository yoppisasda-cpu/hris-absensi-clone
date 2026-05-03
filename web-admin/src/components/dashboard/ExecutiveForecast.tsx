
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
            <div className="relative overflow-hidden rounded-[2.5rem] border border-indigo-500/20 bg-[#050505]/60 backdrop-blur-2xl p-8 shadow-2xl">
                {/* Decoration */}
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
                <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />

                <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start">
                    {/* Forecast Main */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                                <Sparkles className="h-4 w-4 text-indigo-400" />
                            </div>
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic">AI Cashflow Projection (Next 30 Days)</h3>
                        </div>
                        
                        <div className="flex items-end gap-5 mb-8">
                            <h2 className="text-6xl font-black text-white tracking-tighter italic text-glow-md">
                                {formatCurrency(data.forecast.next30DaysBalance)}
                            </h2>
                            <div className={`mb-2 flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic border ${
                                data.forecast.trend === 'UP' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                data.forecast.trend === 'DOWN' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                                {data.forecast.trend === 'UP' ? <TrendingUp className="h-3 w-3" /> : 
                                 data.forecast.trend === 'DOWN' ? <TrendingDown className="h-3 w-3" /> : 
                                 <Info className="h-3 w-3" />}
                                {data.forecast.trend}
                            </div>
                        </div>

                        {/* Strategic Insight Box */}
                        <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-white/5 relative group/insight transition-all hover:bg-indigo-500/10">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                                    <BrainCircuit className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 italic flex items-center gap-2">
                                        Strategic Intelligence
                                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                                    </h4>
                                    <div className="text-sm text-indigo-100/70 leading-relaxed font-bold italic space-y-2">
                                        {data.strategicAdvice.replace(/[#*]/g, '').split('\n').filter(line => line.trim()).map((line, i) => (
                                            <p key={i}>{line.trim()}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Anomaly / Guard Section */}
                    <div className="w-full lg:w-80 p-6 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md shadow-inner">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">Anomaly Guard</span>
                            <div className="flex gap-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
                            </div>
                        </div>
                        
                        {data.anomalies.length > 0 ? (
                            <div className="space-y-4">
                                {data.anomalies.map((anom, idx) => (
                                    <div key={idx} className="flex gap-4 items-start p-3 rounded-2xl hover:bg-white/5 transition-colors group/item">
                                        <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover/item:scale-110 transition-transform">
                                            <AlertCircle className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-white italic leading-tight uppercase tracking-tight">{anom.reason}</p>
                                            <p className="text-[9px] text-white/30 font-bold uppercase mt-2 font-mono">{anom.date} • {formatCurrency(anom.amount)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500/40" />
                                </div>
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] italic">No Anomalies Detected</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

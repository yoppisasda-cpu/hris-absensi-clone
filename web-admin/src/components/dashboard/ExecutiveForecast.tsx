
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
        <div className="w-full h-32 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center animate-pulse">
            <div className="flex items-center gap-3">
                <BrainCircuit className="h-5 w-5 text-indigo-400 animate-bounce" />
                <span className="text-white/40 font-black uppercase text-xs tracking-widest">AI sedang memproyeksikan masa depan...</span>
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
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                                <Sparkles className="h-4 w-4 text-indigo-400" />
                            </div>
                            <h3 className="text-xs font-black text-white/50 uppercase tracking-[0.3em] italic">AI Cashflow Projection (Next 30 Days)</h3>
                        </div>
                        
                        <div className="flex items-end gap-4">
                            <h2 className="text-5xl font-black text-white tracking-tighter italic">
                                {formatCurrency(data.forecast.next30DaysBalance)}
                            </h2>
                            <div className={`mb-2 flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase italic ${
                                data.forecast.trend === 'UP' ? 'bg-emerald-500/20 text-emerald-400' : 
                                data.forecast.trend === 'DOWN' ? 'bg-red-500/20 text-red-400' : 
                                'bg-blue-500/20 text-blue-400'
                            }`}>
                                {data.forecast.trend === 'UP' ? <TrendingUp className="h-3 w-3" /> : 
                                 data.forecast.trend === 'DOWN' ? <TrendingDown className="h-3 w-3" /> : 
                                 <Info className="h-3 w-3" />}
                                {data.forecast.trend}
                            </div>
                        </div>
                        <p className="mt-4 text-white/40 text-sm font-bold italic leading-relaxed max-w-2xl">
                            {data.strategicAdvice.split('\n')[0]}
                        </p>
                    </div>

                    {/* Anomaly / Guard Section */}
                    <div className="w-full lg:w-80 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">AI Anomaly Guard</span>
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </div>
                        
                        {data.anomalies.length > 0 ? (
                            <div className="space-y-4">
                                {data.anomalies.map((anom, idx) => (
                                    <div key={idx} className="flex gap-3 items-start">
                                        <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[11px] font-black text-white italic">{anom.reason}</p>
                                            <p className="text-[9px] text-white/40 font-bold uppercase mt-1">{anom.date} • {formatCurrency(anom.amount)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-4 text-center">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500/20 mb-2" />
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest italic">No Anomalies Detected</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

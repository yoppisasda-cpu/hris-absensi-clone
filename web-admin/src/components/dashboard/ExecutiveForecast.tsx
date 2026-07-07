
'use client';

'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Info, BrainCircuit, CheckCircle2, ChevronRight } from 'lucide-react';
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
    const [aiUsageCount, setAiUsageCount] = useState(0);
    const [aiError, setAiError] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(true);

    const checkQuotaOrCache = async () => {
        try {
            setIsChecking(true);
            const res = await api.get('/stats/predictive-insights?checkOnly=true');
            if (res.data.forecast) {
                // Already in cache!
                setData(res.data);
            }
            if (typeof res.data.usageCount === 'number') {
                setAiUsageCount(res.data.usageCount);
            }
        } catch (err) {
            console.error("Failed to check AI Forecast quota", err);
        } finally {
            setIsChecking(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        checkQuotaOrCache();
    }, []);

    const handleStartAiAnalysis = async () => {
        try {
            setLoading(true);
            setAiError(null);
            const res = await api.get('/stats/predictive-insights');
            setData(res.data);
            if (typeof res.data.usageCount === 'number') {
                setAiUsageCount(res.data.usageCount);
            }
        } catch (err: any) {
            console.error("Failed to run AI Forecast", err);
            const errMsg = err.response?.data?.error || "AI gagal memproses prediksi keuangan saat ini.";
            setAiError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
    };

    if (loading || isChecking) return (
        <div className="w-full h-80 bg-slate-900/40 border border-white/5 rounded-[2.5rem] flex items-center justify-center animate-pulse backdrop-blur-3xl">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <span className="text-white/20 font-black uppercase text-[9px] tracking-[0.4em] italic">Intelligence Loading...</span>
            </div>
        </div>
    );

    // If no analysis has been loaded yet, show the preview state with a manual trigger button
    if (!data) {
        return (
            <div className="w-full animate-in fade-in zoom-in-95 duration-1000">
                <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#050505]/40 backdrop-blur-3xl p-8 shadow-2xl transition-all hover:border-white/20 flex flex-col justify-between min-h-[320px]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
                                <BrainCircuit className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white tracking-tighter uppercase italic">AI Predictive Engine</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest italic">Live Projection Matrix</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Kuota:</span>
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                                aiUsageCount >= 2 
                                    ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                            }`}>
                                {aiUsageCount} / 2 Terpakai
                            </span>
                        </div>
                    </div>

                    <div className="py-6 px-4 rounded-[2rem] bg-indigo-500/5 border border-dashed border-indigo-500/20 text-center flex-grow flex flex-col justify-center items-center gap-4">
                        <p className="text-sm font-bold text-white">Analisis Proyeksi Arus Kas & Risiko Finansial</p>
                        <p className="text-xs text-slate-400 max-w-md">Gunakan kecerdasan buatan untuk memproyeksikan arus kas 30 hari ke depan serta mendeteksi potensi anomali pengeluaran.</p>
                        
                        {aiError && (
                            <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                                {aiError}
                            </div>
                        )}
                        
                        <button
                            onClick={handleStartAiAnalysis}
                            disabled={aiUsageCount >= 2}
                            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest italic flex items-center gap-2 transition-all duration-300 mt-2 ${
                                aiUsageCount >= 2
                                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                    : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] border border-indigo-400/30'
                            }`}
                        >
                            <Sparkles className="h-4 w-4 animate-pulse" />
                            Mulai Analisa AI
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full animate-in fade-in zoom-in-95 duration-1000">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#050505]/40 backdrop-blur-3xl p-8 shadow-2xl transition-all hover:border-white/20 group">
                {/* AI Badge Header */}
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
                            <BrainCircuit className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white tracking-tighter uppercase italic">AI Predictive Engine</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest italic">Live Projection Matrix</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-black italic">
                            Kuota: {aiUsageCount}/2
                        </span>
                        <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/5 text-[9px] font-black text-white/40 uppercase tracking-widest italic">
                            Confidence: {data.forecast.confidence}%
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* Main Stats Area */}
                    <div className="relative p-10 rounded-[2rem] bg-gradient-to-br from-indigo-600/10 to-transparent border border-white/5 overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Sparkles className="h-32 w-32 text-white" />
                        </div>
                        
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] italic mb-4">Cashflow Projection (30D)</p>
                        <div className="flex items-center gap-6">
                            <h2 className="text-5xl lg:text-7xl font-black text-white tracking-tighter italic text-glow-md">
                                {formatCurrency(data.forecast.next30DaysBalance)}
                            </h2>
                            <div className={`flex items-center gap-2 px-5 py-2 rounded-2xl text-[10px] font-black uppercase italic border ${
                                data.forecast.trend === 'UP' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                data.forecast.trend === 'DOWN' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                                {data.forecast.trend === 'UP' ? <TrendingUp className="h-4 w-4" /> : 
                                 data.forecast.trend === 'DOWN' ? <TrendingDown className="h-4 w-4" /> : 
                                 <Info className="h-4 w-4" />}
                                {data.forecast.trend}
                            </div>
                        </div>
                    </div>

                    {/* Content Bento Area */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Strategic Insight */}
                        <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 flex flex-col hover:bg-white/[0.07] transition-all">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-8 w-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">Strategic Roadmap</span>
                            </div>
                            <div className="text-sm text-white/70 leading-relaxed font-bold italic space-y-4">
                                {data.strategicAdvice.replace(/[#*]/g, '').split('\n').filter(line => line.trim()).map((line, i) => (
                                    <div key={i} className="flex gap-4 items-start">
                                        <div className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                                        <p>{line.trim()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Anomaly / Guard */}
                        <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 flex flex-col hover:bg-white/[0.07] transition-all">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                                        <AlertCircle className="h-4 w-4" />
                                    </div>
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">Anomaly Guard</span>
                                </div>
                                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            </div>

                            <div className="space-y-4 flex-grow">
                                {data.anomalies.length > 0 ? (
                                    data.anomalies.map((anom, idx) => (
                                        <div key={idx} className="p-5 rounded-2xl bg-[#050505]/40 border border-white/5 hover:border-amber-500/30 transition-all group/item">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-[11px] font-black text-white uppercase italic tracking-tight">{anom.reason}</p>
                                                <span className="text-[8px] font-mono text-white/30 uppercase">{anom.date}</span>
                                            </div>
                                            <p className="text-xs font-black text-amber-500 italic">{formatCurrency(anom.amount)}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                                        <CheckCircle2 className="h-12 w-12 mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No Risks Detected</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Insight */}
                <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between text-[10px] font-black uppercase italic tracking-widest text-white/20">
                    <span>Fiscal Intelligence Node: 0xF29A</span>
                    <div className="flex items-center gap-2 text-indigo-400 group-hover:translate-x-2 transition-transform cursor-pointer">
                        View Detailed Audit <ChevronRight className="h-3 w-3" />
                    </div>
                </div>
            </div>
        </div>
    );
}

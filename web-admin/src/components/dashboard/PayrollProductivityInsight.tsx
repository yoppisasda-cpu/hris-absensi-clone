
'use client';

import React, { useEffect, useState } from 'react';
import { 
    Zap, 
    TrendingUp, 
    TrendingDown, 
    Target, 
    Lightbulb, 
    BrainCircuit, 
    PieChart, 
    ArrowUpRight,
    Users
} from 'lucide-react';
import api from '@/lib/api';

interface Insight {
    title: string;
    description: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface ProductivityData {
    productivityScore: number;
    productivityTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';
    roiValue: number;
    insights: Insight[];
    recommendations: string[];
    performanceVsCostAnalysis: string;
}

export default function PayrollProductivityInsight() {
    const [data, setData] = useState<ProductivityData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const res = await api.get('/stats/payroll-productivity');
                setData(res.data);
            } catch (err) {
                console.error("Failed to load AI Payroll Insights", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, []);

    const formatROI = (val: number) => {
        return val.toFixed(2) + 'x';
    };

    if (loading) return (
        <div className="w-full h-48 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center animate-pulse mb-8">
            <div className="flex flex-col items-center gap-4">
                <BrainCircuit className="h-8 w-8 text-purple-400 animate-bounce" />
                <span className="text-white/40 font-black uppercase text-[10px] tracking-[0.4em]">AI sedang menghitung ROI SDM bapak...</span>
            </div>
        </div>
    );

    if (!data) return null;

    return (
        <div className="w-full mb-10 animate-in fade-in zoom-in-95 duration-700">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-purple-500/20 bg-gradient-to-br from-[#0c051a] to-[#050505] p-8 shadow-[0_20px_50px_rgba(139,92,246,0.1)]">
                {/* Visual Blurs */}
                <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px]" />
                <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />

                <div className="relative z-10">
                    <div className="flex flex-col xl:flex-row gap-10">
                        
                        {/* Left: Score & ROI */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/30">
                                    <Zap className="h-5 w-5 text-purple-400" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-[10px] font-black text-purple-400/70 uppercase tracking-[0.4em] leading-none mb-1">Human Capital Intelligence</h3>
                                    <h4 className="text-lg font-black text-white tracking-widest uppercase italic">Payroll Productivity Insight</h4>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Productivity Score */}
                                <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md">
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Productivity Score</p>
                                    <div className="flex items-baseline gap-3">
                                        <h2 className="text-5xl font-black text-white italic tracking-tighter">{data.productivityScore}%</h2>
                                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                            data.productivityTrend === 'IMPROVING' ? 'bg-emerald-500/20 text-emerald-400' :
                                            data.productivityTrend === 'DECLINING' ? 'bg-red-500/20 text-red-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                            {data.productivityTrend === 'IMPROVING' ? <TrendingUp className="h-3 w-3" /> : 
                                             data.productivityTrend === 'DECLINING' ? <TrendingDown className="h-3 w-3" /> : 
                                             <PieChart className="h-3 w-3" />}
                                            {data.productivityTrend}
                                        </div>
                                    </div>
                                </div>

                                {/* Employee ROI */}
                                <div className="p-6 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md relative overflow-hidden group">
                                    <ArrowUpRight className="absolute right-4 top-4 h-12 w-12 text-indigo-500/20 group-hover:text-indigo-500/40 transition-colors" />
                                    <p className="text-[10px] font-black text-indigo-300/40 uppercase tracking-widest mb-2">Revenue / Payroll ROI</p>
                                    <h2 className="text-5xl font-black text-indigo-300 italic tracking-tighter">{formatROI(data.roiValue)}</h2>
                                    <p className="text-[9px] text-indigo-300/30 font-bold uppercase mt-1 italic">Setiap Rp 1 Gaji menghasilkan {formatROI(data.roiValue)} omzet</p>
                                </div>
                            </div>

                            <div className="mt-8 p-6 rounded-[2rem] bg-white/5 border border-white/5">
                                <div className="flex items-center gap-3 mb-4">
                                    <Target className="h-4 w-4 text-white/60" />
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">AI Deep Analysis</span>
                                </div>
                                <div className="text-sm text-white/70 leading-relaxed italic prose prose-invert font-medium max-w-none">
                                    {data.performanceVsCostAnalysis}
                                </div>
                            </div>
                        </div>

                        {/* Right: Recommendations & Insights */}
                        <div className="w-full xl:w-[450px] space-y-4">
                            <div className="p-6 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <Lightbulb className="h-5 w-5 text-amber-400" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Strategic Recommendations</span>
                                </div>
                                
                                <div className="space-y-4">
                                    {data.recommendations.map((rec, idx) => (
                                        <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-400/20 transition-colors group">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-400/10 flex items-center justify-center text-[10px] font-black text-amber-400 group-hover:bg-amber-400 group-hover:text-black transition-all">
                                                {idx + 1}
                                            </div>
                                            <p className="text-xs text-white/80 font-bold leading-relaxed italic">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Detailed Insights */}
                            <div className="p-6 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10">
                                <span className="text-[10px] font-black text-indigo-400/60 uppercase tracking-widest italic mb-4 block">Key Performance Insights</span>
                                <div className="space-y-3">
                                    {data.insights.map((insight, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-white italic tracking-wide">{insight.title}</span>
                                                <span className="text-[9px] text-white/40 font-bold uppercase">{insight.description}</span>
                                            </div>
                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${
                                                insight.impact === 'HIGH' ? 'bg-red-500/20 text-red-500' : 
                                                insight.impact === 'MEDIUM' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'
                                            }`}>
                                                {insight.impact}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}


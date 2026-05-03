'use client';

import React from 'react';
import { Sparkles, Sun, Calendar, TrendingUp, AlertCircle, BrainCircuit } from 'lucide-react';

interface MorningBriefProps {
    stats: any;
    insights: any[];
    loading: boolean;
    adminName: string;
}

const MorningBrief: React.FC<MorningBriefProps> = ({ stats, insights, loading, adminName }) => {
    if (loading) {
        return (
            <div className="w-full h-32 bg-[#050505]/40 border border-white/10 rounded-[2.5rem] flex items-center justify-center animate-pulse backdrop-blur-3xl">
                <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-indigo-400 animate-spin" />
                    <span className="text-white/40 font-black uppercase text-xs tracking-[0.2em] italic">Sedang menyusun laporan pagi Anda...</span>
                </div>
            </div>
        );
    }

    const hasUrgentInsights = insights.some(i => i.type === 'danger' || i.type === 'warning');
    const lateCount = stats?.lateCount || 0;
    const inventoryLow = insights.find(i => i.message.includes('Stok')) ? true : false;
    
    const getSummaryText = () => {
        if (!stats) return "Sistem siap membantu operasional Anda hari ini.";
        let text = `Selamat pagi, ${adminName}! `;
        if (lateCount > 0) {
            text += `Ada ${lateCount} keterlambatan pagi ini. `;
        } else {
            text += `Seluruh tim hadir tepat waktu, luar biasa! `;
        }
        if (stats.totalPayable > 0) {
            text += `Terdapat tagihan jatuh tempo yang perlu diperhatikan. `;
        }
        if (inventoryLow) {
            text += `Beberapa stok produk mulai menipis. `;
        }
        return text;
    };

    return (
        <div className="relative overflow-hidden group">
            {/* Premium Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/5 to-transparent rounded-[2.5rem] -z-10"></div>
            <div className="absolute top-0 right-0 p-8 -mr-16 -mt-16 bg-indigo-500/10 blur-3xl h-64 w-64 rounded-full -z-10"></div>
            
            <div className="rounded-[2.5rem] border border-white/10 bg-[#050505]/40 backdrop-blur-3xl p-10 shadow-2xl transition-all hover:border-white/20 border-l-8 border-l-indigo-600 shadow-indigo-500/5">
                <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center">
                    <div className="flex-shrink-0 relative">
                        <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-2xl shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-700 border border-white/20">
                            <Sun className="h-10 w-10 text-white animate-pulse" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-indigo-500 rounded-full p-2 shadow-xl border-2 border-[#050505]">
                            <BrainCircuit className="h-4 w-4 text-white" />
                        </div>
                    </div>

                    <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2">
                                <Sparkles className="h-3 w-3 text-indigo-400" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 italic">AI Co-Pilot Live</span>
                            </div>
                            <span className="h-1 w-1 rounded-full bg-white/10"></span>
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.1em] italic">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </div>
                        <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase italic">Morning Brief: <span className="text-indigo-500">Aivola Intelligence</span></h2>
                        <p className="text-indigo-100/60 leading-relaxed font-bold italic text-lg max-w-4xl">
                            <span className="text-indigo-500 text-3xl leading-none">"</span>
                            {getSummaryText()}
                            <span className="text-indigo-500 text-3xl leading-none"> "</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap lg:flex-col gap-4 lg:items-end w-full lg:w-auto">
                        <div className="flex items-center gap-4 px-8 py-4 bg-white/5 rounded-[1.5rem] border border-white/10 shadow-xl group/stat hover:bg-white/10 transition-all flex-1 lg:flex-none">
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest italic mb-0.5">CURRENT_PROFIT</p>
                                <span className="text-sm font-black text-white uppercase tracking-tighter italic">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats?.monthlyProfit || 0)}</span>
                            </div>
                        </div>
                        <div className={`flex items-center gap-4 px-8 py-4 bg-white/5 rounded-[1.5rem] border shadow-xl flex-1 lg:flex-none transition-all ${hasUrgentInsights ? 'border-red-500/30 text-red-400 bg-red-500/5' : 'border-white/10 text-indigo-400 hover:bg-white/10'}`}>
                            {hasUrgentInsights ? <AlertCircle className="h-5 w-5 animate-pulse" /> : <TrendingUp className="h-5 w-5" />}
                            <div>
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest italic mb-0.5">HEALTH_STATUS</p>
                                <span className="text-sm font-black uppercase tracking-tighter italic">{hasUrgentInsights ? 'Critical Attention' : 'Operational Healthy'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10 pt-10 border-t border-white/5 flex flex-wrap gap-12">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 italic">Personnel Vector</span>
                        <span className="text-xl font-black text-white italic tracking-widest">{stats?.presentCount || 0} <span className="text-sm opacity-20">/</span> {stats?.totalEmployees || 0}</span>
                    </div>
                    <div className="h-12 w-px bg-white/5"></div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 italic">Fiscal Liquidity</span>
                        <span className="text-xl font-black text-emerald-400 italic tracking-tighter">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats?.totalBalance || 0)}</span>
                    </div>
                    <div className="h-12 w-px bg-white/5"></div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 italic">Stock Readiness</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-xl font-black italic tracking-tighter ${insights.filter(i => i.type === 'danger').length > 0 ? 'text-red-500' : 'text-indigo-400'}`}>
                                {insights.filter(i => i.type === 'danger' && i.message.includes('Stok')).length > 0 ? 'CRITICAL_NODE' : 'OPTIMIZED'}
                            </span>
                            {insights.filter(i => i.type === 'danger' && i.message.includes('Stok')).length > 0 && <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MorningBrief;

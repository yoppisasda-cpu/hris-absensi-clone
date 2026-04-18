'use client';

import React from 'react';
import { Sparkles, Sun, Calendar, TrendingUp, AlertCircle, ShoppingBag } from 'lucide-react';

interface MorningBriefProps {
    stats: any;
    insights: any[];
    loading: boolean;
    adminName: string;
}

const MorningBrief: React.FC<MorningBriefProps> = ({ stats, insights, loading, adminName }) => {
    if (loading) {
        return (
            <div className="w-full h-32 bg-slate-50 animate-pulse rounded-2xl border border-slate-100 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-indigo-400 animate-spin" />
                    <span className="text-slate-400 font-medium italic">Sedang menyusun laporan pagi Anda...</span>
                </div>
            </div>
        );
    }

    const hasUrgentInsights = insights.some(i => i.type === 'danger' || i.type === 'warning');
    const lateCount = stats?.lateCount || 0;
    const inventoryLow = insights.find(i => i.message.includes('Stok')) ? true : false;
    
    // Generate a smart summary text based on data
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
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/5 to-transparent rounded-2xl -z-10 group-hover:from-indigo-600/15 transition-all duration-500"></div>
            <div className="absolute top-0 right-0 p-8 -mr-16 -mt-16 bg-indigo-500/10 blur-3xl h-64 w-64 rounded-full -z-10"></div>
            
            <div className="rounded-[2rem] border border-white/10 bg-[#050505]/40 backdrop-blur-md p-8 shadow-2xl transition-all hover:shadow-indigo-500/10 active:scale-[0.99] border-l-4 border-l-indigo-500">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className="flex-shrink-0 relative">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform duration-500">
                            <Sun className="h-8 w-8 text-white animate-pulse" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                        </div>
                    </div>

                    <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Aivola AI Co-Pilot</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                            <span className="text-[10px] font-bold text-slate-400">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">Morning Brief: Ringkasan Bisnis {!loading && stats?.companyName ? stats.companyName : ''}</h2>
                        <p className="text-white/70 leading-relaxed font-bold italic text-sm">
                            <span className="text-indigo-400">"</span>
                            {getSummaryText()}
                            <span className="text-indigo-400"> "</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 md:flex-col md:items-end">
                        <div className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 shadow-xl">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-xs font-black text-white uppercase tracking-wider italic">Profit: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats?.monthlyProfit || 0)}</span>
                        </div>
                        <div className={`flex items-center gap-2 px-6 py-3 bg-white/5 rounded-2xl border shadow-xl ${hasUrgentInsights ? 'border-red-500/20 text-red-400' : 'border-white/10 text-indigo-400'}`}>
                            {hasUrgentInsights ? <AlertCircle className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                            <span className="text-xs font-black uppercase tracking-wider italic">{hasUrgentInsights ? 'Butuh Perhatian' : 'Performa Stabil'}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-indigo-100/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex gap-8">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1 italic">Kehadiran</span>
                            <span className="text-base font-black text-white italic tracking-widest">{stats?.presentCount || 0} / {stats?.totalEmployees || 0}</span>
                        </div>
                        <div className="h-10 w-px bg-white/5"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1 italic">Saldo Kas</span>
                            <span className="text-base font-black text-emerald-400 italic tracking-tighter">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats?.totalBalance || 0)}</span>
                        </div>
                         <div className="h-10 w-px bg-white/5"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1 italic">Stok Kritis</span>
                            <span className={`text-base font-black italic ${insights.filter(i => i.type === 'danger').length > 0 ? 'text-red-500 transition-pulse' : 'text-white'}`}>
                                {insights.filter(i => i.type === 'danger' && i.message.includes('Stok')).length > 0 ? 'Segera Cek!' : 'Aman'}
                            </span>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
};

export default MorningBrief;

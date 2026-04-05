'use client';

import React from 'react';
import { Sparkles, ArrowRight, Sun, Calendar, TrendingUp, AlertCircle, ShoppingBag } from 'lucide-react';

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
            
            <div className="rounded-2xl border border-indigo-100/50 bg-white/40 backdrop-blur-md p-6 shadow-xl shadow-indigo-500/5 transition-all hover:shadow-2xl hover:shadow-indigo-500/10 active:scale-[0.99] border-l-4 border-l-indigo-500">
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
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Morning Brief: Ringkasan Bisnis {!loading && stats?.companyName ? stats.companyName : ''}</h2>
                        <p className="text-slate-600 leading-relaxed font-medium">
                            <span className="text-indigo-600 font-bold italic">"</span>
                            {getSummaryText()}
                            <span className="text-indigo-600 font-bold italic"> "</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 md:flex-col md:items-end">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-xl border border-indigo-50 shadow-sm">
                            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                            <span className="text-xs font-bold text-slate-700">Profit: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats?.monthlyProfit || 0)}</span>
                        </div>
                        <div className={`flex items-center gap-2 px-4 py-2 bg-white/80 rounded-xl border shadow-sm ${hasUrgentInsights ? 'border-red-100 text-red-600' : 'border-indigo-50 text-indigo-600'}`}>
                            {hasUrgentInsights ? <AlertCircle className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                            <span className="text-xs font-bold">{hasUrgentInsights ? 'Butuh Perhatian' : 'Performa Stabil'}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-indigo-100/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kehadiran</span>
                            <span className="text-sm font-bold text-slate-900">{stats?.presentCount || 0} / {stats?.totalEmployees || 0}</span>
                        </div>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Kas</span>
                            <span className="text-sm font-bold text-emerald-600">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats?.totalBalance || 0)}</span>
                        </div>
                         <div className="h-8 w-px bg-slate-200"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stok Kritis</span>
                            <span className={`text-sm font-bold ${insights.filter(i => i.type === 'danger').length > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                                {insights.filter(i => i.type === 'danger' && i.message.includes('Stok')).length > 0 ? 'Segera Cek!' : 'Aman'}
                            </span>
                        </div>
                    </div>

                    <button 
                        onClick={() => window.scrollTo({ top: 500, behavior: 'smooth' })}
                        className="group/btn flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95"
                    >
                        Lihat Detail Analita
                        <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MorningBrief;

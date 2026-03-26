'use client';

import React from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  BrainCircuit,
  ArrowRight,
  Shield
} from 'lucide-react';

interface Insight {
  type: 'success' | 'warning' | 'danger' | 'info';
  message: string;
  detail: string;
  isPremium?: boolean;
  isLocked?: boolean;
  id?: string;
}

interface AIInsightsProps {
  insights: Insight[];
  loading?: boolean;
}

const AIInsights: React.FC<AIInsightsProps> = ({ insights, loading }) => {
  if (loading) {
    return (
      <div className="rounded-3xl border border-white/20 bg-white/40 backdrop-blur-xl p-8 shadow-2xl animate-pulse">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-10 w-10 rounded-xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-5 w-48 bg-slate-200 rounded-md" />
            <div className="h-3 w-32 bg-slate-200 rounded-md" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-20 w-full bg-slate-200/50 rounded-2xl" />
          <div className="h-20 w-full bg-slate-200/50 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/60 backdrop-blur-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_25px_60px_rgba(0,0,0,0.08)]">
      {/* Background Decoration */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/10 blur-[80px]" />
      <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-400/10 blur-[80px]" />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 opacity-20 blur-sm animate-pulse" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
                <BrainCircuit className="h-7 w-7 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                Aivola Mind
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">AI Beta</span>
              </h2>
              <p className="text-slate-500 text-sm font-medium">Asisten cerdas analisis bisnis Anda.</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100/50 rounded-full border border-slate-200/50">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Sistem Aktif & Menganalisis</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.length > 0 ? (
            insights.map((insight, idx) => (
              <div 
                key={idx} 
                className={`group relative flex items-start gap-5 p-5 rounded-2xl border transition-all duration-300 ${
                  insight.isLocked ? 'grayscale opacity-75' : 'hover:scale-[1.02]'
                } ${
                  insight.type === 'success' ? 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50' :
                  insight.type === 'warning' ? 'bg-amber-50/50 border-amber-100 hover:bg-amber-50' :
                  insight.type === 'danger' ? 'bg-red-50/50 border-red-100 hover:bg-red-50' :
                  'bg-blue-50/50 border-blue-100 hover:bg-blue-50'
                }`}
              >
                {/* Premium Badge */}
                {insight.isPremium && (
                  <div className="absolute -top-2 -right-2 z-20">
                    <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 uppercase tracking-tighter">
                      <Sparkles className="h-2 w-2" />
                      Premium
                    </div>
                  </div>
                )}

                {/* Locked Overlay */}
                {insight.isLocked && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/20 backdrop-blur-[2px] rounded-2xl">
                    <div className="bg-slate-900/80 p-2 rounded-full mb-1">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-[8px] font-black text-slate-900 uppercase tracking-widest">Klik untuk Upgrade</span>
                  </div>
                )}

                <div className={`mt-1 p-2.5 rounded-xl shadow-sm ${
                  insight.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                  insight.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                  insight.type === 'danger' ? 'bg-red-100 text-red-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {insight.isLocked ? <Shield className="h-5 w-5" /> : (
                   insight.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> :
                   insight.type === 'warning' ? <AlertTriangle className="h-5 w-5" /> :
                   insight.type === 'danger' ? <Sparkles className="h-5 w-5" /> :
                   <Info className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight text-sm mb-1">{insight.message}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{insight.detail}</p>
                </div>
                {!insight.isLocked && <ArrowRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all mt-1" />}
              </div>
            ))
          ) : (
            <div className="col-span-2 py-12 text-center">
               <p className="text-slate-400 text-sm font-medium">Memproses data untuk memberikan insight terbaik...</p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200/50 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Powered by Aivola Heuristic Engine v2.0</span>
           </div>
           <button className="text-xs font-black text-blue-600 hover:text-indigo-600 flex items-center gap-2 group p-2 hover:bg-blue-50 rounded-lg transition-all">
              LIHAT ANALITIK LENGKAP
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-all" />
           </button>
        </div>
      </div>

      <style jsx>{`
        .backdrop-blur-2xl {
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
        }
      `}</style>
    </div>
  );
};

export default AIInsights;

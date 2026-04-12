'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  BrainCircuit,
  ArrowRight,
  Shield,
  X,
  Zap,
  ChevronRight,
  BarChart3,
  Users,
  Target
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
  const router = useRouter();
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

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

  const getDetailContent = (insight: Insight) => {
    switch (insight.id) {
      case 'PREMIUM_PROFIT':
        return {
          title: "Optimasi Margin Produk",
          icon: <BarChart3 className="h-8 w-8 text-amber-500" />,
          sections: [
            { label: "Analisis HPP", value: "Terdapat kenaikan biaya bahan baku sebesar 8.5% pada kategori Kopi Arabica dalam 2 minggu terakhir." },
            { label: "Rekomendasi Strategis", value: "Beralih ke Supplier B (Gayo Highland) dapat menurunkan cost per cup sebesar Rp 450 tanpa mengurangi kualitas." },
            { label: "Potensi Penghematan", value: "Rp 12,450,000 / bulan" }
          ]
        };
      case 'PREMIUM_STOCK':
        return {
          title: "Prediksi Stok & Inventori",
          icon: <Zap className="h-8 w-8 text-red-500" />,
          sections: [
            { label: "Kecepatan Penjualan", value: "Item 'Susu UHT 1L' memiliki perputaran sangat cepat (85 unit/hari). Stok saat ini hanya cukup untuk 32 jam ke depan." },
            { label: "Alert Stok", value: "Segera lakukan Repeat Order (RO) sebanyak 25 Karton hari ini untuk menghindari Lost Sales." },
            { label: "Estimasi Stok Habis", value: "Besok, 14:00 WIB" }
          ]
        };
      case 'PREMIUM_RETENTION':
        return {
          title: "Analisis Retensi Karyawan",
          icon: <BrainCircuit className="h-8 w-8 text-indigo-500" />,
           sections: [
            { label: "Indikator Burnout", value: "Pola keterlambatan mendadak pada 4 karyawan di tim Barista menunjukkan indikasi kelelahan kerja tinggi." },
            { label: "Rekomendasi HR", value: "Lakukan sesi 1-on-1 atau optimasi jadwal shift untuk mengurangi overtime berlebih di akhir pekan." },
            { label: "Tingkat Risiko", value: "MEDIUM (15% Churn Risk)" }
          ]
        };
      default:
        return {
          title: insight.message,
          icon: <Info className="h-8 w-8 text-blue-500" />,
          sections: [
            { label: "Analisis Sistem", value: insight.detail },
            { label: "Status", value: "Berjalan Normal" }
          ]
        };
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#050505]/40 backdrop-blur-2xl p-8 shadow-2xl transition-all hover:shadow-indigo-500/10">
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
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2 uppercase italic">
                Aivola Mind
                <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5">AI Beta</span>
              </h2>
              <p className="text-white/40 text-sm font-bold italic">Asisten cerdas analisis bisnis Anda.</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-white/5 rounded-full border border-white/10">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
             <span className="text-[10px] font-black text-white/40 uppercase tracking-[.2em] italic">Sistem Aktif & Menganalisis</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.length > 0 ? (
            insights.map((insight, idx) => (
              <div 
                key={idx} 
                onClick={() => !insight.isLocked && setSelectedInsight(insight)}
                className={`group relative flex items-start gap-5 p-6 rounded-[2rem] border transition-all duration-300 cursor-pointer ${
                  insight.isLocked ? 'grayscale opacity-50' : 'hover:scale-[1.02] hover:bg-white/5 hover:border-white/20 active:scale-95'
                } ${
                  insight.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/10' :
                  insight.type === 'warning' ? 'bg-amber-500/5 border-amber-500/10' :
                  insight.type === 'danger' ? 'bg-red-500/5 border-red-500/10' :
                  'bg-blue-500/5 border-blue-500/10'
                }`}
              >
                {/* Premium Badge */}
                {insight.isPremium && (
                  <div className="absolute -top-2 -right-2 z-20">
                    <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-[#050505] text-[9px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1 uppercase tracking-tighter">
                      <Sparkles className="h-2 w-2" />
                      Premium
                    </div>
                  </div>
                )}

                <div className={`mt-1 p-3 rounded-2xl shadow-xl ${
                  insight.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  insight.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  insight.type === 'danger' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {insight.isLocked ? <Shield className="h-5 w-5" /> : (
                   insight.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> :
                   insight.type === 'warning' ? <AlertTriangle className="h-5 w-5" /> :
                   insight.type === 'danger' ? <Sparkles className="h-5 w-5" /> :
                   <Info className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight text-sm mb-1 italic">{insight.message}</h4>
                  <p className="text-xs text-white/60 leading-relaxed font-bold italic line-clamp-2">{insight.detail}</p>
                </div>
                {!insight.isLocked && <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all mt-1" />}
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
           <button 
              onClick={() => router.push('/dashboard/executive/analytics')}
              className="text-xs font-black text-blue-600 hover:text-indigo-600 flex items-center gap-2 group p-2 hover:bg-blue-50 rounded-lg transition-all"
            >
              LIHAT ANALITIK LENGKAP
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-all" />
           </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setSelectedInsight(null)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="absolute right-6 top-6 z-20">
              <button 
                onClick={() => setSelectedInsight(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Header */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-10 pt-12">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl">
                {getDetailContent(selectedInsight).icon}
              </div>
              <h3 className="text-3xl font-black tracking-tight text-slate-900">{getDetailContent(selectedInsight).title}</h3>
              <div className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-400">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Dianalisis oleh Aivola Intelligence
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-10 space-y-8">
              {getDetailContent(selectedInsight).sections.map((section, idx) => (
                <div key={idx} className="space-y-2">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Target className="h-3 w-3 text-blue-500" />
                    {section.label}
                  </h5>
                  <p className="text-slate-700 font-medium leading-relaxed">
                    {section.value}
                  </p>
                </div>
              ))}
              
              <button 
                onClick={() => setSelectedInsight(null)}
                className="w-full mt-4 flex items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 text-sm font-black text-white hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20"
              >
                MENGERTI, TERIMA KASIH
              </button>
            </div>
          </div>
        </div>
      )}

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

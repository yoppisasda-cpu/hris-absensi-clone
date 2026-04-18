'use client';

import React from 'react';
import { useFeatures } from '@/lib/FeatureContext';
import { X, CheckCircle2, Zap, Rocket, ShieldCheck } from 'lucide-react';

export const UpgradeModal: React.FC = () => {
  const { isUpgradeModalOpen, closeUpgradeModal, plan } = useFeatures();

  if (!isUpgradeModalOpen) return null;

  const plans = [
    {
      name: 'Starter',
      price: 'IDR 0',
      desc: 'Cocok untuk UMKM pemula.',
      features: ['Absensi Wajah (Sederhana)', 'Manajemen Karyawan (Max 25)', 'Laporan Dasar'],
      active: plan === 'STARTER',
      color: 'blue'
    },
    {
      name: 'Pro',
      price: 'IDR 250k/bln',
      desc: 'Analisis keuangan & stok lengkap.',
      features: ['Semua Fitur Starter', 'Modul Keuangan & Laba Rugi', 'Manajemen Stok & PO', 'Face Recognition Anti-Fraud'],
      active: plan === 'PRO',
      popular: true,
      color: 'indigo'
    },
    {
      name: 'Enterprise',
      price: 'Hubungi Kami',
      desc: 'Solusi AI & Prediksi Bisnis.',
      features: ['Semua Fitur Pro', 'Aivola Mind (AI Business Advisor)', 'Prediksi Stok Habis (AI)', 'Deteksi Employee Burnout'],
      active: plan === 'ENTERPRISE',
      color: 'purple'
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={closeUpgradeModal} />
      <div className="glass w-full max-w-5xl rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-slate-950/50 border-b border-indigo-500/20 px-12 py-10 relative">
          <button 
            onClick={closeUpgradeModal}
            className="absolute top-8 right-8 h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all z-20"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
              <Zap className="h-6 w-6 stroke-[2.5px]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 italic">Evolutionary Scaling</span>
              <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase mt-1">Select Your Domain Tier</h2>
            </div>
          </div>
          <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest italic max-w-2xl leading-relaxed">
            Unleash the full potential of your commercial enterprise with strategic AI-driven protocols and integrated fiscal management systems.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="p-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((p, i) => (
            <div 
              key={i} 
              className={`relative flex flex-col rounded-[2.5rem] border p-10 transition-all group hover:scale-[1.02] active:scale-95 ${
                p.active 
                  ? 'bg-emerald-500/5 border-emerald-500/30' 
                  : p.popular 
                    ? 'bg-indigo-500/5 border-indigo-500/30 shadow-2xl shadow-indigo-900/20' 
                    : 'bg-slate-950 border-white/5'
              }`}
            >
              {p.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-6 py-2 text-[9px] font-black text-white uppercase tracking-[0.2em] italic shadow-lg shadow-indigo-500/40 border border-white/10">
                  Apex Selection
                </div>
              )}
              
              <div className="mb-8">
                <div className={`h-14 w-14 rounded-2xl mb-6 flex items-center justify-center border transition-all ${
                  p.name === 'Starter' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                  p.name === 'Pro' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/20' :
                  'bg-purple-500/10 border-purple-500/20 text-purple-400'
                }`}>
                  {p.name === 'Starter' ? <CheckCircle2 className="h-7 w-7" /> :
                   p.name === 'Pro' ? <Zap className="h-7 w-7" /> :
                   <Rocket className="h-7 w-7" />}
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] italic">{p.name}</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2 leading-relaxed">{p.desc}</p>
              </div>

              <div className="mb-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white italic tracking-tighter">{p.price.split('/')[0]}</span>
                  {p.price.includes('/') && <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">/ CYCLE</span>}
                </div>
                {p.price === 'Hubungi Kami' && <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">Direct Support Required</span>}
              </div>

              <div className="flex-grow space-y-4 mb-12">
                {p.features.map((f, fi) => (
                  <div key={fi} className="flex items-start gap-3">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 transition-colors ${p.active ? 'text-emerald-500' : 'text-slate-700'}`} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic leading-tight group-hover:text-slate-300 transition-colors">{f}</span>
                  </div>
                ))}
              </div>

              {p.active ? (
                <div className="flex items-center justify-center gap-3 rounded-2xl bg-emerald-500/10 py-5 text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] italic border border-emerald-500/20">
                  <ShieldCheck className="h-4 w-4 stroke-[3px]" />
                  Active Cluster
                </div>
              ) : (
                <button 
                  className={`flex items-center justify-center gap-3 rounded-2xl py-5 text-[10px] font-black text-white transition-all uppercase tracking-[0.2em] italic border border-white/10 shadow-2xl ${
                    p.name === 'Enterprise' 
                      ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-900/20' 
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20'
                  }`}
                  onClick={() => alert('Automated upgrade protocols are initializing. Please interface with Aivola Command Center.')}
                >
                  {p.name === 'Enterprise' ? <Rocket className="h-4 w-4 stroke-[2.5px]" /> : <Zap className="h-4 w-4 stroke-[2.5px]" />}
                  Initialize {p.name}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-slate-950/50 p-8 border-t border-white/5 text-center">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic">
            Requirement Ambiguity? <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">Interface with Analysts</a> or review <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">Licensing Protocols</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

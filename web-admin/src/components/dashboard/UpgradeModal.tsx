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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white relative">
          <button 
            onClick={closeUpgradeModal}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-blue-500/20 p-2 text-blue-400">
              <Zap className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Tingkatkan Performa Bisnis</span>
          </div>
          <h2 className="text-3xl font-bold mb-2">Pilih Paket yang Sesuai Kebutuhan Anda</h2>
          <p className="text-slate-400 text-sm max-w-2xl">Buka potensi penuh perusahaan Anda dengan fitur AI Strategis dan Manajemen Keuangan Terintegrasi.</p>
        </div>

        {/* Pricing Cards */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p, i) => (
            <div 
              key={i} 
              className={`relative flex flex-col rounded-xl border p-6 transition-all ${
                p.active ? 'border-green-500 bg-green-50/10' : 'border-slate-200 hover:border-blue-400 hover:shadow-lg'
              } ${p.popular ? 'ring-2 ring-blue-500' : ''}`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                  Paling Populer
                </div>
              )}
              
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
              </div>

              <div className="mb-6">
                <span className="text-2xl font-black text-slate-900">{p.price}</span>
                {p.price !== 'Hubungi Kami' && <span className="text-xs text-slate-400"> /perusahaan</span>}
              </div>

              <div className="flex-grow space-y-3 mb-8">
                {p.features.map((f, fi) => (
                  <div key={fi} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {p.active ? (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-green-100 py-3 text-sm font-bold text-green-700">
                  <ShieldCheck className="h-4 w-4" />
                  Paket Anda Saat Ini
                </div>
              ) : (
                <button 
                  className={`flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold text-white transition-all ${
                    p.name === 'Enterprise' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  onClick={() => alert('Fitur upgrade otomatis sedang disiapkan. Silakan hubungi CS Aivola.')}
                >
                  {p.name === 'Enterprise' ? <Rocket className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                  Pilih Paket {p.name}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Butuh bantuan memilih? <a href="#" className="font-bold text-blue-600 hover:underline">Hubungi Konsultan Kami</a> atau baca <a href="#" className="font-bold text-blue-600 hover:underline">Bantuan Lisensi</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

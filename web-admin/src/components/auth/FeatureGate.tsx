'use client';

import React from 'react';
import { useFeatures } from '@/lib/FeatureContext';
import { Lock, Zap } from 'lucide-react';

interface FeatureGateProps {
  feature?: string;
  module?: 'ABSENSI' | 'FINANCE' | 'INVENTORY' | 'POS';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  feature, 
  module, 
  children, 
  fallback,
  showUpgrade = true 
}) => {
  const { hasFeature, hasModule, isLoading } = useFeatures();

  if (isLoading) return null;

  let isAllowed = true;
  if (feature) isAllowed = hasFeature(feature);
  if (module) isAllowed = hasModule(module);

  if (isAllowed) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  if (showUpgrade) {
    return (
      <div className="relative group overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center transition-all hover:bg-slate-50">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Lock className="h-6 w-6" />
        </div>
        <h3 className="mb-2 font-bold text-slate-900 leading-tight">Fitur Ini Terkunci</h3>
        <p className="mb-6 text-xs text-slate-500 max-w-[200px] mx-auto">
          Fitur ini hanya tersedia untuk pengguna paket <span className="font-bold text-blue-600">Pro</span> atau <span className="font-bold text-indigo-600">Enterprise</span>.
        </p>
        <button 
          onClick={() => (window as any).showUpgradeModal && (window as any).showUpgradeModal()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-blue-700 active:scale-95 shadow-sm"
        >
          <Zap className="h-3.5 w-3.5" />
          Upgrade Sekarang
        </button>
        
        {/* Layer pelindung agar konten asli di bawah (jika ada) tidak bisa diklik */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none grayscale">
          {children}
        </div>
      </div>
    );
  }

  return null;
};

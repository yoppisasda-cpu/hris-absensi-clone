'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';

type SubscriptionPlan = 'STARTER' | 'PRO' | 'ENTERPRISE';

interface FeatureContextType {
  plan: SubscriptionPlan;
  addons: string[];
  hasFeature: (feature: string) => boolean;
  hasModule: (module: 'ABSENSI' | 'FINANCE' | 'INVENTORY' | 'POS') => boolean;
  isLoading: boolean;
  isUpgradeModalOpen: boolean;
  openUpgradeModal: () => void;
  closeUpgradeModal: () => void;
  refreshFeatures: () => void;
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plan, setPlan] = useState<SubscriptionPlan>('STARTER');
  const [addons, setAddons] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const loadFeatures = async () => {
    if (typeof window !== 'undefined') {
      // 1. Load initial state from localStorage for immediate (though potentially stale) UI
      const storedPlan = localStorage.getItem('userPlan') as SubscriptionPlan;
      const storedAddons = localStorage.getItem('userAddons');
      
      if (storedPlan) setPlan(storedPlan);
      if (storedAddons) {
        try {
          setAddons(JSON.parse(storedAddons));
        } catch (e) {
          setAddons([]);
        }
      }
      setIsLoading(false);

      // 2. BACKGROUND SYNC: Fetch latest plan from server to ensure accuracy
      try {
        const token = localStorage.getItem('jwt_token');
        if (!token) return;

        const res = await api.get('/companies/my');

        if (res.status === 200) {
          const data = res.data;
          if (data.plan) {
            setPlan(data.plan);
            localStorage.setItem('userPlan', data.plan);
          }
          if (data.addons) {
            setAddons(data.addons);
            localStorage.setItem('userAddons', JSON.stringify(data.addons));
          }
          console.log(`[FeatureContext] Auto-sync completed. Plan: ${data.plan}`);
        }
      } catch (error) {
        console.error('[FeatureContext] Failed to auto-sync features:', error);
      }
    }
  };

  useEffect(() => {
    loadFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasFeature = (feature: string) => {
    if (plan === 'ENTERPRISE') return true;
    return addons.includes(feature);
  };

  const hasModule = (module: string) => {
    if (plan === 'ENTERPRISE') return true;
    
    switch (module) {
      case 'ABSENSI':
        return true; // Starter always has Absensi
      case 'FINANCE':
        return plan === 'PRO';
      case 'INVENTORY':
      case 'POS':
        return plan === 'PRO';
      default:
        return false;
    }
  };

  const openUpgradeModal = () => setIsUpgradeModalOpen(true);
  const closeUpgradeModal = () => setIsUpgradeModalOpen(false);

  // Listen for storage events (e.g., when companies/page.tsx updates plan)
  useEffect(() => {
    const handleStorageChange = () => {
      loadFeatures();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Expose to window for simpler legacy integration if needed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).showUpgradeModal = openUpgradeModal;
    }
  }, []);

  return (
    <FeatureContext.Provider value={{ 
      plan, 
      addons, 
      hasFeature, 
      hasModule: hasModule as any, 
      isLoading,
      isUpgradeModalOpen,
      openUpgradeModal,
      closeUpgradeModal,
      refreshFeatures: loadFeatures
    }}>
      {children}
    </FeatureContext.Provider>
  );
};

export const useFeatures = () => {
  const context = useContext(FeatureContext);
  if (context === undefined) {
    throw new Error('useFeatures must be used within a FeatureProvider');
  }
  return context;
};

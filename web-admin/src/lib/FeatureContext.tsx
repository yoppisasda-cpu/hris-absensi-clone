'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

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

  const loadFeatures = () => {
    if (typeof window !== 'undefined') {
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
    }
  };

  useEffect(() => {
    loadFeatures();
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

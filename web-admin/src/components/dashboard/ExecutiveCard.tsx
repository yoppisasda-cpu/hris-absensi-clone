'use client';

import React from 'react';

interface ExecutiveCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'blue' | 'emerald' | 'indigo' | 'slate';
}

const ExecutiveCard: React.FC<ExecutiveCardProps> = ({ 
  children, 
  className = '', 
  title, 
  subtitle, 
  icon,
  variant = 'slate'
}) => {
  const getGradient = () => {
    switch (variant) {
      case 'blue': return 'from-blue-500/10 to-transparent';
      case 'emerald': return 'from-emerald-500/10 to-transparent';
      case 'indigo': return 'from-indigo-500/10 to-transparent';
      default: return 'from-slate-500/5 to-transparent';
    }
  };

  const getBorder = () => {
    switch (variant) {
      case 'blue': return 'border-blue-500/20';
      case 'emerald': return 'border-emerald-500/20';
      case 'indigo': return 'border-indigo-500/20';
      default: return 'border-white/20';
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border ${getBorder()} bg-white/40 backdrop-blur-3xl p-6 shadow-2xl transition-all hover:scale-[1.01] hover:shadow-[0_20px_60px_rgba(0,0,0,0.05)] ${className}`}>
      {/* Background Gradient Glow */}
      <div className={`absolute -inset-24 bg-gradient-to-tr ${getGradient()} blur-3xl opacity-50`} />
      
      <div className="relative z-10 h-full flex flex-col">
        {(title || icon) && (
          <div className="flex items-center justify-between mb-6">
            <div>
              {title && <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">{title}</h3>}
              {subtitle && <p className="text-xs font-medium text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {icon && (
                <div className={`p-3 rounded-2xl ${
                    variant === 'blue' ? 'bg-blue-500/10 text-blue-600' :
                    variant === 'emerald' ? 'bg-emerald-500/10 text-emerald-600' :
                    variant === 'indigo' ? 'bg-indigo-500/10 text-indigo-600' :
                    'bg-slate-500/10 text-slate-600'
                }`}>
                    {icon}
                </div>
            )}
          </div>
        )}
        <div className="flex-1">
            {children}
        </div>
      </div>
    </div>
  );
};

export default ExecutiveCard;

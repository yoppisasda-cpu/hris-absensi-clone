'use client';

import React from 'react';

interface ExecutiveCardProps {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'blue' | 'emerald' | 'indigo' | 'slate';
  trend?: {
    value: number;
    isUp: boolean;
  };
  value?: string | number;
}

const ExecutiveCard: React.FC<ExecutiveCardProps> = ({ 
  children, 
  className = '', 
  title, 
  subtitle, 
  icon: Icon,
  variant = 'slate',
  trend,
  value
}) => {
  const getGradient = () => {
    switch (variant) {
      case 'blue': return 'from-blue-500 to-indigo-600';
      case 'emerald': return 'from-emerald-500 to-teal-600';
      case 'indigo': return 'from-indigo-500 to-violet-600';
      default: return 'from-slate-500 to-slate-700';
    }
  };

  const gradient = getGradient();

  return (
    <div className={`glass relative overflow-hidden rounded-[2.5rem] p-8 border border-white/10 shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-indigo-500/10 group ${className}`}>
        {/* Background Accent Gradient */}
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 blur-3xl -translate-y-1/2 translate-x-1/2 transition-all duration-700 group-hover:scale-150`} />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
            <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 text-white shadow-xl transition-all duration-500 group-hover:bg-gradient-to-br group-hover:${gradient}`}>
                {Icon && React.cloneElement(Icon as React.ReactElement, { className: "h-6 w-6" })}
            </div>
            {trend && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                    trend.isUp ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                    {trend.isUp ? '▲' : '▼'} {trend.value}%
                </div>
            )}
        </div>

        <div className="space-y-1 relative z-10">
            {title && <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</h3>}
            <div className="flex items-baseline gap-2">
                {value && <p className="text-4xl font-black text-white tracking-tighter italic">{value}</p>}
                {subtitle && <p className="text-[10px] font-bold text-slate-500 uppercase italic transition-all duration-500 translate-y-1">{subtitle}</p>}
            </div>
            {children}
        </div>

        {/* Bottom Progress Indicator */}
        <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent w-full opacity-0 group-hover:opacity-100 transition-all duration-700" />
    </div>
  );
};

export default ExecutiveCard;

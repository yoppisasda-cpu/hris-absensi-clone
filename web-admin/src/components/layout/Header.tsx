'use client';

import { useState, useEffect } from 'react';
import { Bell, UserCircle, Globe, Briefcase, BarChart3, ChevronDown, AlertTriangle, Info, X, ExternalLink } from "lucide-react"
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

export default function Header() {
    const { language, setLanguage } = useLanguage();
    const [profileName, setProfileName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userName') || 'Memuat...' : 'Memuat...'));
    const [roleLabel, setRoleLabel] = useState(() => {
        if (typeof window !== 'undefined') {
            const r = localStorage.getItem('userRole');
            if (r === 'SUPERADMIN' || r === 'OWNER') return 'SaaS Owner';
            if (r === 'ADMIN') return 'HR Director';
            if (r) return 'Karyawan';
        }
        return '-';
    });
    const [companyName, setCompanyName] = useState('');
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [activeModule, setActiveModule] = useState<'ABSENSI' | 'FINANCE'>('ABSENSI');
    const [isModuleOpen, setIsModuleOpen] = useState(false);
    const [allowedModules, setAllowedModules] = useState<string>('BOTH');
    const [contractInfo, setContractInfo] = useState<{ end: string | null; level: number }>({ end: null, level: 0 });
    const [showBanner, setShowBanner] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const token = localStorage.getItem('jwt_token');
        if (!token) return;

        const fetchCompany = async () => {
            try {
                const response = await api.get('/companies/my');
                if (response.data) {
                    setCompanyName(response.data.name);
                    setAllowedModules(response.data.modules || 'BOTH');
                    setContractInfo({ 
                        end: response.data.contractEnd, 
                        level: response.data.expiryLevel || 0 
                    });
                }
            } catch (error) {
                console.error("Gagal mengambil info perusahaan", error);
            }
        };

        const fetchNotifications = async () => {
            try {
                const res = await api.get('/notifications');
                setNotifications(res.data);
                setUnreadCount(res.data.filter((n: any) => !n.isRead).length);
            } catch (error) {
                console.error("Gagal mengambil notifikasi", error);
            }
        };

        const mod = localStorage.getItem('activeModule') as any;
        if (mod) setActiveModule(mod);

        fetchCompany();
        fetchNotifications();

        // Refresh notifications every 1 minute
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const markAllAsRead = async () => {
        try {
            const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
            for (const id of unreadIds) {
                await api.patch(`/notifications/${id}/read`);
            }
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Gagal menandai notifikasi telah dibaca", error);
        }
    };
    const getDaysRemaining = () => {
        if (!contractInfo.end) return null;
        const now = new Date();
        const end = new Date(contractInfo.end);
        const diffTime = end.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const daysRemaining = getDaysRemaining();
    const isExpired = contractInfo.level > 0 || (daysRemaining !== null && daysRemaining <= 0);
    
    // Determine banner visibility and color
    const shouldShowBanner = showBanner && (isExpired || (daysRemaining !== null && daysRemaining <= 14));
    
    const bannerConfig = isExpired 
        ? { bg: 'bg-red-600', text: 'text-white', icon: AlertTriangle, msg: 'Masa Kontrak Telah Habis! Akses Terbatas.' }
        : (daysRemaining! <= 7)
            ? { bg: 'bg-orange-500', text: 'text-white', icon: AlertTriangle, msg: `Kontrak berakhir dalam ${daysRemaining} hari. Segera perpanjang!` }
            : { bg: 'bg-amber-400', text: 'text-amber-950', icon: Info, msg: `Kontrak berakhir dalam ${daysRemaining} hari.` };

    return (
        <div className="w-full">
            {shouldShowBanner && (
                <div className={`${bannerConfig.bg} ${bannerConfig.text} px-6 py-2 flex items-center justify-between transition-all animate-in slide-in-from-top duration-500 rounded-2xl mb-4 shadow-lg border border-white/10`}>
                    <div className="flex items-center gap-3 text-sm font-bold">
                        <bannerConfig.icon className="h-4 w-4" />
                        <span>{bannerConfig.msg}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <a 
                            href="https://wa.me/628123456789?text=Halo%20Admin%20Aivola%2C%20saya%20ingin%20memperpanjang%20kontrak%20perusahaan%20saya."
                            target="_blank"
                            className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-[10px] font-black transition-all border border-white/30 tracking-tight"
                        >
                            UPDATE <ExternalLink className="h-3 w-3" />
                        </a>
                        <button onClick={() => setShowBanner(false)} className="hover:opacity-70">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
            
            <header className="flex h-16 w-full items-center justify-between px-6 glass rounded-2xl border border-white/20 shadow-premium">
                <div className="flex items-center gap-4">
                    {/* MODULE PICKER - Refined Premium Style */}
                    {allowedModules === 'BOTH' ? (
                        <div className="relative">
                            <button 
                                onClick={() => setIsModuleOpen(!isModuleOpen)}
                                className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all group"
                            >
                                <div className={`p-1.5 rounded-lg transition-all duration-300 ${activeModule === 'ABSENSI' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'}`}>
                                    {activeModule === 'ABSENSI' ? <Briefcase className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
                                </div>
                                <div className="text-left hidden lg:block">
                                    <p className="text-[12px] font-black text-slate-700 dark:text-white leading-none tracking-tight">
                                        {activeModule === 'ABSENSI' ? 'Absensi & HRIS' : 'Finance & Akunting'}
                                    </p>
                                </div>
                                <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-300 ${isModuleOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isModuleOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsModuleOpen(false)} />
                                    <div className="absolute left-0 mt-3 w-64 bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-white/20 dark:border-white/5 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left p-2">
                                        <button 
                                            onClick={() => {
                                                setActiveModule('ABSENSI');
                                                localStorage.setItem('activeModule', 'ABSENSI');
                                                setIsModuleOpen(false);
                                                window.location.reload(); 
                                            }}
                                            className={`flex w-full items-center gap-3 p-3 rounded-xl transition-all ${activeModule === 'ABSENSI' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500'}`}
                                        >
                                            <Briefcase className="h-4 w-4" />
                                            <span className="text-sm font-bold">Absensi & HRIS</span>
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setActiveModule('FINANCE');
                                                localStorage.setItem('activeModule', 'FINANCE');
                                                setIsModuleOpen(false);
                                                window.location.reload(); 
                                            }}
                                            className={`flex w-full items-center gap-3 p-3 rounded-xl transition-all ${activeModule === 'FINANCE' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500'}`}
                                        >
                                            <BarChart3 className="h-4 w-4" />
                                            <span className="text-sm font-bold">Finance & Akunting</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl bg-white/5 border border-white/10">
                            <div className={`p-1.5 rounded-lg ${allowedModules === 'ABSENSI' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-violet-500/10 text-violet-400'}`}>
                                {allowedModules === 'ABSENSI' ? <Briefcase className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
                            </div>
                            <span className="text-sm font-bold opacity-80">{allowedModules === 'ABSENSI' ? 'Absensi & HRIS' : 'Finance & Akunting'}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-2xl p-1 border border-white/5">
                        <button
                            onClick={() => setLanguage('id')}
                            className={`px-3 py-1 text-[10px] font-black rounded-xl transition-all ${language === 'id' ? 'bg-white dark:bg-white/10 shadow-sm text-indigo-500' : 'text-slate-400'}`}
                        >
                            ID
                        </button>
                        <button
                            onClick={() => setLanguage('en')}
                            className={`px-3 py-1 text-[10px] font-black rounded-xl transition-all ${language === 'en' ? 'bg-white dark:bg-white/10 shadow-sm text-indigo-500' : 'text-slate-400'}`}
                        >
                            EN
                        </button>
                    </div>

                    <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />

                    <div className="relative group">
                        <button 
                            onClick={() => setIsNotifOpen(!isNotifOpen)}
                            className="relative p-2 rounded-xl hover:bg-white/5 transition-all text-slate-400 hover:text-indigo-500"
                        >
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900" />
                            )}
                        </button>
                        {isNotifOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                                <div className="absolute right-0 mt-4 w-80 bg-white/95 dark:bg-slate-900/98 backdrop-blur-2xl rounded-2xl border border-white/20 dark:border-white/5 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Notifikasi</h3>
                                        <button onClick={markAllAsRead} className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">Read All</button>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                                        {notifications.length > 0 ? (
                                            notifications.map((notif) => (
                                                <div key={notif.id} className={`p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${!notif.isRead ? 'bg-indigo-500/5' : ''}`}>
                                                    <p className="text-[12px] font-bold dark:text-white leading-tight">{notif.title}</p>
                                                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-10 text-center text-slate-500 text-[11px] font-bold">Sunyi dan Sepi...</div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-white/10 py-1">
                        <div className="text-right hidden sm:block">
                            <p className="text-[11px] font-black tracking-tight dark:text-white leading-none capitalize italic">{profileName.toLowerCase()}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{roleLabel}</p>
                        </div>
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 ring-2 ring-white/10">
                            <UserCircle className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            </header>
        </div>
    );
}

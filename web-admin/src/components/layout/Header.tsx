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
        <>
            {shouldShowBanner && (
                <div className={`${bannerConfig.bg} ${bannerConfig.text} px-6 py-2 flex items-center justify-between transition-all animate-in slide-in-from-top duration-500 sticky top-0 z-[60] shadow-md`}>
                    <div className="flex items-center gap-3 text-sm font-bold">
                        <bannerConfig.icon className="h-4 w-4" />
                        <span>{bannerConfig.msg}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <a 
                            href="https://wa.me/628123456789?text=Halo%20Admin%20Aivola%2C%20saya%20ingin%20memperpanjang%20kontrak%20perusahaan%20saya."
                            target="_blank"
                            className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-black transition-all border border-white/30"
                        >
                            Update Kontrak <ExternalLink className="h-3 w-3" />
                        </a>
                        <button onClick={() => setShowBanner(false)} className="hover:opacity-70">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
            <header className="flex h-16 w-full items-center justify-between border-b bg-white px-6 shadow-sm sticky top-0 z-50">
            <div className="flex items-center gap-4 text-slate-500">
                {/* MODULE PICKER QUICK ACCESS - Only show if BOTH are allowed */}
                {allowedModules === 'BOTH' ? (
                    <div className="relative">
                        <button 
                            onClick={() => setIsModuleOpen(!isModuleOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all group"
                        >
                            <div className={`p-1 rounded-md ${activeModule === 'ABSENSI' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {activeModule === 'ABSENSI' ? <Briefcase className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
                            </div>
                            <div className="text-left hidden md:block">
                                <p className="text-[10px] uppercase font-bold text-slate-400 leading-none">Modul Aktif</p>
                                <p className="text-xs font-bold text-slate-700">{activeModule === 'ABSENSI' ? 'Absensi & HRIS' : 'Finance & Akunting'}</p>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isModuleOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isModuleOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsModuleOpen(false)} />
                                <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-2">
                                        <button 
                                            onClick={() => {
                                                setActiveModule('ABSENSI');
                                                localStorage.setItem('activeModule', 'ABSENSI');
                                                setIsModuleOpen(false);
                                                window.location.reload(); 
                                            }}
                                            className={`flex w-full items-center gap-3 p-3 rounded-lg transition-colors ${activeModule === 'ABSENSI' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                        >
                                            <Briefcase className="h-5 w-5" />
                                            <div className="text-left">
                                                <p className="text-sm font-bold">Absensi & HRIS</p>
                                                <p className="text-[10px] opacity-70">Kelola kehadiran & SDM</p>
                                            </div>
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setActiveModule('FINANCE');
                                                localStorage.setItem('activeModule', 'FINANCE');
                                                setIsModuleOpen(false);
                                                window.location.reload(); 
                                            }}
                                            className={`flex w-full items-center gap-3 p-3 rounded-lg transition-colors ${activeModule === 'FINANCE' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                        >
                                            <BarChart3 className="h-5 w-5" />
                                            <div className="text-left">
                                                <p className="text-sm font-bold">Finance & Akunting</p>
                                                <p className="text-[10px] opacity-70">Laporan laba rugi & kas</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50/50 border border-slate-100">
                         <div className={`p-1 rounded-md ${allowedModules === 'ABSENSI' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                            {allowedModules === 'ABSENSI' ? <Briefcase className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
                        </div>
                        <div className="text-left hidden md:block">
                            <p className="text-[10px] uppercase font-bold text-slate-400 leading-none">Paket Aktif</p>
                            <p className="text-xs font-bold text-slate-600">{allowedModules === 'ABSENSI' ? 'Absensi & HRIS' : 'Finance & Akunting'}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
                    className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-all border border-slate-200"
                >
                    <Globe className="h-3.5 w-3.5" />
                    {language.toUpperCase()}
                </button>

                <div className="relative">
                    <button 
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                        className="relative text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {isNotifOpen && (
                        <>
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsNotifOpen(false)}
                            />
                            <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h3 className="font-bold text-slate-800 text-sm">Notifikasi</h3>
                                    {unreadCount > 0 && (
                                        <button 
                                            onClick={markAllAsRead}
                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
                                        >
                                            Tandai semua dibaca
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-[350px] overflow-y-auto">
                                    {notifications.length > 0 ? (
                                        notifications.map((notif) => (
                                            <div 
                                                key={notif.id}
                                                className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors last:border-0 ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
                                            >
                                                <div className="flex gap-3">
                                                    <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${!notif.isRead ? 'bg-blue-500' : 'bg-transparent'}`} />
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{notif.title}</p>
                                                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{notif.message}</p>
                                                        <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-10 text-center text-slate-400">
                                            <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                            <p className="text-xs">Belum ada notifikasi.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
                                    <button className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                                        Lihat Semua
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3 border-l pl-4">
                    <div className="text-right">
                        <p className="text-sm font-medium text-slate-700">{!isMounted ? 'Memuat...' : profileName}</p>
                        <p className="text-xs text-slate-500">{!isMounted ? '-' : roleLabel} - {companyName}</p>
                    </div>
                    <UserCircle className="h-8 w-8 text-slate-400" />
                </div>
            </div>
        </header>
        </>
    )
}

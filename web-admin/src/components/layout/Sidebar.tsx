'use client';

import { useEffect, useState } from "react";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Clock, LogOut, Receipt, Banknote, CalendarDays, Building2, Wallet, CreditCard, FileSpreadsheet, Settings, Watch, Megaphone, MapPin, Laptop, TrendingUp, Heart, GraduationCap } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

const menuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { title: 'Karyawan', icon: Users, path: '/dashboard/employees' },
    { title: 'Jadwal Shift', icon: Clock, path: '/dashboard/shifts' },
    { title: 'Kehadiran', icon: Clock, path: '/dashboard/attendance' },
    { title: 'Lembur', icon: Watch, path: '/dashboard/overtimes' },
    { title: 'Penggajian', icon: Banknote, path: '/dashboard/payroll' },
    { title: 'Kasbon', icon: Receipt, path: '/dashboard/loans' },
    { title: 'Klaim Biaya', icon: Receipt, path: '/dashboard/reimbursements' },
    { title: 'Hari Libur', icon: CalendarDays, path: '/dashboard/holidays' }
];

export default function Sidebar() {
    const router = useRouter();
    const { t } = useLanguage();
    const [userRole, setUserRole] = useState('EMPLOYEE');

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        if (role && role !== userRole) {
            setTimeout(() => setUserRole(role), 0);
        }
    }, [userRole]);
    return (
        <div className="flex h-screen w-64 flex-col bg-slate-900 text-white shadow-xl transition-all" style={{ display: 'flex', height: '100vh', width: '16rem', flexDirection: 'column', backgroundColor: '#0f172a', color: 'white' }}>
            <style jsx>{`
                .nav-link { display: flex; items-center: center; gap: 0.75rem; border-radius: 0.375rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; transition: all 0.2s; color: #cbd5e1; text-decoration: none; }
                .nav-link:hover { background-color: #1e293b; color: white; }
                .nav-link.active { background-color: #2563eb; color: white; }
            `}</style>
            
            <div className="flex h-16 items-center justify-center border-b border-slate-700 mt-4 pb-4" style={{ display: 'flex', height: '4rem', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #334155', marginTop: '1rem', paddingBottom: '1rem' }}>
                <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img src="/logo.png" alt="aivola Logo" className="h-8 w-8 rounded-lg object-contain bg-white p-1" style={{ height: '2rem', width: '2rem', borderRadius: '0.5rem', objectFit: 'contain', backgroundColor: 'white', padding: '0.25rem' }} />
                    <span className="text-xl font-bold tracking-tight text-slate-100 font-primary" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f1f5f9' }}>aivola <span style={{ color: '#3b82f6' }}>Admin</span></span>
                </div>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-6">
                <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <LayoutDashboard className="h-5 w-5" />
                    {t('sidebar.dashboard')}
                </Link>
                <Link href="/dashboard/announcements" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <Megaphone className="h-5 w-5" />
                    {t('sidebar.announcements')}
                </Link>

                {/* HANYA MUNCUL JIKA YG LOGIN ADALAH SANG PEMILIK APLIKASI (SUPER ADMIN) */}
                {userRole === 'SUPERADMIN' && (
                    <>
                        <Link href="/dashboard/companies" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-blue-600/10 text-blue-400 hover:bg-slate-800 transition-colors">
                            <Building2 className="h-5 w-5" />
                            Manajemen Klien (SaaS)
                        </Link>
                        <Link href="/dashboard/admin/billing" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-indigo-600/10 text-indigo-400 hover:bg-slate-800 transition-colors">
                            <CreditCard className="h-5 w-5" />
                            Kontrol Billing SaaS
                        </Link>
                        <Link href="/dashboard/admin/reports" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-emerald-600/10 text-emerald-400 hover:bg-slate-800 transition-colors">
                            <TrendingUp className="h-5 w-5" />
                            Laporan Global (SaaS)
                        </Link>
                        <Link href="/dashboard/owner-settings" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-orange-600/10 text-orange-400 hover:bg-slate-800 transition-colors">
                            <Settings className="h-5 w-5" />
                            Owner Settings (Data)
                        </Link>
                    </>
                )}

                <Link href="/dashboard/employees" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <Users className="h-5 w-5" />
                    {t('sidebar.employees')}
                </Link>
                <Link href="/dashboard/assets" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <Laptop className="h-5 w-5" />
                    Aset Perusahaan
                </Link>
                <Link href="/dashboard/branches" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <MapPin className="h-5 w-5" />
                    Cabang
                </Link>
                <Link href="/dashboard/shifts" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <Clock className="h-5 w-5" />
                    Manajemen Shift
                </Link>
                <Link href="/dashboard/leaves" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <CalendarDays className="h-5 w-5" />
                    {t('sidebar.leaves')}
                </Link>
                <Link href="/dashboard/overtimes" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <Watch className="h-5 w-5" />
                    Manajemen Lembur
                </Link>
                <Link href="/dashboard/bonuses" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <Banknote className="h-5 w-5" />
                    Bonus & THR
                </Link>
                <Link href="/dashboard/payroll" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <Wallet className="h-5 w-5" />
                    {t('sidebar.payroll')}
                </Link>
                <Link href="/dashboard/reimbursements" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <Receipt className="h-5 w-5" />
                    Reimbursement
                </Link>
                <Link href="/dashboard/billing" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <CreditCard className="h-5 w-5" />
                    Histori Tagihan
                </Link>
                <Link href="/dashboard/loans" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <CreditCard className="h-5 w-5" />
                    Pinjaman
                </Link>
                <Link href="/dashboard/attendance" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <FileSpreadsheet className="h-5 w-5" />
                    Laporan Absensi
                </Link>
                <Link href="/dashboard/holidays" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <CalendarDays className="h-5 w-5" />
                    Hari Libur
                </Link>
                <Link href="/dashboard/performance" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <TrendingUp className="h-5 w-5" />
                    Performa KPI
                </Link>
                <Link href="/dashboard/vents" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <Heart className="h-5 w-5 text-pink-500" />
                    Pulse of Company
                </Link>
                <Link href="/dashboard/learning" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <GraduationCap className="h-5 w-5 text-indigo-500" />
                    Learning & Development
                </Link>
            </nav>

            <div className="mt-auto border-t border-slate-700 p-4">
                <Link href="/dashboard/settings" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <Settings className="h-5 w-5" />
                    Pengaturan
                </Link>
                <button
                    onClick={() => {
                        localStorage.clear();
                        router.push('/');
                    }}
                    className="flex w-full mt-2 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    Keluar Sistem
                </button>
            </div>
        </div>
    )
}

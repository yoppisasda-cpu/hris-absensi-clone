'use client';

import { useEffect, useState } from "react";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Clock, LogOut, Receipt, Banknote, CalendarDays, Building2, Wallet, CreditCard, FileSpreadsheet, Settings, Watch, Megaphone, MapPin, Laptop, TrendingUp, Heart, GraduationCap, MessageSquare, Briefcase, BarChart3, PieChart, Coins, FileText, Box, ShoppingCart, Truck, ArrowDownCircle, ArrowUpCircle, ShoppingBag, Monitor, BrainCircuit } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useFeatures } from '@/lib/FeatureContext';
import api from '@/lib/api';
import { Lock } from 'lucide-react';

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
    const { plan, openUpgradeModal, hasFeature } = useFeatures();
    const [userRole, setUserRole] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userRole') || 'EMPLOYEE' : 'EMPLOYEE'));
    const [activeModule, setActiveModule] = useState<'ABSENSI' | 'FINANCE' | 'INVENTORY' | null>(null);
    const [allowedModules, setAllowedModules] = useState<string>('BOTH');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const fetchCompanyModules = async () => {
            try {
                const res = await api.get('/companies/my');
                const modules = res.data.modules || 'BOTH';
                setAllowedModules(modules);
                
                // Priority order:
                // 1. If company only has one module, force it (no choice)
                // 2. Otherwise, respect the user's saved preference from localStorage
                // 3. If no saved preference, default based on role (FINANCE -> FINANCE, others -> ABSENSI)
                if (modules === 'ABSENSI') {
                    setActiveModule('ABSENSI');
                    localStorage.setItem('activeModule', 'ABSENSI');
                } else if (modules === 'FINANCE') {
                    setActiveModule('FINANCE');
                    localStorage.setItem('activeModule', 'FINANCE');
                } else {
                    // Company has BOTH modules available — respect saved preference first
                    const saved = localStorage.getItem('activeModule') as 'ABSENSI' | 'FINANCE' | null;
                    if (saved === 'FINANCE' || saved === 'ABSENSI') {
                        setActiveModule(saved);
                    } else if (userRole === 'FINANCE') {
                        // No saved preference, user is Finance role → default to Finance
                        setActiveModule('FINANCE');
                        localStorage.setItem('activeModule', 'FINANCE');
                    } else {
                        setActiveModule('ABSENSI');
                    }
                }
            } catch (err) {
                console.error("Failed to fetch modules", err);
                const saved = localStorage.getItem('activeModule') as 'ABSENSI' | 'FINANCE' | null;
                if (saved === 'FINANCE' || saved === 'ABSENSI') {
                    setActiveModule(saved);
                } else {
                    setActiveModule(userRole === 'FINANCE' ? 'FINANCE' : 'ABSENSI');
                }
            }
        };

        fetchCompanyModules();
    }, []);
    return (
        <div className="flex h-screen w-64 flex-col bg-slate-900 text-white shadow-xl transition-all overflow-y-auto" style={{ display: 'flex', height: '100vh', width: '16rem', flexDirection: 'column', backgroundColor: '#0f172a', color: 'white', overflowY: 'auto' }}>
            <style jsx>{`
                .nav-link { display: flex; items-center: center; gap: 0.75rem; border-radius: 0.375rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; transition: all 0.2s; color: #cbd5e1; text-decoration: none; }
                .nav-link:hover { background-color: #1e293b; color: white; }
                .nav-link.active { background-color: #2563eb; color: white; }
            `}</style>
            
            <div className="flex h-16 items-center justify-center border-b border-slate-700 mt-4 pb-4" style={{ display: 'flex', height: '4rem', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #334155', marginTop: '1rem', paddingBottom: '1rem' }}>
                <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img src="/logo.png" alt="aivola Logo" className="h-8 w-8 rounded-lg object-contain bg-white p-1" style={{ height: '2rem', width: '2rem', borderRadius: '0.5rem', objectFit: 'contain', backgroundColor: 'white', padding: '0.25rem' }} />
                    <div className="flex flex-col">
                        <span className="text-xl font-bold tracking-tight text-slate-100 font-primary" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f1f5f9' }}>aivola <span style={{ color: '#3b82f6' }}>Admin</span></span>
                        <span className="text-[10px] text-slate-500 font-mono">Build v1.0.6-Final-Live</span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-6">
                {/* MODULE SWITCHER BUTTON */}
                <div className="px-3 mb-6">
                    <button 
                        onClick={() => {
                            if (activeModule === 'ABSENSI' && plan === 'STARTER') {
                                openUpgradeModal();
                                return;
                            }
                            const next = activeModule === 'ABSENSI' ? 'FINANCE' : 'ABSENSI';
                            setActiveModule(next);
                            localStorage.setItem('activeModule', next);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg p-3 text-sm font-bold transition-all border group relative overflow-hidden ${
                            activeModule === 'ABSENSI' ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {activeModule === 'ABSENSI' ? <Briefcase className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
                            <span>Modul: {activeModule === 'ABSENSI' ? 'Absensi & HRIS' : 'Finance & Akunting'}</span>
                        </div>
                        {activeModule === 'ABSENSI' && plan === 'STARTER' ? (
                            <Lock className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                            <TrendingUp className="h-3 w-3 opacity-50 group-hover:rotate-180 transition-transform" />
                        )}
                        
                        {activeModule === 'ABSENSI' && plan === 'STARTER' && (
                            <div className="absolute top-0 right-0 bg-amber-500 text-slate-900 text-[8px] px-1.5 py-0.5 font-black uppercase tracking-tighter">Premium</div>
                        )}
                    </button>
                </div>


                <Link href="/dashboard/executive" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-black bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/40 hover:to-indigo-600/40 text-blue-400 hover:text-white border border-blue-500/30 transition-all mb-2 animate-pulse shadow-lg shadow-blue-500/10">
                    <Monitor className="h-5 w-5" />
                    EXECUTIVE INTEL
                </Link>

                <div 
                    onClick={() => {
                        if (!hasFeature('AI_ADVISOR')) {
                            openUpgradeModal();
                        } else {
                            router.push('/dashboard');
                        }
                    }}
                    className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-black transition-all mb-4 cursor-pointer group relative overflow-hidden ${
                        hasFeature('AI_ADVISOR') 
                        ? 'bg-gradient-to-r from-violet-600/20 to-purple-600/20 text-violet-400 border border-violet-500/30 hover:from-violet-600/40 hover:to-purple-600/40' 
                        : 'bg-slate-800/50 text-slate-500 border border-slate-700/50'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <BrainCircuit className="h-5 w-5" />
                        AIVOLA MIND
                    </div>
                    {!hasFeature('AI_ADVISOR') && <Lock className="h-3.5 w-3.5 text-amber-500" />}
                    {hasFeature('AI_ADVISOR') && <div className="absolute top-0 right-0 bg-violet-500 text-white text-[7px] px-1 py-0.5 font-black uppercase tracking-tighter rounded-bl-md">Active</div>}
                </div>

                <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <LayoutDashboard className="h-5 w-5" />
                    {t('sidebar.dashboard')}
                </Link>

                {/* MODUL ABSENSI & HRIS */}
                {activeModule === 'ABSENSI' && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Manajemen SDM</div>
                        <Link href="/dashboard/employees" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <Users className="h-5 w-5" />
                            {t('sidebar.employees')}
                        </Link>
                        <Link href="/dashboard/branches" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <MapPin className="h-5 w-5" />
                            Cabang
                        </Link>
                        <Link href="/dashboard/shifts" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <Clock className="h-5 w-5" />
                            Manajemen Shift
                        </Link>
                        <Link href="/dashboard/attendance" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <FileSpreadsheet className="h-5 w-5" />
                            Laporan Absensi
                        </Link>
                        <Link href="/dashboard/leaves" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <CalendarDays className="h-5 w-5" />
                            {t('sidebar.leaves')}
                        </Link>
                        <Link href="/dashboard/overtimes" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <Watch className="h-5 w-5" />
                            Lembur
                        </Link>

                        <div className="px-3 py-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Komunikasi & CRM</div>
                        <Link href="/dashboard/crm" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <MessageSquare className="h-5 w-5 text-blue-400" />
                            CRM Live Chat
                        </Link>

                        <div className="px-3 py-2 mt-4 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Performa & Budaya</div>
                        <Link href="/dashboard/performance" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <TrendingUp className="h-5 w-5" />
                            Performa KPI
                        </Link>
                        <Link href="/dashboard/learning" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <GraduationCap className="h-5 w-5" />
                            Learning & Development
                        </Link>
                        <Link href="/dashboard/vents" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <Heart className="h-5 w-5 text-pink-500" />
                            Pulse of Company
                        </Link>

                        <div className="px-3 py-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operasional SDM</div>
                        <Link href="/dashboard/bonuses" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <Banknote className="h-5 w-5" />
                            Bonus & THR
                        </Link>
                        <Link href="/dashboard/reimbursements" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <Receipt className="h-5 w-5" />
                            Reimbursement
                        </Link>
                        <Link href="/dashboard/loans" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <CreditCard className="h-5 w-5" />
                            Pinjaman
                        </Link>
                        <Link href="/dashboard/assets" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <Laptop className="h-5 w-5" />
                            Aset Perusahaan
                        </Link>
                        {isMounted && (userRole === 'OWNER' || userRole === 'SUPERADMIN') && (
                            <Link href="/dashboard/billing" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-red-600/10 text-red-400 hover:bg-slate-800 transition-colors">
                                <CreditCard className="h-5 w-5" />
                                Histori Tagihan
                            </Link>
                        )}
                    </div>
                )}

                {/* MODUL FINANCE & AKUNTING */}
                {activeModule === 'FINANCE' && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="px-3 py-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Penjualan & Operasional</div>
                        <Link href="/dashboard/sales" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-blue-600/10 text-blue-400 hover:bg-slate-800 transition-colors">
                            <ShoppingCart className="h-5 w-5" />
                            Penjualan B2B (Invoice)
                        </Link>
                        <Link href="/dashboard/sales/orders" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-blue-600/10 text-blue-400 hover:bg-slate-800 transition-colors">
                            <FileText className="h-5 w-5" />
                            Sales Orders (PO)
                        </Link>
                        <Link href="/dashboard/pos/reports" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-emerald-600/10 text-emerald-400 hover:bg-slate-800 transition-colors">
                            <Monitor className="h-5 w-5" />
                            Laporan Kasir (POS)
                        </Link>
                        <Link href="/dashboard/customers" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <Users className="h-5 w-5 text-indigo-400" />
                            Data Pelanggan
                        </Link>
                        <Link href="/dashboard/suppliers" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <Truck className="h-5 w-5 text-amber-400" />
                            Data Supplier
                        </Link>
                        <div className="px-3 py-2 mt-4 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Hutang & Piutang</div>
                        <Link href="/dashboard/finance/payables" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <ArrowDownCircle className="h-5 w-5 text-red-400" />
                            Buku Hutang (Payables)
                        </Link>
                        <Link href="/dashboard/finance/receivables" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <ArrowUpCircle className="h-5 w-5 text-blue-400" />
                            Buku Piutang (Receivables)
                        </Link>
                        <div className="px-3 py-2 mt-4 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Keuangan & Kas (GL)</div>
                        <Link href="/dashboard/finance/income" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <TrendingUp className="h-5 w-5 text-emerald-400" />
                            Pemasukan (Income)
                        </Link>
                        <Link href="/dashboard/finance/expense" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <TrendingUp className="h-5 w-5 text-red-400 rotate-180" />
                            Pengeluaran (Expense)
                        </Link>
                        <Link href="/dashboard/finance/accounts" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <Coins className="h-5 w-5 text-amber-400" />
                            Kas & Bank
                        </Link>
                        <div className="px-3 py-2 mt-4 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Laporan Keuangan</div>
                        <Link href="/dashboard/payroll" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <Banknote className="h-5 w-5 text-emerald-400" />
                            Manajemen Gaji (Payroll)
                        </Link>
                        <Link href="/dashboard/finance/profit-loss" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <BarChart3 className="h-5 w-5" />
                            Laba Rugi
                        </Link>
                        <Link href="/dashboard/finance/balance-sheet" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <PieChart className="h-5 w-5" />
                            Neraca Keuangan
                        </Link>
                        <Link href="/dashboard/finance/cash-flow" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <TrendingUp className="h-5 w-5 text-emerald-400" />
                            Arus Kas (Cash Flow)
                        </Link>
                        <Link href="/dashboard/finance/profitability" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <BarChart3 className="h-5 w-5 text-blue-400" />
                            Analisis Margin
                        </Link>
                        <Link href="/dashboard/finance/journal" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <FileText className="h-5 w-5 text-indigo-400" />
                            Jurnal Umum
                        </Link>
                        <Link href="/dashboard/finance/closing" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <FileText className="h-5 w-5 text-orange-400" />
                            Tutup Buku (Closing)
                        </Link>

                        <div className="px-3 py-2 mt-4 text-[10px] font-bold text-orange-400 uppercase tracking-widest">Manajemen Inventori</div>
                        <Link href="/dashboard/inventory/products" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <Box className="h-5 w-5 text-orange-400" />
                            Produk & Stok
                        </Link>
                        <Link href="/dashboard/inventory/adjustments" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <Clock className="h-5 w-5 text-slate-400" />
                            Penyesuaian Stok
                        </Link>
                        <Link href="/dashboard/inventory/purchase-orders" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <ShoppingBag className="h-5 w-5 text-blue-400" />
                            Purchase Order (PO)
                        </Link>
                        <Link href="/dashboard/inventory/warehouses" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <MapPin className="h-5 w-5 text-blue-400" />
                            Manajemen Gudang
                        </Link>
                    </div>
                )}


                {/* UMUM / COMMON */}
                <div className="px-3 py-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lainnya</div>
                <Link href="/dashboard/announcements" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <Megaphone className="h-5 w-5" />
                    {t('sidebar.announcements')}
                </Link>
                <Link href="/dashboard/holidays" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                    <CalendarDays className="h-5 w-5" />
                    Hari Libur
                </Link>

                {/* HANYA MUNCUL JIKA YG LOGIN ADALAH SANG PEMILIK APLIKASI (SUPER ADMIN / OWNER) */}
                {isMounted && (userRole === 'SUPERADMIN' || userRole === 'OWNER') && (
                    <div className="space-y-1 pt-4 border-t border-slate-700/50 mt-4">
                        <div className="px-3 py-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono">Control SaaS</div>
                        <Link href="/dashboard/companies" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-blue-600/10 text-blue-400 hover:bg-slate-800 transition-colors">
                            <Building2 className="h-5 w-5" />
                            Manajemen Klien
                        </Link>
                        <Link href="/dashboard/admin/billing" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-indigo-600/10 text-indigo-400 hover:bg-slate-800 transition-colors">
                            <CreditCard className="h-5 w-5" />
                            Billing SaaS
                        </Link>
                        <Link href="/dashboard/admin/integrations" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-amber-600/10 text-amber-500 hover:bg-slate-800 transition-colors">
                            <Laptop className="h-5 w-5" />
                            Integrasi API
                        </Link>
                    </div>
                )}
            </nav>

            <div className="mt-auto border-t border-slate-700 p-4">
                <Link href="/dashboard/store" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-gradient-to-r from-purple-600/10 to-blue-600/10 text-purple-400 hover:bg-slate-800 transition-colors border border-purple-500/20 mb-2">
                    <ShoppingBag className="h-5 w-5 animate-pulse" />
                    Aivola Store
                </Link>
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

'use client';

import { useEffect, useState, useRef } from "react";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Clock, LogOut, Receipt, Banknote, CalendarDays, CalendarCheck, Building2, Wallet, CreditCard, FileSpreadsheet, Settings, Watch, Megaphone, MapPin, Laptop, TrendingUp, Heart, GraduationCap, MessageSquare, Briefcase, BarChart3, PieChart, Coins, FileText, Box, ShoppingCart, Truck, ArrowDownCircle, ArrowUpCircle, ShoppingBag, Monitor, BrainCircuit, Sparkles, Database, Upload } from 'lucide-react';
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
    const pathname = usePathname();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useLanguage();
    const { plan, openUpgradeModal, hasFeature } = useFeatures();

    const handleBackup = () => {
        const token = localStorage.getItem('jwt_token');
        const baseUrl = api.defaults.baseURL;
        window.open(`${baseUrl}/admin/backup?token=${token}`, '_blank');
    };

    const handleRestoreClick = () => {
        const confirmRestore = window.confirm(
            "⚠️ PERINGATAN KRUSIAL!\n\nProses RESTORE akan menghapus seluruh data database saat ini dan menggantinya dengan data dari file backup.\n\nTindakan ini TIDAK DAPAT DIBATALKAN.\n\nApakah Anda yakin ingin melanjutkan?"
        );
        if (confirmRestore) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.sql.gz')) {
            alert("Format file tidak valid. Harap unggah file .sql.gz");
            return;
        }

        const formData = new FormData();
        formData.append('backup', file);

        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) throw new Error('Token not found');
            const baseUrl = api.defaults.baseURL;

            const response = await fetch(`${baseUrl}/admin/restore`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                alert("✅ BERHASIL: Database telah dipulihkan sepenuhnya. Halaman akan dimuat ulang.");
                window.location.reload();
            } else {
                alert("❌ GAGAL: " + (result.details || result.error));
            }
        } catch (error: any) {
            alert("❌ ERROR: Gagal menghubungi server: " + error.message);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const [userRole, setUserRole] = useState<string | null>(null);
    const [activeModule, setActiveModule] = useState<'ABSENSI' | 'FINANCE' | null>(null);
    const [allowedModules, setAllowedModules] = useState<string>('BOTH');
    const [isMounted, setIsMounted] = useState(false);
    
    // Holding / Multi-Company States
    const [accessibleCompanies, setAccessibleCompanies] = useState<any[]>([]);
    const [currentCompanyName, setCurrentCompanyName] = useState<string>('');

    useEffect(() => {
        setIsMounted(true);
        const role = localStorage.getItem('userRole');
        setUserRole(role);
        
        const fetchAccessibleCompanies = async () => {
            if (role === 'OWNER' || role === 'SUPERADMIN') {
                try {
                    const res = await api.get('/companies/accessible');
                    setAccessibleCompanies(res.data);
                } catch (err) {
                    console.error("Failed to fetch accessible companies", err);
                }
            }
        };

        fetchAccessibleCompanies();
    }, []);

    // --- NEW: RE-RUN DETECTION ON EVERY NAVIGATION ---
    useEffect(() => {
        const role = localStorage.getItem('userRole');
        const savedModule = localStorage.getItem('activeModule') as any;
        
        if (role === 'FINANCE') {
            setActiveModule('FINANCE');
            return;
        }

        if (pathname.includes('/dashboard/finance') || pathname.includes('/dashboard/loans') || pathname.includes('/dashboard/reimbursements') || pathname.includes('/dashboard/inventory') || pathname.includes('/dashboard/pos') || pathname.includes('/dashboard/payroll')) {
            setActiveModule('FINANCE');
            localStorage.setItem('activeModule', 'FINANCE');
        } else if (pathname.includes('/dashboard/employees') || pathname.includes('/dashboard/shifts') || pathname.includes('/dashboard/attendance')) {
            setActiveModule('ABSENSI');
            localStorage.setItem('activeModule', 'ABSENSI');
        } else if (savedModule && (activeModule === null)) {
            // Only use saved module on initial load if URL doesn't match a specific module
            setActiveModule(savedModule === 'INVENTORY' ? 'FINANCE' : savedModule);
        } else if (activeModule === null) {
            setActiveModule('ABSENSI');
        }

        const fetchCompanyModules = async () => {
            try {
                const res = await api.get('/companies/my');
                const modules = res.data.modules || 'BOTH';
                setAllowedModules(modules);
                setCurrentCompanyName(res.data.name);
                
                // Soft protection: only override if we are on a generic page (dashboard)
                // If the user is ALREADY on a finance/inventory page, don't kick them out
                const isFinanceOrInventoryPage = pathname.includes('/dashboard/finance') || pathname.includes('/dashboard/loans') || pathname.includes('/dashboard/reimbursements') || pathname.includes('/dashboard/inventory') || pathname.includes('/dashboard/pos') || pathname.includes('/dashboard/payroll');

                if (modules === 'ABSENSI' && !isFinanceOrInventoryPage) {
                    setActiveModule('ABSENSI');
                } else if (modules === 'FINANCE') {
                    setActiveModule('FINANCE');
                }
            } catch (err) {
                console.error("Failed to fetch modules", err);
            }
        };

        fetchCompanyModules();
    }, [pathname]);

    const handleSwitchCompany = (companyId: number) => {
        if (!companyId || isNaN(companyId)) return;
        
        // Verify this company is in our accessible list before switching
        const isAccessible = accessibleCompanies.some(c => c.id === companyId);
        if (!isAccessible) {
            console.warn(`[SWITCH] Attempted to switch to inaccessible company: ${companyId}`);
            return;
        }
        
        console.log(`[SWITCH] Switching to company: ${companyId}`);
        localStorage.setItem('currentTenantId', companyId.toString());
        // Use href navigation to /dashboard to avoid reload going through login page
        window.location.href = '/dashboard';
    };

    const handleLinkCompany = async () => {
        const name = window.prompt("Masukkan Nama Perusahaan Target:");
        if (!name) return;
        const pass = window.prompt(`Masukkan Password Admin untuk ${name}:`);
        if (!pass) return;

        try {
            const res = await api.post('/companies/link', { companyName: name, adminPassword: pass });
            alert(res.data.message);
            window.location.reload();
        } catch (err: any) {
            alert("Gagal menghubungkan: " + (err.response?.data?.error || err.message));
        }
    };
    return (
        <div className="flex h-screen w-64 flex-col bg-[#050505] border-r border-white/5 text-white transition-all overflow-y-auto no-scrollbar relative z-30 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <style jsx>{`
                .nav-link { 
                    display: flex; 
                    align-items: center; 
                    gap: 0.875rem; 
                    border-radius: 1.25rem; 
                    padding: 0.75rem 1rem; 
                    font-size: 0.813rem; 
                    font-weight: 600;
                    transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); 
                    color: rgba(255, 255, 255, 0.4); 
                    text-decoration: none;
                    margin-bottom: 0.25rem;
                    border: 1px solid transparent;
                }
                .nav-link:hover { 
                    background-color: rgba(255, 255, 255, 0.03); 
                    color: white; 
                    border-color: rgba(255, 255, 255, 0.05);
                    transform: translateX(4px);
                }
                .nav-link.active { 
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
                    color: white; 
                    border-color: rgba(99, 102, 241, 0.2);
                    box-shadow: 0 10px 20px -10px rgba(99, 102, 241, 0.3);
                }
                .nav-link.active .icon-container {
                    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
                    color: white;
                    box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
                }
            `}</style>
            
            <div className="flex flex-col items-center justify-center border-b border-white/5 mt-6 pb-6 px-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                         <Sparkles className="h-6 w-6 text-white animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-2xl font-black tracking-tighter text-white uppercase italic">aivola</span>
                        <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">v1.0.8-SaaS</span>
                    </div>
                </div>

                {/* HOLDING COMPANY SWITCHER */}
                {isMounted && (userRole === 'OWNER' || userRole === 'SUPERADMIN') && accessibleCompanies.length > 0 && (
                    <div className="px-3 w-full animate-in fade-in zoom-in duration-300">
                        <div className="relative group">
                            <select 
                                onChange={(e) => {
                                    if (e.target.value === 'LINK_NEW') {
                                        handleLinkCompany();
                                    } else {
                                        handleSwitchCompany(Number(e.target.value));
                                    }
                                }}
                                value={localStorage.getItem('currentTenantId') || ''}
                                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-[11px] rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer hover:bg-slate-700 transition-colors"
                            >
                                <option value="" disabled>-- Perusahaan Aktif --</option>
                                {accessibleCompanies.map(c => (
                                    <option key={c.id} value={c.id}>
                                        🏢 {c.name} {c.isPrimary ? '(Pusat)' : ''}
                                    </option>
                                ))}
                                <option value="LINK_NEW" className="text-blue-400 font-bold">+ Hubungkan Perusahaan Lain</option>
                            </select>
                            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none opacity-50">
                                <TrendingUp className="h-3 w-3 rotate-90" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <nav className="flex-1 space-y-1 px-3 py-6">
                {/* MODULE SWITCHER BUTTON (Hidden for Finance role) */}
                {isMounted && userRole !== 'FINANCE' && (
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
                            className={`flex w-full items-center justify-between gap-3 rounded-xl p-3 text-[13px] font-bold transition-all border group relative overflow-hidden backdrop-blur-sm shadow-lg ${
                                activeModule === 'ABSENSI' 
                                ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' 
                                : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
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
                        </button>
                    </div>
                )}


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
                {activeModule === 'ABSENSI' && userRole !== 'POS_VIEWER' && (
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
                        <Link href="/dashboard/attendance/schedule" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <CalendarCheck className="h-5 w-5 text-indigo-400" />
                            Penjadwalan Karyawan
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
                        <Link href="/dashboard/assignments" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <Briefcase className="h-5 w-5 text-indigo-400" />
                            Penugasan & Monitoring
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

                {/* MODUL FINANCE & AKUNTING (HANYA UNTUK STAFF FINANCE / OWNER) */}
                {activeModule === 'FINANCE' && userRole !== 'POS_VIEWER' && (
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
                        <Link href="/dashboard/finance/equity" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <PieChart className="h-5 w-5" />
                            Dividen & Modal
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
                        <Link href="/dashboard/assets" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                            <Laptop className="h-5 w-5 text-indigo-400" />
                            Manajemen Aset (Fixed Assets)
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

                {/* POS VIEWER SPECIFIC MENU */}
                {userRole === 'POS_VIEWER' && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="px-3 py-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest italic">Monitoring POS</div>
                        <Link href="/dashboard/pos/reports" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-emerald-600/10 text-emerald-400 hover:bg-slate-800 transition-colors border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                            <Monitor className="h-5 w-5" />
                            Laporan Kasir (POS)
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
                        <div className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium bg-slate-800/30 text-slate-500 cursor-not-allowed border border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5" />
                                Audit Logs
                            </div>
                            <span className="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Soon</span>
                        </div>
                        <button 
                            onClick={handleBackup}
                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-emerald-600/10 text-emerald-400 hover:bg-slate-800 transition-colors border border-emerald-500/20 shadow-lg shadow-emerald-500/5 mt-1"
                        >
                            <Database className="h-5 w-5" />
                            Backup Database (.gz)
                        </button>
                        <button 
                            onClick={handleRestoreClick}
                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-rose-600/10 text-rose-400 hover:bg-slate-800 transition-colors border border-rose-500/20 shadow-lg shadow-rose-500/5 mt-1"
                        >
                            <Upload className="h-5 w-5" />
                            Restore Database
                        </button>
                        <input 
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".sql.gz"
                        />
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

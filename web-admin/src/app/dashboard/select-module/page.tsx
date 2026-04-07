'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, BarChart3, ArrowRight, CheckCircle2, Building2 } from 'lucide-react';
import api from '@/lib/api';

export default function ModuleSelection() {
    const router = useRouter();
    const [company, setCompany] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        // Safe check for localStorage
        if (typeof window !== 'undefined') {
            setUserRole(localStorage.getItem('userRole') || '');

            // If activeModule is already set, skip module selection and go directly to dashboard
            const existingModule = localStorage.getItem('activeModule');
            if (existingModule) {
                router.push('/dashboard');
                return;
            }
        }

        const fetchCompany = async () => {
            try {
                const res = await api.get('/companies/my');
                const comp = res.data;
                setCompany(comp);

                // Auto-detect module for non-OWNER/SUPERADMIN roles
                const role = localStorage.getItem('userRole') || '';
                const isSuperAdmin = role === 'SUPERADMIN' || role === 'OWNER';
                
                if (!isSuperAdmin) {
                    if (comp.modules === 'ABSENSI') {
                        localStorage.setItem('activeModule', 'ABSENSI');
                        router.push('/dashboard');
                    } else if (comp.modules === 'FINANCE') {
                        localStorage.setItem('activeModule', 'FINANCE');
                        router.push('/dashboard');
                    } else if (comp.modules === 'BOTH' || comp.modules === 'INVENTORY') {
                        // For BOTH: default to ABSENSI for non-admin roles
                        localStorage.setItem('activeModule', 'ABSENSI');
                        router.push('/dashboard');
                    }
                }
                // If BOTH & OWNER/SUPERADMIN → show module selection UI
            } catch (error) {
                console.error("Gagal mengambil data perusahaan", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCompany();
    }, [router]);

    const selectModule = (moduleId: 'ABSENSI' | 'FINANCE' | 'INVENTORY') => {
        localStorage.setItem('activeModule', moduleId);
        router.push('/dashboard');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-blue-600 animate-bounce" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Menyiapkan Workspace Anda...</p>
                </div>
            </div>
        );
    }

    // Determine what modules are available based on company.modules
    // Bypass constraints for SUPERADMIN / OWNER
    const isSuperAdmin = userRole === 'SUPERADMIN' || userRole === 'OWNER';
    const isAbsensiAvailable = isSuperAdmin || company?.modules === 'BOTH' || company?.modules === 'ABSENSI';
    const isFinanceAvailable = isSuperAdmin || company?.modules === 'BOTH' || company?.modules === 'FINANCE';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-slate-50">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 text-blue-600 text-xs font-bold uppercase tracking-wider mb-4">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Selamat Datang, {company?.name}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                        Pilih Modul <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Aivola</span> Anda
                    </h1>
                    <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
                        Kelola bisnis Anda dengan lebih cerdas. Pilih modul yang ingin Anda gunakan hari ini.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 animate-in fade-in zoom-in duration-700 delay-200">
                    {/* ABSENSI CARD */}
                    <button 
                        disabled={!isAbsensiAvailable}
                        onClick={() => selectModule('ABSENSI')}
                        className={`group relative flex flex-col bg-white rounded-3xl p-8 border-2 transition-all duration-300 text-left overflow-hidden shadow-sm hover:shadow-2xl ${isAbsensiAvailable ? 'border-transparent hover:border-blue-500' : 'opacity-60 cursor-not-allowed border-slate-100 grayscale'}`}
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                            <Briefcase className="h-32 w-32" />
                        </div>
                        
                        <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                            <Briefcase className="h-8 w-8 text-blue-600 group-hover:text-white" />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-slate-800 mb-3">Absensi & HRIS</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8">
                            Kelola kehadiran karyawan, shift kerja, pengajuan cuti, lembur, aset perusahaan, dan sistem penggajian otomatis.
                        </p>
                        
                        <div className="mt-auto flex items-center justify-between">
                            <span className="text-sm font-bold text-blue-600 flex items-center gap-2">
                                {isAbsensiAvailable ? 'Buka Modul' : 'Belum Berlangganan'}
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </div>
                    </button>

                    {/* FINANCE CARD */}
                    <button 
                        disabled={!isFinanceAvailable}
                        onClick={() => selectModule('FINANCE')}
                        className={`group relative flex flex-col bg-white rounded-3xl p-8 border-2 transition-all duration-300 text-left overflow-hidden shadow-sm hover:shadow-2xl ${isFinanceAvailable ? 'border-transparent hover:border-emerald-500' : 'opacity-60 cursor-not-allowed border-slate-100 grayscale'}`}
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                            <BarChart3 className="h-32 w-32" />
                        </div>
                        
                        <div className="h-16 w-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                            <BarChart3 className="h-8 w-8 text-emerald-600 group-hover:text-white" />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-slate-800 mb-3">Finance & Akunting</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8">
                            Pantau arus kas, pemasukan, pengeluaran, laporan laba rugi, aset keuangan, dan neraca perusahaan secara real-time.
                        </p>
                        
                        <div className="mt-auto flex items-center justify-between">
                            <span className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                                {isFinanceAvailable ? 'Buka Modul' : 'Belum Berlangganan'}
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </div>
                    </button>
                </div>

                <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400">
                    <p className="text-sm">© 2026 PT. Aivola Studio Integrasi. All rights reserved.</p>
                    <div className="flex items-center gap-6 text-sm font-medium">
                        <button className="hover:text-slate-600 transition-colors">Privacy Policy</button>
                        <button className="hover:text-slate-600 transition-colors">Help Center</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

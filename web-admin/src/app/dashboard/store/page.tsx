'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { ShoppingBag, CheckCircle, ArrowRight, Zap, Shield, BarChart3, Users, Box, MessageSquare, Star, Sparkles, TrendingUp, BrainCircuit } from 'lucide-react';

const MODULES_DATA = [
    {
        id: 'ABSENSI',
        name: 'Absensi & HRIS Pro',
        description: 'Kelola kehadiran karyawan, shift, lembur, dan performa KPI dalam satu sistem terintegrasi.',
        icon: Users,
        color: 'blue',
        features: ['GPS/Biometric Attendance', 'Shift Management', 'KPI & Performance', 'Mobile App for Employees'],
        price: 'Mulai dari Rp 5.000 / user'
    },
    {
        id: 'FINANCE',
        name: 'Finance & Akunting',
        description: 'Catat transaksi, kelola hutang-piutang, laba rugi, dan otomatisasi penggajian karyawan.',
        icon: BarChart3,
        color: 'emerald',
        features: ['Laporan Laba Rugi', 'Manajemen Gaji Otomatis', 'Buku Kas & Bank', 'Invoice & Piutang'],
        price: 'Biaya Flat Bulanan'
    },
    {
        id: 'INVENTORY',
        name: 'Inventory & Stok',
        description: 'Pantau pergerakan stok barang, gudang, dan sinkronisasi otomatis dengan penjualan.',
        icon: Box,
        color: 'orange',
        features: ['Multi-Warehouse', 'Stock Adjustment', 'Alert Stok Menipis', 'Barcode Scanning'],
        price: 'Add-on Operasional'
    },
    {
        id: 'CRM',
        name: 'CRM & AI Chatbot',
        description: 'Tingkatkan penjualan dengan layanan pelanggan 24/7 menggunakan kecerdasan buatan.',
        icon: MessageSquare,
        color: 'purple',
        features: ['AI Sales Assistant', 'Live Chat Integration', 'Customer Analytics', 'Auto-Reply Smart'],
        price: 'GRATIS / Selamanya'
    }
];

const PREMIUM_INSIGHTS = [
    {
        id: 'PREMIUM_PROFIT',
        name: 'AI: Profit Optimizer',
        description: 'Menganalisis korelasi pengeluaran dan pemasukan untuk menemukan celah efisiensi biaya bahan baku.',
        icon: TrendingUp,
        color: 'amber',
        features: ['Margin Analysis', 'Vendor Price Tracking', 'Opex Optimization'],
        price: 'Rp 250k / bulan'
    },
    {
        id: 'PREMIUM_RETENTION',
        name: 'AI: Retention Predictor',
        description: 'Prediksi risiko pengunduran diri karyawan berbasis pola kehadiran dan perilaku absensi.',
        icon: BrainCircuit,
        color: 'indigo',
        features: ['Burnout Detection', 'Satisfaction Prediction', 'Churn Alerts'],
        price: 'Rp 150k / bulan'
    },
    {
        id: 'PREMIUM_STOCK',
        name: 'AI: Smart Stock Forecaster',
        description: 'Prediksi kapan stok barang akan habis berdasarkan kecepatan penjualan harian secara real-time.',
        icon: Zap,
        color: 'red',
        features: ['Stock Velocity', 'Restock Alerts', 'Trend Prediction'],
        price: 'Rp 100k / bulan'
    }
];

export default function StorePage() {
    const [currentModules, setCurrentModules] = useState<string>('BOTH');
    const [purchasedInsights, setPurchasedInsights] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchCompanyInfo();
    }, []);

    const fetchCompanyInfo = async () => {
        try {
            console.log(`[DEBUG] StorePage: Fetching from ${(api.defaults as any).baseURL}`);
            const res = await api.get('/companies/my');
            setCurrentModules(res.data.modules || 'BOTH');
            setPurchasedInsights(res.data.purchasedInsights || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const isModuleActive = (id: string) => {
        if (id === 'CRM') return true; 
        if (currentModules === 'BOTH') {
            return id === 'ABSENSI' || id === 'FINANCE' || id === 'INVENTORY';
        }
        if (currentModules === 'FINANCE' && id === 'INVENTORY') return true;
        return currentModules === id;
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Hero section */}
                <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 text-white shadow-2xl border border-slate-700">
                    <div className="relative z-10 max-w-2xl">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-4 py-1.5 text-xs font-bold text-blue-400 border border-blue-500/30">
                            <Sparkles className="h-4 w-4" />
                            Aivola Cloud Ecosystem
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            Scale Your Business with Expert Modules.
                        </h1>
                        <p className="mt-6 text-lg text-slate-400 leading-relaxed">
                            Pilih modul tambahan untuk memperkuat operasional bisnis Anda. Aktifkan fitur instan tanpa perlu migrasi data.
                        </p>
                    </div>
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-blue-600/20 blur-[100px]" />
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-purple-600/10 blur-[80px]" />
                </div>

                {/* Package Selector (Point 2 Implementation) */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Zap className="h-6 w-6 text-amber-500" />
                                Konfigurasi Paket Aktif
                            </h2>
                            <p className="text-slate-500 text-sm mt-1">Sesuaikan modul yang muncul di dashboard Anda sesuai kebutuhan bisnis.</p>
                        </div>
                        <button 
                            onClick={async () => {
                                try {
                                    setIsLoading(true);
                                    await api.patch('/companies/my', { modules: currentModules });
                                    toast.success('Konfigurasi paket berhasil diperbarui!');
                                    localStorage.removeItem('activeModule'); 
                                    window.location.reload(); // Refresh to update sidebar & header
                                } catch (err) {
                                    toast.error('Gagal memperbarui paket');
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? 'Memproses...' : 'Simpan Konfigurasi'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { id: 'ABSENSI', name: 'Absensi & HRIS Saja', desc: 'Modul Finance akan disembunyikan.', icon: Users, color: 'blue' },
                            { id: 'FINANCE', name: 'Finance & Akunting Saja', desc: 'Modul Absensi disembunyikan. Payroll Manual.', icon: BarChart3, color: 'emerald' },
                            { id: 'BOTH', name: 'Keduanya (Full Suite)', desc: 'Integrasi otomatis Absensi, Payroll, dan Finance.', icon: Sparkles, color: 'indigo' }
                        ].map((pkg) => (
                            <button
                                key={pkg.id}
                                onClick={() => setCurrentModules(pkg.id)}
                                className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all ${
                                    currentModules === pkg.id 
                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' 
                                    : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'
                                }`}
                            >
                                <div className={`p-2 rounded-lg w-fit mb-4 ${
                                    pkg.id === 'ABSENSI' ? 'bg-blue-100 text-blue-600' :
                                    pkg.id === 'FINANCE' ? 'bg-emerald-100 text-emerald-600' :
                                    'bg-indigo-100 text-indigo-600'
                                }`}>
                                    <pkg.icon className="h-5 w-5" />
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white">{pkg.name}</h4>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{pkg.desc}</p>
                                {currentModules === pkg.id && (
                                    <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase">
                                        <CheckCircle className="h-3 w-3" />
                                        Pilihan Saat Ini
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Explorasi Modul Add-on</h2>
                    <p className="text-slate-500 mt-2">Dapatkan lebih banyak fitur untuk mempercepat pertumbuhan bisnis Anda.</p>
                </div>

                {/* Grid Modules */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {MODULES_DATA.map((module) => {
                        const active = isModuleActive(module.id);
                        return (
                            <div key={module.id} className={`group relative flex flex-col rounded-2xl border p-6 transition-all hover:shadow-xl ${active ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <div className="flex items-start justify-between mb-6">
                                    <div className={`rounded-xl p-3 transition-transform group-hover:scale-110 
                                        ${module.color === 'blue' ? 'bg-blue-500/10 text-blue-600' : 
                                          module.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600' :
                                          module.color === 'orange' ? 'bg-orange-500/10 text-orange-600' :
                                          'bg-purple-500/10 text-purple-600'}`}>
                                        <module.icon className="h-8 w-8" />
                                    </div>
                                    {active ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            Aktif
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                                            Tersedia
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 mb-2">{module.name}</h3>
                                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                                    {module.description}
                                </p>

                                <div className="space-y-3 mb-8 flex-1">
                                    {module.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                                            {feature}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                                    <div className="text-sm font-semibold text-slate-400">
                                        {module.price}
                                    </div>
                                    {active ? (
                                        <button disabled className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-slate-400 bg-slate-100 cursor-not-allowed">
                                            Terpasang
                                        </button>
                                    ) : (
                                        <a 
                                            href={`https://wa.me/628123456789?text=Halo%20Admin%20Aivola%2C%20saya%20tertarik%20mengaktifkan%20modul%20${module.name}%20untuk%20perusahaan%20saya.`}
                                            target="_blank"
                                            className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
                                        >
                                            Aktifkan Modul
                                            <ArrowRight className="h-4 w-4" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom section */}
                <div className="rounded-2xl bg-amber-50 p-8 border border-amber-100 flex flex-col md:flex-row items-center gap-6">
                    <div className="bg-amber-100 p-4 rounded-full">
                        <Shield className="h-10 w-10 text-amber-600" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h4 className="text-lg font-bold text-amber-900 mb-1">Butuh Modul Custom?</h4>
                        <p className="text-sm text-amber-700 max-w-xl">
                            Aivola Cloud mendukung pengembangan fitur kustom sesuai kebutuhan spesifik alur bisnis Anda. Hubungi tim developer kami untuk konsultasi gratis.
                        </p>
                    </div>
                    <button className="whitespace-nowrap rounded-xl bg-amber-600 px-8 py-3 text-sm font-bold text-white hover:bg-amber-700 transition-all shadow-md">
                        Konsultasi Kustom
                    </button>
                </div>

                <div className="text-center pt-8">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Aivola Mind Premium Pack</h2>
                    <p className="text-slate-500 mt-2">Kecerdasan Buatan untuk keunggulan kompetitif bisnis Anda.</p>
                </div>

                {/* Premium Insights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PREMIUM_INSIGHTS.map((pack) => {
                        const active = purchasedInsights.includes(pack.id);
                        return (
                            <div key={pack.id} className={`group relative flex flex-col rounded-2xl border p-6 transition-all hover:shadow-xl ${active ? 'bg-amber-50/30 border-amber-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <div className="flex items-start justify-between mb-6">
                                    <div className={`rounded-xl p-3 transition-transform group-hover:scale-110 
                                        ${pack.color === 'amber' ? 'bg-amber-500/10 text-amber-600' : 
                                          pack.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-600' :
                                          'bg-red-500/10 text-red-600'}`}>
                                        <pack.icon className="h-8 w-8" />
                                    </div>
                                    {active ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            Unlocked
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                                            Premium
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 mb-2">{pack.name}</h3>
                                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                                    {pack.description}
                                </p>

                                <div className="space-y-3 mb-8 flex-1">
                                    {pack.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                                            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                                            {feature}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                                    <div className="text-sm font-semibold text-slate-400">
                                        {pack.price}
                                    </div>
                                    {active ? (
                                        <button disabled className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-amber-400 bg-amber-50 cursor-not-allowed">
                                            Terpasang
                                        </button>
                                    ) : (
                                        <a 
                                            href={`https://wa.me/628123456789?text=Halo%20Admin%20Aivola%2C%20saya%20tertarik%20mengaktifkan%20insight%20premium%20${pack.name}%20untuk%20Aivola%20Mind.`}
                                            target="_blank"
                                            className="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700 transition-all shadow-lg shadow-amber-900/20 active:scale-95"
                                        >
                                            Beli & Aktifkan
                                            <Zap className="h-4 w-4" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
}

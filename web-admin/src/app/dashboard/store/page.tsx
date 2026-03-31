'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { CheckCircle, ArrowRight, Zap, Shield, BarChart3, Sparkles, TrendingUp, BrainCircuit, Clock, AlertTriangle, RefreshCw, Phone, Users, Box, MessageSquare, Star } from 'lucide-react';

const HR_PACKAGES = {
  main: {
    name: 'Paket HR per Karyawan',
    description: 'Manajemen lengkap karyawan: absensi GPS/wajah, lembur, payroll, cuti, dan lebih banyak lagi.',
    pricingMonthly: 9000,
    pricingYearly: 7000,
    features: [
      'GPS & Face Recognition Attendance',
      'Overtime dengan Approval',
      'Payroll & PPh 21 Otomatis',
      'Multi Cabang',
      'Bonus & THR',
      'Reimbursement',
      'Pinjaman & Cicilan',
      'Kelola Aset',
      'Hari Libur & Pengumuman',
      'Pulse of Company',
    ],
  },
  addons: [
    { id: 'KPI', name: 'KPI & Penilaian Kinerja', icon: '🎯', price: 1500, desc: 'Buat indikator KPI kustom, pantau score, dan evaluasi performa tim.', highlight: false },
    { id: 'LEARNING', name: 'Learning & Development', icon: '📚', price: 2000, desc: 'Buat materi pelatihan, ujian online, dan pantau perkembangan kompetensi.', highlight: false },
    { id: 'KPI_LEARNING', name: 'Bundle KPI + Learning', icon: '🚀', price: 3000, desc: 'Paket lengkap KPI dan Learning Development. Hemat Rp 500 vs terpisah.', highlight: true },
  ],
};

const MODULES_DATA = [
  { id: 'ABSENSI', name: 'Absensi & HRIS Pro', description: 'Kelola kehadiran karyawan, shift, lembur, dan KPI dalam satu sistem.', icon: Users, color: 'blue', features: ['GPS/Biometric Attendance', 'Shift Management', 'KPI & Performance', 'Mobile App'], price: 'Rp 9.000 / karyawan' },
  { id: 'FINANCE', name: 'Finance & Akunting', description: 'Catat transaksi, kelola hutang-piutang, laba rugi, dan otomatisasi penggajian.', icon: BarChart3, color: 'emerald', features: ['Laporan Laba Rugi', 'Gaji Otomatis', 'Buku Kas & Bank', 'Invoice & Piutang'], price: 'Biaya Flat Bulanan' },
  { id: 'INVENTORY', name: 'Inventory & Stok', description: 'Pantau pergerakan stok barang, gudang, dan sinkronisasi dengan penjualan.', icon: Box, color: 'orange', features: ['Multi-Warehouse', 'Stock Adjustment', 'Alert Stok Menipis', 'Barcode Scanning'], price: 'Add-on Operasional' },
  { id: 'CRM', name: 'CRM & AI Chatbot', description: 'Tingkatkan penjualan dengan layanan pelanggan 24/7 menggunakan AI.', icon: MessageSquare, color: 'purple', features: ['AI Sales Assistant', 'Live Chat', 'Customer Analytics', 'Auto-Reply'], price: 'GRATIS / Selamanya' },
];

const PREMIUM_INSIGHTS = [
  { id: 'PREMIUM_PROFIT', name: 'AI: Profit Optimizer', description: 'Analisis korelasi pengeluaran dan pemasukan untuk efisiensi biaya.', icon: TrendingUp, color: 'amber', features: ['Margin Analysis', 'Vendor Price Tracking', 'Opex Optimization'], price: 'Rp 250k / bulan' },
  { id: 'PREMIUM_RETENTION', name: 'AI: Retention Predictor', description: 'Prediksi risiko pengunduran diri karyawan dari pola absensi.', icon: BrainCircuit, color: 'indigo', features: ['Burnout Detection', 'Satisfaction Prediction', 'Churn Alerts'], price: 'Rp 150k / bulan' },
  { id: 'PREMIUM_STOCK', name: 'AI: Smart Stock Forecaster', description: 'Prediksi kapan stok barang habis dari kecepatan penjualan harian.', icon: Zap, color: 'red', features: ['Stock Velocity', 'Restock Alerts', 'Trend Prediction'], price: 'Rp 100k / bulan' },
];

const WA_NUMBER = '6287882716935';

function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function ContractStatusBanner({ contractEnd }: { contractEnd: string | null }) {
  if (!contractEnd) return null;
  const now = new Date();
  const end = new Date(contractEnd);
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 7) return null;

  const isExpired = diffDays <= 0;
  const waMsg = encodeURIComponent('Halo Admin Aivola, saya ingin memperpanjang langganan Aivola HR saya.');
  return (
    <div className={`rounded-2xl p-5 border flex flex-col md:flex-row items-center gap-4 ${isExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className={`rounded-full p-3 ${isExpired ? 'bg-red-100' : 'bg-amber-100'}`}>
        {isExpired ? <AlertTriangle className="h-6 w-6 text-red-600" /> : <Clock className="h-6 w-6 text-amber-600" />}
      </div>
      <div className="flex-1 text-center md:text-left">
        <p className={`font-bold text-lg ${isExpired ? 'text-red-800' : 'text-amber-800'}`}>
          {isExpired ? '⚠️ Langganan Telah Berakhir!' : `⏰ Langganan berakhir dalam ${diffDays} hari`}
        </p>
        <p className={`text-sm mt-0.5 ${isExpired ? 'text-red-600' : 'text-amber-700'}`}>
          {isExpired
            ? 'Perpanjang sekarang untuk memulihkan akses penuh ke semua fitur.'
            : `Segera perpanjang sebelum ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} agar tidak kehilangan akses.`}
        </p>
      </div>
      <a
        href={`https://wa.me/${WA_NUMBER}?text=${waMsg}`}
        target="_blank"
        className={`whitespace-nowrap inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all shadow-md ${isExpired ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
      >
        <RefreshCw className="h-4 w-4" /> Perpanjang Sekarang
      </a>
    </div>
  );
}

export default function StorePage() {
  const [currentModules, setCurrentModules] = useState<string>('BOTH');
  const [purchasedInsights, setPurchasedInsights] = useState<string[]>([]);
  const [contractEnd, setContractEnd] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchCompanyInfo(); }, []);

  const fetchCompanyInfo = async () => {
    try {
      const res = await api.get('/companies/my');
      setCurrentModules(res.data.modules || 'BOTH');
      setPurchasedInsights(res.data.purchasedInsights || []);
      setContractEnd(res.data.contractEnd || null);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const isModuleActive = (id: string) => {
    if (id === 'CRM') return true;
    if (currentModules === 'BOTH') return id === 'ABSENSI' || id === 'FINANCE' || id === 'INVENTORY';
    if (currentModules === 'FINANCE' && id === 'INVENTORY') return true;
    return currentModules === id;
  };

  const pricePerUser = billingCycle === 'monthly' ? HR_PACKAGES.main.pricingMonthly : HR_PACKAGES.main.pricingYearly;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Contract Status Banner (only shows if near/past expiry) */}
        <ContractStatusBanner contractEnd={contractEnd} />

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 text-white shadow-2xl border border-slate-700">
          <div className="relative z-10 max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-4 py-1.5 text-xs font-bold text-blue-400 border border-blue-500/30">
              <Sparkles className="h-4 w-4" /> Aivola Cloud Ecosystem
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Pilih Paket yang Tepat untuk Bisnis Anda.
            </h1>
            <p className="mt-6 text-lg text-slate-400 leading-relaxed">
              Harga transparan per karyawan. Tidak ada biaya tersembunyi. Batalkan kapan saja.
            </p>
          </div>
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-blue-600/20 blur-[100px]" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-purple-600/10 blur-[80px]" />
        </div>

        {/* === PAKET HR === */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="h-6 w-6 text-blue-600" /> Paket HR — Per Karyawan
              </h2>
              <p className="text-slate-500 text-sm mt-1">Bayar sesuai jumlah karyawan aktif Anda.</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-1 self-start">
              <button onClick={() => setBillingCycle('monthly')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>Bulanan</button>
              <button onClick={() => setBillingCycle('yearly')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all relative ${billingCycle === 'yearly' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
                Tahunan
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">HEMAT</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-500/20">
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-extrabold">{formatRupiah(pricePerUser)}</span>
                <span className="text-blue-200 text-sm">/karyawan/bln</span>
              </div>
              {billingCycle === 'yearly' && (
                <div className="inline-flex items-center gap-1 bg-green-400/20 border border-green-400/40 rounded-full px-3 py-1 text-xs font-bold text-green-200 mb-4">
                  <Star className="h-3 w-3" /> Hemat Rp 2.000 vs bulanan
                </div>
              )}
              <p className="text-blue-200 text-sm mb-6">
                {billingCycle === 'yearly' ? 'Tagihan sekali bayar per tahun.' : 'Tagihan tiap bulan. Batalkan kapan saja.'}
              </p>
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Halo Admin Aivola, saya tertarik berlangganan Paket HR ${billingCycle === 'yearly' ? 'Tahunan' : 'Bulanan'} @${formatRupiah(pricePerUser)}/karyawan/bulan.`)}`}
                target="_blank"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white text-blue-700 font-bold py-3 text-sm hover:bg-blue-50 transition-all"
              >
                <Phone className="h-4 w-4" /> Hubungi via WhatsApp
              </a>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Sudah termasuk:</p>
              <div className="space-y-2.5">
                {HR_PACKAGES.main.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-0.5 flex-shrink-0">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* === ADD-ON HR === */}
        <div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Add-On HR</h2>
            <p className="text-slate-500 mt-1 text-sm">Fitur spesialis per karyawan, aktif selama trial.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {HR_PACKAGES.addons.map((addon) => {
              const isActive = purchasedInsights.includes(addon.id) || purchasedInsights.includes('KPI') || purchasedInsights.includes('LEARNING');
              return (
                <div key={addon.id} className={`relative flex flex-col rounded-2xl border p-6 transition-all hover:shadow-xl ${addon.highlight ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700'}`}>
                  {addon.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold uppercase rounded-full px-3 py-1 shadow">Best Value</div>
                  )}
                  <div className="text-3xl mb-4">{addon.icon}</div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">{addon.name}</h3>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed flex-1">{addon.desc}</p>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatRupiah(addon.price)}</span>
                    <span className="text-xs text-slate-400">/karyawan/bln</span>
                  </div>
                  {isActive ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
                      <CheckCircle className="h-4 w-4" /> Aktif dalam Trial
                    </div>
                  ) : (
                    <a
                      href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Halo Admin Aivola, saya tertarik mengaktifkan Add-on ${addon.name} @${formatRupiah(addon.price)}/karyawan.`)}`}
                      target="_blank"
                      className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all ${addon.highlight ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                    >
                      Aktifkan <ArrowRight className="h-4 w-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Konfigurasi Modul */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="h-6 w-6 text-amber-500" /> Konfigurasi Modul Aktif
              </h2>
              <p className="text-slate-500 text-sm mt-1">Sesuaikan modul yang muncul di dashboard Anda.</p>
            </div>
            <button
              onClick={async () => {
                try {
                  setIsLoading(true);
                  await api.patch('/companies/my', { modules: currentModules });
                  toast.success('Konfigurasi berhasil diperbarui!');
                  localStorage.removeItem('activeModule');
                  window.location.reload();
                } catch { toast.error('Gagal memperbarui'); }
                finally { setIsLoading(false); }
              }}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Memproses...' : 'Simpan Konfigurasi'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'ABSENSI', name: 'Absensi & HRIS Saja', desc: 'Modul Finance disembunyikan.', icon: Users, color: 'blue' },
              { id: 'FINANCE', name: 'Finance & Akunting Saja', desc: 'Modul Absensi disembunyikan.', icon: BarChart3, color: 'emerald' },
              { id: 'BOTH', name: 'Keduanya (Full Suite)', desc: 'Integrasi otomatis Absensi, Payroll, Finance.', icon: Sparkles, color: 'indigo' },
            ].map((pkg) => (
              <button key={pkg.id} onClick={() => setCurrentModules(pkg.id)}
                className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all ${currentModules === pkg.id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}
              >
                <div className={`p-2 rounded-lg w-fit mb-4 ${pkg.id === 'ABSENSI' ? 'bg-blue-100 text-blue-600' : pkg.id === 'FINANCE' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  <pkg.icon className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white">{pkg.name}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{pkg.desc}</p>
                {currentModules === pkg.id && (
                  <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase">
                    <CheckCircle className="h-3 w-3" /> Pilihan Saat Ini
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Module Banner */}
        <div className="rounded-2xl bg-amber-50 p-8 border border-amber-100 flex flex-col md:flex-row items-center gap-6">
          <div className="bg-amber-100 p-4 rounded-full">
            <Shield className="h-10 w-10 text-amber-600" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-lg font-bold text-amber-900 mb-1">Butuh Modul Custom?</h4>
            <p className="text-sm text-amber-700 max-w-xl">
              Aivola Cloud mendukung pengembangan fitur kustom. Hubungi tim developer kami untuk konsultasi gratis.
            </p>
          </div>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Halo Admin Aivola, saya ingin konsultasi modul custom.')}`}
            target="_blank"
            className="whitespace-nowrap rounded-xl bg-amber-600 px-8 py-3 text-sm font-bold text-white hover:bg-amber-700 transition-all shadow-md"
          >
            Konsultasi Kustom
          </a>
        </div>

        {/* Aivola Mind Premium */}
        <div className="text-center pt-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Aivola Mind Premium Pack</h2>
          <p className="text-slate-500 mt-2">Kecerdasan Buatan untuk keunggulan kompetitif bisnis Anda.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PREMIUM_INSIGHTS.map((pack) => {
            const active = purchasedInsights.includes(pack.id);
            return (
              <div key={pack.id} className={`group relative flex flex-col rounded-2xl border p-6 transition-all hover:shadow-xl ${active ? 'bg-amber-50/30 border-amber-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-start justify-between mb-6">
                  <div className={`rounded-xl p-3 transition-transform group-hover:scale-110 ${pack.color === 'amber' ? 'bg-amber-500/10 text-amber-600' : pack.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-red-500/10 text-red-600'}`}>
                    <pack.icon className="h-8 w-8" />
                  </div>
                  {active ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                      <CheckCircle className="h-3.5 w-3.5" /> Unlocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">Premium</span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{pack.name}</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">{pack.description}</p>
                <div className="space-y-3 mb-8 flex-1">
                  {pack.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" /> {feature}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <div className="text-sm font-semibold text-slate-400">{pack.price}</div>
                  {active ? (
                    <button disabled className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-amber-400 bg-amber-50 cursor-not-allowed">Terpasang</button>
                  ) : (
                    <a
                      href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Halo Admin Aivola, saya tertarik mengaktifkan ${pack.name}.`)}`}
                      target="_blank"
                      className="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700 transition-all active:scale-95"
                    >
                      Beli & Aktifkan <Zap className="h-4 w-4" />
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

'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle2, Lock, History, AlertCircle, 
  TrendingUp, BarChart3, ArrowRight, Loader2, ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface PeriodClosing {
  id: number;
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  closedAt: string;
}

export default function ClosingPage() {
  const [closings, setClosings] = useState<PeriodClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    { id: 1, name: 'Januari' }, { id: 2, name: 'Februari' }, { id: 3, name: 'Maret' },
    { id: 4, name: 'April' }, { id: 5, name: 'Mei' }, { id: 6, name: 'Juni' },
    { id: 7, name: 'Juli' }, { id: 8, name: 'Agustus' }, { id: 9, name: 'September' },
    { id: 10, name: 'Oktober' }, { id: 11, name: 'November' }, { id: 12, name: 'Desember' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/closing');
      setClosings(res.data);
    } catch (err) {
      toast.error('Gagal memuat riwayat penutupan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClosing = async () => {
    if (!confirm(`Apakah Anda yakin ingin menutup buku untuk periode ${months.find(m => m.id === selectedMonth)?.name} ${selectedYear}? \n\nPenutupan buku ini akan mencatat ringkasan laba rugi untuk periode tersebut.`)) return;

    try {
      setIsClosing(true);
      const res = await api.post('/finance/closing', { month: selectedMonth, year: selectedYear });
      toast.success(res.data.message);
      fetchHistory();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal melakukan penutupan buku');
    } finally {
      setIsClosing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-blue-500" />
              Penutupan Buku <span className="text-blue-500">(Closing)</span>
            </h1>
            <p className="text-slate-500 mt-2">Finalisasi laporan bulanan untuk pencatatan ringkasan kinerja keuangan.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Closing Action Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Tutup Periode Baru</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Pilih Bulan Berjalan</label>
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black text-slate-800"
                  >
                    {months.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Pilih Tahun Berjalan</label>
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black text-slate-800"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
                    <p className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed">
                      <strong>INFO:</strong> Penutupan buku akan menghitung total pemasukan & pengeluaran untuk periode tersebut sebagai arsip laporan.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleClosing}
                  disabled={isClosing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isClosing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  Lakukan Closing Buku
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
              <h3 className="font-bold flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5" />
                Integritas Data
              </h3>
              <p className="text-sm text-blue-100">
                Sistem ini membantu Anda merangkum performa bisnis bulanan untuk mempermudah evaluasi kinerja.
              </p>
            </div>
          </div>

          {/* History Table */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <History className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <h2 className="text-lg font-semibold">Riwayat Penutupan</h2>
                </div>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>Memuat riwayat...</p>
                  </div>
                ) : closings.length === 0 ? (
                  <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-4">
                    <FileSpreadsheet className="h-12 w-12 text-slate-300 dark:text-white/20 mb-2" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-200/60 italic tracking-tight">Belum ada periode yang ditutup.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Periode</th>
                        <th className="px-6 py-4 font-semibold">Total Pemasukan</th>
                        <th className="px-6 py-4 font-semibold">Total Pengeluaran</th>
                        <th className="px-6 py-4 font-semibold text-right">Laba Bersih</th>
                        <th className="px-6 py-4 font-semibold">Tgl Tutup</th>
                        <th className="px-6 py-4 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {closings.map((closing) => (
                        <tr key={closing.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {months.find(m => m.id === closing.month)?.name} {closing.year}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-medium">
                            {formatCurrency(closing.totalIncome)}
                          </td>
                          <td className="px-6 py-4 text-red-600 dark:text-red-400 font-medium">
                            {formatCurrency(closing.totalExpense)}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(closing.netProfit)}
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-sm">
                            {new Date(closing.closedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <ShieldCheck className="h-3 w-3" />
                              RECORDED
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

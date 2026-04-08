'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Wallet, Calculator, CheckCircle, Clock, User, AlertCircle, Download, FileText, Search, Banknote, Plus, X, ChevronRight, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import PaycheckModal from '@/components/payroll/PaycheckModal';

interface PayrollRecord {
    id: number;
    userId: number;
    user: {
        name: string;
        email: string;
    };
    month: number;
    year: number;
    basicSalary: number;
    allowance: number;
    overtimeHours: number;
    overtimePay: number;
    attendanceCount: number;
    lateCount: number;
    deductions: number;
    loanDeduction: number;
    bpjsKesehatanDeduction: number;
    bpjsKetenagakerjaanDeduction: number;
    pph21Deduction: number;
    bpjsCompanyContribution: number;
    sickLeaveDeduction: number;
    reimbursementPay: number;
    bonusPay: number;
    netSalary: number;
    status: 'DRAFT' | 'PAID';
    updatedAt: string;
}

export default function PayrollPage() {
    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [companyInfo, setCompanyInfo] = useState<any>(null);

    // Modal Slip Gaji State
    const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);
    const [isPaycheckOpen, setIsPaycheckOpen] = useState(false);

    // Default ke bulan & tahun saat ini
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

    // SaaS Module State
    const [isFinanceOnly, setIsFinanceOnly] = useState(false);
    const [employees, setEmployees] = useState<{ id: number, name: string }[]>([]);
    const [branches, setBranches] = useState<{ id: number, name: string }[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    
    // Manual Modal State
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualForm, setManualForm] = useState({
        userId: '',
        basicSalary: '',
        allowance: '',
        deductions: '',
        bonusPay: ''
    });

    const fetchInitialData = async () => {
        try {
            const [payrollRes, companyRes, userRes, branchRes] = await Promise.all([
                api.get(`/payroll?month=${selectedMonth}&year=${selectedYear}${selectedBranch !== 'all' ? `&branchId=${selectedBranch}` : ''}`),
                api.get('/companies/my'),
                api.get('/users?limit=1000'), // Ambil daftar karyawan untuk dropdown manual
                api.get('/branches')
            ]);
            
            setPayrolls(payrollRes.data);
            setIsFinanceOnly(companyRes.data.modules === 'FINANCE');
            setCompanyInfo(companyRes.data);
            setEmployees(userRes.data);
            setBranches(branchRes.data);
            setError('');
        } catch (err: any) {
            console.error("Fetch Data Error:", err);
            setError('Gagal memuat data penggajian.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [selectedMonth, selectedYear, selectedBranch]);

    const handleGenerate = async () => {
        if (isFinanceOnly) {
            setIsManualModalOpen(true);
            return;
        }

        if (!confirm(`Hitung ulang gaji untuk Periode ${selectedMonth}/${selectedYear}?`)) return;

        setIsGenerating(true);
        try {
            await api.post('/payroll/generate', { month: selectedMonth, year: selectedYear });
            alert('Kalkulasi Gaji Berhasil!');
            fetchInitialData();
        } catch (err: any) {
            alert('Gagal generate payroll: ' + (err.response?.data?.error || 'Kesalahan Server'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        try {
            await api.post('/payroll/manual', {
                ...manualForm,
                month: selectedMonth,
                year: selectedYear
            });
            alert('Payroll Manual Berhasil Disimpan!');
            setIsManualModalOpen(false);
            setManualForm({ userId: '', basicSalary: '', allowance: '', deductions: '', bonusPay: '' });
            fetchInitialData();
        } catch (err: any) {
            alert('Gagal simpan payroll manual: ' + (err.response?.data?.error || 'Kesalahan Server'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExportExcel = async () => {
        try {
            const response = await api.get('/payroll/export', {
                params: { 
                    month: selectedMonth, 
                    year: selectedYear,
                    branchId: selectedBranch !== 'all' ? selectedBranch : undefined 
                },
                responseType: 'blob',
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Rekap_Payroll_${selectedMonth}_${selectedYear}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Gagal mengekspor payroll excel", error);
            alert("Gagal mengekspor data penggajian ke Excel. Silakan coba lagi.");
        }
    };

    const handlePay = async (id: number) => {
        try {
            await api.patch(`/payroll/${id}`, { status: 'PAID' });
            setPayrolls(prev => prev.map(p => p.id === id ? { ...p, status: 'PAID' } : p));
        } catch (err: any) {
            alert('Gagal memproses pembayaran.');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const handleDownloadPDF = (p: PayrollRecord) => {
        setSelectedPayroll(p);
        setIsPaycheckOpen(true);
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Penggajian (Payroll)</h1>
                    <p className="text-sm text-slate-500">Otomasi kalkulasi gaji berdasarkan kehadiran & keterlambatan.</p>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>Bulan {i + 1}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>

                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="all">Semua Cabang</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari nama atau email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <button
                        onClick={handleExportExcel}
                        disabled={isLoading || payrolls.length === 0}
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-all disabled:opacity-50"
                    >
                        <Download className="h-4 w-4" />
                        Export Excel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        ) : (
                            isFinanceOnly ? <Plus className="h-4 w-4" /> : <Calculator className="h-4 w-4" />
                        )}
                        {isFinanceOnly ? 'Input Gaji Manual' : 'Hitung Gaji'}
                    </button>
                </div>
            </div>

            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Banknote className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-emerald-900">Terintegrasi dengan Keuangan</h3>
                    <p className="text-xs text-emerald-700">Setiap gaji yang Anda tandai sebagai <b>"Bayar"</b> akan otomatis tercatat sebagai Pengeluaran (Expense) di Modul Finance.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Pengeluaran Gaji</p>
                    <p className="text-2xl font-bold text-slate-900">
                        {formatCurrency(payrolls.reduce((acc, curr) => acc + curr.netSalary, 0))}
                    </p>
                    <div className="mt-2 flex items-center text-xs text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Periode terpilih
                    </div>
                </div>
                <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Potongan (Lates)</p>
                    <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(payrolls.reduce((acc, curr) => acc + curr.deductions, 0))}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">Rp 50.000 / keterlambatan</p>
                </div>
                <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status Pembayaran</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-2xl font-bold text-slate-900">
                            {payrolls.filter(p => p.status === 'PAID').length} / {payrolls.length}
                        </span>
                        <span className="text-sm text-slate-500">Tuntas</span>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-red-500">{error}</div>
                ) : payrolls.filter(p =>
                    p.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.user.email.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-500">
                        <Search className="h-12 w-12 text-slate-200 mb-4" />
                        <p className="font-medium text-lg mb-1">Tidak ada hasil ditemukan</p>
                        <p className="text-sm">Tidak ada data payroll yang cocok dengan "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Karyawan</th>
                                    <th className="px-6 py-4">Gaji Pokok</th>
                                    <th className="px-6 py-4">Tambahan<br />(Tunj/Lembur/Klaim/Bonus)</th>
                                    <th className="px-6 py-4">Hadir / Terlambat</th>
                                    <th className="px-6 py-4">Potongan / Pinjaman</th>
                                    <th className="px-6 py-4">Gaji Bersih</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payrolls.filter(p =>
                                    p.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    p.user.email.toLowerCase().includes(searchQuery.toLowerCase())
                                ).map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                                                    {p.user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{p.user.name}</p>
                                                    <p className="text-xs text-slate-400">{p.user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            {formatCurrency(p.basicSalary)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-green-600 font-medium">Tunj: + {formatCurrency(p.allowance)}</span>
                                                {p.overtimeHours > 0 && (
                                                    <span className="text-blue-600 font-medium text-xs">
                                                        Lembur ({p.overtimeHours}j): + {formatCurrency(p.overtimePay)}
                                                    </span>
                                                )}
                                                {p.reimbursementPay > 0 && (
                                                    <span className="text-teal-600 font-medium text-xs">
                                                        Klaim: + {formatCurrency(p.reimbursementPay)}
                                                    </span>
                                                )}
                                                {p.bonusPay > 0 && (
                                                    <span className="text-orange-600 font-medium text-xs font-bold">
                                                        Bonus/THR: + {formatCurrency(p.bonusPay)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-700">{p.attendanceCount} Hari</span>
                                                <span className={`text-xs ${p.lateCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                    {p.lateCount}x Terlambat
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            <div className="flex flex-col gap-1">
                                                {p.deductions > 0 && (
                                                    <span className="text-red-500 font-medium">- {formatCurrency(p.deductions)} (Absen)</span>
                                                )}
                                                {p.loanDeduction > 0 && (
                                                    <span className="text-orange-600 font-medium">- {formatCurrency(p.loanDeduction)} (Pinjaman)</span>
                                                )}
                                                {p.bpjsKesehatanDeduction > 0 && (
                                                    <span className="text-red-500 text-xs">BPJS Kes (1%): - {formatCurrency(p.bpjsKesehatanDeduction)}</span>
                                                )}
                                                {p.bpjsKetenagakerjaanDeduction > 0 && (
                                                    <span className="text-red-500 text-xs">BPJS Ket: - {formatCurrency(p.bpjsKetenagakerjaanDeduction)}</span>
                                                )}
                                                {p.pph21Deduction > 0 && (
                                                    <span className="text-blue-600 font-bold text-xs underline decoration-blue-200">PPh 21: - {formatCurrency(p.pph21Deduction)}</span>
                                                )}
                                                {p.loanDeduction === 0 && p.deductions === 0 && p.pph21Deduction === 0 && (
                                                    <span className="text-slate-400">Rp 0</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-emerald-600 bg-emerald-50/30">
                                            {formatCurrency(p.netSalary)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${p.status === 'PAID' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                                                }`}>
                                                {p.status === 'PAID' ? 'Tuntas' : 'Draft'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => { setSelectedPayroll(p); setIsPaycheckOpen(true); }}
                                                    className="p-1 px-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Cetak Slip PDF"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </button>
                                                 {p.status === 'DRAFT' ? (
                                                     <button
                                                         onClick={() => handlePay(p.id)}
                                                         className="inline-flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded transition-all shadow-sm"
                                                     >
                                                         Bayar
                                                     </button>
                                                 ) : (
                                                     <span className="text-xs text-slate-400 font-medium">Selesai</span>
                                                 )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="text-xs text-blue-800 leading-relaxed">
                    <p className="font-bold mb-1">Catatan Penting (Gaji Proporsional):</p>
                    <ul className="list-disc ml-4 space-y-1">
                        <li><strong>Hari Kerja Aktif</strong> = Total hari Senin-Jumat dikurangi <strong>Hari Libur Nasional</strong>.</li>
                        <li><strong>Gaji Harian</strong> = (Gaji Pokok + Tunjangan) dibagi Hari Kerja Aktif.</li>
                        <li><strong>Gaji Terkumpul</strong> = (Gaji Harian × (Kehadiran + Cuti Disetujui)) + <strong>Lembur</strong> + <strong>Reimbursement</strong>.</li>
                        <li><strong>Uang Lembur</strong> = Total jam lembur disetujui × Tarif Lembur/Jam.</li>
                        <li><strong>Gaji Bersih</strong> = Gaji Terkumpul - (Potongan Terlambat + Pinjaman + BPJS).</li>
                        <li>Karyawan yang <strong>Alpha</strong> (tidak masuk tanpa cuti) otomatis memotong target hari kerja.</li>
                    </ul>
                </div>
            </div>
            {/* Paycheck Modal Standar Baru */}
            <PaycheckModal 
                isOpen={isPaycheckOpen}
                onClose={() => setIsPaycheckOpen(false)}
                payroll={selectedPayroll}
                company={companyInfo}
            />

            {/* MODAL INPUT MANUAL (Khusus Finance-Only) */}
            {isManualModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Input Gaji Manual</h2>
                                <p className="text-xs text-slate-500">Periode {selectedMonth} / {selectedYear}</p>
                            </div>
                            <button onClick={() => setIsManualModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pilih Karyawan</label>
                                <select 
                                    required
                                    value={manualForm.userId}
                                    onChange={(e) => setManualForm({...manualForm, userId: e.target.value})}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                >
                                    <option value="">-- Pilih --</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Gaji Pokok</label>
                                    <input 
                                        type="number"
                                        required
                                        value={manualForm.basicSalary}
                                        onChange={(e) => setManualForm({...manualForm, basicSalary: e.target.value})}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tunjangan</label>
                                    <input 
                                        type="number"
                                        value={manualForm.allowance}
                                        onChange={(e) => setManualForm({...manualForm, allowance: e.target.value})}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Bonus / THR</label>
                                    <input 
                                        type="number"
                                        value={manualForm.bonusPay}
                                        onChange={(e) => setManualForm({...manualForm, bonusPay: e.target.value})}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Total Potongan</label>
                                    <input 
                                        type="number"
                                        value={manualForm.deductions}
                                        onChange={(e) => setManualForm({...manualForm, deductions: e.target.value})}
                                        className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsManualModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isGenerating}
                                    className="flex-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isGenerating ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Simpan Payroll'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

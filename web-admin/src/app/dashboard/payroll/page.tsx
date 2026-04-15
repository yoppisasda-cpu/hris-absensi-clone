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
    mealAllowance: number;
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
        mealAllowance: '',
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
            setManualForm({ userId: '', basicSalary: '', allowance: '', mealAllowance: '', deductions: '', bonusPay: '' });
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
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Penggajian (Payroll)</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 italic">Otomasi kalkulasi gaji berdasarkan kehadiran & keterlambatan.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="rounded-xl border border-slate-700 bg-slate-950 text-indigo-400 font-black italic uppercase text-xs px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>Bulan {i + 1}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="rounded-xl border border-slate-700 bg-slate-950 text-indigo-400 font-black italic uppercase text-xs px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                    >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>

                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="rounded-xl border border-slate-700 bg-slate-950 text-white font-bold text-xs px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                    >
                        <option value="all">Semua Cabang</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cari nama atau email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-500"
                        />
                    </div>
                    <button
                        onClick={handleExportExcel}
                        disabled={isLoading || payrolls.length === 0}
                        className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-black italic uppercase tracking-widest text-white hover:bg-slate-700 transition-all disabled:opacity-50 border border-white/5"
                    >
                        <Download className="h-4 w-4 text-emerald-400" />
                        Export
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-black italic uppercase tracking-widest text-white hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20 border border-indigo-500/20"
                    >
                        {isGenerating ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        ) : (
                            isFinanceOnly ? <Plus className="h-4 w-4" /> : <Calculator className="h-4 w-4" />
                        )}
                        {isFinanceOnly ? 'Manual Entry' : 'Hitung Gaji'}
                    </button>
                </div>
            </div>

            <div className="mb-8 p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-[28px] flex items-center gap-4 shadow-[0_0_30px_rgba(16,185,129,0.02)]">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                    <Banknote className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-xs font-black italic uppercase tracking-widest text-emerald-100">Konektivitas Finance Aktif</h3>
                    <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest leading-relaxed mt-1">Status <b>"Bayar"</b> akan otomatis memicu jurnal pengeluaran (Expense) pada sistem akuntansi perusahaan.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-8 bg-slate-900/50 rounded-[32px] border border-slate-700 shadow-2xl backdrop-blur-xl group hover:border-indigo-500/30 transition-all">
                    <p className="text-[10px] font-black italic text-slate-500 uppercase tracking-[0.2em] mb-3">Total Disbursement</p>
                    <p className="text-3xl font-black italic tracking-tighter text-white group-hover:text-indigo-400 transition-colors">
                        {formatCurrency(payrolls.reduce((acc, curr) => acc + curr.netSalary, 0))}
                    </p>
                    <div className="mt-4 flex items-center text-[9px] font-black uppercase tracking-widest text-emerald-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Periode Dinamis Berjalan
                    </div>
                </div>
                <div className="p-8 bg-slate-900/50 rounded-[32px] border border-slate-700 shadow-2xl backdrop-blur-xl group hover:border-red-500/30 transition-all">
                    <p className="text-[10px] font-black italic text-slate-500 uppercase tracking-[0.2em] mb-3">Total Penalty Deductions</p>
                    <p className="text-3xl font-black italic tracking-tighter text-red-500">
                        {formatCurrency(payrolls.reduce((acc, curr) => acc + curr.deductions, 0))}
                    </p>
                    <p className="mt-4 text-[9px] font-black uppercase tracking-widest text-slate-600 italic">Rate: Rp 50.000 / Keterlambatan</p>
                </div>
                <div className="p-8 bg-slate-900/50 rounded-[32px] border border-slate-700 shadow-2xl backdrop-blur-xl group hover:border-emerald-500/30 transition-all">
                    <p className="text-[10px] font-black italic text-slate-500 uppercase tracking-[0.2em] mb-3">Payment Fulfilment</p>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-3xl font-black italic tracking-tighter text-white">
                            {payrolls.filter(p => p.status === 'PAID').length} <span className="text-slate-700 text-xl">/</span> {payrolls.length}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 italic">Status Tuntas</span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/50 rounded-[32px] border border-slate-700 shadow-2xl overflow-hidden backdrop-blur-xl">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-red-400 font-black italic uppercase tracking-widest">{error}</div>
                ) : payrolls.filter(p =>
                    p.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.user.email.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-500">
                        <Search className="h-12 w-12 text-slate-800 mb-4" />
                        <p className="text-xl font-black italic tracking-tighter text-slate-300 uppercase mb-1">Tidak ada hasil ditemukan</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Tidak ada data payroll yang cocok dengan "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#050505] border-b border-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-[0.2em]">
                                <tr>
                                    <th className="px-6 py-5 italic">Karyawan</th>
                                    <th className="px-6 py-5 italic">Gaji Pokok</th>
                                    <th className="px-6 py-5 italic">Tambahan</th>
                                    <th className="px-6 py-5 italic">Kehadiran</th>
                                    <th className="px-6 py-5 italic">Total Potongan</th>
                                    <th className="px-6 py-5 italic">Take-Home Pay</th>
                                    <th className="px-6 py-5 italic text-center">Status</th>
                                    <th className="px-6 py-5 text-right italic">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 transition-all">
                                {payrolls.filter(p =>
                                    p.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    p.user.email.toLowerCase().includes(searchQuery.toLowerCase())
                                ).map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform font-black italic">
                                                    {p.user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black italic text-white uppercase tracking-tighter">{p.user.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-none mt-1">{p.user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 font-black italic text-slate-100 uppercase tracking-tighter">
                                            {formatCurrency(p.basicSalary)}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-emerald-400 font-black italic text-[10px] uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/10 w-fit">+ {formatCurrency(p.allowance)}</span>
                                                {(p.mealAllowance > 0 || p.overtimePay > 0 || p.reimbursementPay > 0 || p.bonusPay > 0) && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {p.mealAllowance > 0 && <span className="text-orange-400/80 font-bold text-[9px] uppercase tracking-tighter">Makan+</span>}
                                                        {p.overtimePay > 0 && <span className="text-indigo-400/80 font-bold text-[9px] uppercase tracking-tighter">Lembur+</span>}
                                                        {p.reimbursementPay > 0 && <span className="text-teal-400/80 font-bold text-[9px] uppercase tracking-tighter">Klaim+</span>}
                                                        {p.bonusPay > 0 && <span className="text-orange-500 font-black text-[9px] uppercase tracking-tighter">Bonus+</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-white font-black italic text-xs uppercase tracking-tight">{p.attendanceCount} HARI</span>
                                                <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${p.lateCount > 0 ? 'text-red-500' : 'text-slate-600'}`}>
                                                    {p.lateCount}x TERLAMBAT
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                {(p.deductions > 0 || p.loanDeduction > 0 || p.bpjsKesehatanDeduction > 0 || p.bpjsKetenagakerjaanDeduction > 0 || p.pph21Deduction > 0) ? (
                                                    <>
                                                        {p.deductions > 0 && <span className="text-red-400/80 font-bold text-[9px] uppercase tracking-tighter">Absen: -{p.deductions}</span>}
                                                        {p.loanDeduction > 0 && <span className="text-orange-400/80 font-bold text-[9px] uppercase tracking-tighter">Loan: -{p.loanDeduction}</span>}
                                                        {(p.bpjsKesehatanDeduction > 0 || p.bpjsKetenagakerjaanDeduction > 0) && <span className="text-indigo-400/80 font-bold text-[9px] uppercase tracking-tighter">BPJS Active</span>}
                                                        {p.pph21Deduction > 0 && <span className="text-white/50 font-bold text-[9px] uppercase tracking-tighter">Tax Incl.</span>}
                                                    </>
                                                ) : (
                                                    <span className="text-slate-700 text-[10px] font-black italic uppercase tracking-widest italic">Bersih</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 font-black italic text-emerald-400 text-base uppercase tracking-tighter bg-emerald-500/[0.02]">
                                            {formatCurrency(p.netSalary)}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black italic uppercase tracking-[0.15em] border ${p.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                                                {p.status === 'PAID' ? 'Tuntas' : 'Draft'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => { setSelectedPayroll(p); setIsPaycheckOpen(true); }}
                                                    className="p-2 text-indigo-400 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-white/5"
                                                    title="Cetak Slip PDF"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </button>
                                                 {p.status === 'DRAFT' ? (
                                                     <button
                                                         onClick={() => handlePay(p.id)}
                                                         className="px-4 py-2 text-[10px] font-black italic uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-500/20 border border-indigo-500/20 active:scale-95"
                                                     >
                                                         Bayar
                                                     </button>
                                                 ) : (
                                                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 italic">Selesai</span>
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

            <div className="mt-8 flex items-start gap-4 p-6 bg-slate-900/50 rounded-[32px] border border-white/5 backdrop-blur-xl">
                <AlertCircle className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-1" />
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                    <p className="text-white mb-2 italic tracking-[0.2em]">Logika Kalkulasi Pro-rata :</p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 italic">
                        <li><span className="text-slate-400">•</span> Hari Aktif = Total Hari Kerja - Libur Nasional</li>
                        <li><span className="text-slate-400">•</span> Gaji Harian = (GP + Tunj) / Hari Aktif</li>
                        <li><span className="text-slate-400">•</span> Net Pay = (Harian × Kehadiran) + Lembur - Potongan</li>
                        <li><span className="text-slate-400">•</span> Alpha/Unpaid Leave memotong target hari kerja</li>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-xl animate-in fade-in duration-200">
                    <div className="bg-slate-900 rounded-[32px] border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-slate-950/50">
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 italic">Input Gaji Manual</h2>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Periode {selectedMonth} / {selectedYear}</p>
                            </div>
                            <button onClick={() => setIsManualModalOpen(false)} className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleManualSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Daftar Karyawan</label>
                                <select 
                                    required
                                    value={manualForm.userId}
                                    onChange={(e) => setManualForm({...manualForm, userId: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                >
                                    <option value="">-- Pilih --</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Gaji Pokok</label>
                                    <input 
                                        type="number"
                                        required
                                        value={manualForm.basicSalary}
                                        onChange={(e) => setManualForm({...manualForm, basicSalary: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Tunjangan</label>
                                    <input 
                                        type="number"
                                        value={manualForm.allowance}
                                        onChange={(e) => setManualForm({...manualForm, allowance: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Uang Makan</label>
                                    <input 
                                        type="number"
                                        value={manualForm.mealAllowance}
                                        onChange={(e) => setManualForm({...manualForm, mealAllowance: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Bonus / THR</label>
                                    <input 
                                        type="number"
                                        value={manualForm.bonusPay}
                                        onChange={(e) => setManualForm({...manualForm, bonusPay: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Total Potongan (Absen/Pinjaman)</label>
                                    <input 
                                        type="number"
                                        value={manualForm.deductions}
                                        onChange={(e) => setManualForm({...manualForm, deductions: e.target.value})}
                                        className="w-full bg-slate-950 border border-red-500/30 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-red-500 outline-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="pt-8 flex gap-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setIsManualModalOpen(false)}
                                    className="flex-1 px-6 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all shadow-[0_0_20px_rgba(0,0,0,0.2)]"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isGenerating}
                                    className="flex-1 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 border border-indigo-500/20 disabled:opacity-50 active:scale-95"
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

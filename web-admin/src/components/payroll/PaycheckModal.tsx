'use client';

import { X, Printer, Banknote, User, Calendar, Clock, MapPin, CheckCircle, Scale, Calculator, AlertCircle, Phone, Package } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface PaycheckModalProps {
    isOpen: boolean;
    onClose: () => void;
    payroll: any;
    company: any;
}

export default function PaycheckModal({ isOpen, onClose, payroll, company }: PaycheckModalProps) {
    if (!isOpen || !payroll) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const handlePrint = () => {
        window.print();
    };

    const monthNames = [
        "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static print:inset-auto">
            <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:rounded-none">
                
                {/* Modal Header - Hidden on Print */}
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0 print:hidden">
                    <div className="flex items-center gap-3">
                        <Banknote className="h-5 w-5 text-emerald-400" />
                        <h2 className="text-lg font-black uppercase tracking-tight italic">Detail Slip Gaji</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                        >
                            <Printer className="h-4 w-4" /> Cetak / PDF
                        </button>
                        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto p-8 md:p-12 printable-content relative print:overflow-visible print:p-0">
                    {/* Watermark Branding */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-30deg] pointer-events-none hidden print:block">
                        <h1 className="text-[120px] font-black tracking-tighter uppercase whitespace-nowrap">AIVOLA HRIS</h1>
                    </div>

                    <div className="flex flex-col gap-10">
                        
                        {/* Company & Header */}
                        <div className="flex justify-between items-start gap-8 border-b-2 border-slate-900 pb-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    {company?.logoUrl ? (
                                        <img src={company.logoUrl} alt="Logo" className="h-14 w-auto" />
                                    ) : (
                                        <div className="h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center">
                                            <Package className="h-10 w-10 text-emerald-500" />
                                        </div>
                                    )}
                                    <div>
                                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{company?.name || 'AIVOLA TECHNOLOGY'}</h1>
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Official Salary Statement</p>
                                    </div>
                                </div>
                                <div className="space-y-1 text-xs font-bold text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-3 w-3" /> {company?.address || 'Jl. Utama No. 88, Central Business District'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-3 w-3" /> {company?.picPhone || '(021) 555-0123'}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl shadow-slate-100 rotate-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Periode Gaji</p>
                                    <h3 className="text-xl font-black italic">{monthNames[payroll.month]} {payroll.year}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Employee & Record Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 print:bg-white print:border-slate-900 print:rounded-none">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Informasi Karyawan</p>
                                    <h4 className="text-xl font-black text-slate-900 italic">{payroll.user.name}</h4>
                                    <p className="text-sm font-bold text-slate-500">{payroll.user.email}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${payroll.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        Status {payroll.status === 'PAID' ? 'LUNAS (PAID)' : 'MENUNGGU (PENDING)'}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 italic">Disusun: {new Date(payroll.updatedAt).toLocaleDateString('id-ID')}</p>
                                </div>
                            </div>
                            <div className="space-y-3 flex flex-col justify-end text-right border-l border-slate-200 pl-8 hidden md:flex">
                                <div className="flex items-center gap-2 justify-end text-slate-500 font-bold mb-2">
                                    <Clock className="h-3 w-3" />
                                    <span className="text-[10px] uppercase">Rincian Kehadiran</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Total Hadir:</span>
                                    <span className="font-black text-slate-900">{payroll.attendanceCount} Hari</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Terlambat:</span>
                                    <span className="font-black text-red-500">{payroll.lateCount} Kali</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Lembur:</span>
                                    <span className="font-black text-blue-600 font-mono tracking-tighter">{payroll.overtimeHours} Jam</span>
                                </div>
                            </div>
                        </div>

                        {/* Earnings vs Deductions Table */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-2 border-slate-900 rounded-3xl overflow-hidden print:rounded-none">
                            {/* Pendapatan (Earnings) */}
                            <div className="flex flex-col">
                                <div className="bg-slate-900 p-4">
                                    <h5 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <Calculator className="h-3 w-3 text-emerald-400" /> I. Pendapatan (Earnings)
                                    </h5>
                                </div>
                                <div className="p-6 space-y-4 flex-1 divide-y divide-slate-100">
                                    <div className="flex justify-between items-center text-sm group">
                                        <span className="font-bold text-slate-500 italic">Gaji Pokok (Basic)</span>
                                        <span className="font-black text-slate-900">{formatCurrency(payroll.basicSalary)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm pt-4">
                                        <span className="font-bold text-slate-500 italic">Tunjangan Operasional</span>
                                        <span className="font-black text-emerald-600">+ {formatCurrency(payroll.allowance)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm pt-4">
                                        <span className="font-bold text-slate-500 italic">Upah Lembur ({payroll.overtimeHours}j)</span>
                                        <span className="font-black text-blue-600">+ {formatCurrency(payroll.overtimePay)}</span>
                                    </div>
                                    {payroll.mealAllowance > 0 && (
                                        <div className="flex justify-between items-center text-sm pt-4">
                                            <span className="font-bold text-slate-500 italic">Uang Makan</span>
                                            <span className="font-black text-orange-600">+ {formatCurrency(payroll.mealAllowance)}</span>
                                        </div>
                                    )}
                                    {payroll.reimbursementPay > 0 && (
                                        <div className="flex justify-between items-center text-sm pt-4">
                                            <span className="font-bold text-slate-500 italic">Klaim Reimbursement</span>
                                            <span className="font-black text-teal-600">+ {formatCurrency(payroll.reimbursementPay)}</span>
                                        </div>
                                    )}
                                    {payroll.bonusPay > 0 && (
                                        <div className="flex justify-between items-center text-sm pt-4">
                                            <span className="font-bold text-slate-900 italic font-black">Bonus / THR</span>
                                            <span className="font-black text-orange-600">+ {formatCurrency(payroll.bonusPay)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Potongan (Deductions) */}
                            <div className="flex flex-col border-l-2 border-slate-900 md:border-l-2">
                                <div className="bg-slate-900 p-4">
                                    <h5 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <AlertCircle className="h-3 w-3 text-red-400" /> II. Potongan (Deductions)
                                    </h5>
                                </div>
                                <div className="p-6 space-y-4 flex-1 bg-red-50/20 divide-y divide-red-100 print:bg-white">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-red-500/70 italic">Keterlambatan ({payroll.lateCount}x)</span>
                                        <span className="font-black text-red-600">- {formatCurrency(payroll.deductions)}</span>
                                    </div>
                                    {payroll.loanDeduction > 0 && (
                                        <div className="flex justify-between items-center text-sm pt-4">
                                            <span className="font-bold text-red-500/70 italic">Cicilan Kasbon</span>
                                            <span className="font-black text-red-600">- {formatCurrency(payroll.loanDeduction)}</span>
                                        </div>
                                    )}
                                    {payroll.bpjsKesehatanDeduction > 0 && (
                                        <div className="flex justify-between items-center text-sm pt-4">
                                            <span className="font-bold text-red-500/70 italic">BPJS Kesehatan (1%)</span>
                                            <span className="font-black text-red-600">- {formatCurrency(payroll.bpjsKesehatanDeduction)}</span>
                                        </div>
                                    )}
                                    {payroll.bpjsKetenagakerjaanDeduction > 0 && (
                                        <div className="flex justify-between items-center text-sm pt-4">
                                            <span className="font-bold text-red-500/70 italic">BPJS Ketenagakerjaan</span>
                                            <span className="font-black text-red-600">- {formatCurrency(payroll.bpjsKetenagakerjaanDeduction)}</span>
                                        </div>
                                    )}
                                    {payroll.pph21Deduction > 0 && (
                                        <div className="flex justify-between items-center text-sm pt-4">
                                            <span className="font-bold text-blue-900 italic font-black">PPh 21 (Pajak)</span>
                                            <span className="font-black text-blue-800 underline decoration-blue-200">- {formatCurrency(payroll.pph21Deduction)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* TOTAL (Take Home Pay) */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-1 bg-slate-900 rounded-[2.5rem] print:rounded-none">
                            <div className="px-10 py-5 text-white flex items-center gap-4">
                                <Scale className="h-8 w-8 text-emerald-400 rotate-12" />
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-60">Take Home Pay</p>
                                    <h3 className="text-3xl font-black italic drop-shadow-lg tracking-tighter">TOTAL DITERIMA</h3>
                                </div>
                            </div>
                            <div className="bg-white m-1 px-10 py-5 rounded-[2rem] border-4 border-slate-900 print:border-none">
                                <h2 className="text-4xl font-black italic text-slate-900 tracking-tighter">
                                    {formatCurrency(payroll.netSalary)}
                                </h2>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="flex justify-between items-end pt-12">
                            <div className="text-[10px] font-bold text-slate-400 italic">
                                <p>© 2026 {company?.name || 'Aivola Merchant'}</p>
                                <p>HRIS Core Intelligence System</p>
                                <p className="mt-1">Dicetak: {new Date().toLocaleString('id-ID')}</p>
                            </div>
                            <div className="flex gap-20">
                                <div className="text-center w-40">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-16 tracking-widest">Penerima,</p>
                                    <div className="h-[1.5px] bg-slate-900 w-full mb-1"></div>
                                    <p className="text-[11px] font-black italic text-slate-900">{payroll.user.name}</p>
                                </div>
                                <div className="text-center w-40">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-16 tracking-widest">Manager HRD,</p>
                                    <div className="h-[1.5px] bg-slate-900 w-full mb-1"></div>
                                    <p className="text-[11px] font-black italic text-slate-900">Authorized Signature</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Modal Footer (Hidden on Print) */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end print:hidden">
                    <button
                        onClick={onClose}
                        className="px-10 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black uppercase italic shadow-2xl hover:bg-slate-800 transition-all active:scale-95"
                    >
                        Tutup Slip
                    </button>
                </div>
            </div>
        </div>
    );
}

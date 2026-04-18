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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl print:hidden" onClick={onClose} />
            <div className="glass w-full max-w-4xl max-h-[95vh] rounded-[3rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col print:max-h-none print:shadow-none print:rounded-none print:border-none print:bg-white">
                
                {/* Modal Header - Hidden on Print */}
                <div className="bg-slate-950/50 border-b border-indigo-500/20 px-10 py-8 flex items-center justify-between shrink-0 print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                            <Banknote className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Salary Artifact</h2>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Official Earnings & Deduction Statement</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest italic transition-all border border-white/10 shadow-lg shadow-emerald-900/20"
                        >
                            <Printer className="h-4 w-4" /> Hard Copy / PDF
                        </button>
                        <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto p-12 printable-content relative print:overflow-visible print:p-0 bg-slate-950/20 print:bg-white">
                    {/* Watermark Branding */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] print:opacity-[0.03] rotate-[-30deg] pointer-events-none">
                        <h1 className="text-[120px] font-black tracking-tighter uppercase whitespace-nowrap text-white print:text-black">AIVOLA HRIS</h1>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-950/50 rounded-[2.5rem] border border-white/5 print:bg-white print:border-slate-900 print:rounded-none shadow-inner relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                                <User className="h-32 w-32 text-indigo-500" />
                            </div>
                            <div className="space-y-4 relative z-10">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 italic">Personnel Identity</p>
                                    <h4 className="text-2xl font-black text-white italic tracking-tight">{payroll.user.name}</h4>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">{payroll.user.email}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic border ${payroll.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                        Status: {payroll.status}
                                    </div>
                                    <p className="text-[9px] font-black text-slate-600 italic uppercase tracking-widest">Commit: {new Date(payroll.updatedAt).toLocaleDateString('id-ID')}</p>
                                </div>
                            </div>
                            <div className="space-y-4 flex flex-col justify-end text-right border-l border-white/5 pl-10 hidden md:flex relative z-10 print:border-slate-300">
                                <div className="flex items-center gap-3 justify-end text-slate-500 font-black italic mb-2">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span className="text-[10px] uppercase tracking-widest">Attendance Matrix</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-500 italic">Total Presence:</span>
                                    <span className="text-white print:text-black">{payroll.attendanceCount} UNITS</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-500 italic">Latent Variance:</span>
                                    <span className="text-rose-500">{payroll.lateCount} DELTA</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-500 italic">Overtime Yield:</span>
                                    <span className="text-blue-500 font-mono italic">{payroll.overtimeHours} HRS</span>
                                </div>
                            </div>
                        </div>

                        {/* Earnings vs Deductions Table */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-white/10 rounded-[2.5rem] overflow-hidden print:rounded-none print:border-slate-900 shadow-2xl">
                            {/* Pendapatan (Earnings) */}
                            <div className="flex flex-col bg-slate-900/50 print:bg-white">
                                <div className="bg-slate-950 p-6 border-b border-white/5 print:bg-slate-100 print:border-slate-900">
                                    <h5 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 italic print:text-black">
                                        <Calculator className="h-4 w-4 text-emerald-400" /> I. Earnings Accumulation
                                    </h5>
                                </div>
                                <div className="p-8 space-y-5 flex-1 divide-y divide-white/5 print:divide-slate-200">
                                    <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest group">
                                        <span className="text-slate-500 italic">Basic Allocation</span>
                                        <span className="text-white print:text-black">{formatCurrency(payroll.basicSalary)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest pt-5">
                                        <span className="text-slate-500 italic">Operational Subsidy</span>
                                        <span className="text-emerald-500">+ {formatCurrency(payroll.allowance)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest pt-5">
                                        <span className="text-slate-500 italic">Overtime Premium ({payroll.overtimeHours}H)</span>
                                        <span className="text-blue-500">+ {formatCurrency(payroll.overtimePay)}</span>
                                    </div>
                                    {payroll.mealAllowance > 0 && (
                                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest pt-5">
                                            <span className="text-slate-500 italic">Nutritional Subsidy</span>
                                            <span className="text-orange-500">+ {formatCurrency(payroll.mealAllowance)}</span>
                                        </div>
                                    )}
                                    {payroll.reimbursementPay > 0 && (
                                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest pt-5">
                                            <span className="text-slate-500 italic">Capital Reimbursement</span>
                                            <span className="text-teal-500">+ {formatCurrency(payroll.reimbursementPay)}</span>
                                        </div>
                                    )}
                                    {payroll.bonusPay > 0 && (
                                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest pt-5">
                                            <span className="text-white italic print:text-black">Bonus / Dividends</span>
                                            <span className="text-orange-500">+ {formatCurrency(payroll.bonusPay)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Potongan (Deductions) */}
                            <div className="flex flex-col border-l border-white/10 md:border-l print:border-slate-900 bg-slate-950/30 print:bg-white">
                                <div className="bg-slate-950 p-6 border-b border-white/5 print:bg-slate-100 print:border-slate-900">
                                    <h5 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 italic print:text-black">
                                        <AlertCircle className="h-4 w-4 text-rose-500" /> II. Liability Deductions
                                    </h5>
                                </div>
                                <div className="p-8 space-y-5 flex-1 divide-y divide-white/5 print:divide-slate-200">
                                    <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                                        <span className="text-rose-500/60 italic">Latency Adjust ({payroll.lateCount}x)</span>
                                        <span className="text-rose-500">- {formatCurrency(payroll.deductions)}</span>
                                    </div>
                                    {payroll.loanDeduction > 0 && (
                                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest pt-5">
                                            <span className="text-rose-500/60 italic">Capital Amortization</span>
                                            <span className="text-rose-500">- {formatCurrency(payroll.loanDeduction)}</span>
                                        </div>
                                    )}
                                    {payroll.bpjsKesehatanDeduction > 0 && (
                                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest pt-5">
                                            <span className="text-rose-500/60 italic">Medical Insurance (1%)</span>
                                            <span className="text-rose-500">- {formatCurrency(payroll.bpjsKesehatanDeduction)}</span>
                                        </div>
                                    )}
                                    {payroll.bpjsKetenagakerjaanDeduction > 0 && (
                                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest pt-5">
                                            <span className="text-rose-500/60 italic">Social Security Matrix</span>
                                            <span className="text-rose-500">- {formatCurrency(payroll.bpjsKetenagakerjaanDeduction)}</span>
                                        </div>
                                    )}
                                    {payroll.pph21Deduction > 0 && (
                                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest pt-5">
                                            <span className="text-blue-400 italic font-black">Fiscal Taxation (PPh 21)</span>
                                            <span className="text-blue-500 underline decoration-blue-500/30">- {formatCurrency(payroll.pph21Deduction)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* TOTAL (Take Home Pay) */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 p-2 bg-white/5 border border-white/10 rounded-[3rem] print:rounded-none print:bg-white print:border-slate-950 print:p-8 shadow-2xl relative overflow-hidden group/total">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover/total:opacity-100 transition-opacity print:hidden" />
                            <div className="px-10 py-6 text-white flex items-center gap-6 relative z-10 print:text-black">
                                <div className="h-16 w-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 print:hidden">
                                    <Scale className="h-8 w-8 rotate-12" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 italic mb-2">Net Portfolio Liquidity</p>
                                    <h3 className="text-4xl font-black italic tracking-tighter text-glow-sm">TAKE HOME PAY</h3>
                                </div>
                            </div>
                            <div className="bg-white/5 m-1 px-12 py-8 rounded-[2.5rem] border border-white/10 print:bg-white print:border-none relative z-10 backdrop-blur-3xl group-hover/total:scale-105 transition-transform">
                                <h2 className="text-5xl font-black italic text-white print:text-black tracking-tighter text-glow-md">
                                    {formatCurrency(payroll.netSalary)}
                                </h2>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="flex justify-between items-end pt-12 relative z-10">
                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic leading-relaxed print:text-slate-400">
                                <p>© 2026 {company?.name?.toUpperCase() || 'AIVOLA TECHNOLOGY HUB'}</p>
                                <p>Core Integrity Protocol / Secured Artifact</p>
                                <p className="mt-2 text-indigo-500/50 print:text-black">Checksum: {monthNames[payroll.month].toUpperCase()}-{payroll.year}-{payroll.id.toString().padStart(6, '0')}</p>
                            </div>
                            <div className="flex gap-24">
                                <div className="text-center w-48 group/sign">
                                    <p className="text-[9px] font-black uppercase text-slate-600 mb-16 tracking-[0.3em] italic group-hover/sign:text-white transition-colors">Recipient Node,</p>
                                    <div className="h-[2px] bg-slate-800 w-full mb-2 print:bg-black rounded-full" />
                                    <p className="text-[11px] font-black italic text-white print:text-black uppercase tracking-widest">{payroll.user.name}</p>
                                </div>
                                <div className="text-center w-48 group/sign">
                                    <p className="text-[9px] font-black uppercase text-slate-600 mb-16 tracking-[0.3em] italic group-hover/sign:text-white transition-colors">Authorized Proxy,</p>
                                    <div className="h-[2px] bg-slate-800 w-full mb-2 print:bg-black rounded-full" />
                                    <p className="text-[11px] font-black italic text-white print:text-black uppercase tracking-widest">HRM DIVISION</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Modal Footer (Hidden on Print) */}
                <div className="p-10 bg-slate-950/50 border-t border-white/5 flex justify-end shrink-0 print:hidden">
                    <button
                        onClick={onClose}
                        className="px-12 py-5 rounded-[1.5rem] bg-white text-slate-950 text-[10px] font-black uppercase italic tracking-[0.3em] shadow-2xl hover:bg-slate-200 transition-all active:scale-95"
                    >
                        De-link Statement
                    </button>
                </div>
            </div>
        </div>
            </div>
        </div>
    );
}

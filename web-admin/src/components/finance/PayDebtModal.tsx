'use client';

import { useState, useEffect } from "react";
import { X, CheckCircle2, Wallet, Tag, ArrowUpRight, ArrowDownRight, Layers, Sparkles } from "lucide-react";

interface PayDebtModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (accountId: string, paymentAmount?: number, paymentDate?: string, categoryId?: string, depositDeduction?: number) => void;
    accounts: any[];
    categories?: any[];
    expense: any;
    loading: boolean;
}

export default function PayDebtModal({ isOpen, onClose, onConfirm, accounts, categories = [], expense, loading }: PayDebtModalProps) {
    const [selectedId, setSelectedId] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [useDeposit, setUseDeposit] = useState(false);
    const [depositDeductionAmount, setDepositDeductionAmount] = useState<string>('');

    const remainingAmount = expense ? (expense.amount - (expense.paidAmount || 0)) : 0;
    const availableDeposit = Number(expense?.supplierDepositBalance) || 0;

    useEffect(() => {
        if (expense) {
            setSelectedId('');
            setSelectedCategoryId(expense.categoryId ? expense.categoryId.toString() : '');
            setPaymentAmount(remainingAmount.toFixed(0));
            setPaymentDate(new Date().toISOString().split('T')[0]);

            if (availableDeposit > 0) {
                setUseDeposit(true);
                const defaultDeduct = Math.min(remainingAmount, availableDeposit);
                setDepositDeductionAmount(defaultDeduct.toFixed(0));
            } else {
                setUseDeposit(false);
                setDepositDeductionAmount('');
            }
        }
    }, [expense, remainingAmount, availableDeposit]);

    if (!isOpen || !expense) return null;

    const parsedPayAmount = paymentAmount ? parseFloat(paymentAmount) : remainingAmount;
    const rawDepositDeduct = useDeposit ? (depositDeductionAmount ? parseFloat(depositDeductionAmount) : 0) : 0;
    const actualDepositDeduct = Math.min(rawDepositDeduct, parsedPayAmount, availableDeposit);
    const cashNeeded = Math.max(0, parsedPayAmount - actualDepositDeduct);

    const handleConfirm = () => {
        if (cashNeeded > 0 && !selectedId) {
            alert(`Pilih akun kas/bank untuk sisa pembayaran sebesar Rp ${cashNeeded.toLocaleString()}`);
            return;
        }
        onConfirm(
            cashNeeded > 0 ? selectedId : '',
            parsedPayAmount,
            paymentDate,
            selectedCategoryId || undefined,
            actualDepositDeduct
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
            <div className="glass w-full max-w-lg rounded-[2.5rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-slate-950/60 border-b border-rose-500/20 px-8 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/10">
                            <Wallet className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-base font-black italic tracking-wider text-white uppercase leading-none">Pembayaran Hutang</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 italic">Debt Settlement & Deposit Offset</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-400 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto no-scrollbar text-white">
                    {/* SUMMARY CARD */}
                    <div className="rounded-2xl bg-slate-950 border border-white/5 p-6 relative overflow-hidden">
                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1 italic">Tagihan Vendor / Supplier</p>
                        <p className="text-sm font-black text-white truncate">{expense.supplierName || expense.paidTo || 'Vendor'} - {expense.description || 'Pengeluaran'}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                            <div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Tagihan</span>
                                <p className="text-xs font-black text-slate-300">Rp {expense.amount.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Sisa Hutang</span>
                                <p className="text-xl font-black text-rose-400">Rp {remainingAmount.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* INPUT TOTAL PEMBAYARAN */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nominal Pembayaran Kali Ini (Rp) *</label>
                            <button 
                                type="button"
                                onClick={() => {
                                    setPaymentAmount(remainingAmount.toFixed(0));
                                    if (useDeposit) {
                                        setDepositDeductionAmount(Math.min(remainingAmount, availableDeposit).toFixed(0));
                                    }
                                }}
                                className="text-[10px] text-amber-400 font-bold hover:underline"
                            >
                                Set Penuh (Rp {remainingAmount.toLocaleString()})
                            </button>
                        </div>
                        <input 
                            type="number"
                            placeholder="Masukkan nominal..."
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="w-full px-5 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl focus:border-rose-500 outline-none text-white font-bold text-base"
                        />
                    </div>

                    {/* FITUR POTONG DEPOSIT SUPPLIER (JIKA TERSEDIA) */}
                    {availableDeposit > 0 && (
                        <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                        <Sparkles size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">Potong Saldo Deposit Supplier</p>
                                        <p className="text-[10px] text-slate-400">Tersedia: <span className="text-white font-bold">Rp {availableDeposit.toLocaleString()}</span></p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={useDeposit} 
                                        onChange={(e) => setUseDeposit(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>

                            {useDeposit && (
                                <div className="space-y-3 pt-2 border-t border-emerald-500/20">
                                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                                        <span>Nominal Deposit yang Dipotong:</span>
                                        <button 
                                            type="button"
                                            onClick={() => setDepositDeductionAmount(Math.min(parsedPayAmount, availableDeposit).toFixed(0))}
                                            className="text-emerald-400 font-bold hover:underline"
                                        >
                                            Pakai Maksimal (Rp {Math.min(parsedPayAmount, availableDeposit).toLocaleString()})
                                        </button>
                                    </div>
                                    <input 
                                        type="number"
                                        max={Math.min(parsedPayAmount, availableDeposit)}
                                        value={depositDeductionAmount}
                                        onChange={(e) => setDepositDeductionAmount(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-950 border border-emerald-500/40 rounded-xl focus:border-emerald-400 outline-none text-emerald-300 font-bold text-sm"
                                        placeholder="Nominal deposit yang dipotong..."
                                    />

                                    {/* BREAKDOWN DISPLAY */}
                                    <div className="p-3 bg-slate-950/80 rounded-xl border border-white/5 space-y-1.5 text-xs">
                                        <div className="flex justify-between text-slate-400">
                                            <span>Dipotong dari Deposit:</span>
                                            <span className="font-bold text-emerald-400">- Rp {actualDepositDeduct.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between font-black text-white pt-1 border-t border-white/5">
                                            <span>Sisa Bayar via Kas / Bank:</span>
                                            <span className={cashNeeded > 0 ? "text-amber-400" : "text-emerald-400"}>
                                                Rp {cashNeeded.toLocaleString()} {cashNeeded === 0 ? '(LUNAS 100% via Deposit)' : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FUNDING ACCOUNT SELECTION (HANYA DITAMPILKAN / DIBUTUHKAN JIKA ADA PORSI KAS YANG DIBAYAR) */}
                    {cashNeeded > 0 ? (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Pilih Akun Kas / Bank Pelunas (Rp {cashNeeded.toLocaleString()}) *</span>
                            </label>
                            <div className="grid gap-2.5 max-h-48 overflow-y-auto pr-1">
                                {accounts.map(acc => (
                                    <button
                                        key={acc.id}
                                        type="button"
                                        onClick={() => setSelectedId(acc.id.toString())}
                                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                                            selectedId === acc.id.toString() 
                                            ? 'border-emerald-500/50 bg-emerald-500/10 shadow-md' 
                                            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                                                selectedId === acc.id.toString() ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-500'
                                            }`}>
                                                <Wallet size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-white uppercase">{acc.name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Saldo: Rp {acc.balance.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        {selectedId === acc.id.toString() && (
                                            <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">
                                                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                            <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-2">
                                <CheckCircle2 size={16} /> 100% Ditutup oleh Saldo Deposit Supplier
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">Tidak ada uang kas/bank perusahaan yang akan dikeluarkan.</p>
                        </div>
                    )}

                    {/* TANGGAL PEMBAYARAN */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tanggal Pembayaran</label>
                        <input 
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-rose-500 outline-none text-white font-bold text-xs"
                        />
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl border border-slate-800 py-3.5 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            disabled={(cashNeeded > 0 && !selectedId) || loading || !paymentAmount}
                            onClick={handleConfirm}
                            className="flex-[2] rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500 py-3.5 text-xs font-black uppercase tracking-wider shadow-lg active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                                actualDepositDeduct > 0 && cashNeeded > 0
                                    ? `Bayar Kombinasi (DP + Kas)`
                                    : actualDepositDeduct > 0 && cashNeeded === 0
                                    ? `Lunas via Potong Deposit`
                                    : parsedPayAmount < remainingAmount - 0.01 
                                    ? "Bayar Cicilan" 
                                    : "Lunasi Tagihan"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

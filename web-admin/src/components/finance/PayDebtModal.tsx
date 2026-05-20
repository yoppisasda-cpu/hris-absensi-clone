'use client';

import { useState, useEffect } from "react";
import { X, CheckCircle2, Wallet } from "lucide-react";

interface PayDebtModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (accountId: string, paymentAmount?: number) => void;
    accounts: any[];
    expense: any;
    loading: boolean;
}

export default function PayDebtModal({ isOpen, onClose, onConfirm, accounts, expense, loading }: PayDebtModalProps) {
    const [selectedId, setSelectedId] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');

    const remainingAmount = expense ? (expense.amount - (expense.paidAmount || 0)) : 0;

    useEffect(() => {
        if (expense) {
            setSelectedId('');
            setPaymentAmount(remainingAmount.toFixed(0));
        }
    }, [expense, remainingAmount]);

    if (!isOpen || !expense) return null;

    const handleConfirm = () => {
        if (!selectedId) return;
        const amt = paymentAmount ? parseFloat(paymentAmount) : remainingAmount;
        onConfirm(selectedId, amt);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
            <div className="glass w-full max-w-md rounded-[3rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-slate-950/50 border-b border-rose-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/10">
                            <Wallet className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Debt Settlement</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic truncate max-w-[180px]">Account Payable Verification</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-10 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
                    <div className="rounded-[2.5rem] bg-slate-950 border border-white/5 p-8 shadow-inner relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <CheckCircle2 className="h-20 w-20 text-emerald-500" />
                        </div>
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3 italic">LIFECYCLE PAYLOAD</p>
                        <p className="text-sm font-black text-white italic truncate pr-12">{expense.categoryName || expense.category?.name || 'Kategori'} - {expense.supplierName || expense.paidTo || 'Vendor'}</p>
                        <div className="flex justify-between items-end mt-4">
                            <div>
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Tagihan</span>
                                <p className="text-xs font-black text-slate-400">Rp {expense.amount.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Sisa Hutang</span>
                                <p className="text-xl font-black text-white italic tracking-tighter">Rp {remainingAmount.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Nominal Pembayaran (Rp)</label>
                        <div className="relative">
                            <input 
                                type="number"
                                placeholder="Masukkan nominal..."
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-950/50 rounded-[1.8rem] border border-white/5 focus:border-rose-500 outline-none text-white font-bold"
                            />
                            <button 
                                type="button"
                                onClick={() => setPaymentAmount(remainingAmount.toFixed(0))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[8px] font-black rounded-xl uppercase tracking-wider transition-all"
                            >
                                Set Penuh
                            </button>
                        </div>
                        {paymentAmount && (
                            <p className={`text-[10px] font-bold mt-2 ml-2 ${parseFloat(paymentAmount) >= remainingAmount - 0.01 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {parseFloat(paymentAmount) >= remainingAmount - 0.01 
                                    ? '✓ Pembayaran penuh akan melunasi hutang ini.' 
                                    : '⚠ Pembayaran sebagian akan dicatat sebagai Cicilan.'}
                            </p>
                        )}
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Funding Interface Selection</label>
                        <div className="grid gap-3 p-2 bg-slate-950/50 border border-white/5 rounded-[2.5rem]">
                            {accounts.map(acc => (
                                <button
                                    key={acc.id}
                                    type="button"
                                    onClick={() => setSelectedId(acc.id.toString())}
                                    className={`flex items-center justify-between p-5 rounded-[1.8rem] border transition-all ${
                                        selectedId === acc.id.toString() 
                                        ? 'border-rose-500/50 bg-rose-500/10 shadow-lg shadow-rose-500/5' 
                                        : 'border-white/5 bg-slate-950 hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-colors ${
                                            selectedId === acc.id.toString() ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-900 text-slate-600'
                                        }`}>
                                            <Wallet className="h-5 w-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className={`text-xs font-black italic uppercase tracking-widest transition-colors ${selectedId === acc.id.toString() ? 'text-white' : 'text-slate-500'}`}>{acc.name}</p>
                                            <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">Available: Rp {acc.balance.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {selectedId === acc.id.toString() && (
                                        <div className="h-6 w-6 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                                            <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 rounded-[24px] border border-white/5 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:bg-white/5 transition-all italic"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={!selectedId || loading || !paymentAmount}
                            onClick={handleConfirm}
                            className="flex-[2] rounded-[24px] bg-emerald-600/20 text-emerald-500 border border-emerald-600/30 py-5 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/10 hover:bg-emerald-600 hover:text-white active:scale-95 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-3 italic"
                        >
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500"></div>
                            ) : (
                                paymentAmount && parseFloat(paymentAmount) < remainingAmount - 0.01 
                                    ? "Execute Installment" 
                                    : "Execute Settlement"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

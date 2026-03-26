'use client';

import { useState } from "react";
import { X, CheckCircle2, Wallet } from "lucide-react";

interface PayDebtModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (accountId: string) => void;
    accounts: any[];
    expense: any;
    loading: boolean;
}

export default function PayDebtModal({ isOpen, onClose, onConfirm, accounts, expense, loading }: PayDebtModalProps) {
    const [selectedId, setSelectedId] = useState('');

    if (!isOpen || !expense) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 text-slate-900 border border-slate-200">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h3 className="text-lg font-bold">Pelunasan Hutang (Tempo)</h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="rounded-xl bg-amber-50 p-4 border border-amber-100">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">DATA TRANSAKSI</p>
                        <p className="text-sm font-bold text-slate-700">{expense.category?.name} - {expense.paidTo || 'Vendor'}</p>
                        <p className="text-xl font-black text-slate-900 mt-1">Rp {expense.amount.toLocaleString()}</p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">Pilih Akun Sumber Dana:</label>
                        <div className="grid gap-2">
                            {accounts.map(acc => (
                                <button
                                    key={acc.id}
                                    type="button"
                                    onClick={() => setSelectedId(acc.id.toString())}
                                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${selectedId === acc.id.toString() ? 'border-red-600 bg-red-50/50 shadow-md ring-1 ring-red-600' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${selectedId === acc.id.toString() ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                            <Wallet className="h-4 w-4" />
                                        </div>
                                        <div className="text-left">
                                            <p className={`text-sm font-bold ${selectedId === acc.id.toString() ? 'text-red-900' : 'text-slate-700'}`}>{acc.name}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Saldo: Rp {acc.balance.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {selectedId === acc.id.toString() && <CheckCircle2 className="h-5 w-5 text-red-600" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all font-inter"
                        >
                            Batal
                        </button>
                        <button
                            disabled={!selectedId || loading}
                            onClick={() => onConfirm(selectedId)}
                            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                "LUNASI SEKARANG"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

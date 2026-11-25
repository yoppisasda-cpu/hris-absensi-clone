'use client';

import { useState, useEffect } from "react";
import { 
    X, Wallet, ArrowDownRight, ArrowUpRight, 
    Receipt, CheckCircle2, AlertCircle, Building2, 
    Calendar, RefreshCw, FileText, Plus, ArrowRightLeft,
    Clock, DollarSign, Download
} from "lucide-react";
import api from "@/lib/api";

interface SupplierFinancialModalProps {
    isOpen: boolean;
    onClose: () => void;
    supplier: any;
    onSuccess?: () => void;
}

export default function SupplierFinancialModal({
    isOpen,
    onClose,
    supplier,
    onSuccess
}: SupplierFinancialModalProps) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [financialData, setFinancialData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'SUMMARY' | 'DEPOSIT' | 'LOAN_INSTALLMENT'>('SUMMARY');

    // Form Deposit State
    const [depositAction, setDepositAction] = useState<'DEPOSIT' | 'DEPOSIT_REFUND'>('DEPOSIT');
    const [depositAmount, setDepositAmount] = useState<number | ''>('');
    const [depositAccountId, setDepositAccountId] = useState<string>('');
    const [depositRef, setDepositRef] = useState('');
    const [depositNotes, setDepositNotes] = useState('');

    // Form Pinjaman & Angsuran State
    const [loanAction, setLoanAction] = useState<'LOAN' | 'INSTALLMENT'>('INSTALLMENT');
    const [loanAmount, setLoanAmount] = useState<number | ''>('');
    const [installmentMethod, setInstallmentMethod] = useState<'CASH' | 'TRANSFER' | 'POTONG_PO'>('CASH');
    const [loanAccountId, setLoanAccountId] = useState<string>('');
    const [selectedPoId, setSelectedPoId] = useState<string>('');
    const [loanRef, setLoanRef] = useState('');
    const [loanNotes, setLoanNotes] = useState('');

    useEffect(() => {
        if (isOpen && supplier?.id) {
            fetchFinancials();
        }
    }, [isOpen, supplier?.id]);

    const fetchFinancials = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/suppliers/${supplier.id}/financials`);
            setFinancialData(res.data);
            if (res.data?.accounts?.length > 0) {
                setDepositAccountId(String(res.data.accounts[0].id));
                setLoanAccountId(String(res.data.accounts[0].id));
            }
            if (res.data?.purchaseOrders?.length > 0) {
                setSelectedPoId(String(res.data.purchaseOrders[0].id));
            }
        } catch (error) {
            console.error("Gagal mengambil data finansial supplier", error);
        } finally {
            setLoading(false);
        }
    };

    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        try {
            setExporting(true);
            const response = await api.get(`/suppliers/${supplier.id}/financials/export`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const safeName = (supplier?.name || 'Supplier').replace(/[^a-zA-Z0-9_-]/g, '_');
            link.setAttribute('download', `Buku_Finansial_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Gagal mengekspor buku finansial", error);
            alert("Gagal mengunduh file Excel Buku Finansial");
        } finally {
            setExporting(false);
        }
    };

    const handleDepositSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!depositAmount || Number(depositAmount) <= 0) {
            alert("Nominal harus lebih dari 0");
            return;
        }

        try {
            setSubmitting(true);
            await api.post(`/suppliers/${supplier.id}/transactions`, {
                type: depositAction,
                amount: Number(depositAmount),
                paymentMethod: 'TRANSFER',
                financialAccountId: depositAccountId ? Number(depositAccountId) : null,
                referenceNumber: depositRef || null,
                notes: depositNotes || null,
                date: new Date().toISOString()
            });

            alert(depositAction === 'DEPOSIT' ? "Deposit / DP berhasil disetor" : "Deposit berhasil ditarik kembali");
            setDepositAmount('');
            setDepositRef('');
            setDepositNotes('');
            fetchFinancials();
            if (onSuccess) onSuccess();
            setActiveTab('SUMMARY');
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal memproses transaksi deposit");
        } finally {
            setSubmitting(false);
        }
    };

    const handleLoanInstallmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loanAmount || Number(loanAmount) <= 0) {
            alert("Nominal harus lebih dari 0");
            return;
        }

        try {
            setSubmitting(true);
            await api.post(`/suppliers/${supplier.id}/transactions`, {
                type: loanAction,
                amount: Number(loanAmount),
                paymentMethod: loanAction === 'INSTALLMENT' ? installmentMethod : 'TRANSFER',
                financialAccountId: (loanAction === 'LOAN' || installmentMethod !== 'POTONG_PO') && loanAccountId ? Number(loanAccountId) : null,
                purchaseOrderId: loanAction === 'INSTALLMENT' && installmentMethod === 'POTONG_PO' && selectedPoId ? Number(selectedPoId) : null,
                referenceNumber: loanRef || null,
                notes: loanNotes || null,
                date: new Date().toISOString()
            });

            alert(loanAction === 'LOAN' ? "Pinjaman / Klaim supplier berhasil dicatat" : "Pembayaran angsuran supplier berhasil dicatat");
            setLoanAmount('');
            setLoanRef('');
            setLoanNotes('');
            fetchFinancials();
            if (onSuccess) onSuccess();
            setActiveTab('SUMMARY');
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal memproses transaksi");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white">
                
                {/* MODAL HEADER */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-black uppercase tracking-tight text-white">{supplier?.name}</h2>
                                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    {supplier?.category || 'SUPPLIER'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Buku Finansial: Lacak Saldo Deposit, Hutang Tempo, dan Angsuran Piutang</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            disabled={exporting || loading}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                            title="Export Buku Finansial ke Excel"
                        >
                            <Download size={14} className={exporting ? "animate-bounce" : ""} />
                            {exporting ? "Mengunduh..." : "Export Excel"}
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* 3 FINANCIAL SUMMARY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-950/30 border-b border-slate-800 shrink-0">
                    {/* 1. DEPOSIT / DP */}
                    <div className="bg-slate-900/90 border border-emerald-500/20 p-4 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Saldo Deposit / DP</span>
                            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                        </div>
                        <p className="text-2xl font-black text-white">
                            Rp {(financialData?.depositBalance || 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 italic">Uang muka / jaminan kita di supplier</p>
                    </div>

                    {/* 2. HUTANG TEMPO (PAYABLE) */}
                    <div className="bg-slate-900/90 border border-rose-500/20 p-4 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Hutang Tempo PO</span>
                            <ArrowDownRight className="h-4 w-4 text-rose-400" />
                        </div>
                        <p className="text-2xl font-black text-rose-400">
                            Rp {(financialData?.payableBalance || 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 italic">Tagihan invoice PO yang belum lunas</p>
                    </div>

                    {/* 3. PIUTANG / PINJAMAN SUPPLIER */}
                    <div className="bg-slate-900/90 border border-amber-500/20 p-4 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Piutang / Pinjaman Supplier</span>
                            <Receipt className="h-4 w-4 text-amber-400" />
                        </div>
                        <p className="text-2xl font-black text-amber-300">
                            Rp {(financialData?.receivableBalance || 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 italic">Sisa hutang supplier yang sedang diangsur</p>
                    </div>
                </div>

                {/* NAVIGATION TABS */}
                <div className="flex items-center border-b border-slate-800 bg-slate-900 px-6 gap-2">
                    <button
                        onClick={() => setActiveTab('SUMMARY')}
                        className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === 'SUMMARY'
                                ? 'border-amber-400 text-amber-400'
                                : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                    >
                        <FileText size={15} /> Riwayat Mutasi
                    </button>
                    <button
                        onClick={() => setActiveTab('DEPOSIT')}
                        className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === 'DEPOSIT'
                                ? 'border-emerald-400 text-emerald-400'
                                : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                    >
                        <Plus size={15} /> Kelola Deposit (DP)
                    </button>
                    <button
                        onClick={() => setActiveTab('LOAN_INSTALLMENT')}
                        className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === 'LOAN_INSTALLMENT'
                                ? 'border-amber-400 text-amber-400'
                                : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                    >
                        <ArrowRightLeft size={15} /> Pinjaman & Angsuran Supplier
                    </button>
                </div>

                {/* TAB CONTENT CONTAINER */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center p-12 text-slate-500 font-bold text-sm">
                            <RefreshCw className="animate-spin mr-2" size={18} /> Memuat data finansial...
                        </div>
                    ) : (
                        <>
                            {/* TAB 1: SUMMARY / MUTASI HISTORY */}
                            {activeTab === 'SUMMARY' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Riwayat Mutasi & Transaksi</h3>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={handleExport} 
                                                disabled={exporting || loading}
                                                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold disabled:opacity-50"
                                            >
                                                <Download size={13} className={exporting ? "animate-bounce" : ""} />
                                                {exporting ? "Mengunduh..." : "Export Excel"}
                                            </button>
                                            <button 
                                                onClick={fetchFinancials} 
                                                className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-bold"
                                            >
                                                <RefreshCw size={12} /> Segarkan
                                            </button>
                                        </div>
                                    </div>

                                    {financialData?.transactions?.length === 0 ? (
                                        <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs font-bold uppercase tracking-wider">
                                            Belum ada transaksi deposit, hutang, atau angsuran untuk supplier ini.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-950/80 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                                                    <tr>
                                                        <th className="px-4 py-3">Tanggal</th>
                                                        <th className="px-4 py-3">Jenis Transaksi</th>
                                                        <th className="px-4 py-3 text-right">Nominal</th>
                                                        <th className="px-4 py-3">Metode & Akun</th>
                                                        <th className="px-4 py-3">Keterangan</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/60 font-medium">
                                                    {financialData?.transactions?.map((tx: any) => {
                                                        const isGreen = tx.type === 'DEPOSIT' || tx.type === 'INSTALLMENT';
                                                        return (
                                                            <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                                                                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                                                    {new Date(tx.date || tx.createdAt).toLocaleDateString('id-ID', {
                                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                                    })}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                                        tx.type === 'DEPOSIT'
                                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                                            : tx.type === 'DEPOSIT_REFUND'
                                                                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                                                            : tx.type === 'LOAN'
                                                                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                                                            : 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                                                                    }`}>
                                                                        {tx.type === 'DEPOSIT' && 'Setor Deposit'}
                                                                        {tx.type === 'DEPOSIT_REFUND' && 'Tarik Deposit'}
                                                                        {tx.type === 'DEPOSIT_USED' && 'Deposit Terpakai'}
                                                                        {tx.type === 'LOAN' && 'Pinjaman / Klaim'}
                                                                        {tx.type === 'INSTALLMENT' && 'Angsuran Diterima'}
                                                                    </span>
                                                                </td>
                                                                <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                                                                    isGreen ? 'text-emerald-400' : 'text-slate-200'
                                                                }`}>
                                                                    Rp {tx.amount.toLocaleString()}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-300">
                                                                    {tx.paymentMethod === 'POTONG_PO' ? (
                                                                        <span className="text-amber-400 font-bold">
                                                                            Potong PO {tx.purchaseOrder?.orderNumber ? `#${tx.purchaseOrder.orderNumber}` : ''}
                                                                        </span>
                                                                    ) : (
                                                                        <span>{tx.financialAccount?.name || tx.paymentMethod || 'Kas'}</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                                                                    {tx.notes || tx.referenceNumber || '-'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: MANAGE DEPOSIT (DP) */}
                            {activeTab === 'DEPOSIT' && (
                                <form onSubmit={handleDepositSubmit} className="space-y-6 max-w-xl mx-auto py-2">
                                    <div className="flex gap-4 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setDepositAction('DEPOSIT')}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                                depositAction === 'DEPOSIT'
                                                    ? 'bg-emerald-600 text-white shadow-lg'
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            Setor Deposit Baru (Kas Keluar)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDepositAction('DEPOSIT_REFUND')}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                                depositAction === 'DEPOSIT_REFUND'
                                                    ? 'bg-blue-600 text-white shadow-lg'
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            Tarik Kembali Deposit (Kas Masuk)
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                                Nominal (Rp) *
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                placeholder="Contoh: 2500000"
                                                value={depositAmount}
                                                onChange={(e) => setDepositAmount(e.target.value ? Number(e.target.value) : '')}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-lg font-bold text-white focus:border-emerald-500 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                                Sumber / Tujuan Akun Kas & Bank *
                                            </label>
                                            <select
                                                required
                                                value={depositAccountId}
                                                onChange={(e) => setDepositAccountId(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-emerald-500 outline-none"
                                            >
                                                {financialData?.accounts?.map((acc: any) => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.name} (Saldo: Rp {acc.balance.toLocaleString()})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                                No. Referensi / Bukti Transfer
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Contoh: TRF-BCA-9842"
                                                value={depositRef}
                                                onChange={(e) => setDepositRef(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                                Keterangan / Catatan
                                            </label>
                                            <textarea
                                                rows={2}
                                                placeholder="Contoh: Deposit jaminan 50 krat botol minuman, dapat direfund saat tutup kontrak"
                                                value={depositNotes}
                                                onChange={(e) => setDepositNotes(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-black uppercase tracking-wider text-white shadow-xl transition-all disabled:opacity-50"
                                    >
                                        {submitting ? 'Memproses...' : depositAction === 'DEPOSIT' ? 'Simpan Setoran Deposit' : 'Simpan Penarikan Deposit'}
                                    </button>
                                </form>
                            )}

                            {/* TAB 3: LOAN & INSTALLMENTS (SUPPLIER OWES US) */}
                            {activeTab === 'LOAN_INSTALLMENT' && (
                                <form onSubmit={handleLoanInstallmentSubmit} className="space-y-6 max-w-xl mx-auto py-2">
                                    <div className="flex gap-4 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setLoanAction('INSTALLMENT')}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                                loanAction === 'INSTALLMENT'
                                                    ? 'bg-amber-500 text-slate-900 shadow-lg'
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            Terima Angsuran dari Supplier
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLoanAction('LOAN')}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                                loanAction === 'LOAN'
                                                    ? 'bg-rose-600 text-white shadow-lg'
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            Catat Pinjaman Baru ke Supplier
                                        </button>
                                    </div>

                                    {loanAction === 'INSTALLMENT' ? (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                                    Metode Pembayaran Angsuran *
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setInstallmentMethod('TRANSFER')}
                                                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                                                            installmentMethod === 'TRANSFER'
                                                                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                                        }`}
                                                    >
                                                        💰 Kas / Transfer Bank
                                                        <p className="text-[10px] font-normal text-slate-500 mt-1">Supplier bayar tunai/transfer ke rekening kita</p>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setInstallmentMethod('POTONG_PO')}
                                                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                                                            installmentMethod === 'POTONG_PO'
                                                                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                                        }`}
                                                    >
                                                        ✂️ Potong Nota Pembelian (PO)
                                                        <p className="text-[10px] font-normal text-slate-500 mt-1">Angsuran dipotong dari tagihan PO berjalan</p>
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                                    Nominal Angsuran (Rp) *
                                                </label>
                                                <input
                                                    type="number"
                                                    required
                                                    min="1"
                                                    placeholder="Contoh: 1000000"
                                                    value={loanAmount}
                                                    onChange={(e) => setLoanAmount(e.target.value ? Number(e.target.value) : '')}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-lg font-bold text-white focus:border-amber-400 outline-none"
                                                />
                                            </div>

                                            {installmentMethod === 'POTONG_PO' ? (
                                                <div>
                                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                                        Pilih PO / Nota yang Dipotong *
                                                    </label>
                                                    {financialData?.purchaseOrders?.length === 0 ? (
                                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-medium">
                                                            Belum ada PO aktif untuk supplier ini. Angsuran akan otomatis memotong tagihan hutang berjalan.
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={selectedPoId}
                                                            onChange={(e) => setSelectedPoId(e.target.value)}
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-amber-400 outline-none"
                                                        >
                                                            {financialData?.purchaseOrders?.map((po: any) => (
                                                                <option key={po.id} value={po.id}>
                                                                    PO #{po.orderNumber} (Rp {po.totalAmount.toLocaleString()}) - {po.status}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                                        Akun Kas / Bank Penerima *
                                                    </label>
                                                    <select
                                                        required
                                                        value={loanAccountId}
                                                        onChange={(e) => setLoanAccountId(e.target.value)}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-amber-400 outline-none"
                                                    >
                                                        {financialData?.accounts?.map((acc: any) => (
                                                            <option key={acc.id} value={acc.id}>
                                                                {acc.name} (Saldo: Rp {acc.balance.toLocaleString()})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                                    Keterangan / Cicilan Ke-
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    placeholder="Contoh: Cicilan ke-2 dari total pinjaman modal bahan baku"
                                                    value={loanNotes}
                                                    onChange={(e) => setLoanNotes(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-400 outline-none"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        // PENCATATAN PINJAMAN BARU
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                                    Nominal Pinjaman / Klaim (Rp) *
                                                </label>
                                                <input
                                                    type="number"
                                                    required
                                                    min="1"
                                                    placeholder="Contoh: 10000000"
                                                    value={loanAmount}
                                                    onChange={(e) => setLoanAmount(e.target.value ? Number(e.target.value) : '')}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-lg font-bold text-white focus:border-rose-500 outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                                    Sumber Kas / Bank Pencairan Dana *
                                                </label>
                                                <select
                                                    required
                                                    value={loanAccountId}
                                                    onChange={(e) => setLoanAccountId(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-rose-500 outline-none"
                                                >
                                                    {financialData?.accounts?.map((acc: any) => (
                                                        <option key={acc.id} value={acc.id}>
                                                            {acc.name} (Saldo: Rp {acc.balance.toLocaleString()})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                                    Keterangan / Rencana Angsuran
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    placeholder="Contoh: Talangan modal pakan ayam mitra, kesepakatan diangsur 5x via potong nota PO"
                                                    value={loanNotes}
                                                    onChange={(e) => setLoanNotes(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-rose-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-wider text-white shadow-xl transition-all disabled:opacity-50 ${
                                            loanAction === 'INSTALLMENT'
                                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                                : 'bg-rose-600 hover:bg-rose-500 text-white'
                                        }`}
                                    >
                                        {submitting ? 'Memproses...' : loanAction === 'INSTALLMENT' ? 'Catat Penerimaan Angsuran' : 'Simpan Pinjaman Supplier'}
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}

'use client';

import React, { useState, useEffect } from 'react';
import { 
    X, 
    Printer, 
    CheckCircle2, 
    AlertTriangle, 
    RefreshCcw, 
    Clock, 
    User, 
    Banknote, 
    CreditCard, 
    QrCode, 
    Building2, 
    FileText, 
    HelpCircle,
    ArrowRight,
    Lock
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface ShiftClosingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    companyName?: string;
    companyLogo?: string | null;
    receiptStoreName?: string;
    receiptStoreAddress?: string;
    receiptStorePhone?: string;
    receiptStoreFooter?: string;
    printAgentOnline?: boolean;
}

export default function ShiftClosingModal({
    isOpen,
    onClose,
    onSuccess,
    companyName = 'AIVOLA POS',
    companyLogo = null,
    receiptStoreName = '',
    receiptStoreAddress = '',
    receiptStorePhone = '',
    receiptStoreFooter = '',
    printAgentOnline = false
}: ShiftClosingModalProps) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [summary, setSummary] = useState<any>(null);
    const [actualCash, setActualCash] = useState<number>(0);
    const [actualCashInput, setActualCashInput] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [isClosed, setIsClosed] = useState(false);
    const [savedClosingData, setSavedClosingData] = useState<any>(null);

    const cashierName = typeof window !== 'undefined' ? (localStorage.getItem('userName') || 'Kasir') : 'Kasir';
    const finalStoreName = receiptStoreName.trim() || companyName || 'AIVOLA POS';

    useEffect(() => {
        if (isOpen) {
            fetchSummary();
            setIsClosed(false);
            setSavedClosingData(null);
            setShowConfirmDialog(false);
            setNotes('');
            setActualCash(0);
            setActualCashInput('');
        }
    }, [isOpen]);

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const res = await api.get('/pos/closing-summary');
            setSummary(res.data);
            // Default actual cash to expected cash initially for convenient validation unless blind closing
            if (!res.data.blindClosing && res.data.expectedCash !== undefined) {
                // leave blank or 0 so cashier actively counts
            }
        } catch (error: any) {
            console.error('Gagal mengambil ringkasan closing:', error);
            toast.error(error.response?.data?.error || 'Gagal memuat ringkasan closing');
        } finally {
            setLoading(false);
        }
    };

    const handleCashChange = (valStr: string) => {
        const clean = valStr.replace(/\D/g, '');
        const num = clean ? parseInt(clean, 10) : 0;
        setActualCash(num);
        setActualCashInput(num > 0 ? num.toLocaleString('id-ID') : '');
    };

    const handleSetShortcut = (amount: number) => {
        const next = Math.max(0, actualCash + amount);
        setActualCash(next);
        setActualCashInput(next > 0 ? next.toLocaleString('id-ID') : '');
    };

    const expectedCash = summary?.expectedCash || 0;
    const cashDifference = actualCash - expectedCash;
    const isBlind = summary?.blindClosing === true;

    const handleSubmitClosing = async () => {
        if (!summary) return;
        setSubmitting(true);
        try {
            const payload = {
                startTime: summary.startTime,
                endTime: summary.endTime || new Date(),
                totalGrossSales: summary.totalGrossSales || 0,
                totalNetSales: summary.totalNetSales || 0,
                totalCommission: summary.totalCommission || 0,
                totalTransactions: summary.totalTransactions || 0,
                actualCash: actualCash,
                expectedCash: expectedCash,
                cashDifference: cashDifference,
                notes: notes.trim() || 'Closing Shift Kasir Web POS'
            };

            const res = await api.post('/pos/closing', payload);
            setSavedClosingData({
                ...payload,
                methodBreakdown: summary.methodBreakdown || [],
                id: res.data?.id
            });
            setIsClosed(true);
            setShowConfirmDialog(false);
            toast.success('Shift kasir berhasil ditutup!');
            
            // Auto trigger thermal print if LAN Print Agent is online
            if (printAgentOnline) {
                handlePrintAgent({
                    ...payload,
                    methodBreakdown: summary.methodBreakdown || []
                });
            }
        } catch (error: any) {
            console.error('Gagal closing shift:', error);
            toast.error(error.response?.data?.error || 'Gagal menyimpan closing shift');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrintAgent = async (dataToPrint?: any) => {
        const targetData = dataToPrint || savedClosingData || {
            startTime: summary?.startTime,
            endTime: summary?.endTime || new Date(),
            totalGrossSales: summary?.totalGrossSales || 0,
            totalNetSales: summary?.totalNetSales || 0,
            totalCommission: summary?.totalCommission || 0,
            totalTransactions: summary?.totalTransactions || 0,
            actualCash: actualCash,
            expectedCash: expectedCash,
            cashDifference: cashDifference,
            methodBreakdown: summary?.methodBreakdown || [],
            notes: notes
        };

        if (printAgentOnline) {
            try {
                toast.loading('Mencetak struk closing ke printer kasir...', { id: 'closing-print' });
                const res = await fetch('http://localhost:18181/print-closing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        closing: targetData,
                        cashierName: cashierName,
                        companyName: finalStoreName,
                        store: {
                            name: finalStoreName,
                            address: receiptStoreAddress.trim(),
                            phone: receiptStorePhone.trim(),
                            footer: receiptStoreFooter.trim()
                        }
                    })
                });
                const resData = await res.json();
                if (resData.success) {
                    toast.success('Struk closing berhasil dicetak!', { id: 'closing-print' });
                    return;
                }
            } catch (err) {
                console.error('Print agent closing error:', err);
            }
        }

        // Fallback to browser print dialog
        handleBrowserPrint();
    };

    const handleBrowserPrint = () => {
        window.print();
    };

    if (!isOpen) return null;

    const dataForPrint = savedClosingData || {
        startTime: summary?.startTime,
        endTime: summary?.endTime || new Date(),
        totalGrossSales: summary?.totalGrossSales || 0,
        totalNetSales: summary?.totalNetSales || 0,
        totalCommission: summary?.totalCommission || 0,
        totalTransactions: summary?.totalTransactions || 0,
        actualCash: actualCash,
        expectedCash: expectedCash,
        cashDifference: cashDifference,
        methodBreakdown: summary?.methodBreakdown || [],
        notes: notes
    };

    return (
        <>
            {/* HIDDEN THERMAL CLOSING RECEIPT FOR BROWSER PRINT (@media print) */}
            <div id="thermal-closing-receipt" className="hidden print:block font-mono text-[11px] p-2 bg-white text-black w-[58mm] leading-tight mx-auto">
                <div className="text-center mb-2">
                    {companyLogo && (
                        <div className="flex justify-center mb-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={companyLogo} alt="Logo" className="h-8 max-w-[100px] object-contain grayscale" />
                        </div>
                    )}
                    <h2 className="font-black text-sm uppercase leading-tight">{finalStoreName}</h2>
                    {receiptStoreAddress && <p className="text-[9px] text-gray-700">{receiptStoreAddress}</p>}
                    {receiptStorePhone && <p className="text-[9px] text-gray-700">Telp: {receiptStorePhone}</p>}
                </div>

                <div className="border-t border-b border-black py-1 my-1.5 text-center">
                    <div className="font-black text-xs uppercase">LAPORAN TUTUP KASIR</div>
                    <div className="text-[9px] font-bold text-gray-800">(CLOSING SHIFT)</div>
                </div>

                <div className="text-[10px] space-y-0.5 mb-2">
                    <div className="flex justify-between">
                        <span>Kasir:</span>
                        <span className="font-bold">{cashierName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Shift Buka:</span>
                        <span>{dataForPrint.startTime ? new Date(dataForPrint.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Shift Tutup:</span>
                        <span>{new Date(dataForPrint.endTime || new Date()).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Total Transaksi:</span>
                        <span className="font-bold">{dataForPrint.totalTransactions || 0} Pesanan</span>
                    </div>
                </div>

                <div className="border-t border-dashed border-black py-1 my-1 text-[10px] space-y-1">
                    <div className="font-bold uppercase text-[9px] mb-0.5">Ringkasan Penjualan:</div>
                    <div className="flex justify-between">
                        <span>Penjualan Kotor:</span>
                        <span>Rp {Number(dataForPrint.totalGrossSales || 0).toLocaleString('id-ID')}</span>
                    </div>
                    {dataForPrint.totalCommission > 0 && (
                        <div className="flex justify-between text-gray-700">
                            <span>Potongan / Komisi:</span>
                            <span>- Rp {Number(dataForPrint.totalCommission || 0).toLocaleString('id-ID')}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold border-t border-dotted border-gray-400 pt-0.5">
                        <span>Penjualan Bersih:</span>
                        <span>Rp {Number(dataForPrint.totalNetSales || 0).toLocaleString('id-ID')}</span>
                    </div>
                </div>

                {Array.isArray(dataForPrint.methodBreakdown) && dataForPrint.methodBreakdown.length > 0 && (
                    <div className="border-t border-dashed border-black py-1 my-1 text-[10px] space-y-0.5">
                        <div className="font-bold uppercase text-[9px] mb-0.5">Rincian Pembayaran:</div>
                        {dataForPrint.methodBreakdown.map((m: any, idx: number) => (
                            <div key={idx} className="flex justify-between">
                                <span>{m.accountName || 'Lainnya'}:</span>
                                <span>Rp {Number(m.expectedAmount || 0).toLocaleString('id-ID')}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="border-t border-dashed border-black py-1 my-1 text-[10px] space-y-1">
                    <div className="font-bold uppercase text-[9px] mb-0.5">Rekonsiliasi Kas Laci:</div>
                    <div className="flex justify-between">
                        <span>Kas Diharapkan:</span>
                        <span>Rp {Number(dataForPrint.expectedCash || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                        <span>Kas Fisik Aktual:</span>
                        <span>Rp {Number(dataForPrint.actualCash || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between font-black border-t border-dotted border-gray-400 pt-0.5">
                        <span>Selisih Kas:</span>
                        <span>
                            {dataForPrint.cashDifference === 0 
                                ? 'PAS (Rp 0)' 
                                : (dataForPrint.cashDifference > 0 ? `+Rp ${Number(dataForPrint.cashDifference).toLocaleString('id-ID')}` : `-Rp ${Number(Math.abs(dataForPrint.cashDifference)).toLocaleString('id-ID')}`)}
                        </span>
                    </div>
                </div>

                {dataForPrint.notes && (
                    <div className="border-t border-dashed border-black py-1 text-[9px] italic">
                        Catatan: {dataForPrint.notes}
                    </div>
                )}

                <div className="border-t border-black pt-3 mt-3 text-center">
                    <div className="grid grid-cols-2 text-[9px] gap-4 mb-8">
                        <div>Kasir</div>
                        <div>Supervisor</div>
                    </div>
                    <div className="grid grid-cols-2 text-[9px] gap-4 font-bold">
                        <div>( {cashierName} )</div>
                        <div>( ................ )</div>
                    </div>
                    <div className="text-[8px] text-gray-500 mt-4">
                        Dicetak: {new Date().toLocaleString('id-ID')}
                    </div>
                </div>
            </div>

            {/* MODAL DIALOG ON SCREEN */}
            <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 print:hidden">
                <div className="bg-slate-900 border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-[36px] shadow-2xl flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-200">
                    
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 bg-slate-950/70 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
                                <Banknote className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                                    <span>Tutup Kasir (Closing Shift)</span>
                                    {isBlind && (
                                        <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            <Lock className="h-3 w-3" /> Blind Mode
                                        </span>
                                    )}
                                </h3>
                                <p className="text-xs text-slate-400">Rekonsiliasi penerimaan kas & penyelesaian sesi kasir</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={fetchSummary}
                                disabled={loading}
                                title="Perbarui Ringkasan Shift"
                                className="h-9 w-9 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                            >
                                <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={onClose}
                                className="h-9 w-9 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 pos-touch-scrollbar space-y-6 bg-slate-950/20">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
                                <RefreshCcw className="h-8 w-8 animate-spin text-rose-500" />
                                <p className="text-sm font-bold">Menghitung akumulasi transaksi shift...</p>
                            </div>
                        ) : isClosed ? (
                            /* SUCCESS VIEW POST CLOSING */
                            <div className="py-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
                                <div className="h-20 w-20 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                                    <CheckCircle2 className="h-10 w-10 stroke-[2.5px] animate-bounce" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-2xl font-black uppercase text-white">Shift Kasir Berhasil Ditutup</h4>
                                    <p className="text-xs text-slate-400">
                                        Data penutupan shift telah tersimpan di sistem dan riwayat closing dapat dipantau di Laporan POS.
                                    </p>
                                </div>

                                <div className="bg-slate-950 p-5 rounded-3xl border border-white/5 max-w-md mx-auto text-left space-y-3">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Kasir:</span>
                                        <span className="font-bold text-white">{cashierName}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Total Transaksi:</span>
                                        <span className="font-bold text-white">{savedClosingData?.totalTransactions || 0} Pesanan</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Penjualan Bersih:</span>
                                        <span className="font-bold text-emerald-400">Rp {Number(savedClosingData?.totalNetSales || 0).toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Kas Fisik Disetor:</span>
                                        <span className="font-bold text-white">Rp {Number(savedClosingData?.actualCash || 0).toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between text-xs border-t border-white/5 pt-2">
                                        <span className="text-slate-400">Status Selisih Kas:</span>
                                        <span className={`font-black ${
                                            savedClosingData?.cashDifference === 0 
                                                ? 'text-emerald-400' 
                                                : (savedClosingData?.cashDifference > 0 ? 'text-blue-400' : 'text-rose-400')
                                        }`}>
                                            {savedClosingData?.cashDifference === 0 
                                                ? 'PAS (Rp 0)' 
                                                : (savedClosingData?.cashDifference > 0 
                                                    ? `+ Rp ${Number(savedClosingData?.cashDifference).toLocaleString('id-ID')} (Lebih)`
                                                    : `- Rp ${Number(Math.abs(savedClosingData?.cashDifference)).toLocaleString('id-ID')} (Kurang)`)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => handlePrintAgent()}
                                        className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <Printer className="h-4 w-4" />
                                        <span>Cetak Struk Closing</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClose();
                                            if (onSuccess) onSuccess();
                                        }}
                                        className="w-full sm:w-auto px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                                    >
                                        Selesai &amp; Keluar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* CLOSING FORM VIEW */
                            <>
                                {/* Shift Information Bar */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-3xl border border-white/5 text-xs">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Kasir Bertugas</span>
                                        <span className="font-black text-white truncate block">{cashierName}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Shift Dimulai</span>
                                        <span className="font-bold text-slate-300 block">
                                            {summary?.startTime ? new Date(summary.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Waktu Closing</span>
                                        <span className="font-bold text-slate-300 block">
                                            {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Total Pesanan</span>
                                        <span className="font-black text-sky-400 block">{summary?.totalTransactions || 0} Transaksi</span>
                                    </div>
                                </div>

                                {/* Revenue & Sales Overview */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Ringkasan Omset Shift</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="bg-slate-900/90 border border-white/5 p-4 rounded-3xl">
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Penjualan Kotor (Gross)</span>
                                            <div className="text-lg font-black text-white">
                                                {isBlind ? 'Rp *******' : `Rp ${Number(summary?.totalGrossSales || 0).toLocaleString('id-ID')}`}
                                            </div>
                                        </div>
                                        <div className="bg-slate-900/90 border border-white/5 p-4 rounded-3xl">
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Potongan Platform / Fee</span>
                                            <div className="text-lg font-black text-rose-400">
                                                {isBlind ? 'Rp *******' : `- Rp ${Number(summary?.totalCommission || 0).toLocaleString('id-ID')}`}
                                            </div>
                                        </div>
                                        <div className="bg-slate-900/90 border border-emerald-500/20 p-4 rounded-3xl bg-emerald-500/5">
                                            <span className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">Estimasi Bersih (Net)</span>
                                            <div className="text-lg font-black text-emerald-400">
                                                {isBlind ? 'Rp *******' : `Rp ${Number(summary?.totalNetSales || 0).toLocaleString('id-ID')}`}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Breakdown Grid */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Rincian Metode Pembayaran</h4>
                                    <div className="bg-slate-950/70 border border-white/5 rounded-3xl divide-y divide-white/5 overflow-hidden">
                                        {Array.isArray(summary?.methodBreakdown) && summary.methodBreakdown.length > 0 ? (
                                            summary.methodBreakdown.map((m: any, idx: number) => {
                                                const isCash = m.accountType === 'CASH' || m.accountName.toLowerCase().includes('tunai');
                                                const isQris = m.accountType === 'QRIS' || m.accountName.toLowerCase().includes('qris');
                                                return (
                                                    <div key={idx} className="p-3.5 px-4 flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`p-1.5 rounded-lg ${isCash ? 'bg-emerald-500/20 text-emerald-300' : isQris ? 'bg-sky-500/20 text-sky-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                                                {isCash ? <Banknote className="h-4 w-4" /> : isQris ? <QrCode className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                                                            </div>
                                                            <span className="font-bold text-white">{m.accountName}</span>
                                                        </div>
                                                        <span className="font-mono font-bold text-slate-200">
                                                            {isBlind ? 'Rp *******' : `Rp ${Number(m.expectedAmount || 0).toLocaleString('id-ID')}`}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-4 text-center text-xs text-slate-500 italic">
                                                Belum ada transaksi di shift ini.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Physical Cash Reconciliation (Hitung Kas Laci) */}
                                <div className="bg-rose-500/5 border border-rose-500/20 p-5 rounded-3xl space-y-4">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                                                <Banknote className="h-4 w-4" />
                                                <span>Rekonsiliasi Uang Kas Fisik di Laci</span>
                                            </h4>
                                            <p className="text-[10px] text-slate-400">
                                                Hitung fisik uang tunai di laci kasir lalu masukkan nominal riilnya di bawah ini.
                                            </p>
                                        </div>

                                        {!isBlind && (
                                            <div className="text-right">
                                                <span className="text-[10px] text-slate-400 block">Kas Diharapkan di Laci:</span>
                                                <span className="font-mono font-black text-sm text-emerald-400">
                                                    Rp {Number(expectedCash).toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Input Cash */}
                                    <div>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">Rp</span>
                                            <input
                                                type="text"
                                                autoFocus
                                                value={actualCashInput}
                                                onChange={(e) => handleCashChange(e.target.value)}
                                                placeholder="0"
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-rose-500/30 focus:border-rose-500 rounded-2xl text-xl font-mono font-black text-white outline-none transition-all placeholder:text-slate-700"
                                            />
                                        </div>

                                        {/* Shortcut Denomination Buttons */}
                                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                                            {!isBlind && expectedCash > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActualCash(expectedCash);
                                                        setActualCashInput(expectedCash.toLocaleString('id-ID'));
                                                    }}
                                                    className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-bold border border-emerald-500/30 transition-all active:scale-95"
                                                >
                                                    Set Uang Pas
                                                </button>
                                            )}
                                            {[10000, 20000, 50000, 100000, 500000].map(val => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => handleSetShortcut(val)}
                                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold border border-white/5 transition-all active:scale-95"
                                                >
                                                    +{val.toLocaleString('id-ID')}
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActualCash(0);
                                                    setActualCashInput('');
                                                }}
                                                className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[10px] font-bold border border-rose-500/30 transition-all active:scale-95 ml-auto"
                                            >
                                                Reset (0)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Difference Indicator (Only when not blind closing) */}
                                    {!isBlind && (
                                        <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                                            cashDifference === 0 
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                                                : (cashDifference > 0 ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-rose-500/15 border-rose-500/40 text-rose-300')
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                {cashDifference === 0 ? (
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                                ) : (
                                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                                )}
                                                <span className="font-bold">
                                                    {cashDifference === 0 
                                                        ? 'Uang Kas Sesuai / Pas (Tidak ada selisih)' 
                                                        : (cashDifference > 0 ? 'Kelebihan Uang Kas (Surplus):' : 'Kekurangan Uang Kas (Shortage):')}
                                                </span>
                                            </div>
                                            <span className="font-mono font-black text-sm">
                                                {cashDifference === 0 
                                                    ? 'Rp 0' 
                                                    : (cashDifference > 0 ? `+ Rp ${cashDifference.toLocaleString('id-ID')}` : `- Rp ${Math.abs(cashDifference).toLocaleString('id-ID')}`)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Notes */}
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            Catatan Closing (Opsional)
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Contoh: Shift 1 selesai lancar, uang koin kembalian tersisa 50rb di laci..."
                                            className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-medium text-white outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-600"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {!isClosed && !loading && (
                        <div className="p-5 px-6 border-t border-white/10 bg-slate-950/70 flex items-center justify-between gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => handlePrintAgent()}
                                className="px-4 py-3 rounded-2xl border border-white/10 hover:border-white/20 text-slate-300 hover:text-white bg-slate-800/60 text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
                                title="Cetak Ringkasan Sementara"
                            >
                                <Printer className="h-4 w-4" />
                                <span>Preview Struk</span>
                            </button>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-3 rounded-2xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-xs font-bold transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmDialog(true)}
                                    className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <Banknote className="h-4 w-4" />
                                    <span>Tutup Kasir Sekarang</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* CONFIRMATION POPUP DIALOG */}
            {showConfirmDialog && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150 print:hidden">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-3xl p-6 text-white shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-base font-black uppercase text-white">Konfirmasi Tutup Kasir</h4>
                                <p className="text-[11px] text-slate-400">Shift akan diakhiri dan dicatat ke laporan</p>
                            </div>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Kas Fisik Diinput:</span>
                                <span className="font-bold text-white">Rp {actualCash.toLocaleString('id-ID')}</span>
                            </div>
                            {!isBlind && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Selisih Kas:</span>
                                    <span className={`font-bold ${cashDifference === 0 ? 'text-emerald-400' : (cashDifference > 0 ? 'text-blue-400' : 'text-rose-400')}`}>
                                        {cashDifference === 0 ? 'PAS (Rp 0)' : (cashDifference > 0 ? `+Rp ${cashDifference.toLocaleString('id-ID')}` : `-Rp ${Math.abs(cashDifference).toLocaleString('id-ID')}`)}
                                    </span>
                                </div>
                            )}
                            <p className="text-[11px] text-slate-400 pt-1 border-t border-white/5">
                                Apakah Anda yakin ingin melakukan Closing sekarang? Transaksi berikutnya setelah ini akan otomatis masuk ke shift kasir yang baru.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-1">
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => setShowConfirmDialog(false)}
                                className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-xs font-bold"
                            >
                                Kembali
                            </button>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={handleSubmitClosing}
                                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 flex items-center gap-2 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <span>Ya, Tutup Shift</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

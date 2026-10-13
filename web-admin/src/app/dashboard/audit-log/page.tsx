'use client';

import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
    ShieldCheck, Calendar, Clock, User, FileText, AlertTriangle, 
    Eye, X, Search, RefreshCw, ShoppingCart, Tag, DollarSign,
    Package, ArrowRight, Info, CheckCircle2
} from "lucide-react";
import api from "@/lib/api";

export default function AuditLogPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterAction, setFilterAction] = useState("ALL");
    
    // Modal state
    const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
    const [detailData, setDetailData] = useState<any | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [showRawDetails, setShowRawDetails] = useState(false);

    const fetchLogs = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/audit-logs');
            setLogs(res.data);
        } catch (error) {
            console.error("Failed to fetch audit logs", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const openDetailModal = async (logId: number) => {
        setSelectedLogId(logId);
        setIsDetailLoading(true);
        setDetailData(null);
        setShowRawDetails(false);
        try {
            const res = await api.get(`/audit-logs/${logId}/detail`);
            setDetailData(res.data);
        } catch (error) {
            console.error("Failed to fetch audit log detail", error);
        } finally {
            setIsDetailLoading(false);
        }
    };

    const closeDetailModal = () => {
        setSelectedLogId(null);
        setDetailData(null);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchSearch = 
                (log.userName && log.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (log.entityId && log.entityId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (log.action && log.action.toLowerCase().includes(searchTerm.toLowerCase()));
            
            if (!matchSearch) return false;

            if (filterAction === "REFUND") {
                return log.action.includes("REFUND");
            }
            if (filterAction === "DELETE_PENDING") {
                return log.action.includes("DELETE_PENDING");
            }
            if (filterAction === "DELETE_SALE") {
                return log.action === "DELETE_SALE";
            }
            return true;
        });
    }, [logs, searchTerm, filterAction]);

    const getActionBadgeClass = (action: string) => {
        if (action.includes('REFUND')) {
            return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        }
        if (action.includes('DELETE')) {
            return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        }
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    };

    return (
        <DashboardLayout>
            <div className="p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                            <ShieldCheck className="h-6 w-6 text-rose-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white uppercase tracking-widest italic">
                                Audit Log <span className="text-rose-500">Sistem</span>
                            </h1>
                            <p className="text-sm text-slate-400 mt-1">
                                Pantau dan inspeksi aktivitas krusial seperti penghapusan transaksi, pending bill, dan refund produk
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={fetchLogs}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors w-fit"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-rose-400' : ''}`} />
                        Refresh Data
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-[#050505] rounded-[24px] border border-white/5 p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cari user, invoice, ID, atau kata kunci..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                        <button
                            onClick={() => setFilterAction("ALL")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                                filterAction === "ALL" 
                                    ? "bg-rose-500 text-white" 
                                    : "bg-white/5 text-slate-400 hover:text-white"
                            }`}
                        >
                            Semua Aksi
                        </button>
                        <button
                            onClick={() => setFilterAction("REFUND")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                                filterAction === "REFUND" 
                                    ? "bg-amber-500 text-black" 
                                    : "bg-white/5 text-slate-400 hover:text-white"
                            }`}
                        >
                            Refund / Retur
                        </button>
                        <button
                            onClick={() => setFilterAction("DELETE_PENDING")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                                filterAction === "DELETE_PENDING" 
                                    ? "bg-rose-500 text-white" 
                                    : "bg-white/5 text-slate-400 hover:text-white"
                            }`}
                        >
                            Hapus Pending Bill
                        </button>
                        <button
                            onClick={() => setFilterAction("DELETE_SALE")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                                filterAction === "DELETE_SALE" 
                                    ? "bg-rose-500 text-white" 
                                    : "bg-white/5 text-slate-400 hover:text-white"
                            }`}
                        >
                            Hapus Penjualan
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-[#050505] rounded-[24px] border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                        <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3 text-rose-500" />
                            Riwayat Aktivitas ({filteredLogs.length})
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] whitespace-nowrap">Waktu</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] whitespace-nowrap">User</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] whitespace-nowrap">Aksi</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] whitespace-nowrap">Target Data</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] whitespace-nowrap">Detail / Ringkasan</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] whitespace-nowrap text-right">Rincian Item</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-500 text-sm italic">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="h-4 w-4 rounded-full border-2 border-rose-500 border-t-transparent animate-spin"></div>
                                                Memuat data audit log...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-500 text-sm italic">
                                            Tidak ada catatan audit log yang cocok dengan filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => {
                                        return (
                                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                                        <Calendar className="h-4 w-4 text-slate-500" />
                                                        {new Date(log.createdAt).toLocaleDateString('id-ID')}
                                                        <Clock className="h-3 w-3 text-slate-500 ml-2" />
                                                        <span className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleTimeString('id-ID')}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                                            <User className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-white">{log.userName || 'Unknown'}</div>
                                                            <div className="text-[10px] text-slate-500 font-mono tracking-wider">ID: {log.userId || '-'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase italic border ${getActionBadgeClass(log.action)}`}>
                                                        {log.action.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-slate-500" />
                                                        <span className="text-sm font-bold text-slate-300">{log.entity}</span>
                                                        <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">{log.entityId}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {log.totalAmount !== null && log.totalAmount !== undefined && log.totalAmount > 0 ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                                                {formatCurrency(log.totalAmount)}
                                                            </span>
                                                            {log.itemCount && (
                                                                <span className="text-[11px] text-slate-400">({log.itemCount} Item)</span>
                                                            )}
                                                        </div>
                                                    ) : log.label ? (
                                                        <div className="text-xs text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-md border border-sky-500/20 inline-block">
                                                            Hold Bill: <span className="font-semibold text-white">"{log.label}"</span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-400 truncate max-w-xs" title={log.details || ''}>
                                                            {log.summaryText || log.details || '-'}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => openDetailModal(log.id)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/20 text-xs font-semibold transition-colors"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        Lihat Detail
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL DETAIL AUDIT LOG */}
                {selectedLogId !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0c0d12] border border-white/10 rounded-[28px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <Package className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-black text-white uppercase tracking-wider italic">
                                                Rincian Item & Transaksi
                                            </h3>
                                            <span className="text-xs font-mono text-slate-500">#{selectedLogId}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Inspeksi rincian barang, nominal, dan catatan yang di-refund atau dihapus
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeDetailModal}
                                    className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                                {isDetailLoading ? (
                                    <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
                                        <div className="h-7 w-7 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                                        <span>Mengambil rincian data audit...</span>
                                    </div>
                                ) : detailData ? (
                                    <>
                                        {/* Info Summary Cards */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="p-3.5 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Aksi</div>
                                                <div className="mt-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase italic border ${getActionBadgeClass(detailData.log?.action || '')}`}>
                                                        {detailData.log?.action?.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-3.5 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Pelaksana</div>
                                                <div className="text-sm font-bold text-white mt-1 truncate">
                                                    {detailData.log?.userName || 'Kasir / Admin'}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-mono">ID: {detailData.log?.userId || '-'}</div>
                                            </div>

                                            <div className="p-3.5 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Target Dokumen</div>
                                                <div className="text-sm font-bold text-indigo-400 mt-1 font-mono truncate">
                                                    {detailData.log?.entityId || '-'}
                                                </div>
                                                <div className="text-[10px] text-slate-500">{detailData.log?.entity}</div>
                                            </div>

                                            <div className="p-3.5 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Total Nilai</div>
                                                <div className="text-sm font-bold text-emerald-400 mt-1">
                                                    {detailData.summaryInfo?.totalRefundAmount !== undefined
                                                        ? formatCurrency(detailData.summaryInfo.totalRefundAmount)
                                                        : detailData.summaryInfo?.totalAmount !== undefined
                                                        ? formatCurrency(detailData.summaryInfo.totalAmount)
                                                        : '-'}
                                                </div>
                                                {detailData.summaryInfo?.returnNumber && (
                                                    <div className="text-[10px] text-amber-400/80 font-mono truncate">
                                                        {detailData.summaryInfo.returnNumber}
                                                    </div>
                                                )}
                                                {detailData.summaryInfo?.label && (
                                                    <div className="text-[10px] text-sky-400 truncate">
                                                        "{detailData.summaryInfo.label}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Notes or Reason if available */}
                                        {detailData.summaryInfo?.notes && (
                                            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5">
                                                <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <div className="text-xs font-bold text-amber-300">Catatan / Alasan Retur:</div>
                                                    <div className="text-xs text-amber-200/90 mt-0.5">{detailData.summaryInfo.notes}</div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Product / Item Breakdown Table */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                                                    <ShoppingCart className="h-3.5 w-3.5 text-indigo-400" />
                                                    Daftar Barang / Produk ({detailData.items?.length || 0})
                                                </h4>
                                                {detailData.items?.length > 0 && (
                                                    <span className="text-[11px] text-slate-400">
                                                        Total Qty: {detailData.items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0)} pcs
                                                    </span>
                                                )}
                                            </div>

                                            {detailData.items && detailData.items.length > 0 ? (
                                                <div className="rounded-2xl border border-white/5 overflow-hidden bg-white/[0.01]">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="border-b border-white/5 bg-white/[0.03]">
                                                                <th className="p-3 text-[10px] font-black uppercase text-slate-500 tracking-wider w-10 text-center">#</th>
                                                                <th className="p-3 text-[10px] font-black uppercase text-slate-500 tracking-wider">Nama Produk</th>
                                                                <th className="p-3 text-[10px] font-black uppercase text-slate-500 tracking-wider text-center">Qty</th>
                                                                <th className="p-3 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Harga Satuan</th>
                                                                <th className="p-3 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Subtotal</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5 text-xs">
                                                            {detailData.items.map((item: any, idx: number) => {
                                                                const qty = Number(item.quantity) || 1;
                                                                const price = Number(item.price) || 0;
                                                                const subtotal = Number(item.total) || Number(item.subtotal) || (qty * price);

                                                                return (
                                                                    <tr key={idx} className="hover:bg-white/[0.02]">
                                                                        <td className="p-3 text-slate-500 text-center font-mono">{idx + 1}</td>
                                                                        <td className="p-3">
                                                                            <div className="font-bold text-white">{item.name}</div>
                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                {item.sku && (
                                                                                    <span className="text-[10px] font-mono text-slate-500">{item.sku}</span>
                                                                                )}
                                                                                {item.category && (
                                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                                                                                        {item.category}
                                                                                    </span>
                                                                                )}
                                                                                {item.notes && (
                                                                                    <span className="text-[10px] text-amber-400/80 italic">Note: {item.notes}</span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-3 text-center font-bold text-slate-300">
                                                                            {qty}
                                                                        </td>
                                                                        <td className="p-3 text-right text-slate-400 font-mono">
                                                                            {formatCurrency(price)}
                                                                        </td>
                                                                        <td className="p-3 text-right font-bold text-emerald-400 font-mono">
                                                                            {formatCurrency(subtotal)}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                        <tfoot>
                                                            <tr className="border-t border-white/10 bg-white/[0.03] font-bold text-xs">
                                                                <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-slate-400">
                                                                    Grand Total:
                                                                </td>
                                                                <td className="p-3 text-right text-emerald-400 font-mono text-sm">
                                                                    {formatCurrency(
                                                                        detailData.summaryInfo?.totalRefundAmount !== undefined
                                                                            ? detailData.summaryInfo.totalRefundAmount
                                                                            : detailData.summaryInfo?.totalAmount !== undefined
                                                                            ? detailData.summaryInfo.totalAmount
                                                                            : detailData.items.reduce((sum: number, it: any) => sum + (Number(it.total) || Number(it.subtotal) || (Number(it.quantity || 1) * Number(it.price || 0))), 0)
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center space-y-2">
                                                    <Info className="h-6 w-6 text-slate-500 mx-auto" />
                                                    <p className="text-xs text-slate-300 font-medium">
                                                        {detailData.summaryInfo?.label ? (
                                                            <>Pending Bill atas nama <span className="text-sky-400 font-bold">"{detailData.summaryInfo.label}"</span> dihapus.</>
                                                        ) : (
                                                            "Tidak ada rincian item produk yang tersimpan dalam snapshot untuk log ini."
                                                        )}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                                                        Untuk penghapusan atau refund transaksi baru, seluruh daftar item produk, kuantitas, dan harga sudah otomatis tercatat secara mendetail di audit log.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Toggle Raw Payload for Debug / Audit Proof */}
                                        <div className="pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowRawDetails(!showRawDetails)}
                                                className="text-[11px] text-slate-500 hover:text-slate-300 underline font-mono flex items-center gap-1"
                                            >
                                                {showRawDetails ? "Sembunyikan Raw Details" : "Lihat Raw Details Log"}
                                            </button>
                                            {showRawDetails && (
                                                <pre className="mt-2 p-3 bg-black/60 border border-white/10 rounded-xl text-[10px] text-slate-400 font-mono overflow-x-auto">
                                                    {JSON.stringify(detailData, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-12 text-center text-slate-500 text-sm">
                                        Data log tidak ditemukan atau terjadi kesalahan saat memuat.
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-end">
                                <button
                                    onClick={closeDetailModal}
                                    className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

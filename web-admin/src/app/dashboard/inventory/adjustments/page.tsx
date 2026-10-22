'use client';

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
    Search, Filter, History, ArrowUpRight, ArrowDownRight, RefreshCcw, 
    Package, Calendar, Download, Eye, X, Flame, TrendingDown, 
    TrendingUp, Warehouse, CheckCircle2, ChevronRight, FileSpreadsheet,
    Layers, AlertCircle
} from "lucide-react";
import api from "@/lib/api";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";

function AdjustmentsContent() {
    const searchParams = useSearchParams();
    const queryProduct = searchParams.get('product') || searchParams.get('search') || '';

    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(queryProduct);
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    
    // Modal state for product usage details
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [modalSearchTerm, setModalSearchTerm] = useState("");
    const [modalTimeFilter, setModalTimeFilter] = useState<"ALL" | "TODAY" | "7DAYS" | "30DAYS">("ALL");

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventory/transactions');
            setTransactions(res.data);
        } catch (error) {
            console.error("Gagal mengambil histori stok", error);
            toast.error("Gagal memuat data mutasi stok");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    useEffect(() => {
        if (queryProduct) {
            setSearchTerm(queryProduct);
        }
    }, [queryProduct]);

    const formatQuantity = (val: number | string, allowNegative = false) => {
        const rawNum = Number(val) || 0;
        const absNum = Math.abs(rawNum);
        if (absNum === 0) return '0';
        const formatted = Number.isInteger(absNum)
            ? absNum.toLocaleString('id-ID')
            : Number(absNum.toFixed(2)).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        return (allowNegative && rawNum < 0) ? `−${formatted}` : formatted;
    };

    const getTypeDetails = (type: string) => {
        switch (type) {
            case 'IN':
                return { label: 'Stok Masuk', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: ArrowUpRight };
            case 'OUT':
                return { label: 'Stok Keluar / Pemakaian', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: ArrowDownRight };
            case 'ADJUST':
                return { label: 'Koreksi Stok', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: RefreshCcw };
            default:
                return { label: type, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', icon: History };
        }
    };

    // Filtered transactions based on search and type
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = 
                !searchTerm ||
                t.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesType = typeFilter === "ALL" || t.type === typeFilter;
            return matchesSearch && matchesType;
        });
    }, [transactions, searchTerm, typeFilter]);

    // Aggregate statistics from filtered data
    const summaryStats = useMemo(() => {
        let totalIn = 0;
        let totalOut = 0;
        let outTransactionsCount = 0;

        filteredTransactions.forEach(t => {
            const qty = Math.abs(Number(t.quantity) || 0);
            if (t.type === 'IN') {
                totalIn += qty;
            } else if (t.type === 'OUT') {
                totalOut += qty;
                outTransactionsCount++;
            }
        });

        return {
            totalLogs: filteredTransactions.length,
            totalIn,
            totalOut,
            outTransactionsCount
        };
    }, [filteredTransactions]);

    // Check if search matches a specific product single focus
    const singleProductMatch = useMemo(() => {
        if (!searchTerm) return null;
        const matchingProds = transactions.filter(t => 
            t.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.product_sku?.toLowerCase() === searchTerm.toLowerCase()
        );
        if (matchingProds.length === 0) return null;
        
        const firstProd = matchingProds[0];
        const isSingleFocus = matchingProds.every(p => p.productId === firstProd.productId);
        if (!isSingleFocus) return null;

        // Calculate usage for this specific product
        const prodTxs = transactions.filter(t => t.productId === firstProd.productId);
        const prodOut = prodTxs.filter(t => t.type === 'OUT').reduce((s, t) => s + Math.abs(Number(t.quantity) || 0), 0);
        const prodIn = prodTxs.filter(t => t.type === 'IN').reduce((s, t) => s + Math.abs(Number(t.quantity) || 0), 0);

        return {
            ...firstProd,
            totalOut: prodOut,
            totalIn: prodIn,
            txCount: prodTxs.length,
            outTxCount: prodTxs.filter(t => t.type === 'OUT').length
        };
    }, [transactions, searchTerm]);

    // Open detail modal for a specific product
    const handleOpenProductDetail = (prod: any) => {
        const prodTxs = transactions.filter(t => t.productId === prod.productId || (prod.id && t.productId === prod.id));
        const totalOut = prodTxs.filter(t => t.type === 'OUT').reduce((s, t) => s + Math.abs(Number(t.quantity) || 0), 0);
        const totalIn = prodTxs.filter(t => t.type === 'IN').reduce((s, t) => s + Math.abs(Number(t.quantity) || 0), 0);
        const totalAdjust = prodTxs.filter(t => t.type === 'ADJUST').reduce((s, t) => s + (Number(t.quantity) || 0), 0);

        setSelectedProduct({
            productId: prod.productId || prod.id,
            product_name: prod.product_name || prod.name,
            product_sku: prod.product_sku || prod.sku,
            product_unit: prod.product_unit || prod.unit,
            current_stock: prod.current_stock ?? prod.stock,
            warehouse_name: prod.warehouse_name,
            totalOut,
            totalIn,
            totalAdjust,
            transactions: prodTxs
        });
        setModalSearchTerm("");
        setModalTimeFilter("ALL");
    };

    // Filter modal transactions
    const modalFilteredTransactions = useMemo(() => {
        if (!selectedProduct) return [];
        let list = selectedProduct.transactions || [];

        // Time filter
        const now = new Date();
        if (modalTimeFilter === "TODAY") {
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            list = list.filter((t: any) => new Date(t.createdAt) >= startOfDay);
        } else if (modalTimeFilter === "7DAYS") {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            list = list.filter((t: any) => new Date(t.createdAt) >= sevenDaysAgo);
        } else if (modalTimeFilter === "30DAYS") {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            list = list.filter((t: any) => new Date(t.createdAt) >= thirtyDaysAgo);
        }

        // Search reference
        if (modalSearchTerm) {
            list = list.filter((t: any) => 
                t.reference?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                t.type?.toLowerCase().includes(modalSearchTerm.toLowerCase())
            );
        }

        return list;
    }, [selectedProduct, modalTimeFilter, modalSearchTerm]);

    // Modal filtered usage total
    const modalFilteredUsage = useMemo(() => {
        return modalFilteredTransactions
            .filter((t: any) => t.type === 'OUT')
            .reduce((s: number, t: any) => s + Math.abs(Number(t.quantity) || 0), 0);
    }, [modalFilteredTransactions]);

    // EXPORT TO EXCEL - ALL / FILTERED
    const handleExportExcel = () => {
        if (filteredTransactions.length === 0) {
            toast.error("Tidak ada data mutasi stok untuk diekspor");
            return;
        }

        const dataToExport = filteredTransactions.map((t, index) => {
            const qty = Math.abs(Number(t.quantity) || 0);
            const isOut = t.type === 'OUT';
            const isIn = t.type === 'IN';
            return {
                'No': index + 1,
                'Tanggal & Waktu': format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm:ss'),
                'Nama Produk': t.product_name,
                'SKU': t.product_sku || '-',
                'Gudang / Lokasi': t.warehouse_name || 'Gudang Utama',
                'Tipe Mutasi': isIn ? 'Stok Masuk (IN)' : isOut ? 'Stok Keluar / Pemakaian (OUT)' : 'Koreksi Stok (ADJUST)',
                'Jumlah Pergerakan': isOut ? -qty : qty,
                'Jumlah Pemakaian (OUT)': isOut ? qty : 0,
                'Satuan': t.product_unit || 'UNIT',
                'Stok Terkini': t.current_stock ?? '-',
                'Referensi / Dokumen': t.reference || 'SYSTEM_LOG'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Mutasi Stok");
        
        // Auto column widths
        const maxWidths = [
            { wch: 5 },  // No
            { wch: 20 }, // Tanggal
            { wch: 32 }, // Nama Produk
            { wch: 18 }, // SKU
            { wch: 25 }, // Gudang
            { wch: 28 }, // Tipe Mutasi
            { wch: 18 }, // Jumlah Pergerakan
            { wch: 22 }, // Jumlah Pemakaian
            { wch: 10 }, // Satuan
            { wch: 14 }, // Stok Terkini
            { wch: 45 }  // Referensi
        ];
        worksheet['!cols'] = maxWidths;

        const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
        const filename = searchTerm 
            ? `Mutasi_Stok_${searchTerm.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.xlsx`
            : `Riwayat_Mutasi_Stok_${timestamp}.xlsx`;

        XLSX.writeFile(workbook, filename);
        toast.success(`Berhasil mengekspor ${dataToExport.length} data ke Excel!`);
    };

    // EXPORT TO EXCEL - SINGLE PRODUCT USAGE HISTORY
    const handleExportProductUsageExcel = () => {
        if (!selectedProduct || modalFilteredTransactions.length === 0) {
            toast.error("Tidak ada data untuk diekspor");
            return;
        }

        const dataToExport = modalFilteredTransactions.map((t: any, index: number) => {
            const qty = Math.abs(Number(t.quantity) || 0);
            const isOut = t.type === 'OUT';
            return {
                'No': index + 1,
                'Tanggal & Waktu': format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm:ss'),
                'Nama Produk': selectedProduct.product_name,
                'SKU': selectedProduct.product_sku || '-',
                'Tipe': isOut ? 'Pemakaian / Keluar' : t.type === 'IN' ? 'Stok Masuk' : 'Koreksi Stok',
                'Jumlah Mutasi': isOut ? -qty : qty,
                'Jumlah Pemakaian': isOut ? qty : 0,
                'Satuan': selectedProduct.product_unit || 'UNIT',
                'Gudang': t.warehouse_name || selectedProduct.warehouse_name || 'Gudang Utama',
                'Referensi (Invoice POS / PO)': t.reference || '-'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Pemakaian");

        const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
        const safeName = (selectedProduct.product_name || 'Produk').replace(/[^a-zA-Z0-9]/g, '_');
        XLSX.writeFile(workbook, `Pemakaian_${safeName}_${timestamp}.xlsx`);
        toast.success(`Laporan pemakaian ${selectedProduct.product_name} berhasil diekspor!`);
    };

    return (
        <DashboardLayout>
            {/* Header Section */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <History className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-white uppercase text-glow-sm">
                                Riwayat & Mutasi <span className="text-indigo-500">Stok</span>
                            </h1>
                            <p className="text-[10px] md:text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase italic leading-relaxed">
                                Jalur audit rinci pergerakan stok: Penjualan POS (BOM Resep), Pembelian PO, Koreksi Opname, & Transfer Gudang.
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons: Export Excel & Refresh */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchTransactions}
                            disabled={loading}
                            className="p-3 rounded-2xl border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800 transition-all shadow-inner"
                            title="Refresh Data"
                        >
                            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all text-xs font-black uppercase tracking-wider italic shadow-lg shadow-emerald-500/10"
                        >
                            <Download className="h-4 w-4 stroke-[2.5px]" />
                            <span>Export Excel</span>
                        </button>
                    </div>
                </div>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                    <div className="p-5 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Total Log Mutasi</span>
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                <History className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black italic tracking-tight text-white">
                            {summaryStats.totalLogs.toLocaleString('id-ID')} <span className="text-xs text-slate-500 font-normal">transaksi</span>
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                            {searchTerm ? `Hasil filter pencarian` : `Seluruh mutasi tercatat`}
                        </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Total Stok Masuk (IN)</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <ArrowUpRight className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black italic tracking-tight text-emerald-400">
                            +{formatQuantity(summaryStats.totalIn)}
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                            Penerimaan PO & Penambahan Manual
                        </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-slate-900/40 border border-rose-500/20 bg-rose-500/[0.02] backdrop-blur-xl relative overflow-hidden shadow-lg shadow-rose-500/5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-300 italic flex items-center gap-1.5">
                                <Flame className="h-3.5 w-3.5 text-rose-400" /> Total Jumlah Pemakaian (OUT)
                            </span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <ArrowDownRight className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black italic tracking-tight text-rose-400">
                            −{formatQuantity(summaryStats.totalOut)}
                        </div>
                        <div className="text-[9px] font-bold text-rose-300/70 uppercase tracking-widest mt-1">
                            {summaryStats.outTransactionsCount} transaksi pemakaian POS / keluar
                        </div>
                    </div>
                </div>

                {/* Single Product Highlight Banner (e.g. Raw Beans Blend 7bilion) */}
                {singleProductMatch && (
                    <div className="mt-4 p-5 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-slate-900/70 to-rose-950/40 border border-indigo-500/30 backdrop-blur-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 shadow-lg shadow-indigo-500/20">
                                <Package className="h-6 w-6 stroke-[2px]" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[9px] font-black uppercase tracking-wider text-indigo-300">
                                        Fokus Produk
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-slate-400">
                                        {singleProductMatch.product_sku || 'NO-SKU'}
                                    </span>
                                </div>
                                <h3 className="text-lg font-black text-white italic tracking-tight uppercase mt-0.5">
                                    {singleProductMatch.product_name}
                                </h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 flex-wrap">
                            <div className="text-left md:text-right">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block italic">
                                    Stok Saat Ini
                                </span>
                                <span className={`text-lg font-black italic ${Number(singleProductMatch.current_stock) < 0 ? 'text-rose-400' : 'text-white'}`}>
                                    {formatQuantity(singleProductMatch.current_stock ?? 0, true)} {singleProductMatch.product_unit || 'UNIT'}
                                </span>
                                {Number(singleProductMatch.current_stock) < 0 ? (
                                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider block bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 italic">
                                        Defisit
                                    </span>
                                ) : (
                                    <span className="text-[8px] font-bold text-slate-500 block">
                                        Tersedia
                                    </span>
                                )}
                            </div>

                            <div className="text-left md:text-right">
                                <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 block italic">
                                    Jumlah Pemakaian (OUT)
                                </span>
                                <span className="text-xl font-black text-rose-400 italic">
                                    {formatQuantity(singleProductMatch.totalOut)} {singleProductMatch.product_unit || 'UNIT'}
                                </span>
                                <span className="text-[9px] text-slate-500 block">
                                    dari {singleProductMatch.outTxCount} transaksi POS
                                </span>
                            </div>

                            <button
                                onClick={() => handleOpenProductDetail(singleProductMatch)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider italic transition-all shadow-lg shadow-indigo-500/20"
                            >
                                <Eye className="h-4 w-4" />
                                <span>Lihat Rincian Pemakaian</span>
                            </button>

                            <button
                                onClick={() => setSearchTerm("")}
                                className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-xs"
                                title="Reset Filter Produk"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Table Container */}
            <div className="rounded-[40px] border border-white/5 bg-slate-900/50 shadow-2xl overflow-hidden mb-20 backdrop-blur-xl">
                {/* Search & Filters Toolbar */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 border-b border-white/5 p-6 bg-slate-950/30">
                    <div className="relative w-full lg:w-[450px] group">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors z-10" />
                        <input
                            type="text"
                            placeholder="CARI PRODUK (MISAL: BEANS BLEND), SKU, REFERENSI..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 pl-12 pr-10 text-[10px] font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase placeholder:text-slate-700 shadow-inner"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
                        {[
                            { id: 'ALL', label: 'Semua Tipe' },
                            { id: 'OUT', label: 'Pemakaian / Keluar (OUT)', color: 'text-rose-400' },
                            { id: 'IN', label: 'Stok Masuk (IN)', color: 'text-emerald-400' },
                            { id: 'ADJUST', label: 'Koreksi (ADJUST)', color: 'text-amber-400' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setTypeFilter(tab.id)}
                                className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider italic transition-all shrink-0 border ${
                                    typeFilter === tab.id
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                                }`}
                            >
                                <span className={tab.color}>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table Data */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead>
                            <tr className="bg-slate-950/60 border-b border-white/5">
                                <th className="px-6 py-4 font-black uppercase tracking-[0.2em] text-[9px] text-slate-400 italic">Penanda Waktu</th>
                                <th className="px-6 py-4 font-black uppercase tracking-[0.2em] text-[9px] text-slate-400 italic">Produk & SKU</th>
                                <th className="px-6 py-4 font-black uppercase tracking-[0.2em] text-[9px] text-slate-400 italic">Gudang</th>
                                <th className="px-6 py-4 font-black uppercase tracking-[0.2em] text-[9px] text-slate-400 italic">Tipe Mutasi</th>
                                <th className="px-6 py-4 font-black uppercase tracking-[0.2em] text-[9px] text-slate-400 italic text-center">Jumlah Pergerakan</th>
                                <th className="px-6 py-4 font-black uppercase tracking-[0.2em] text-[9px] text-rose-400 italic text-center bg-rose-500/[0.03]">Jumlah Pemakaian</th>
                                <th className="px-6 py-4 font-black uppercase tracking-[0.2em] text-[9px] text-slate-400 italic">Referensi Dokumen</th>
                                <th className="px-6 py-4 font-black uppercase tracking-[0.2em] text-[9px] text-slate-400 italic text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse border-b border-white/5">
                                        <td colSpan={8} className="px-6 py-6"><div className="h-10 w-full rounded-2xl bg-white/5"></div></td>
                                    </tr>
                                ))
                            ) : filteredTransactions.length > 0 ? (
                                filteredTransactions.map((t) => {
                                    const details = getTypeDetails(t.type);
                                    const Icon = details.icon;
                                    const isOut = t.type === 'OUT';
                                    const isIn = t.type === 'IN';
                                    
                                    return (
                                        <tr key={t.id} className="group hover:bg-white/[0.02] transition-colors">
                                            {/* Time */}
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-2.5 text-slate-400 font-bold uppercase tracking-wider text-[9px] italic group-hover:text-indigo-400 transition-colors">
                                                    <Calendar className="h-3.5 w-3.5 opacity-50 stroke-[2px]" />
                                                    {format(new Date(t.createdAt), 'dd MMM yyyy, HH:mm', { locale: id }).toUpperCase()}
                                                </div>
                                            </td>

                                            {/* Product Info (Clickable for quick drilldown) */}
                                            <td className="px-6 py-5">
                                                <button
                                                    onClick={() => handleOpenProductDetail(t)}
                                                    className="flex items-center gap-3.5 text-left group/prod cursor-pointer"
                                                    title="Klik untuk analisis pemakaian produk ini"
                                                >
                                                    <div className="h-10 w-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 group-hover/prod:text-indigo-400 group-hover/prod:border-indigo-500/40 transition-all shadow-inner shrink-0">
                                                        <Package className="h-5 w-5 stroke-[1.5px]" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black text-white text-[12px] leading-tight italic uppercase tracking-tight group-hover/prod:text-indigo-400 group-hover/prod:underline transition-colors">
                                                                {t.product_name}
                                                            </p>
                                                            <ChevronRight className="h-3 w-3 text-slate-600 group-hover/prod:text-indigo-400 transition-colors" />
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest italic">
                                                                {t.product_sku || 'UNTRACKED_SKU'}
                                                            </span>
                                                            {t.product_unit && (
                                                                <span className="text-[8px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 italic">
                                                                    {t.product_unit}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            </td>

                                            {/* Warehouse */}
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider italic">
                                                    <Warehouse className="h-3.5 w-3.5 text-slate-600" />
                                                    <span>{t.warehouse_name || 'Gudang Utama'}</span>
                                                </div>
                                            </td>

                                            {/* Movement Type */}
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] border italic ${details.bg} ${details.color}`}>
                                                    <Icon className="h-3 w-3 stroke-[2.5px]" />
                                                    {details.label.toUpperCase()}
                                                </span>
                                            </td>

                                            {/* Quantity Movement */}
                                            <td className="px-6 py-5 text-center whitespace-nowrap">
                                                <div className="flex items-baseline justify-center gap-1.5">
                                                    <span className={`text-xl font-black italic tracking-tighter ${isOut ? 'text-rose-400' : isIn ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                        {isOut ? '−' : isIn ? '+' : ''}{formatQuantity(t.quantity)}
                                                    </span>
                                                    <span className="text-[10px] font-bold uppercase text-slate-500 italic tracking-wider">
                                                        {t.product_unit || 'UNIT'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Dedicated Column: Jumlah Pemakaian (OUT) */}
                                            <td className="px-6 py-5 text-center whitespace-nowrap bg-rose-500/[0.03]">
                                                {isOut ? (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <span className="text-base font-black italic text-rose-400">
                                                            {formatQuantity(t.quantity)}
                                                        </span>
                                                        <span className="text-[9px] font-bold uppercase text-rose-400/80">
                                                            {t.product_unit || 'UNIT'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-700 font-mono text-xs">-</span>
                                                )}
                                            </td>

                                            {/* Reference / Notes */}
                                            <td className="px-6 py-5">
                                                <p className="text-slate-400 font-bold italic text-[10px] uppercase tracking-wider max-w-xs truncate group-hover:text-slate-200 transition-colors" title={t.reference}>
                                                    {t.reference || 'SYSTEM_LOG'}
                                                </p>
                                            </td>

                                            {/* Action: Open Drilldown */}
                                            <td className="px-6 py-5 text-center whitespace-nowrap">
                                                <button
                                                    onClick={() => handleOpenProductDetail(t)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-white/5 transition-all text-[10px] font-bold uppercase tracking-wider italic shadow-sm"
                                                    title="Lihat Pemakaian Lengkap"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    <span>Detail</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-8 py-32 text-center text-slate-600 uppercase tracking-[0.2em] font-black italic text-xs">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="h-20 w-20 rounded-[32px] bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-800">
                                                <History className="h-10 w-10" />
                                            </div>
                                            TIDAK ADA RIWAYAT PERGERAKAN STOK DENGAN KRITERIA INI
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DETAIL & ANALISIS PEMAKAIAN PRODUK MODAL */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
                    <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-[36px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 md:p-8 border-b border-white/10 bg-slate-950/60 flex items-start justify-between gap-4 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg shadow-indigo-500/10">
                                    <Package className="h-7 w-7 stroke-[2px]" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-black uppercase tracking-wider">
                                            Analisis Pemakaian Produk
                                        </span>
                                        <span className="text-[10px] font-mono font-bold text-slate-400">
                                            SKU: {selectedProduct.product_sku || '-'}
                                        </span>
                                    </div>
                                    <h2 className="text-xl md:text-2xl font-black italic tracking-tight text-white uppercase">
                                        {selectedProduct.product_name}
                                    </h2>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="p-2.5 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all shrink-0"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
                            {/* Hero Card: JUMLAH PEMAKAIAN */}
                            <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-indigo-950/40 border border-rose-500/30 relative overflow-hidden shadow-2xl shadow-rose-500/10">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <div className="flex items-center gap-2 text-rose-400 text-xs font-black uppercase tracking-widest italic mb-1">
                                            <Flame className="h-4 w-4" />
                                            <span>TOTAL JUMLAH PEMAKAIAN (OUT)</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl md:text-5xl font-black italic tracking-tighter text-rose-400 text-glow-sm">
                                                {formatQuantity(selectedProduct.totalOut)}
                                            </span>
                                            <span className="text-lg font-black text-rose-300 uppercase italic">
                                                {selectedProduct.product_unit || 'UNIT'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-medium italic mt-2 max-w-xl leading-relaxed">
                                            Akumulasi bahan yang terpakai dan terpotong otomatis dari seluruh pesanan kasir POS (melalui recipe BOM), mutasi keluar, dan konsumsi operasional.
                                        </p>
                                    </div>

                                    {/* Quick Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3 shrink-0">
                                        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                                Total Masuk (IN)
                                            </span>
                                            <span className="text-lg font-black text-emerald-400 italic">
                                                +{formatQuantity(selectedProduct.totalIn)} {selectedProduct.product_unit}
                                            </span>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col justify-between">
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                                    Stok Saat Ini
                                                </span>
                                                <span className={`text-lg font-black italic ${Number(selectedProduct.current_stock) < 0 ? 'text-rose-400' : 'text-white'}`}>
                                                    {formatQuantity(selectedProduct.current_stock ?? 0, true)} {selectedProduct.product_unit}
                                                </span>
                                            </div>
                                            {Number(selectedProduct.current_stock) < 0 ? (
                                                <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider block mt-1.5 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 italic">
                                                    Defisit (Belum Input PO / Stok Awal)
                                                </span>
                                            ) : (
                                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block mt-1">
                                                    Tersedia di Gudang
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Filters Bar inside Modal */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    {[
                                        { id: 'ALL', label: 'Semua Waktu' },
                                        { id: 'TODAY', label: 'Hari Ini' },
                                        { id: '7DAYS', label: '7 Hari Terakhir' },
                                        { id: '30DAYS', label: '30 Hari Terakhir' }
                                    ].map((f) => (
                                        <button
                                            key={f.id}
                                            onClick={() => setModalTimeFilter(f.id as any)}
                                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider italic transition-all border ${
                                                modalTimeFilter === f.id
                                                    ? 'bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-500/20'
                                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    <div className="relative w-full sm:w-60">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="CARI INVOICE POS..."
                                            value={modalSearchTerm}
                                            onChange={(e) => setModalSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-bold text-white uppercase italic placeholder:text-slate-600 focus:outline-none focus:border-rose-500/50"
                                        />
                                    </div>
                                    <button
                                        onClick={handleExportProductUsageExcel}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-black uppercase tracking-wider italic shrink-0"
                                    >
                                        <FileSpreadsheet className="h-3.5 w-3.5" />
                                        <span>Export Excel Produk</span>
                                    </button>
                                </div>
                            </div>

                            {/* Transactions Table for this product */}
                            <div className="rounded-2xl border border-white/5 bg-slate-950/50 overflow-hidden">
                                <div className="p-3.5 bg-slate-950/80 border-b border-white/5 flex items-center justify-between text-xs font-bold text-slate-400">
                                    <span>Histori Pemakaian & Pergerakan ({modalFilteredTransactions.length} Log)</span>
                                    {modalFilteredUsage > 0 && (
                                        <span className="text-rose-400 font-black">
                                            Pemakaian Terfilter: −{formatQuantity(modalFilteredUsage)} {selectedProduct.product_unit}
                                        </span>
                                    )}
                                </div>
                                <div className="max-h-72 overflow-y-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-950 sticky top-0 text-[9px] uppercase tracking-widest text-slate-500 border-b border-white/5">
                                            <tr>
                                                <th className="px-4 py-2.5">Waktu</th>
                                                <th className="px-4 py-2.5">Tipe</th>
                                                <th className="px-4 py-2.5 text-center">Jumlah Pemakaian</th>
                                                <th className="px-4 py-2.5">Referensi Transaksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50 text-[10px]">
                                            {modalFilteredTransactions.length > 0 ? (
                                                modalFilteredTransactions.map((tx: any) => {
                                                    const isOut = tx.type === 'OUT';
                                                    return (
                                                        <tr key={tx.id} className="hover:bg-white/[0.02]">
                                                            <td className="px-4 py-3 whitespace-nowrap text-slate-400 font-mono">
                                                                {format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                                                    isOut ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                }`}>
                                                                    {isOut ? 'PEMAKAIAN (OUT)' : tx.type}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                                <span className={`font-black italic text-sm ${isOut ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                                    {isOut ? '−' : '+'}{formatQuantity(tx.quantity)} {selectedProduct.product_unit}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-300 font-bold uppercase tracking-wider">
                                                                {tx.reference || 'SYSTEM_LOG'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-8 text-center text-slate-600 uppercase font-black tracking-widest text-[10px]">
                                                        Tidak ada log pergerakan stok untuk kriteria ini
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 px-8 border-t border-white/10 bg-slate-950/80 flex items-center justify-between shrink-0">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Aivola Core • Sistem Analisis Mutasi Stok
                            </span>
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="px-6 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider italic transition-all"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Notice */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 py-12 border-t border-white/5 italic">
                <div className="flex items-center gap-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    <p>© 2026 AIVOLA CORE - ANALITIK LOGISTIK GLOBAL</p>
                    <span className="h-1 w-1 bg-indigo-500 rounded-full animate-ping"></span>
                    <p>INTEGRITAS STOK & PEMAKAIAN TERVERIFIKASI</p>
                </div>
                <div className="flex gap-3">
                    <div className="h-2 w-10 rounded-full bg-indigo-500/20 border border-indigo-500/30"></div>
                    <div className="h-2 w-2 rounded-full bg-slate-800"></div>
                </div>
            </div>
        </DashboardLayout>
    );
}

export default function AdjustmentsPage() {
    return (
        <Suspense fallback={
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="flex flex-col items-center gap-4">
                        <RefreshCcw className="h-8 w-8 text-indigo-500 animate-spin" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 italic">Memuat Mutasi & Riwayat Stok...</p>
                    </div>
                </div>
            </DashboardLayout>
        }>
            <AdjustmentsContent />
        </Suspense>
    );
}

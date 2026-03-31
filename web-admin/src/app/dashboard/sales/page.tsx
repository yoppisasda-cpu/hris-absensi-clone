'use client';

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";
import AddSaleModal from "@/components/sales/AddSaleModal";
import InvoiceModal from "@/components/sales/InvoiceModal";
import ReturnSaleModal from "@/components/sales/ReturnSaleModal";
import { Plus, Search, Filter, ShoppingCart, TrendingUp, CreditCard, Calendar, MoreVertical, FileText, Download, CheckCircle2, Eye, Printer, RotateCcw } from "lucide-react";

export default function SalesPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [selectedReturnSaleId, setSelectedReturnSaleId] = useState<number | null>(null);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const res = await api.get('/sales');
            setSales(res.data);
        } catch (error) {
            console.error("Gagal mengambil data penjualan", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const stats = useMemo(() => {
        const total = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const paid = sales.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.totalAmount, 0);
        const pending = sales.filter(s => s.status === 'UNPAID').reduce((sum, s) => sum + s.totalAmount, 0);
        return { total, paid, pending };
    }, [sales]);

    const filteredSales = sales.filter(sale => 
        (sale.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.notes?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !sale.invoiceNumber?.startsWith('POS-')
    );

    const handleViewInvoice = (id: number) => {
        setSelectedSaleId(id);
        setIsInvoiceModalOpen(true);
    };

    return (
        <DashboardLayout>
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Penjualan (Sales)</h1>
                    <p className="mt-1 text-sm text-slate-500">Kelola transaksi penjualan dan cetak invoice pelanggan.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                        <Download className="h-4 w-4" /> Export
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
                    >
                        <Plus className="h-4 w-4" /> Tambah Penjualan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-blue-500">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Penjualan</p>
                    <p className="text-xl font-black text-slate-900">Rp {stats.total.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-emerald-500">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sudah Dibayar</p>
                    <p className="text-xl font-black text-emerald-600">Rp {stats.paid.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-amber-500">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Belum Bayar (Piutang)</p>
                    <p className="text-xl font-black text-amber-600">Rp {stats.pending.toLocaleString()}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 p-6">
                    <div className="relative w-full sm:w-96 group text-slate-900">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari nomor invoice atau catatan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:bg-white focus:outline-none transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto text-xs">
                    <table className="w-full border-collapse text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Tanggal</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">No. Invoice</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Pelanggan</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase tracking-wider text-[10px]">Total</th>
                                <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse"><td colSpan={5} className="px-6 py-6"><div className="h-4 w-full rounded bg-slate-100"></div></td></tr>
                                ))
                            ) : filteredSales.length > 0 ? (
                                filteredSales.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-700">
                                            {new Date(sale.date).toLocaleDateString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{sale.invoiceNumber}</div>
                                            <div className="text-[10px] text-slate-400 italic">ID Transaksi: #{sale.id}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-700">
                                            {sale.customerName || 'Umum'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-tighter ${
                                                sale.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                                                sale.status === 'RETURNED' ? 'bg-red-100 text-red-700 border border-red-200' :
                                                sale.status === 'PARTIALLY_RETURNED' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                                'bg-amber-100 text-amber-700 border border-amber-200'
                                            }`}>
                                                {sale.status === 'PAID' ? 'Lunas' : 
                                                 sale.status === 'RETURNED' ? 'Diretur' :
                                                 sale.status === 'PARTIALLY_RETURNED' ? 'Retur Sebagian' :
                                                 'Belum Bayar'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-black text-slate-900 text-sm">Rp {sale.totalAmount.toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handleViewInvoice(sale.id)}
                                                    className="rounded-lg bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
                                                    title="Cetak Invoice"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setSelectedReturnSaleId(sale.id);
                                                        setIsReturnModalOpen(true);
                                                    }}
                                                    className="rounded-lg bg-orange-50 p-2 text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-sm border border-orange-100"
                                                    title="Proses Retur"
                                                >
                                                    <RotateCcw className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleViewInvoice(sale.id)}
                                                    className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-600 hover:text-white transition-all shadow-sm border border-slate-200"
                                                    title="Lihat Detail"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">Belum ada transaksi penjualan.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddSaleModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={fetchSales} 
            />

            {/* Professional Invoice Modal */}
            <InvoiceModal 
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                saleId={selectedSaleId!}
            />

            <ReturnSaleModal 
                isOpen={isReturnModalOpen}
                onClose={() => setIsReturnModalOpen(false)}
                saleId={selectedReturnSaleId!}
                onRefresh={fetchSales}
            />
        </DashboardLayout>
    );
}

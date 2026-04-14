'use client';

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";
import InvoiceModal from "@/components/sales/InvoiceModal";
import { Search, Monitor, TrendingUp, Download, Eye, Printer, ShoppingBag, Receipt, Building2 } from "lucide-react";

export default function POSReportsPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
    const [isRestricted, setIsRestricted] = useState(false);

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        const branchId = localStorage.getItem('userBranchId');
        
        if (role === 'POS_VIEWER' && branchId && branchId !== '') {
            setSelectedBranchId(branchId);
            setIsRestricted(true);
        }
    }, []);

    const fetchBranches = async () => {
        try {
            const res = await api.get('/branches');
            setBranches(res.data);
        } catch (error) {
            console.error("Gagal mengambil data cabang", error);
        }
    };

    const fetchSales = async (branchId: string = "all") => {
        setLoading(true);
        try {
            const res = await api.get('/sales', {
                params: { branchId }
            });
            // Filter hanya transaksi POS
            const posData = res.data.filter((s: any) => s.invoiceNumber?.startsWith('POS-'));
            setSales(posData);
        } catch (error) {
            console.error("Gagal mengambil data laporan POS", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
        fetchSales(selectedBranchId);
    }, [selectedBranchId]);

    const stats = useMemo(() => {
        const gross = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const commission = sales.reduce((sum, s) => sum + (s.totalCommission || 0), 0);
        const net = gross - commission;
        return { gross, commission, net };
    }, [sales]);

    const filteredSales = sales.filter(sale => 
        sale.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleViewInvoice = (id: number) => {
        setSelectedSaleId(id);
        setIsInvoiceModalOpen(true);
    };

    const handleExport = () => {
        const token = localStorage.getItem('jwt_token');
        const url = `${api.defaults.baseURL}/sales/export?branchId=${selectedBranchId}&token=${token}`;
        window.open(url, '_blank');
    };

    return (
        <DashboardLayout>
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <Monitor className="h-8 w-8 text-emerald-600" />
                        Laporan Kasir (POS)
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 font-medium">Monitoring transaksi retail harian dan komisi pihak ketiga.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Download className="h-4 w-4" /> Export Laporan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-all">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Omzet (Gross)</p>
                    <p className="text-xl font-black text-slate-900">Rp {stats.gross.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-all">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Potongan Platform</p>
                    <p className="text-xl font-black text-red-600">Rp {stats.commission.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-emerald-500 hover:shadow-lg transition-all bg-emerald-50/30">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Net Settlement (Cair)</p>
                    <p className="text-2xl font-black text-emerald-700">Rp {stats.net.toLocaleString()}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <div className="relative w-full sm:w-80 group text-slate-900">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Cari nomor invoice..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-medium"
                            />
                        </div>

                        <div className="relative w-full sm:w-64 group">
                            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10" />
                            <select
                                value={selectedBranchId}
                                onChange={(e) => setSelectedBranchId(e.target.value)}
                                disabled={isRestricted}
                                className={`w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm focus:border-emerald-500 focus:outline-none transition-all font-bold text-slate-700 shadow-sm ${isRestricted ? 'cursor-not-allowed bg-slate-50' : 'cursor-pointer'}`}
                            >
                                {!isRestricted && (
                                    <>
                                        <option value="all">Semua Cabang</option>
                                        <option value="null">Kantor Pusat</option>
                                    </>
                                )}
                                {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold text-[10px]">▼</div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto text-xs">
                    <table className="w-full border-collapse text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Tanggal & Waktu</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">No. Invoice</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Channel / Notes</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase tracking-wider text-[10px]">Potongan</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase tracking-wider text-[10px]">Total (Gross)</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase tracking-wider text-[10px]">Net Settlement</th>
                                <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse"><td colSpan={7} className="px-6 py-6"><div className="h-4 w-full rounded bg-slate-100"></div></td></tr>
                                ))
                            ) : filteredSales.length > 0 ? (
                                filteredSales.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-emerald-50/30 transition-colors group">
                                        <td className="px-6 py-4 text-slate-700">
                                            <div className="font-bold">{new Date(sale.date).toLocaleDateString('id-ID')}</div>
                                            <div className="text-[10px] text-slate-400">{new Date(sale.createdAt).toLocaleTimeString('id-ID')}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-slate-900 font-mono">{sale.invoiceNumber}</div>
                                            <div className="text-[9px] text-slate-400">ID: #{sale.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                    sale.notes?.includes('GOFOOD') ? 'bg-red-100 text-red-700' :
                                                    sale.notes?.includes('GRABFOOD') ? 'bg-green-100 text-green-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {sale.notes || 'REGULAR'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-red-600 font-bold">
                                            {sale.totalCommission > 0 ? `-Rp ${sale.totalCommission.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-slate-900">
                                            Rp {sale.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-emerald-700 text-sm">
                                            Rp {(sale.totalAmount - (sale.totalCommission || 0)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handleViewInvoice(sale.id)}
                                                    className="rounded-lg bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
                                                    title="Cetak Struk"
                                                >
                                                    <Printer className="h-4 w-4" />
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
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium italic">Belum ada transaksi POS hari ini.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <InvoiceModal 
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                saleId={selectedSaleId!}
            />
        </DashboardLayout>
    );
}

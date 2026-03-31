"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FileText, Plus, CheckCircle2, Search, Filter, Calendar, Zap, AlertCircle } from "lucide-react";
import api from "@/lib/api";

export default function AdminBillingPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    
    // Form Generate
    const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
    const [genYear, setGenYear] = useState(new Date().getFullYear());

    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const res = await api.get("/billing");
            setInvoices(res.data);
        } catch (error) {
            console.error("Gagal mengambil data billing:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!confirm(`Generate invoice massal untuk periode ${genMonth}/${genYear}?`)) return;
        
        setGenerating(true);
        try {
            const res = await api.post("/admin/billing/generate", {
                month: genMonth,
                year: genYear
            });
            alert(res.data.message + `\nCreated: ${res.data.details.created}, Skipped: ${res.data.details.skipped}`);
            fetchInvoices();
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal men-generate invoice.");
        } finally {
            setGenerating(false);
        }
    };

    const handleMarkAsPaid = async (id: number) => {
        if (!confirm("Tandai invoice ini sebagai LUNAS?")) return;

        try {
            await api.patch(`/admin/billing/${id}/pay`);
            fetchInvoices();
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal memperbarui status.");
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const filteredInvoices = invoices.filter(inv => 
        inv.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Manajemen Billing SaaS</h1>
                    <p className="mt-1 text-sm text-slate-500">Kelola penagihan, generate invoice massal, dan verifikasi pembayaran client.</p>
                </div>
                
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <select 
                            value={genMonth}
                            onChange={(e) => setGenMonth(parseInt(e.target.value))}
                            className="text-sm font-medium bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            {[...Array(12)].map((_, i) => (
                                <option key={i+1} value={i+1}>Bulan {i+1}</option>
                            ))}
                        </select>
                        <select 
                            value={genYear}
                            onChange={(e) => setGenYear(parseInt(e.target.value))}
                            className="text-sm font-medium bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                        </select>
                    </div>
                    <button 
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                    >
                        <Zap className={`h-4 w-4 ${generating ? 'animate-pulse' : ''}`} />
                        {generating ? 'Processing...' : 'Generate Invoices'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Cari tenant atau no. invoice..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Tenant / Invoice</th>
                                <th className="px-6 py-4 font-semibold">Periode</th>
                                <th className="px-6 py-4 font-semibold">Contract Detail</th>
                                <th className="px-6 py-4 font-semibold">Total Tagihan</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading data...</td>
                                </tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <FileText className="h-10 w-10 text-slate-200 mb-3" />
                                            <p className="text-slate-400">Belum ada data invoice untuk periode ini.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800">{inv.company?.name}</p>
                                            <p className="text-xs font-mono text-slate-400">{inv.invoiceNumber}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-slate-700">Bulan {inv.month}/{inv.year}</p>
                                            <p className="text-xs text-slate-400 whitespace-nowrap">Due: {new Date(inv.dueDate).toLocaleDateString('id-ID')}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${inv.contractType === 'BULANAN' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {inv.contractType === 'BULANAN' ? 'Bulanan' : 'Tahunan'}
                                            </span>
                                            <p className="text-xs text-slate-500 mt-1">Val: {formatCurrency(inv.contractValue)} / {inv.employeeLimit} pax</p>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-indigo-600">
                                            {formatCurrency(inv.amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {inv.status === 'PAID' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> LUNAS
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                                    UNPAID
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {inv.status === 'UNPAID' && (
                                                <button 
                                                    onClick={() => handleMarkAsPaid(inv.id)}
                                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md flex items-center gap-1 ml-auto"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Set PAID
                                                </button>
                                            )}
                                            {inv.status === 'PAID' && (
                                                <p className="text-xs text-slate-400 font-medium whitespace-nowrap">
                                                    Paid: {new Date(inv.paidAt).toLocaleDateString('id-ID')}
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-start gap-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                 <div>
                    <h4 className="font-bold text-amber-800">Tips Operasional SuperAdmin</h4>
                    <p className="text-sm text-amber-700 mt-1">
                        Disarankan untuk melakukan **Generate Invoices** secara massal pada tanggal 1 setiap bulannya. Sistem akan secara otomatis menghitung tagihan berdasarkan tipe kontrak masing-masing tenant (Lumsum atau Satuan per Karyawan).
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}

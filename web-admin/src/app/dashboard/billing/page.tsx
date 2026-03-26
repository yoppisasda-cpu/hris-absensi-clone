"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FileText, Download, CreditCard, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import api from "@/lib/api";

export default function BillingPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const router = useRouter();

    useEffect(() => {
        const role = localStorage.getItem("userRole");
        if (role && role !== "OWNER" && role !== "SUPERADMIN") {
            router.push("/dashboard");
            return;
        }
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PAID":
                return (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> LUNAS
                    </span>
                );
            case "UNPAID":
                return (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                        <Clock className="h-3.5 w-3.5" /> MENUNGGU PEMBAYARAN
                    </span>
                );
            case "CANCELLED":
                return (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        DIBATALKAN
                    </span>
                );
            default:
                return null;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 text-slate-500">Tagihan & Pembayaran</h1>
                <p className="mt-1 text-sm text-slate-500">Kelola riwayat invoice dan status berlangganan SaaS Anda.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="p-3 bg-blue-50 rounded-xl w-fit mb-4">
                        <CreditCard className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Tagihan Terakhir</p>
                    <h3 className="text-2xl font-bold mt-1">
                        {invoices.length > 0 ? formatCurrency(invoices[0].amount) : "Rp 0"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2">
                        {invoices.length > 0 ? `Bulan ${invoices[0].month}/${invoices[0].year}` : "-"}
                    </p>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="p-3 bg-amber-50 rounded-xl w-fit mb-4">
                        <AlertCircle className="h-6 w-6 text-amber-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Menunggu Pembayaran</p>
                    <h3 className="text-2xl font-bold mt-1">
                        {invoices.filter(i => i.status === "UNPAID").length} Invoice
                    </h3>
                    <p className="text-xs text-slate-400 mt-2">Segera lakukan pelunasan untuk menjaga akses.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-none">
                    <div className="p-3 bg-white/20 rounded-xl w-fit mb-4">
                        <FileText className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-sm font-medium opacity-80">Total Riwayat</p>
                    <h3 className="text-2xl font-bold mt-1">{invoices.length} Terbit</h3>
                    <p className="text-xs opacity-70 mt-2">Semua histori penagihan Anda tersimpan aman.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-bold text-slate-800">Riwayat Invoice</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">No. Invoice</th>
                                <th className="px-6 py-4 font-semibold">Periode</th>
                                <th className="px-6 py-4 font-semibold">Tipe / Item</th>
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
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <FileText className="h-10 w-10 text-slate-200 mb-3" />
                                            <p className="text-slate-400">Belum ada data tagihan.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs font-semibold text-slate-600">
                                                {inv.invoiceNumber}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-slate-800">Bulan {inv.month}/{inv.year}</p>
                                            <p className="text-xs text-slate-400">Jatuh tempo: {new Date(inv.dueDate).toLocaleDateString('id-ID')}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-slate-700">{inv.contractType}</p>
                                            <p className="text-xs text-slate-400">{inv.employeeLimit} Karyawan</p>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900">
                                            {formatCurrency(inv.amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(inv.status)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                title="Cetak Invoice"
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 bg-blue-50 rounded-2xl p-6 border border-blue-100 flex items-start gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                    <h4 className="font-bold text-blue-800">Catatan Pembayaran</h4>
                    <p className="text-sm text-blue-700 mt-1">
                        Sistem aivola saat ini baru mendukung transfer bank manual. Silakan transfer ke rekening: 
                        <span className="font-bold"> Bank BCA 1234.567.890 a/n PT Aivola AI Nusantara</span>. 
                        Setelah transfer, silakan lampirkan bukti pembayaran via WhatsApp PIC Admin kami untuk verifikasi.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}

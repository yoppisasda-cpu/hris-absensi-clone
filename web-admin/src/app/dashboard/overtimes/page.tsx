'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Watch, CheckCircle, XCircle, Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

interface OvertimeRequest {
    id: number;
    userId: number;
    user: {
        name: string;
        email: string;
        overtimeRate: number;
    };
    date: string;
    durationHours: number;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
}

export default function OvertimesPage() {
    const [requests, setRequests] = useState<OvertimeRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/overtimes');
            setRequests(res.data);
        } catch (error) {
            console.error('Failed to fetch overtime requests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleUpdateStatus = async (id: number, status: 'APPROVED' | 'REJECTED') => {
        if (!confirm(`Apakah Anda yakin ingin ${status === 'APPROVED' ? 'MENYETUJUI' : 'MENOLAK'} lembur ini?`)) return;

        try {
            await api.patch(`/overtimes/${id}`, { status });
            fetchRequests();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Gagal memperbarui status lembur.');
        }
    };

    const handleExportExcel = () => {
        if (requests.length === 0) return;

        const exportData = requests.map(r => ({
            'Nama Karyawan': r.user.name,
            'Email': r.user.email,
            'Tanggal Lembur': new Date(r.date).toLocaleDateString('id-ID'),
            'Durasi (Jam)': r.durationHours,
            'Tarif per Jam': r.user.overtimeRate,
            'Total Bayaran': r.durationHours * r.user.overtimeRate,
            'Alasan': r.reason,
            'Status': r.status,
            'Diajukan Pada': new Date(r.createdAt).toLocaleString('id-ID'),
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Lembur");

        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Laporan_Lembur_${date}.xlsx`);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Manajemen Lembur (Overtime)</h1>
                    <p className="text-sm text-slate-500">Tinjau dan setujui pengajuan lembur karyawan.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari nama, email, atau alasan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <button
                        onClick={handleExportExcel}
                        disabled={isLoading || requests.length === 0}
                        className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition disabled:opacity-50"
                    >
                        <Download className="h-4 w-4" /> Export Excel
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700">
                            <tr>
                                <th className="px-6 py-4 font-medium">Tanggal Lembur</th>
                                <th className="px-6 py-4 font-medium">Karyawan</th>
                                <th className="px-6 py-4 font-medium">Durasi & Tarif</th>
                                <th className="px-6 py-4 font-medium">Alasan</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Memuat data...</td></tr>
                            ) : requests.filter(r =>
                                r.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                r.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                r.reason.toLowerCase().includes(searchQuery.toLowerCase())
                            ).length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-500">
                                        <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                        <p className="font-medium text-lg mb-1">Tidak ada hasil ditemukan</p>
                                        <p className="text-sm">Tidak ada data lembur yang cocok dengan "{searchQuery}"</p>
                                    </td>
                                </tr>
                            ) : (
                                requests.filter(r =>
                                    r.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    r.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    r.reason.toLowerCase().includes(searchQuery.toLowerCase())
                                ).map(req => {
                                    const d = new Date(req.date);
                                    const estimatedPay = req.durationHours * req.user.overtimeRate;

                                    return (
                                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-800">{req.user.name}</p>
                                                <p className="text-xs text-slate-500">{req.user.email}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-blue-600">{req.durationHours} Jam</p>
                                                <p className="text-xs text-slate-500">{formatCurrency(req.user.overtimeRate)}/jam (Est. {formatCurrency(estimatedPay)})</p>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs truncate" title={req.reason}>
                                                {req.reason}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${req.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    req.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                    {req.status === 'APPROVED' ? 'Disetujui' : req.status === 'REJECTED' ? 'Ditolak' : 'Menunggu'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {req.status === 'PENDING' ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleUpdateStatus(req.id, 'APPROVED')}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 font-medium"
                                                        >
                                                            <CheckCircle className="h-3.5 w-3.5" />
                                                            Setujui
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(req.id, 'REJECTED')}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 font-medium"
                                                        >
                                                            <XCircle className="h-3.5 w-3.5" />
                                                            Tolak
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">Selesai</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}

'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { CalendarDays, CheckCircle, XCircle, Clock, User, Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

interface LeaveRequest {
    id: number;
    userId: number;
    user: {
        name: string;
        email: string;
        remainingQuota?: number;
    };
    startDate: string;
    endDate: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
}

export default function LeavesPage() {
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchLeaves = async () => {
        try {
            const response = await api.get('/leaves');
            setLeaves(response.data);
        } catch (err: any) {
            setError('Gagal memuat data pengajuan cuti.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, []);

    const handleUpdateStatus = async (id: number, status: 'APPROVED' | 'REJECTED') => {
        try {
            await api.patch(`/leaves/${id}`, { status });
            // Update local state atau fetch ulang
            setLeaves(prev => prev.map(item => item.id === id ? { ...item, status } : item));
        } catch (err: any) {
            alert('Gagal memperbarui status: ' + (err.response?.data?.error || 'Kesalahan Server'));
        }
    };

    const handleExportExcel = () => {
        if (leaves.length === 0) return;

        const exportData = leaves.map(l => ({
            'Nama Karyawan': l.user.name,
            'Email': l.user.email,
            'Sisa Cuti': l.user.remainingQuota ?? '-',
            'Tanggal Mulai': new Date(l.startDate).toLocaleDateString('id-ID'),
            'Tanggal Selesai': new Date(l.endDate).toLocaleDateString('id-ID'),
            'Alasan': l.reason,
            'Status': l.status,
            'Diajukan Pada': new Date(l.createdAt).toLocaleString('id-ID'),
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Cuti");

        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Laporan_Cuti_${date}.xlsx`);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
            case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200';
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Manajemen Cuti</h1>
                    <p className="text-sm text-slate-500">Tinjau dan proses permohonan istirahat/izin karyawan.</p>
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
                        disabled={isLoading || leaves.length === 0}
                        className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition disabled:opacity-50"
                    >
                        <Download className="h-4 w-4" /> Export Excel
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-red-500">{error}</div>
                ) : leaves.filter(l =>
                    l.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    l.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    l.reason.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-500">
                        <Search className="h-12 w-12 text-slate-200 mb-4" />
                        <p className="font-medium text-lg mb-1">Tidak ada hasil ditemukan</p>
                        <p className="text-sm">Tidak ada data cuti yang cocok dengan "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Karyawan</th>
                                    <th className="px-6 py-4">Durasi / Tanggal</th>
                                    <th className="px-6 py-4">Alasan</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Aksi HRD</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leaves.filter(l =>
                                    l.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    l.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    l.reason.toLowerCase().includes(searchQuery.toLowerCase())
                                ).map((leave) => (
                                    <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <User className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{leave.user.name}</p>
                                                    <p className="text-xs text-slate-400">{leave.user.email}</p>
                                                    {leave.user.remainingQuota !== undefined && (
                                                        <span className="inline-flex mt-1 items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                            Sisa Cuti: {leave.user.remainingQuota} Hari
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-slate-700 font-medium">
                                                    {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                                                </span>
                                                <span className="text-xs text-slate-400">Dimohon pada {formatDate(leave.createdAt)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs truncate">
                                            <p className="text-slate-600 italic">"{leave.reason}"</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusStyle(leave.status)}`}>
                                                {leave.status === 'PENDING' ? 'Menunggu' : leave.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {leave.status === 'PENDING' ? (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleUpdateStatus(leave.id, 'APPROVED')}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200"
                                                        title="Setujui"
                                                    >
                                                        <CheckCircle className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(leave.id, 'REJECTED')}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                                                        title="Tolak"
                                                    >
                                                        <XCircle className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">Sudah Diproses</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

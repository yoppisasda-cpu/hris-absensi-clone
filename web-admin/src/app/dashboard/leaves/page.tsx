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
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Manajemen Cuti</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 italic">Tinjau dan proses permohonan istirahat/izin tim perusahaan.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cari nama, email, atau alasan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm bg-slate-900/50 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-500"
                        />
                    </div>
                    <button
                        onClick={handleExportExcel}
                        disabled={isLoading || leaves.length === 0}
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black italic uppercase tracking-widest text-white hover:bg-emerald-700 transition disabled:opacity-50 shadow-lg shadow-emerald-500/10 border border-emerald-500/20"
                    >
                        <Download className="h-4 w-4" /> Export Excel
                    </button>
                </div>
            </div>

            <div className="bg-slate-900/50 rounded-[32px] border border-slate-700 overflow-hidden shadow-sm backdrop-blur-xl">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-red-400 font-black italic uppercase tracking-widest">{error}</div>
                ) : leaves.filter(l =>
                    l.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    l.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    l.reason.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-500">
                        <Search className="h-12 w-12 text-slate-800 mb-4" />
                        <p className="text-xl font-black italic tracking-tighter text-slate-300 uppercase mb-1">Tidak ada hasil ditemukan</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Tidak ada data cuti yang cocok dengan "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#050505] border-b border-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-[0.2em]">
                                <tr>
                                    <th className="px-6 py-5 italic">Karyawan</th>
                                    <th className="px-6 py-5 italic">Durasi / Tanggal</th>
                                    <th className="px-6 py-5 italic">Alasan</th>
                                    <th className="px-6 py-5 italic text-center">Status</th>
                                    <th className="px-6 py-5 text-right italic">Aksi HRD</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 transition-all">
                                {leaves.filter(l =>
                                    l.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    l.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    l.reason.toLowerCase().includes(searchQuery.toLowerCase())
                                ).map((leave) => (
                                    <tr key={leave.id} className="hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                                    <User className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-black italic text-white uppercase tracking-tighter">{leave.user.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">{leave.user.email}</p>
                                                    {leave.user.remainingQuota !== undefined && (
                                                        <span className="inline-flex mt-2 items-center px-1.5 py-0.5 rounded-lg text-[9px] font-black italic uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                            Sisa: {leave.user.remainingQuota} Hari
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-white font-black italic text-xs uppercase tracking-tight">
                                                    {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dimohon {formatDate(leave.createdAt)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 max-w-xs truncate">
                                            <p className="text-slate-400 italic font-medium text-xs">"{leave.reason}"</p>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black italic uppercase tracking-[0.15em] border ${leave.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : leave.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                                                {leave.status === 'PENDING' ? 'Menunggu' : leave.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            {leave.status === 'PENDING' ? (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleUpdateStatus(leave.id, 'APPROVED')}
                                                        className="p-2 text-emerald-400 hover:text-white hover:bg-emerald-500/20 rounded-xl transition-all border border-emerald-500/20"
                                                        title="Setujui"
                                                    >
                                                        <CheckCircle className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(leave.id, 'REJECTED')}
                                                        className="p-2 text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all border border-red-500/20"
                                                        title="Tolak"
                                                    >
                                                        <XCircle className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 italic">Terproses</span>
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

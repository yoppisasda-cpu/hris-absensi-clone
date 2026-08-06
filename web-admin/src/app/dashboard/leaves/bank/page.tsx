'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { CalendarDays, User, Download, Search, ArrowLeft, Edit2, CheckCircle, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import Link from 'next/link';

interface LeaveBankData {
    id: number;
    name: string;
    email: string;
    jobTitle: string;
    division: string;
    totalQuota: number;
    usedQuota: number;
    remainingQuota: number;
}

export default function LeavesBankPage() {
    const [bankData, setBankData] = useState<LeaveBankData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [userRole, setUserRole] = useState<string | null>(null);

    // Modal state
    const [editingUser, setEditingUser] = useState<LeaveBankData | null>(null);
    const [newQuota, setNewQuota] = useState<number>(12);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchBankData = async () => {
        try {
            const response = await api.get('/leaves/bank');
            setBankData(response.data);
        } catch (err: any) {
            setError('Gagal memuat data bank cuti.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBankData();
        setUserRole(localStorage.getItem('userRole'));
    }, []);

    const handleUpdateQuota = async () => {
        if (!editingUser) return;
        setIsUpdating(true);
        try {
            await api.patch(`/leaves/bank/${editingUser.id}`, {
                annualLeaveQuota: newQuota
            });
            // Update local state
            setBankData(prev => prev.map(u => 
                u.id === editingUser.id ? { 
                    ...u, 
                    totalQuota: newQuota, 
                    remainingQuota: newQuota - u.usedQuota 
                } : u
            ));
            setEditingUser(null);
        } catch (err: any) {
            alert('Gagal mengupdate kuota cuti: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsUpdating(false);
        }
    };

    const handleExportExcel = () => {
        if (bankData.length === 0) return;

        const exportData = bankData.map(d => ({
            'Nama Karyawan': d.name,
            'Email': d.email,
            'Divisi': d.division || '-',
            'Jabatan': d.jobTitle || '-',
            'Kuota Tahunan': d.totalQuota,
            'Terpakai': d.usedQuota,
            'Sisa Cuti': d.remainingQuota,
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Cuti");

        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Laporan_Bank_Cuti_${date}.xlsx`);
    };

    const filteredData = bankData.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.division && d.division.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Link href="/dashboard/leaves" className="text-slate-500 hover:text-white transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Bank Cuti Karyawan</h1>
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 italic pl-8">Tinjau saldo dan penggunaan cuti seluruh karyawan tahun ini.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cari karyawan atau divisi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm bg-slate-900/50 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-500"
                        />
                    </div>
                    <button
                        onClick={handleExportExcel}
                        disabled={isLoading || bankData.length === 0}
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
                ) : filteredData.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-500">
                        <Search className="h-12 w-12 text-slate-800 mb-4" />
                        <p className="text-xl font-black italic tracking-tighter text-slate-300 uppercase mb-1">Tidak ada hasil ditemukan</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Tidak ada data karyawan yang cocok dengan "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#050505] border-b border-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-[0.2em]">
                                <tr>
                                    <th className="px-6 py-5 italic">Karyawan</th>
                                    <th className="px-6 py-5 italic text-center">Jatah Tahunan</th>
                                    <th className="px-6 py-5 italic text-center">Terpakai</th>
                                    <th className="px-6 py-5 italic text-center">Sisa Cuti</th>
                                    {['ADMIN', 'OWNER', 'SUPERADMIN'].includes(userRole || '') && (
                                        <th className="px-6 py-5 italic text-center">Aksi</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 transition-all">
                                {filteredData.map((data) => (
                                    <tr key={data.id} className="hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                                    <User className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-black italic text-white uppercase tracking-tighter">{data.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">{data.division || '-'} • {data.jobTitle || '-'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black italic uppercase tracking-widest bg-slate-500/10 text-slate-300 border border-slate-500/30">
                                                {data.totalQuota} Hari
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black italic uppercase tracking-widest border ${data.usedQuota > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-500/10 text-slate-400 border-slate-500/30'}`}>
                                                {data.usedQuota} Hari
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-black italic uppercase tracking-widest border ${data.remainingQuota > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/5' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                                                {data.remainingQuota} Hari
                                            </span>
                                        </td>
                                        {['ADMIN', 'OWNER', 'SUPERADMIN'].includes(userRole || '') && (
                                            <td className="px-6 py-5 text-center">
                                                <button
                                                    onClick={() => {
                                                        setEditingUser(data);
                                                        setNewQuota(data.totalQuota);
                                                    }}
                                                    className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-500/20 rounded-xl transition-all border border-indigo-500/20"
                                                    title="Edit Jatah Cuti"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-[32px] bg-[#050505] p-8 border border-slate-800 shadow-2xl">
                        <div className="mb-6 text-center">
                            <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">Edit Jatah Cuti</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{editingUser.name}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    Jatah Cuti Tahunan (Hari)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={newQuota}
                                    onChange={(e) => setNewQuota(parseInt(e.target.value) || 0)}
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                                />
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mt-4">
                                <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest leading-relaxed">
                                    Peringatan: Mengubah jatah tahunan akan secara langsung mempengaruhi sisa saldo cuti milik karyawan saat ini.
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-xs font-black italic text-slate-400 uppercase tracking-widest hover:bg-slate-800 transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleUpdateQuota}
                                disabled={isUpdating}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-xs font-black italic text-white uppercase tracking-widest hover:bg-indigo-700 transition disabled:opacity-50"
                            >
                                {isUpdating ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4" /> Simpan
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

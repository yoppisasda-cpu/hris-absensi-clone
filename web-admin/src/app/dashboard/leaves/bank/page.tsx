'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { CalendarDays, User, Download, Search, ArrowLeft } from 'lucide-react';
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
    }, []);

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

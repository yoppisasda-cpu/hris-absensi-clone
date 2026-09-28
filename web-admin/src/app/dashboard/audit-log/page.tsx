'use client';

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ShieldCheck, Calendar, Clock, User, FileText, AlertTriangle } from "lucide-react";
import api from "@/lib/api";

export default function AuditLogPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLogs = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/audit-logs');
            setLogs(res.data);
        } catch (error) {
            console.error("Failed to fetch audit logs", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-12 w-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-rose-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-widest italic">Audit Log <span className="text-rose-500">Sistem</span></h1>
                        <p className="text-sm text-slate-400 mt-1">Pantau aktivitas krusial seperti penghapusan transaksi dan data lainnya</p>
                    </div>
                </div>

                <div className="bg-[#050505] rounded-[24px] border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                        <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3 text-rose-500" />
                            Riwayat Aktivitas Terakhir
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] whitespace-nowrap">Waktu</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] whitespace-nowrap">User</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] whitespace-nowrap">Aksi</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] whitespace-nowrap">Target Data</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] whitespace-nowrap">Detail Tambahan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-500 text-sm italic">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="h-4 w-4 rounded-full border-2 border-rose-500 border-t-transparent animate-spin"></div>
                                                Memuat data audit log...
                                            </div>
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-500 text-sm italic">
                                            Belum ada log aktivitas krusial yang terekam.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => {
                                        let detailsObj: any = {};
                                        try {
                                            if (log.details) detailsObj = JSON.parse(log.details);
                                        } catch (e) {}

                                        return (
                                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                                        <Calendar className="h-4 w-4 text-slate-500" />
                                                        {new Date(log.createdAt).toLocaleDateString('id-ID')}
                                                        <Clock className="h-3 w-3 text-slate-500 ml-2" />
                                                        <span className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleTimeString('id-ID')}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                                            <User className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-white">{log.userName || 'Unknown'}</div>
                                                            <div className="text-[10px] text-slate-500 font-mono tracking-wider">ID: {log.userId || '-'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black tracking-widest uppercase italic ${
                                                        log.action.includes('DELETE') ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                    }`}>
                                                        {log.action.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-slate-500" />
                                                        <span className="text-sm font-bold text-slate-300">{log.entity}</span>
                                                        <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 rounded-md">{log.entityId}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {detailsObj.totalAmount !== undefined && (
                                                        <div className="text-xs text-slate-400">
                                                            Nilai: <span className="font-bold text-rose-400">{formatCurrency(detailsObj.totalAmount)}</span>
                                                        </div>
                                                    )}
                                                    {detailsObj.date && (
                                                        <div className="text-xs text-slate-500 mt-1">
                                                            Tgl Trx: {new Date(detailsObj.date).toLocaleDateString('id-ID')}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

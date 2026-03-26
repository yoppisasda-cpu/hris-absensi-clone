'use client';

import { useState, useEffect } from 'react';
import { ArrowUpCircle, Search, Filter, Calendar, AlertCircle, ShoppingBag, User, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function ReceivablesPage() {
    const [receivables, setReceivables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchReceivables();
    }, []);

    const fetchReceivables = async () => {
        try {
            const res = await api.get('/finance/reports/receivable');
            setReceivables(res.data);
        } catch (error) {
            console.error("Gagal mengambil data piutang", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = receivables.filter(r => 
        (r.customerName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalPiutang = filteredData.reduce((sum, r) => sum + r.totalAmount, 0);

    return (
        <DashboardLayout>
            <div className="p-0 space-y-6 animate-in fade-in duration-500 overflow-y-auto max-h-[90vh]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                            <ArrowUpCircle className="h-8 w-8 text-blue-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black italic tracking-tight text-slate-900 uppercase">Buku Piutang (Receivables)</h1>
                            <p className="text-sm text-slate-500 font-medium">Lacak semua penjualan yang belum dibayar oleh Pelanggan.</p>
                        </div>
                    </div>
                    <div className="bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100 text-right">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Piutang Outstanding</p>
                        <p className="text-2xl font-black text-blue-600">Rp {totalPiutang.toLocaleString()}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Cari berdasarkan Pelanggan atau No. Invoice..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-200 focus:border-blue-500 outline-none transition-all shadow-sm font-medium"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="flex-1 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all font-bold text-slate-600">
                            <Filter className="h-4 w-4" /> Filter
                        </button>
                        <button onClick={fetchReceivables} className="flex-1 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100">
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Invoice</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pelanggan</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Penjualan</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Piutang</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4"><div className="h-10 bg-slate-100 rounded-lg w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                                                <AlertCircle className="h-6 w-6 text-slate-300" />
                                            </div>
                                            <p className="text-slate-400 font-bold italic tracking-tight uppercase text-xs">Tidak ada piutang ditemukan</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((r) => {
                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <ShoppingBag className="h-4 w-4 text-slate-400" />
                                                    <span className="text-sm font-black text-slate-900">{r.invoiceNumber}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                                                        <User className="h-5 w-5 text-slate-400" />
                                                    </div>
                                                    <p className="text-sm font-black text-slate-900">{r.customerName || 'Guest / Umum'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-slate-400" />
                                                    <span className="text-sm font-bold text-slate-600">
                                                        {new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-sm font-black text-blue-600">Rp {r.totalAmount.toLocaleString()}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => window.location.href = '/dashboard/sales'}
                                                    className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1 active:scale-95"
                                                >
                                                    <CheckCircle2 className="h-3 w-3" /> Lunasi
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black italic tracking-tighter flex items-center gap-2 text-blue-400">
                                📊 Strategi Penagihan (Receivable Info)
                            </h3>
                            <p className="text-slate-400 text-sm max-w-md">Kirimkan invoice melalui WhatsApp atau Email secara berkala untuk mempercepat perputaran kas bisnis Anda.</p>
                        </div>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
                </div>
            </div>
        </DashboardLayout>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { ArrowDownCircle, Search, Filter, Calendar, AlertCircle, ChevronRight, Wallet, User, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import DashboardLayout from "@/components/layout/DashboardLayout";
import PayDebtModal from "@/components/finance/PayDebtModal";

export default function PayablesPage() {
    const [payables, setPayables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Quick Pay States
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any>(null);
    const [payLoading, setPayLoading] = useState(false);

    useEffect(() => {
        fetchPayables();
        fetchAccounts();
    }, []);

    const fetchPayables = async () => {
        try {
            const res = await api.get('/finance/reports/payable');
            setPayables(res.data);
        } catch (error) {
            console.error("Gagal mengambil data hutang", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/finance/accounts');
            setAccounts(res.data);
        } catch (error) {
            console.error("Gagal mengambil daftar akun", error);
        }
    };

    const handlePay = async (accountId: string) => {
        if (!selectedExpense) return;
        setPayLoading(true);
        try {
            await api.post(`/finance/expense/${selectedExpense.id}/pay`, { accountId });
            alert("Hutang berhasil dilunasi!");
            setIsPayModalOpen(false);
            fetchPayables(); // Refresh list (paid item will disappear from this view)
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal melunasi hutang");
        } finally {
            setPayLoading(false);
        }
    };

    const filteredData = payables.filter(p => 
        (p.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.paidTo?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalHutang = filteredData.reduce((sum, p) => sum + p.amount, 0);

    return (
        <DashboardLayout>
            <div className="p-0 space-y-6 animate-in fade-in duration-500 overflow-y-auto max-h-[90vh]">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-6 rounded-3xl shadow-sm border border-slate-700">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                            <ArrowDownCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black italic tracking-tight text-white uppercase">Buku Hutang (Payables)</h1>
                            <p className="text-sm text-slate-400 font-medium">Lacak semua pengeluaran tempo yang belum dibayar ke Supplier.</p>
                        </div>
                    </div>
                    <div className="bg-red-900/30 px-6 py-3 rounded-2xl border border-red-800 text-right">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Total Hutang Outstanding</p>
                        <p className="text-2xl font-black text-red-500">Rp {totalHutang.toLocaleString()}</p>
                    </div>
                </div>

                {/* Filter & Search */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <input 
                            type="text"
                            placeholder="Cari berdasarkan Supplier atau Keterangan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-900/50 rounded-2xl border border-slate-700 text-white focus:border-blue-500 outline-none transition-all shadow-sm font-medium placeholder:text-slate-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="flex-1 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all font-bold text-slate-600">
                            <Filter className="h-4 w-4" /> Filter
                        </button>
                        <button onClick={fetchPayables} className="flex-1 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100">
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier / Penerima</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jatuh Tempo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Jumlah</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4"><div className="h-10 bg-slate-100 rounded-lg w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                                                <AlertCircle className="h-6 w-6 text-slate-300" />
                                            </div>
                                            <p className="text-slate-400 font-bold italic tracking-tight uppercase text-xs">Tidak ada hutang ditemukan</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((p) => {
                                    const isOverdue = p.dueDate && new Date(p.dueDate) < new Date();
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                                                        <User className="h-5 w-5 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 leading-none">{p.supplierName || p.paidTo || 'Tanpa Nama'}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase group-hover:text-blue-500 transition-colors">{p.description || 'No description'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className={`h-4 w-4 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`} />
                                                    <span className={`text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                                                        {p.dueDate ? new Date(p.dueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                    {p.categoryName}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-sm font-black text-red-600">Rp {p.amount.toLocaleString()}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-2 w-2 rounded-full ${isOverdue ? 'bg-red-500 animate-pulse' : 'bg-red-400'}`}></div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isOverdue ? 'text-red-600' : 'text-red-400'}`}>
                                                        {isOverdue ? 'MELEWATI BATAS' : 'TEMPO'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedExpense(p);
                                                        setIsPayModalOpen(true);
                                                    }}
                                                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-100 flex items-center gap-2 mx-auto"
                                                >
                                                    <CheckCircle className="h-3 w-3" /> Bayar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Section / Quick Action */}
                <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black italic tracking-tighter flex items-center gap-2">
                                <Wallet className="h-6 w-6 text-emerald-400" /> Kelola Pembayaran Hutang
                            </h3>
                            <p className="text-slate-400 text-sm max-w-md">Pastikan saldo kas Anda mencukupi sebelum melunasi hutang ke Supplier.</p>
                        </div>
                        <button 
                            onClick={() => window.location.href = '/dashboard/finance/expense'}
                            className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center gap-2 active:scale-95 shadow-xl"
                        >
                            Pengeluaran Baru <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
                </div>
            </div>

            <PayDebtModal 
                isOpen={isPayModalOpen}
                onClose={() => setIsPayModalOpen(false)}
                onConfirm={handlePay}
                accounts={accounts}
                expense={selectedExpense}
                loading={payLoading}
            />
        </DashboardLayout>
    );
}

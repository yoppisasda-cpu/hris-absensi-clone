'use client';

import { useState, useEffect } from 'react';
import { ArrowUpCircle, Search, Filter, Calendar, AlertCircle, ShoppingBag, User, CheckCircle2, FileCheck, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function ReceivablesPage() {
    const [receivables, setReceivables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [modalData, setModalData] = useState({ id: 0, date: '', ref: '' });
    const [payData, setPayData] = useState({ id: 0, accountId: '', date: new Date().toISOString().split('T')[0] });
    const [accounts, setAccounts] = useState<any[]>([]);

    useEffect(() => {
        fetchReceivables();
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/finance/accounts');
            setAccounts(res.data);
        } catch (error) {
            console.error("Gagal mengambil data akun", error);
        }
    };

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

    const handleTukarFaktur = async (id: number, currentStatus: boolean, sale?: any) => {
        if (!currentStatus) {
            // Jika mau Tukar Faktur, buka modal dulu
            setModalData({ 
                id, 
                date: new Date().toISOString().split('T')[0], 
                ref: '' 
            });
            setIsModalOpen(true);
        } else {
            // Jika mau Batal Tukar, langsung tembak API (toggle Off)
            confirmUpdate(id, false, null, null);
        }
    };

    const confirmUpdate = async (id: number, status: boolean, date: string | null, ref: string | null) => {
        try {
            setUpdatingId(id);
            await api.patch(`/finance/sales/${id}/tukar-faktur`, { 
                isTukarFaktur: status,
                tukarFakturDate: date,
                tukarFakturRef: ref
            });
            await fetchReceivables(); // Refresh data
            setIsModalOpen(false);
        } catch (error) {
            alert("Gagal memperbarui status tukar faktur.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handlePayClick = (id: number) => {
        setPayData({ 
            id, 
            accountId: accounts.length > 0 ? accounts[0].id.toString() : '', 
            date: new Date().toISOString().split('T')[0] 
        });
        setIsPayModalOpen(true);
    };

    const confirmPayment = async () => {
        if (!payData.accountId) return alert("Pilih akun pembayaran");
        try {
            setUpdatingId(payData.id);
            await api.patch(`/finance/sales/${payData.id}/pay`, {
                accountId: payData.accountId,
                paymentDate: payData.date
            });
            await fetchReceivables();
            setIsPayModalOpen(false);
        } catch (error) {
            alert("Gagal melunasi piutang");
        } finally {
            setUpdatingId(null);
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
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
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
                                            <td className="px-6 py-4 text-center">
                                                {r.isTukarFaktur ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter flex items-center gap-1">
                                                            <FileCheck className="h-2.5 w-2.5" /> Sudah Tukar
                                                        </span>
                                                        <span className="text-[8px] text-slate-400 font-bold">
                                                            {r.tukarFakturDate ? new Date(r.tukarFakturDate).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }) : ''}
                                                            {r.tukarFakturRef && ` | ${r.tukarFakturRef}`}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="bg-slate-100 text-slate-400 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">
                                                        Belum Tukar
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleTukarFaktur(r.id, !!r.isTukarFaktur)}
                                                        disabled={updatingId === r.id}
                                                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 active:scale-95 ${r.isTukarFaktur ? 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500' : 'bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white'}`}
                                                    >
                                                        {updatingId === r.id ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <FileCheck className="h-3 w-3" />
                                                        )}
                                                        {r.isTukarFaktur ? 'Batal Tukar' : 'Tukar Faktur'}
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => handlePayClick(r.id)}
                                                        disabled={updatingId === r.id}
                                                        className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
                                                    >
                                                        {updatingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                                        Lunasi
                                                    </button>
                                                </div>
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

            {/* Modal Tukar Faktur */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <FileCheck className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black italic tracking-tight text-slate-900 uppercase">Input Tukar Faktur</h3>
                                <p className="text-xs text-slate-500 font-medium tracking-tight">Lengkapi detail penyerahan invoice.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tanggal Tukar Faktur</label>
                                <input 
                                    type="date"
                                    value={modalData.date}
                                    onChange={(e) => setModalData({...modalData, date: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">No. Tanda Terima (Opsional)</label>
                                <input 
                                    type="text"
                                    placeholder="Contoh: REF-9901..."
                                    value={modalData.ref}
                                    onChange={(e) => setModalData({...modalData, ref: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-100 transition-all"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={() => confirmUpdate(modalData.id, true, modalData.date, modalData.ref)}
                                disabled={updatingId !== null}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                            >
                                {updatingId !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                Konfirmasi
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Lunasi Piutang */}
            {isPayModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black italic tracking-tight text-slate-900 uppercase">Pelunasan Piutang</h3>
                                <p className="text-xs text-slate-500 font-medium tracking-tight">Konfirmasi pembayaran piutang pelanggan.</p>
                            </div>
                        </div>
        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Terima di Akun (Kas/Bank)</label>
                                <select 
                                    value={payData.accountId}
                                    onChange={(e) => setPayData({...payData, accountId: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700"
                                >
                                    <option value="">Pilih Akun...</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} (Rp {acc.balance.toLocaleString()})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tanggal Pelunasan</label>
                                <input 
                                    type="date"
                                    value={payData.date}
                                    onChange={(e) => setPayData({...payData, date: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700"
                                />
                            </div>
                        </div>
        
                        <div className="flex gap-3 mt-8">
                            <button 
                                onClick={() => setIsPayModalOpen(false)}
                                className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-100 transition-all"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={confirmPayment}
                                disabled={updatingId !== null || !payData.accountId}
                                className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {updatingId !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                                Lunasi Sekarang
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

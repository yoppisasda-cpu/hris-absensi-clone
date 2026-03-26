'use client';

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Plus, Search, Filter, ArrowDownLeft, Wallet, Banknote, Calendar, MoreVertical, FileText, Download, Edit3, Trash2, AlertTriangle, X } from "lucide-react";
import api from "@/lib/api";
import AddExpenseModal from "@/components/finance/AddExpenseModal";

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingExpense, setEditingExpense] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; amount: number } | null>(null);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const res = await api.get('/finance/expense');
            setExpenses(res.data);
        } catch (error) {
            console.error("Gagal mengambil data pengeluaran", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            setLoading(true);
            await api.delete(`/finance/expense/${deleteConfirm.id}`);
            alert("Pengeluaran berhasil dihapus.");
            setDeleteConfirm(null);
            fetchExpenses();
        } catch (error: any) {
            console.error("Gagal menghapus pengeluaran", error);
            alert(error.response?.data?.error || "Gagal menghapus data pengeluaran.");
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (exp: any) => {
        setEditingExpense(exp);
        setIsModalOpen(true);
    };

    const filteredExpenses = expenses.filter(exp => 
        exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.paidTo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalExpenseThisMonth = expenses
        .filter(exp => new Date(exp.date).getMonth() === new Date().getMonth() && exp.status === 'PAID')
        .reduce((sum, exp) => sum + exp.amount, 0);

    return (
        <DashboardLayout>
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 font-primary tracking-tight">Pengeluaran (Expense)</h1>
                    <p className="mt-1 text-sm text-slate-500">Kelola dan pantau semua pengeluaran operasional perusahaan.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                        <Download className="h-4 w-4" /> Export
                    </button>
                    <button 
                        onClick={() => {
                            setEditingExpense(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
                    >
                        <Plus className="h-4 w-4" /> Catat Pengeluaran
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="rounded-lg bg-red-50 p-2"><ArrowDownLeft className="h-5 w-5 text-red-600" /></div>
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full uppercase tracking-widest">Bulan Ini</span>
                    </div>
                    <p className="text-sm font-medium text-slate-500">Total Pengeluaran</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">Rp {totalExpenseThisMonth.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="rounded-lg bg-blue-50 p-2"><Wallet className="h-5 w-5 text-blue-600" /></div>
                    </div>
                    <p className="text-sm font-medium text-slate-500">Jumlah Transaksi</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{expenses.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm bg-gradient-to-br from-red-600 to-red-700 text-white border-none shadow-red-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="rounded-lg bg-white/20 p-2"><Banknote className="h-5 w-5 text-white" /></div>
                    </div>
                    <p className="text-sm font-medium text-red-100">Utang Belum Lunas</p>
                    <p className="mt-1 text-2xl font-bold">
                        Rp {expenses.filter(e => e.status === 'PENDING').reduce((s, e) => s + e.amount, 0).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 p-6">
                    <div className="relative w-full sm:w-96 group">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari transaksi, kategori, atau penerima..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Tanggal</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">No. Transaksi</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Dibayar Kepada</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Kategori</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Status</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase tracking-wider text-[11px]">Jumlah</th>
                                <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase tracking-wider text-[11px]">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && expenses.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-6 py-6"><div className="h-4 w-full rounded bg-slate-100"></div></td>
                                    </tr>
                                ))
                            ) : filteredExpenses.length > 0 ? (
                                filteredExpenses.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors group cursor-default">
                                        <td className="whitespace-nowrap px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                <span className="font-semibold text-slate-700">{new Date(exp.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 font-mono text-xs text-slate-500">EXP-{exp.id.toString().padStart(6, '0')}</td>
                                        <td className="px-6 py-5">
                                            <div className="text-sm font-bold text-slate-900">{exp.paidTo || '-'}</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">{exp.description || 'Tanpa keterangan'}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                                                {exp.category?.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                                exp.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                                {exp.status === 'PAID' ? 'LUNAS' : 'TEMPO'}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-5 text-right font-black text-red-600">
                                            Rp {exp.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => openEditModal(exp)}
                                                    className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 transition-all shadow-sm border border-blue-100 bg-white"
                                                    title="Edit Transaksi"
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteConfirm({ id: exp.id, amount: exp.amount })}
                                                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 transition-all shadow-sm border border-red-100 bg-white"
                                                    title="Hapus Transaksi"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="rounded-full bg-slate-50 p-4"><FileText className="h-8 w-8 text-slate-300" /></div>
                                            <p className="text-sm font-medium text-slate-500">Belum ada data pengeluaran.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Konfirmasi Hapus */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
                        <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-4">
                            <AlertTriangle className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Pengeluaran?</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Apakah Anda yakin ingin menghapus transaksi senilai <span className="font-bold text-slate-900">Rp {deleteConfirm.amount.toLocaleString()}</span>? 
                            Tindakan ini akan otomatis mengoreksi saldo akun terkait jika sudah lunas.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AddExpenseModal 
                isOpen={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingExpense(null);
                }} 
                onSuccess={fetchExpenses} 
                expenseToEdit={editingExpense}
            />
        </DashboardLayout>
    );
}

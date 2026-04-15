'use client';

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Plus, Landmark, Wallet, MoreVertical, Search, ArrowUpRight, ArrowDownLeft, History, Edit3, Trash2, X, AlertTriangle, Building2, Sparkles, Loader2, BrainCircuit } from "lucide-react";
import api from "@/lib/api";
import AddAccountModal from "@/components/finance/AddAccountModal";

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);

    // AI Analysis States
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const handleAiAnalysis = async () => {
        setIsAiLoading(true);
        try {
            const context = {
                type: 'FINANCIAL_ACCOUNTS_ANALYSIS',
                totalBalance: accounts.reduce((sum, acc) => sum + acc.balance, 0),
                accountDetails: accounts.map(acc => ({
                    name: acc.name,
                    type: acc.type,
                    balance: acc.balance,
                    branch: acc.branch?.name || 'Pusat'
                }))
            };

            const res = await api.post('/ai/chat', {
                message: "Lakukan analisa strategis terhadap kondisi keuangan kas dan bank saya saat ini. Berikan saran langkah konkret untuk optimalisasi arus kas dengan gaya bicara elite business consultant.",
                context: context
            });
            
            setAiInsight(res.data.reply);
        } catch (error) {
            console.error("Gagal melakukan analisa AI:", error);
            alert("Gagal memanggil asisten AI. Pastikan server sudah siap.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await api.get('/branches');
            setBranches(res.data);
        } catch (error) {
            console.error("Gagal mengambil daftar cabang", error);
        }
    };

    const fetchAccounts = async (branchId = selectedBranchId) => {
        try {
            setLoading(true);
            const url = branchId === 'all' ? '/finance/accounts' : `/finance/accounts?branchId=${branchId}`;
            const res = await api.get(url);
            setAccounts(res.data);
        } catch (error) {
            console.error("Gagal mengambil daftar akun", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;

        try {
            setLoading(true);
            await api.delete(`/finance/accounts/${deleteConfirm.id}`);
            alert("Akun berhasil dihapus.");
            setDeleteConfirm(null);
            fetchAccounts();
        } catch (error: any) {
            console.error("Gagal menghapus akun", error);
            const errorMsg = error.response?.data?.error || error.message || "Gagal menghapus akun keuangan.";
            alert("Error: " + errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (acc: any) => {
        setEditingAccount(acc);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingAccount(null);
    };

    useEffect(() => {
        fetchBranches();
        fetchAccounts();
    }, []);

    useEffect(() => {
        fetchAccounts(selectedBranchId);
    }, [selectedBranchId]);

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    return (
        <DashboardLayout>
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Kas & Bank</h1>
                    <p className="mt-1 text-sm text-slate-400">Kelola semua rekening bank dan kas tunai perusahaan Anda.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Branch Filter */}
                    <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-700 p-2 rounded-2xl shadow-sm">
                        <span className="text-xs font-bold text-slate-500 pl-2 uppercase">Cabang:</span>
                        <select 
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 cursor-pointer pr-8"
                        >
                            <option value="all">Semua Cabang</option>
                            {branches.map(branch => (
                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={handleAiAnalysis}
                        disabled={isAiLoading || accounts.length === 0}
                        className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-50 group min-w-[140px] justify-center"
                    >
                        {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 group-hover:animate-pulse" />}
                        Analisa AI
                    </button>

                    <button 
                        onClick={() => {
                            setEditingAccount(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
                    >
                        <Plus className="h-4 w-4" /> Tambah Akun
                    </button>
                </div>
            </div>

            <div className="mb-8 rounded-3xl bg-gradient-to-br from-blue-700 to-blue-900 p-8 text-white shadow-2xl shadow-blue-200 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Landmark className="h-32 w-32" />
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100/70 mb-1">Total Saldo Kas & Bank</p>
                    <h2 className="text-4xl font-black">Rp {totalBalance.toLocaleString()}</h2>
                    <div className="mt-6 flex gap-4">
                        <div className="rounded-2xl bg-white/10 px-4 py-2 backdrop-blur-md">
                            <span className="text-[10px] font-bold text-blue-200 uppercase">Aktif</span>
                            <p className="text-sm font-bold">{accounts.length} Akun</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && accounts.length === 0 ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-48 rounded-2xl border border-slate-100 bg-white animate-pulse"></div>
                    ))
                ) : accounts.length > 0 ? (
                    accounts.map((acc) => (
                        <div key={acc.id} className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all duration-300">
                            <div className="mb-4 flex items-start justify-between">
                                <div className={`rounded-xl p-3 ${acc.type === 'BANK' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {acc.type === 'BANK' ? <Landmark className="h-6 w-6" /> : <Wallet className="h-6 w-6" />}
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openEditModal(acc);
                                        }}
                                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 transition-all shadow-sm border border-blue-100 bg-white"
                                        title="Edit Akun"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteConfirm({ id: acc.id, name: acc.name });
                                        }}
                                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 transition-all shadow-sm border border-red-100 bg-white"
                                        title="Hapus Akun"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-1">
                                <h3 className="font-bold text-slate-900 leading-tight">{acc.name}</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{acc.type === 'BANK' ? 'Rekening Bank' : 'Kas Tunai'}</span>
                                    <span className="text-[10px] text-slate-300">•</span>
                                    <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600">
                                        <Building2 className="h-2.5 w-2.5" />
                                        {acc.branch?.name || 'Kantor Pusat'}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                                <div className="text-lg font-black text-slate-900">
                                    Rp {acc.balance.toLocaleString()}
                                </div>
                                <div className="flex gap-1">
                                    <button className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title='Riwayat'>
                                        <History className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full rounded-2xl border border-dashed border-slate-300 py-12 text-center">
                        <p className="text-slate-500">Belum ada akun terdaftar.</p>
                        <button 
                            onClick={() => {
                                setEditingAccount(null);
                                setIsModalOpen(true);
                            }} 
                            className="mt-2 text-sm font-bold text-blue-600 hover:underline"
                        >
                            Tambah Akun Sekarang
                        </button>
                    </div>
                )}
            </div>

            {/* Modal Konfirmasi Hapus */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
                        <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-4">
                            <AlertTriangle className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Akun?</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Apakah Anda yakin ingin menghapus akun <span className="font-bold text-slate-900">"{deleteConfirm.name}"</span>? 
                            Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all font-medium"
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

            {/* AI Insight Modal */}
            {aiInsight && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <BrainCircuit className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold leading-none">AI Strategic Insights</h3>
                                    <p className="text-violet-100 text-[10px] uppercase tracking-widest mt-1 font-bold">Financial Analysis Report</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setAiInsight(null)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto bg-slate-50/50">
                            <div className="prose prose-slate max-w-none">
                                <div className="text-slate-700 leading-relaxed whitespace-pre-line text-sm md:text-base">
                                    {aiInsight}
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-6 border-t border-slate-200">
                                <div className="bg-violet-50 rounded-2xl p-4 flex items-start gap-4 border border-violet-100">
                                    <div className="p-2 bg-violet-600 text-white rounded-lg shrink-0">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <p className="text-xs text-violet-800 leading-relaxed italic">
                                        Rekomendasi ini dibuat secara otomatis oleh Aivola AI berdasarkan data saldo saat ini. Harap tinjau kembali sebelum mengambil keputusan strategis yang signifikan.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-white border-t border-slate-100 flex justify-end shrink-0">
                            <button 
                                onClick={() => setAiInsight(null)}
                                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                            >
                                Mengerti, Terima Kasih
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AddAccountModal 
                isOpen={isModalOpen} 
                onClose={closeModal} 
                onSuccess={fetchAccounts} 
                initialData={editingAccount}
            />
        </DashboardLayout>
    );
}

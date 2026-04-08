'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Users, PieChart, Banknote, History, Plus, AlertCircle, TrendingUp, Wallet, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Shareholder {
    id: number;
    name: string;
    sharePercentage: number;
    idNumber: string;
    _count: { dividends: number };
}

interface Dividend {
    id: number;
    amount: number;
    date: string;
    description: string;
    shareholder: { name: string };
    account: { name: string };
}

export default function EquityPage() {
    const [shareholders, setShareholders] = useState<Shareholder[]>([]);
    const [history, setHistory] = useState<Dividend[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [authorizedCapital, setAuthorizedCapital] = useState(0);

    // Form States
    const [isEditCapitalOpen, setIsEditCapitalOpen] = useState(false);
    const [tempCapital, setTempCapital] = useState('');
    const [isAddOwnerOpen, setIsAddOwnerOpen] = useState(false);
    const [newOwner, setNewOwner] = useState({ name: '', sharePercentage: '', idNumber: '' });
    
    const [isDistributeOpen, setIsDistributeOpen] = useState(false);
    const [distributeForm, setDistributeForm] = useState({ totalAmount: '', accountId: '', description: '' });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [shRes, divRes, accRes, capRes] = await Promise.all([
                api.get('/finance/shareholders'),
                api.get('/finance/dividends'),
                api.get('/finance/accounts'),
                api.get('/finance/company-info')
            ]);
            setShareholders(shRes.data);
            setHistory(divRes.data);
            setAccounts(accRes.data);
            setAuthorizedCapital(capRes.data.authorizedCapital || 0);
            setTempCapital(capRes.data.authorizedCapital?.toString() || '0');
        } catch (error) {
            console.error("Error fetching equity data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddShareholder = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/finance/shareholders', newOwner);
            alert('Pemegang Saham berhasil ditambahkan!');
            setIsAddOwnerOpen(false);
            setNewOwner({ name: '', sharePercentage: '', idNumber: '' });
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Gagal menambah pemegang saham');
        }
    };

    const handleRemoveShareholder = async (id: number) => {
        if (!confirm('Hapus pemegang saham ini? Semua riwayat dividen terkait juga akan dihapus.')) return;
        try {
            await api.delete(`/finance/shareholders/${id}`);
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Gagal menghapus');
        }
    };

    const handleUpdateCapital = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            await api.patch('/finance/capital', { authorizedCapital: tempCapital });
            toast.success('Modal Dasar berhasil diperbarui!');
            setIsEditCapitalOpen(false);
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Gagal update modal dasar');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDistribute = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm('Apakah Anda yakin ingin membagikan dividen ini? Saldo kas akan berkurang otomatis.')) return;

        setIsProcessing(true);
        try {
            await api.post('/finance/dividends/distribute', distributeForm);
            alert('Dividen berhasil dibagikan secara proporsional!');
            setIsDistributeOpen(false);
            setDistributeForm({ totalAmount: '', accountId: '', description: '' });
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Gagal membagikan dividen');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 font-outfit">Modal & Dividen</h1>
                    <p className="text-sm text-slate-500">Kelola kepemilikan saham dan pembagian keuntungan (Dividen).</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsAddOwnerOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900 transition-all"
                    >
                        <Plus className="h-4 w-4" /> Tambah Pemegang Saham
                    </button>
                    <button 
                        onClick={() => setIsDistributeOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                    >
                        <Banknote className="h-4 w-4" /> Bagi Dividen (Profit)
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 transition-all group" onClick={() => setIsEditCapitalOpen(true)}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <Plus className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Modal Dasar (PT)</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(authorizedCapital)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                        <Users className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Pemegang Saham</p>
                    <p className="text-xl font-bold text-slate-900">{shareholders.length} Orang</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Dividen Dibagikan</p>
                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(history.reduce((a, b) => a + b.amount, 0))}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                        <Banknote className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Modal Disetor (%)</p>
                    <p className="text-xl font-bold text-slate-900">
                        {shareholders.reduce((a, b) => a + b.sharePercentage, 0)}%
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Shareholders List */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-500" /> Daftar Kepemilikan Saham
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Nama Pemilik</th>
                                    <th className="px-6 py-4">Persentase</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {shareholders.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-slate-400">Belum ada pemegang saham.</td>
                                    </tr>
                                ) : (
                                    shareholders.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-900">{s.name}</p>
                                                <p className="text-xs text-slate-400">{s.idNumber || 'No ID'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${s.sharePercentage}%` }} />
                                                    </div>
                                                    <span className="font-bold text-slate-700">{s.sharePercentage}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Aktif</span>
                                                    <button 
                                                        onClick={() => handleRemoveShareholder(s.id)}
                                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Dividend History */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <History className="h-5 w-5 text-emerald-500" /> Riwayat Pembagian Dividen
                        </h3>
                    </div>
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs sticky top-0">
                                <tr>
                                    <th className="px-6 py-4">Tanggal & Penerima</th>
                                    <th className="px-6 py-4 text-right">Nominal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} className="px-6 py-12 text-center text-slate-400">Belum ada riwayat pembagian.</td>
                                    </tr>
                                ) : (
                                    history.map(h => (
                                        <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-900">{h.shareholder.name}</p>
                                                <p className="text-xs text-slate-400">{new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                <p className="text-[10px] text-slate-300 italic">{h.description}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                                {formatCurrency(h.amount)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal: Edit Capital */}
            {isEditCapitalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-blue-600" /> Modal Dasar PT
                            </h2>
                            <button onClick={() => setIsEditCapitalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <Plus className="h-5 w-5 text-slate-500 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateCapital} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nominal Modal Dasar (Rp)</label>
                                <input 
                                    required
                                    type="number"
                                    value={tempCapital}
                                    onChange={(e) => setTempCapital(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-3 text-lg font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                    placeholder="0"
                                />
                                <p className="text-[10px] text-slate-400 mt-2 italic leading-relaxed">
                                    Modal dasar adalah seluruh nilai nominal saham perseroan yang disebut dalam anggaran dasar (AKTA).
                                </p>
                            </div>
                            <button 
                                type="submit" 
                                disabled={isProcessing}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                            >
                                {isProcessing ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Simpan Modal Dasar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Owner */}
            {isAddOwnerOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Tambah Pemilik Saham</h2>
                                <p className="text-xs text-slate-500">Daftarkan investor atau pemilik baru.</p>
                            </div>
                            <button onClick={() => setIsAddOwnerOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <Plus className="h-5 w-5 text-slate-500 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleAddShareholder} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nama Lengkap</label>
                                <input 
                                    required
                                    type="text"
                                    value={newOwner.name}
                                    onChange={(e) => setNewOwner({ ...newOwner, name: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                    placeholder="Contoh: Pak H. Ahmad"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Porsi Saham (%)</label>
                                    <input 
                                        required
                                        type="number"
                                        step="0.1"
                                        value={newOwner.sharePercentage}
                                        onChange={(e) => setNewOwner({ ...newOwner, sharePercentage: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        placeholder="0.0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">KTP / ID (Opsional)</label>
                                    <input 
                                        type="text"
                                        value={newOwner.idNumber}
                                        onChange={(e) => setNewOwner({ ...newOwner, idNumber: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        placeholder="NIK KTP"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-all">Simpan Data</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Distribute Dividends */}
            {isDistributeOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
                            <div>
                                <h2 className="text-xl font-bold text-emerald-900">Bagi Dividen Otomatis</h2>
                                <p className="text-xs text-emerald-700">Profit akan dibagi proporsional ke semua pemilik.</p>
                            </div>
                            <button onClick={() => setIsDistributeOpen(false)} className="p-2 hover:bg-emerald-200 rounded-full transition-colors">
                                <Plus className="h-5 w-5 text-emerald-500 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleDistribute} className="p-6 space-y-4">
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                                <p className="text-xs text-emerald-800 leading-relaxed">
                                    Masukkan total laba yang ingin dibagikan. Sistem akan menghitung jatah masing-masing berdasarkan persentase saham secara otomatis.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Total Laba yang Dibagikan (Rp)</label>
                                <input 
                                    required
                                    type="number"
                                    value={distributeForm.totalAmount}
                                    onChange={(e) => setDistributeForm({ ...distributeForm, totalAmount: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-lg font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Sumber Dana (Akun Kas/Bank)</label>
                                <select 
                                    required
                                    value={distributeForm.accountId}
                                    onChange={(e) => setDistributeForm({ ...distributeForm, accountId: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                >
                                    <option value="">-- Pilih Akun --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} (Saldo: {formatCurrency(acc.balance)})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Keterangan / Memo</label>
                                <textarea 
                                    value={distributeForm.description}
                                    onChange={(e) => setDistributeForm({ ...distributeForm, description: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                    placeholder="Contoh: Pembagian Laba Tahun Buku 2025"
                                    rows={2}
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isProcessing}
                                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                            >
                                {isProcessing ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <><CheckCircle className="h-5 w-5" /> Eksekusi Pembagian Sekarang</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

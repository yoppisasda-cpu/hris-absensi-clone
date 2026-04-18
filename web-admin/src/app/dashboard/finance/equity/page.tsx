'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Users, PieChart, Banknote, History, Plus, AlertCircle, TrendingUp, Wallet, CheckCircle, Trash2, Pencil, X } from 'lucide-react';

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

    const [isEditOwnerOpen, setIsEditOwnerOpen] = useState(false);
    const [selectedOwner, setSelectedOwner] = useState<Shareholder | null>(null);
    const [editForm, setEditForm] = useState({ name: '', sharePercentage: '', idNumber: '' });

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

    const handleOpenEdit = (s: Shareholder) => {
        setSelectedOwner(s);
        setEditForm({ 
            name: s.name, 
            sharePercentage: s.sharePercentage.toString(), 
            idNumber: s.idNumber || '' 
        });
        setIsEditOwnerOpen(true);
    };

    const handleUpdateShareholder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOwner) return;
        try {
            await api.patch(`/finance/shareholders/${selectedOwner.id}`, editForm);
            alert('Data Pemegang Saham berhasil diperbarui!');
            setIsEditOwnerOpen(false);
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Gagal memperbarui data');
        }
    };

    const handleUpdateCapital = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            await api.patch('/finance/capital', { authorizedCapital: tempCapital });
            alert('Modal Dasar berhasil diperbarui!');
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                        <PieChart className="w-9 h-9 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase tracking-[0.05em]">Ekuitas <span className="text-indigo-400">& DIVIDEN</span></h1>
                        <p className="text-white/40 font-medium tracking-tight">Kelola kepemilikan saham dan distribusi laba bersih secara proporsional.</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsAddOwnerOpen(true)}
                        className="flex items-center gap-2 px-6 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all shadow-xl"
                    >
                        <Plus className="w-4 h-4" /> Tambah Owner
                    </button>
                    <button 
                        onClick={() => setIsDistributeOpen(true)}
                        className="flex items-center gap-2 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-[#050505] rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                        <Banknote className="w-5 h-5" /> Bagi Profit
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="glass p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden group cursor-pointer hover:border-indigo-500/30 transition-all shadow-2xl" onClick={() => setIsEditCapitalOpen(true)}>
                    <div className="relative z-10">
                        <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em] mb-3 leading-none italic">Modal Dasar (PT)</p>
                        <h3 className="text-2xl font-black text-white tracking-tighter italic">{formatCurrency(authorizedCapital)}</h3>
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest italic group-hover:text-white transition-colors">Update Capital</span>
                            <Wallet className="w-4 h-4 text-indigo-500/50" />
                        </div>
                    </div>
                </div>

                <div className="glass p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden group transition-all shadow-2xl">
                    <div className="relative z-10">
                        <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em] mb-3 leading-none italic">Pemegang Saham</p>
                        <h3 className="text-4xl font-black text-white tracking-tighter italic">{shareholders.length} <span className="text-lg text-white/30 not-italic">Entitas</span></h3>
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest italic">Listed Owners</span>
                            <Users className="w-4 h-4 text-white/20" />
                        </div>
                    </div>
                </div>

                <div className="glass p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden group transition-all shadow-2xl">
                    <div className="relative z-10">
                        <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em] mb-3 leading-none italic">Total Dividen</p>
                        <h3 className="text-2xl font-black text-emerald-400 tracking-tighter italic">{formatCurrency(history.reduce((a, b) => a + b.amount, 0))}</h3>
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-widest italic">Distributed Profit</span>
                            <TrendingUp className="w-4 h-4 text-emerald-500/50" />
                        </div>
                    </div>
                </div>

                <div className="glass p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden group transition-all shadow-2xl">
                    <div className="relative z-10">
                        <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em] mb-3 leading-none italic">Modal Disetor</p>
                        <h3 className="text-4xl font-black text-white tracking-tighter italic">{shareholders.reduce((a, b) => a + b.sharePercentage, 0)}%</h3>
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest italic">Commited Portion</span>
                            <Banknote className="w-4 h-4 text-white/20" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Shareholders List */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="flex items-center gap-3 px-6">
                        <PieChart className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] italic">Daftar Kepemilikan Saham</h3>
                    </div>
                    
                    <div className="glass rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto text-sm text-left">
                            <table className="w-full border-collapse">
                                <thead className="bg-white/[0.02] text-[10px] font-black text-white/20 uppercase tracking-[0.2em] border-b border-white/5">
                                    <tr>
                                        <th className="px-8 py-6">Nama Pemilik</th>
                                        <th className="px-8 py-6">Persentase</th>
                                        <th className="px-8 py-6 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 italic">
                                    {shareholders.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-8 py-20 text-center text-white/10 uppercase tracking-widest font-black text-xs">Belum ada pemegang saham.</td>
                                        </tr>
                                    ) : (
                                        shareholders.map(s => (
                                            <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-8 py-6">
                                                    <p className="font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{s.name}</p>
                                                    <p className="text-[10px] font-bold text-white/20 uppercase mt-0.5 tracking-widest italic">{s.idNumber || 'Lokal Owner'}</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${s.sharePercentage}%` }} />
                                                        </div>
                                                        <span className="font-black text-white italic tracking-tighter">{s.sharePercentage}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                                                        <button 
                                                            onClick={() => handleOpenEdit(s)}
                                                            className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-lg"
                                                            title="Edit Data"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleRemoveShareholder(s.id)}
                                                            className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                                                            title="Hapus Pemilik"
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
                </div>

                {/* Dividend History */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-6">
                        <History className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] italic">Riwayat Dividen</h3>
                    </div>
                    
                    <div className="glass rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto max-h-[500px] no-scrollbar">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/[0.02] text-[10px] font-black text-white/20 uppercase tracking-[0.2em] border-b border-white/5 sticky top-0">
                                    <tr>
                                        <th className="px-8 py-6">Penerima & Periode</th>
                                        <th className="px-8 py-6 text-right">Nominal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 italic">
                                    {history.length === 0 ? (
                                        <tr>
                                            <td colSpan={2} className="px-8 py-20 text-center text-white/10 uppercase tracking-widest font-black text-xs">Belum ada riwayat pembagian.</td>
                                        </tr>
                                    ) : (
                                        history.map(h => (
                                            <tr key={h.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-8 py-6">
                                                    <p className="font-black text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{h.shareholder.name}</p>
                                                    <p className="text-[10px] font-bold text-white/20 uppercase mt-0.5 tracking-widest italic">{new Date(h.date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                                                </td>
                                                <td className="px-8 py-6 text-right font-black text-emerald-400 tracking-tighter text-base">
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
            </div>

            {/* Modal: Edit Capital */}
            {isEditCapitalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={() => setIsEditCapitalOpen(false)} />
                    <div className="glass w-full max-w-sm rounded-[4rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-12 pb-6 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/10">
                                <Wallet className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic tracking-tight">Modal Dasar PT</h2>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-3 px-6 leading-loose italic leading-relaxed">Nilai nominal saham perseroan sesuai AKTA anggaran dasar.</p>
                        </div>
                        <form onSubmit={handleUpdateCapital} className="p-12 pt-4 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] ml-1 italic italic">Nominal Capital (Rp)</label>
                                <input 
                                    required
                                    type="number"
                                    value={tempCapital}
                                    onChange={(e) => setTempCapital(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 text-white text-xl font-black outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/5 italic"
                                    placeholder="0"
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isProcessing}
                                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all italic"
                            >
                                {isProcessing ? 'Saving...' : 'Simpan Modal Dasar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add/Edit Owner */}
            {(isAddOwnerOpen || isEditOwnerOpen) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={() => { setIsAddOwnerOpen(false); setIsEditOwnerOpen(false); }} />
                    <div className="glass w-full max-w-lg rounded-[4rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-12 pb-6 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/10">
                                <Users className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic tracking-tight">{isEditOwnerOpen ? 'Update Owner' : 'Add Owner'}</h2>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-3 px-10 leading-loose italic">{isEditOwnerOpen ? 'Edit detail kepemilikan saham' : 'Daftarkan pemegang saham baru dalam struktur permodalan PT.'}</p>
                        </div>

                        <form onSubmit={isEditOwnerOpen ? handleUpdateShareholder : handleAddShareholder} className="p-12 pt-4 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] ml-1 italic font-outfit">Nama Lengkap Pemilik</label>
                                <input 
                                    required
                                    type="text"
                                    value={isEditOwnerOpen ? editForm.name : newOwner.name}
                                    onChange={(e) => isEditOwnerOpen ? setEditForm({...editForm, name: e.target.value}) : setNewOwner({ ...newOwner, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white text-base font-black outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/5 italic"
                                    placeholder="NAMA LENGKAP..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] ml-1 italic">Porsi Saham (%)</label>
                                    <input 
                                        required
                                        type="number"
                                        step="0.01"
                                        value={isEditOwnerOpen ? editForm.sharePercentage : newOwner.sharePercentage}
                                        onChange={(e) => isEditOwnerOpen ? setEditForm({...editForm, sharePercentage: e.target.value}) : setNewOwner({ ...newOwner, sharePercentage: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white text-xl font-black outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/5 italic"
                                        placeholder="0.0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] ml-1 italic">KTP / NIK (ID Number)</label>
                                    <input 
                                        type="text"
                                        value={isEditOwnerOpen ? editForm.idNumber : newOwner.idNumber}
                                        onChange={(e) => isEditOwnerOpen ? setEditForm({...editForm, idNumber: e.target.value}) : setNewOwner({ ...newOwner, idNumber: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white text-[11px] font-black outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/5 italic"
                                        placeholder="NIK..."
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-4 pt-8 border-t border-white/5 mt-4">
                                <button type="button" onClick={() => { setIsAddOwnerOpen(false); setIsEditOwnerOpen(false); }} className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-white/50 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all italic">Batal</button>
                                <button type="submit" className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all italic">
                                    {isEditOwnerOpen ? 'Simpan Perubahan' : 'Daftarkan Owner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Distribute Dividends */}
            {isDistributeOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={() => setIsDistributeOpen(false)} />
                    <div className="glass w-full max-w-lg rounded-[4rem] border border-emerald-500/20 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-12 pb-6 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/10">
                                <PieChart className="w-10 h-10 text-emerald-400" />
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic tracking-tight">Otomasi Bagi Hasil</h2>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-3 px-10 leading-loose italic">Sistem akan membagi total profit secara otomatis berdasarkan persentase kepemilikan saham.</p>
                        </div>

                        <form onSubmit={handleDistribute} className="p-12 pt-4 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] ml-1 italic">Total Nilai Yang Dibagi (Rp)</label>
                                <input 
                                    required
                                    type="number"
                                    value={distributeForm.totalAmount}
                                    onChange={(e) => setDistributeForm({ ...distributeForm, totalAmount: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 text-white text-xl font-black outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/5 italic"
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] ml-1 italic">Sumber Dana (Bank/Kas)</label>
                                <select 
                                    required
                                    value={distributeForm.accountId}
                                    onChange={(e) => setDistributeForm({ ...distributeForm, accountId: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white text-sm outline-none focus:border-emerald-500/50 appearance-none font-bold italic"
                                >
                                    <option value="" className="bg-[#050505]">PILIH AKUN KEUANGAN...</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id} className="bg-[#050505]">{acc.name} (Rp {acc.balance.toLocaleString()})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] ml-1 italic">Keterangan / Memo</label>
                                <textarea 
                                    value={distributeForm.description}
                                    onChange={(e) => setDistributeForm({ ...distributeForm, description: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white text-[11px] outline-none focus:border-emerald-500/50 transition-all font-bold placeholder:text-white/10 italic"
                                    placeholder="Contoh: Pembagian Laba Tahun Buku 2025"
                                    rows={2}
                                />
                            </div>
                            <div className="flex gap-4 pt-8 border-t border-white/5 mt-4">
                                <button type="button" onClick={() => setIsDistributeOpen(false)} className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-white/50 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all italic">Batal</button>
                                <button type="submit" disabled={isProcessing} className="flex-[2] py-5 bg-emerald-500 hover:bg-emerald-600 text-[#050505] rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all italic flex items-center justify-center gap-3">
                                    {isProcessing ? 'Eksekusi...' : <><CheckCircle className="h-5 w-5" /> Bagi Profit Sekarang</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Capital */}
            {isEditCapitalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={() => setIsEditCapitalOpen(false)} />
                    <div className="glass w-full max-w-sm rounded-[4rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-12 pb-6 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/10">
                                <Wallet className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic tracking-tight">Modal Dasar PT</h2>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-3 px-6 leading-loose italic leading-relaxed">Nilai nominal saham perseroan sesuai AKTA anggaran dasar.</p>
                        </div>
                        <form onSubmit={handleUpdateCapital} className="p-12 pt-4 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] ml-1 italic italic">Nominal Capital (Rp)</label>
                                <input 
                                    required
                                    type="number"
                                    value={tempCapital}
                                    onChange={(e) => setTempCapital(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 text-white text-xl font-black outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/5 italic"
                                    placeholder="0"
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isProcessing}
                                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all italic"
                            >
                                {isProcessing ? 'Saving...' : 'Simpan Modal Dasar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

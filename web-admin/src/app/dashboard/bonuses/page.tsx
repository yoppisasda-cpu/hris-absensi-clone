'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Banknote, Plus, History, Trash2, Loader2, Search, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Bonus {
    id: number;
    type: string;
    amount: number;
    description: string;
    month: number;
    year: number;
    createdAt: string;
    user: {
        name: string;
        email: string;
    };
}

export default function BonusesPage() {
    const [bonuses, setBonuses] = useState<Bonus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [previewResponse, setPreviewResponse] = useState<any>(null);
    const [formData, setFormData] = useState({
        type: 'BONUS',
        description: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        amount: '',
        division: ''
    });

    const fetchBonuses = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/bonuses');
            setBonuses(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBonuses();
    }, []);

    const handlePreview = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const res = await api.post('/bonuses/preview', formData);
            setPreviewResponse(res.data);
            setIsPreviewMode(true);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Gagal melakukan preview.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkDistribute = async () => {
        try {
            setIsSaving(true);
            const res = await api.post('/bonuses/bulk', formData);
            alert(res.data.message);
            setIsModalOpen(false);
            setIsPreviewMode(false);
            setPreviewResponse(null);
            fetchBonuses();
            setFormData({ ...formData, description: '', amount: '' });
        } catch (error: any) {
            alert(error.response?.data?.error || 'Gagal membagikan bonus.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus catatan bonus ini? (Ini juga akan membatalkan bonus di slip gaji bulan ini jika payroll belum PAID)')) return;
        try {
            await api.delete(`/bonuses/${id}`);
            setBonuses(bonuses.filter(b => b.id !== id));
        } catch (error) {
            alert('Gagal menghapus bonus.');
        }
    };

    const filteredBonuses = bonuses.filter(b =>
        b.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatIDR = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari nama karyawan atau deskripsi..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setIsPreviewMode(false);
                            setPreviewResponse(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        <Plus className="h-4 w-4" /> Distribusi Massal
                    </button>
                </div>

                {/* History Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <History className="h-4 w-4 text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Riwayat Distribusi</h3>
                    </div>

                    {isLoading ? (
                        <div className="flex h-64 flex-col items-center justify-center">
                            <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                            <p className="text-slate-500 font-medium">Memuat data bonus...</p>
                        </div>
                    ) : filteredBonuses.length === 0 ? (
                        <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-400">
                            <Banknote className="h-12 w-12 mb-2 opacity-20" />
                            <p className="text-lg font-medium">Belum ada riwayat bonus</p>
                            <p className="text-sm">Klik "Distribusi Massal" untuk mulai membagikan Bonus atau THR.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-200">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Karyawan</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipe & Deskripsi</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Periode</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nominal</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredBonuses.map((bonus) => (
                                        <tr key={bonus.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-900">{bonus.user?.name || 'Karyawan'}</div>
                                                <div className="text-xs text-slate-500">{bonus.user?.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold mb-1 ${bonus.type === 'THR' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {bonus.type}
                                                </span>
                                                <div className="text-sm text-slate-600">{bonus.description}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                                {new Date(0, bonus.month - 1).toLocaleString('id-ID', { month: 'long' })} {bonus.year}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900">
                                                {formatIDR(bonus.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(bonus.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Distribusi Massal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{isPreviewMode ? 'Review Distribusi' : 'Distribusi Bonus/THR'}</h2>
                                <p className="text-sm text-slate-500">{isPreviewMode ? 'Tinjau daftar penerima sebelum dikirim.' : 'Bagikan apresiasi ke banyak karyawan sekaligus.'}</p>
                            </div>
                            <button onClick={() => { setIsModalOpen(false); setIsPreviewMode(false); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition">
                                <Plus className="h-6 w-6 rotate-45" />
                            </button>
                        </div>

                        {isPreviewMode ? (
                            <div className="flex flex-col h-[500px]">
                                <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                                        <CheckCircle2 className="h-4 w-4" />
                                        {previewResponse?.willReceive} Karyawan akan menerima {formData.type}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium italic">
                                        {previewResponse?.totalEmployees} Total karyawan dicek
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-0 border-b border-slate-100">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="sticky top-0 bg-white shadow-sm">
                                            <tr className="border-b border-slate-100">
                                                <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Nama</th>
                                                <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-right">Nominal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {previewResponse?.preview.map((p: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-slate-700">{p.userName}</div>
                                                        <div className="text-[10px] text-slate-400">{p.email}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-blue-600">
                                                        {formatIDR(p.amount)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {previewResponse?.skippedNoJoinDate > 0 && (
                                    <div className="p-3 bg-red-50 text-red-600 text-[10px] flex items-center gap-2">
                                        <AlertCircle className="h-3 w-3" />
                                        {previewResponse.skippedNoJoinDate} karyawan dilewati karena tidak ada Tanggal Bergabung.
                                    </div>
                                )}

                                <div className="p-6 flex gap-3 bg-slate-50">
                                    <button
                                        type="button"
                                        onClick={() => setIsPreviewMode(false)}
                                        className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all uppercase"
                                    >
                                        Kembali Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleBulkDistribute}
                                        disabled={isSaving}
                                        className="flex-[2] px-4 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-lg uppercase disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                        Konfirmasi & Kirim
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handlePreview} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Tipe</label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-slate-700"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="BONUS">BONUS (Nominal Bebas)</option>
                                            <option value="THR">THR (Otomatis Pro-Rata)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Divisi (Opsional)</label>
                                        <input
                                            type="text"
                                            placeholder="Semua Divisi"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                                            value={formData.division}
                                            onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Deskripsi / Keterangan</label>
                                    <input
                                        type="text"
                                        placeholder="Misal: Bonus Performa Q1 2024"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Bulan Pencairan</label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
                                            value={formData.month}
                                            onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <option key={i + 1} value={i + 1}>
                                                    {new Date(0, i).toLocaleString('id-ID', { month: 'long' })}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Tahun</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                {formData.type === 'BONUS' ? (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Nominal (Per Orang)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="w-full pl-12 pr-4 py-2.5 bg-blue-50/30 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold text-blue-600"
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <p className="mt-1.5 text-[10px] text-slate-400 italic">* Nominal ini akan diberikan merata ke semua karyawan terpilih.</p>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex gap-3">
                                        <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold text-orange-800">Perhitungan Otomatis Aktif</p>
                                            <p className="text-xs text-orange-700 leading-relaxed mt-0.5">
                                                Sistem akan menghitung nominal THR secara pro-rata berdasarkan <b>joinDate</b> masing-masing karyawan sesuai Permenaker No. 6/2016.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition-all uppercase tracking-wider"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-[2] px-4 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                        {isSaving ? 'Menghitung...' : 'Review Distribusi'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

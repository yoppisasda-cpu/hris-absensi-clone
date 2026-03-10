'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { CalendarDays, Plus, Trash2, Calendar, PartyPopper, Tag, X, Search } from 'lucide-react';

interface Holiday {
    id: number;
    date: string;
    endDate?: string | null;
    name: string;
}

export default function HolidaysPage() {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        date: '',
        endDate: '',
        name: ''
    });

    const fetchHolidays = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/holidays');
            setHolidays(response.data);
        } catch (err) {
            setError('Gagal mengambil daftar hari libur.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHolidays();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/holidays', formData);
            fetchHolidays();
            setIsFormOpen(false);
            setFormData({ date: '', endDate: '', name: '' });
        } catch (err: any) {
            alert(err.response?.data?.error || 'Gagal menambahkan hari libur.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus hari libur ini?')) return;
        try {
            await api.delete(`/holidays/${id}`);
            setHolidays(prev => prev.filter(h => h.id !== id));
        } catch (err) {
            alert('Gagal menghapus hari libur.');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatRange = (start: string, end?: string | null) => {
        const startFormatted = formatDate(start);
        if (!end) return startFormatted;

        const endFormatted = formatDate(end);
        if (startFormatted === endFormatted) return startFormatted;

        return `${startFormatted} - ${endFormatted}`;
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <CalendarDays className="h-6 w-6 text-blue-600" /> Kalender & Hari Libur
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Kelola hari libur nasional atau acara khusus perusahaan.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari nama hari libur..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                    {!isFormOpen && (
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition whitespace-nowrap"
                        >
                            <Plus className="h-4 w-4" />
                            Tambah Hari Libur
                        </button>
                    )}
                </div>
            </div>

            {isFormOpen && (
                <div className="mb-8 bg-white border border-blue-100 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2">
                            <PartyPopper className="h-4 w-4" /> Form Hari Libur Baru
                        </h2>
                        <button onClick={() => setIsFormOpen(false)} className="text-blue-400 hover:text-blue-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Mulai</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Berakhir (Opsional)</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <p className="text-[10px] text-slate-400 mt-1 italic">*Kosongkan jika hanya 1 hari</p>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Hari Libur / Acara</label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="Contoh: Libur Lebaran 2024"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Hari Libur'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
                        <tr>
                            <th className="px-6 py-4">Tanggal</th>
                            <th className="px-6 py-4">Nama Hari Libur / Acara</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center">
                                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                                    <p className="mt-2 text-slate-400">Memuat data...</p>
                                </td>
                            </tr>
                        ) : holidays.filter(h =>
                            h.name.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center">
                                    <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                    <p className="font-medium text-slate-900">Belum ada hari libur</p>
                                    <p className="text-slate-500">Klik "Tambah Hari Libur" untuk memulai.</p>
                                </td>
                            </tr>
                        ) : (
                            holidays.filter(h =>
                                h.name.toLowerCase().includes(searchQuery.toLowerCase())
                            ).map((holiday) => (
                                <tr key={holiday.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium text-slate-900">{formatRange(holiday.date, holiday.endDate)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-slate-700">{holiday.name}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(holiday.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Hapus Hari Libur"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </DashboardLayout>
    );
}

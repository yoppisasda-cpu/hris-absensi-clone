'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { CalendarDays, Plus, Trash2, Calendar, X, Search, Clock, Edit2 } from 'lucide-react';

const CalendarIcon = Calendar;

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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
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

    const handleAdd = () => {
        setEditingId(null);
        setFormData({ date: '', endDate: '', name: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (holiday: Holiday) => {
        setEditingId(holiday.id);
        setFormData({
            date: holiday.date?.slice(0, 10) ?? '',
            endDate: holiday.endDate?.slice(0, 10) ?? '',
            name: holiday.name
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ date: '', endDate: '', name: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingId) {
                await api.put(`/holidays/${editingId}`, formData);
            } else {
                await api.post('/holidays', formData);
            }
            fetchHolidays();
            handleCloseModal();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Gagal menyimpan hari libur.');
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
        return `${startFormatted} – ${endFormatted}`;
    };

    const filteredHolidays = holidays.filter(h =>
        h.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-8">
                <div>
                    <div className="flex items-center gap-4 mb-5">
                        <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
                            <CalendarDays className="h-7 w-7 stroke-[2.5px]" />
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase text-glow-sm">
                            Daftar <span className="text-amber-500">Hari Libur</span>
                        </h1>
                    </div>
                    <p className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase italic max-w-2xl leading-relaxed">
                        Kelola hari libur nasional dan cuti bersama perusahaan. Jadwal ini digunakan untuk perhitungan absensi karyawan secara otomatis.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative w-full sm:w-[350px] group/search">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700 group-focus-within/search:text-amber-500 transition-colors z-10" />
                        <input
                            type="text"
                            placeholder="CARI HARI LIBUR..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] font-black text-white focus:border-amber-500/50 outline-none transition-all italic tracking-[0.2em] uppercase placeholder:text-slate-800 shadow-inner"
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        className="group flex items-center gap-4 rounded-2xl bg-amber-600 px-8 py-4 text-[11px] font-black text-white shadow-2xl shadow-amber-500/20 hover:bg-amber-700 active:scale-95 transition-all uppercase tracking-[0.2em] italic border border-white/10"
                    >
                        <Plus className="h-4 w-4 stroke-[3.2px] group-hover:rotate-90 transition-transform duration-300" /> Tambah Hari Libur
                    </button>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/95 backdrop-blur-2xl p-4 animate-in fade-in duration-500">
                    <div className="bg-slate-900 w-full max-w-lg rounded-[48px] shadow-[0_0_100px_rgba(245,158,11,0.1)] overflow-hidden animate-in zoom-in-95 duration-500 border border-white/5">
                        <div className="p-10 text-center border-b border-white/5 bg-slate-950/30 flex justify-between items-center">
                            <div className="flex items-center gap-4 text-left">
                                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
                                    <CalendarIcon className="h-6 w-6 stroke-[2.5px]" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase text-glow-sm">
                                        {editingId ? 'Ubah' : 'Tambah'} <span className="text-amber-500">Hari Libur</span>
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase mt-1 italic">Isi data hari libur</p>
                                </div>
                            </div>
                            <button onClick={handleCloseModal} className="h-10 w-10 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-xl border border-white/5 transition-all">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-10 space-y-10">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic ml-2">Nama Hari Libur</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-[24px] border border-white/5 bg-slate-950 py-5 px-8 text-[11px] font-black text-white focus:border-amber-500/50 outline-none transition-all placeholder:text-slate-800 italic uppercase tracking-[0.1em] shadow-inner"
                                    placeholder="CONTOH: HARI RAYA IDUL FITRI..."
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic ml-2">Tanggal</label>
                                <div className="relative group">
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full rounded-[24px] border border-white/5 bg-slate-950 py-5 px-8 text-[11px] font-black text-white focus:border-amber-500/50 outline-none transition-all italic uppercase tracking-[0.2em] shadow-inner flex-row-reverse"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-amber-500/30 group-focus-within:text-amber-500 transition-colors">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-6 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 py-5 text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-[0.2em] italic"
                                >
                                    BATAL
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] rounded-[24px] bg-amber-600 px-8 py-5 text-[10px] font-black text-white shadow-2xl shadow-amber-500/20 hover:bg-amber-700 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-[0.2em] italic border-b-4 border-b-amber-900"
                                >
                                    {isSubmitting ? 'MENYIMPAN...' : (editingId ? 'SIMPAN PERUBAHAN' : 'SIMPAN')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-slate-900/40 rounded-[48px] border border-white/5 shadow-2xl overflow-hidden backdrop-blur-xl">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-950/50 border-b border-white/5">
                            <th className="px-10 py-8 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Tanggal</th>
                            <th className="px-10 py-8 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Nama Hari Libur</th>
                            <th className="px-10 py-8 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-slate-950/20">
                        {isLoading ? (
                            <tr>
                                <td colSpan={3} className="px-10 py-32 text-center">
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent shadow-lg shadow-amber-500/20"></div>
                                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] italic animate-pulse">Memuat data hari libur...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredHolidays.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-10 py-32 text-center">
                                    <div className="flex flex-col items-center gap-8 opacity-40">
                                        <div className="h-24 w-24 rounded-[40px] bg-slate-900 border border-white/5 flex items-center justify-center shadow-inner">
                                            <CalendarIcon className="h-10 w-10 text-slate-800" />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] italic">Belum ada hari libur yang terdaftar</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredHolidays.map((holiday) => (
                                <tr key={holiday.id} className="group hover:bg-white/[0.02] transition-colors duration-300">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-5">
                                            <div className="h-12 w-12 rounded-2xl bg-slate-950 border border-white/5 flex flex-col items-center justify-center text-amber-500 shadow-inner group-hover:bg-amber-600 group-hover:text-white transition-all">
                                                <span className="text-[8px] font-black leading-none uppercase tracking-tighter mb-1 opacity-60">
                                                    {new Date(holiday.date).toLocaleDateString('id-ID', { month: 'short' })}
                                                </span>
                                                <span className="text-base font-black italic tracking-tighter leading-none">
                                                    {new Date(holiday.date).getDate()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-white tracking-widest uppercase italic group-hover:text-amber-400 transition-colors">
                                                    {new Date(holiday.date).toLocaleDateString('id-ID', { weekday: 'long' })}
                                                </p>
                                                <p className="text-[8px] font-black text-slate-600 tracking-[0.2em] uppercase italic mt-1.5 flex items-center gap-2">
                                                    <Clock className="h-3 w-3 opacity-40" /> {new Date(holiday.date).getFullYear()}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-3">
                                            <div className="h-1 w-8 bg-amber-500/20 rounded-full group-hover:w-12 transition-all group-hover:bg-amber-500/50"></div>
                                            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.1em] italic group-hover:text-white transition-colors">
                                                {holiday.name}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            <button
                                                onClick={() => handleEdit(holiday)}
                                                className="h-10 w-10 flex items-center justify-center bg-slate-950 border border-white/5 text-slate-500 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all"
                                                title="Ubah"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(holiday.id)}
                                                className="h-10 w-10 flex items-center justify-center bg-slate-950 border border-white/5 text-slate-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                title="Hapus"
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
        </DashboardLayout>
    );
}

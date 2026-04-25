'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Clock, Save, Plus, Search, Trash2 } from "lucide-react";

interface Shift {
    id: number;
    title: string;
    startTime: string;
    endTime: string;
}

export default function ShiftsPage() {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Form Tambah Shift
    const [showForm, setShowForm] = useState(false);
    const [formObj, setFormObj] = useState({ title: '', startTime: '08:00', endTime: '17:00' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchShifts = async () => {
        try {
            const res = await api.get('/shifts');
            setShifts(res.data);
        } catch (error) {
            console.error('Gagal mengambil shifts', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchShifts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/shifts', formObj);
            alert('Berhasil membuat Jadwal Shift baru!');
            setShowForm(false);
            setFormObj({ title: '', startTime: '08:00', endTime: '17:00' });
            fetchShifts();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            alert(error.response?.data?.error || 'Terjadi kesalahan sistem');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Hapus shift "${name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
        try {
            await api.delete(`/shifts/${id}`);
            setShifts(prev => prev.filter(s => s.id !== id));
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            alert(error.response?.data?.error || 'Gagal menghapus shift');
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
                        <Clock className="h-6 w-6 text-indigo-500" /> Operasional Shift
                    </h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 italic">Konfigurasi master jadwal kerja tim (Reguler, Overtime, Seasonal).</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cari nama shift..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm bg-slate-900/50 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-500"
                        />
                    </div>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black italic uppercase tracking-widest text-white hover:bg-indigo-700 transition whitespace-nowrap shadow-lg shadow-indigo-500/20 border border-indigo-500/20"
                        >
                            <Plus className="h-4 w-4" /> Tambah Shift
                        </button>
                    )}
                </div>
            </div>

            {showForm && (
                <div className="mb-8 rounded-[32px] border border-white/5 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <h2 className="mb-6 text-xs font-black uppercase tracking-[0.2em] text-indigo-400 italic">Form Pendaftaran Master Shift</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Nama Penjadwalan</label>
                            <input
                                type="text" required
                                value={formObj.title} onChange={e => setFormObj({ ...formObj, title: e.target.value })}
                                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="Contoh: Shift Gudang Siang"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Jam Masuk</label>
                            <input
                                type="time" required
                                value={formObj.startTime} onChange={e => setFormObj({ ...formObj, startTime: e.target.value })}
                                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Jam Pulang</label>
                            <input
                                type="time" required
                                value={formObj.endTime} onChange={e => setFormObj({ ...formObj, endTime: e.target.value })}
                                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div className="md:col-span-4 flex justify-end gap-4 mt-4">
                            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-xl border border-white/5">
                                Batal
                            </button>
                            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 border border-indigo-500/20">
                                {isSubmitting ? 'Menyimpan...' : <><Save className="h-4 w-4" /> Simpan</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-slate-900/50 rounded-[32px] border border-slate-700 overflow-hidden shadow-sm backdrop-blur-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#050505] border-b border-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-[0.2em]">
                            <tr>
                                <th className="px-6 py-5 italic text-center">ID</th>
                                <th className="px-6 py-5 italic">Nama Template Shift</th>
                                <th className="px-6 py-5 italic text-center">Sesi Masuk</th>
                                <th className="px-6 py-5 italic text-center">Sesi Pulang</th>
                                <th className="px-6 py-5 text-center italic">Durasi</th>
                                                <th className="px-6 py-5 text-center italic">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 transition-all">
                            {isLoading ? (
                                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Memuat data dari server...</td></tr>
                            ) : shifts.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-500">
                                        <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                        <p className="font-medium text-lg mb-1">Tidak ada hasil ditemukan</p>
                                        <p className="text-sm">Tidak ada shift yang cocok dengan &quot;{searchQuery}&quot;</p>
                                    </td>
                                </tr>
                            ) : (
                                shifts.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(shift => (
                                    <tr key={shift.id} className="hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-5 text-center font-black italic text-slate-500 group-hover:text-indigo-400"># {shift.id}</td>
                                        <td className="px-6 py-5 font-black italic text-white uppercase tracking-tighter text-base">{shift.title}</td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black italic uppercase tracking-widest text-emerald-400 border border-emerald-500/20">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> {shift.startTime} WIB
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="inline-flex items-center gap-2 rounded-lg bg-orange-500/10 px-3 py-1.5 text-[10px] font-black italic uppercase tracking-widest text-orange-400 border border-orange-500/20">
                                                <div className="h-1.5 w-1.5 rounded-full bg-orange-500" /> {shift.endTime} WIB
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center text-indigo-400 font-black italic uppercase tracking-tighter text-lg">
                                            {(() => {
                                                const s = parseInt(shift.startTime.split(':')[0]);
                                                const e = parseInt(shift.endTime.split(':')[0]);
                                                const diff = e < s ? (24 - s + e) : (e - s);
                                                return `${diff} Jam`;
                                            })()}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <button
                                                onClick={() => handleDelete(shift.id, shift.title)}
                                                className="p-2 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
                                                title="Hapus shift ini"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout >
    );
}

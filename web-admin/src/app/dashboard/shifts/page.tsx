'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Clock, Save, Plus, Search } from "lucide-react";

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

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Clock className="h-6 w-6 text-blue-600" /> Pengaturan Shift Pegawai
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Buat _Master_ jadwal operasional perusahaan Anda (Mis. Shift Reguler, Shift Malam).</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari nama shift..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition whitespace-nowrap"
                        >
                            <Plus className="h-4 w-4" /> Tambah Shift
                        </button>
                    )}
                </div>
            </div>

            {showForm && (
                <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
                    <h2 className="mb-4 text-lg font-semibold text-slate-800">Form Pendaftaran Master Shift</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-slate-700">Nama Penjadwalan</label>
                            <input
                                type="text" required
                                value={formObj.title} onChange={e => setFormObj({ ...formObj, title: e.target.value })}
                                className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Contoh: Shift Gudang Siang"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Jam Masuk (Clock-In)</label>
                            <input
                                type="time" required
                                value={formObj.startTime} onChange={e => setFormObj({ ...formObj, startTime: e.target.value })}
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Jam Pulang (Clock-Out)</label>
                            <input
                                type="time" required
                                value={formObj.endTime} onChange={e => setFormObj({ ...formObj, endTime: e.target.value })}
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="md:col-span-4 flex justify-end gap-3 mt-4">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">
                                Batal
                            </button>
                            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300">
                                {isSubmitting ? 'Menyimpan...' : <><Save className="h-4 w-4" /> Simpan</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">ID Shift</th>
                                <th className="px-6 py-4">Nama Template Shift</th>
                                <th className="px-6 py-4">Sesi Jam Masuk</th>
                                <th className="px-6 py-4">Sesi Jam Keluar</th>
                                <th className="px-6 py-4 text-center">Durasi Operasional</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={5} className="py-8 text-center text-slate-400">Memuat data dari server...</td></tr>
                            ) : shifts.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-500">
                                        <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                        <p className="font-medium text-lg mb-1">Tidak ada hasil ditemukan</p>
                                        <p className="text-sm">Tidak ada shift yang cocok dengan &quot;{searchQuery}&quot;</p>
                                    </td>
                                </tr>
                            ) : (
                                shifts.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(shift => (
                                    <tr key={shift.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900"># {shift.id}</td>
                                        <td className="px-6 py-4 font-semibold text-blue-700">{shift.title}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                {shift.startTime} WIB
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
                                                {shift.endTime} WIB
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-500 font-mono">
                                            {/* Simplified Duration Calc Logics purely for display */}
                                            {(() => {
                                                const s = parseInt(shift.startTime.split(':')[0]);
                                                const e = parseInt(shift.endTime.split(':')[0]);
                                                const diff = e < s ? (24 - s + e) : (e - s);
                                                return `${diff} Jam`;
                                            })()}
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

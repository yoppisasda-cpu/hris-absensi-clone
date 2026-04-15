'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Megaphone, Plus, Trash2, Calendar, AlertCircle, Send, X, Search } from 'lucide-react';

interface Announcement {
    id: number;
    title: string;
    content: string;
    imageUrl?: string;
    isPriority: boolean;
    createdAt: string;
}

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        isPriority: false
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fetchAnnouncements = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/announcements');
            setAnnouncements(response.data);
        } catch (err) {
            setError('Gagal mengambil daftar pengumuman.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('content', formData.content);
            data.append('isPriority', String(formData.isPriority));
            if (selectedFile) {
                data.append('image', selectedFile);
            }

            await api.post('/announcements', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            fetchAnnouncements();
            setIsFormOpen(false);
            setFormData({ title: '', content: '', isPriority: false });
            setSelectedFile(null);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Gagal menerbitkan pengumuman.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus pengumuman ini?')) return;
        try {
            await api.delete(`/announcements/${id}`);
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            alert('Gagal menghapus pengumuman.');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-8">
                <div>
                    <div className="flex items-center gap-4 mb-5">
                        <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-lg shadow-indigo-500/10">
                            <Megaphone className="h-7 w-7 stroke-[2.5px]" />
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase text-glow-sm">
                            Siaran <span className="text-indigo-500">Pengumuman</span>
                        </h1>
                    </div>
                    <p className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase italic max-w-2xl leading-relaxed">
                        Kirim informasi penting dan pembaruan organisasi langsung ke seluruh karyawan melalui aplikasi mobile.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative w-full sm:w-[350px] group/search">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700 group-focus-within/search:text-indigo-500 transition-colors z-10" />
                        <input
                            type="text"
                            placeholder="CARI PENGUMUMAN..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-[0.2em] uppercase placeholder:text-slate-800 shadow-inner"
                        />
                    </div>
                    {!isFormOpen && (
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="group flex items-center gap-4 rounded-2xl bg-indigo-600 px-8 py-4 text-[11px] font-black text-white shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-[0.2em] italic border border-white/10"
                        >
                            <Plus className="h-4 w-4 stroke-[3.2px] group-hover:rotate-90 transition-transform duration-300" /> Buat Pengumuman Baru
                        </button>
                    )}
                </div>
            </div>

            {isFormOpen && (
                <div className="mb-8 bg-slate-900 border border-slate-700 rounded-[32px] shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="p-5 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center">
                        <h2 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2 italic">
                            <Send className="h-4 w-4" /> Form Pengumuman Baru
                        </h2>
                        <button onClick={() => setIsFormOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1.5 ml-1">Judul Pengumuman</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 text-sm font-black text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-700 italic"
                                    placeholder="Contoh: Jadwal Libur Lebaran 2024"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1.5 ml-1">Isi Pesan / Informasi</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 text-sm font-black text-white focus:border-indigo-500 focus:outline-none transition-all h-32 placeholder:text-slate-700 italic"
                                    placeholder="Tuliskan detail pengumuman di sini..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1.5 ml-1">Banner / Gambar (Opsional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-slate-800 file:text-[10px] file:font-black file:uppercase file:bg-slate-950 file:text-slate-400 hover:file:bg-slate-800 transition-all font-bold"
                                />
                                <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest font-bold">*Ukuran rekomendasi: 1200x400px</p>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 w-fit">
                                <input
                                    type="checkbox"
                                    id="priority"
                                    checked={formData.isPriority}
                                    onChange={e => setFormData({ ...formData, isPriority: e.target.checked })}
                                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-red-500/50"
                                />
                                <label htmlFor="priority" className="text-[10px] font-black text-slate-300 uppercase tracking-widest cursor-pointer flex items-center gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5 text-red-500" /> Tandai sebagai PENTING / PRIORITAS
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-6 py-3 text-xs font-black text-slate-500 hover:text-white transition uppercase tracking-[0.2em] italic"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="rounded-2xl bg-indigo-600 px-8 py-3 text-xs font-black text-white shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition disabled:opacity-50 uppercase tracking-[0.2em]"
                                >
                                    {isSubmitting ? 'Mengirim...' : 'Terbitkan Sekarang'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {isFormOpen && (
                <div className="mb-20 bg-slate-900/50 border border-white/5 rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-8 duration-500 backdrop-blur-xl">
                    <div className="p-8 bg-slate-950/50 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                                <Send className="h-5 w-5 stroke-[2.5px]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white italic tracking-tighter uppercase text-glow-sm">
                                    Buat <span className="text-indigo-400">Pengumuman</span>
                                </h2>
                                <p className="text-[8px] font-black text-slate-600 tracking-[0.2em] uppercase mt-1 italic">Isi form di bawah untuk mengirim pengumuman</p>
                            </div>
                        </div>
                        <button onClick={() => setIsFormOpen(false)} className="h-10 w-10 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-xl border border-white/5 transition-all">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-2">Judul Pengumuman</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full rounded-[24px] border border-white/5 bg-slate-950 py-5 px-8 text-[11px] font-black text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-800 italic uppercase tracking-[0.1em] shadow-inner"
                                        placeholder="MASUKKAN JUDUL PENGUMUMAN..."
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-2">Gambar / Banner (Opsional)</label>
                                    <div className="bg-slate-950 border border-white/5 rounded-[24px] p-6 group focus-within:border-indigo-500/30 transition-all">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                            className="w-full text-xs text-slate-500 file:mr-6 file:py-3 file:px-6 file:rounded-xl file:border-white/5 file:text-[9px] file:font-black file:uppercase file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 transition-all font-black uppercase tracking-widest italic"
                                        />
                                        <p className="text-[9px] text-slate-700 mt-4 uppercase tracking-[0.2em] font-black italic">*Ukuran optimal: 1200x400 piksel</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 bg-slate-950/80 p-6 rounded-[24px] border border-white/5 w-fit group hover:border-red-500/30 transition-all">
                                    <input
                                        type="checkbox"
                                        id="priority"
                                        checked={formData.isPriority}
                                        onChange={e => setFormData({ ...formData, isPriority: e.target.checked })}
                                        className="h-5 w-5 rounded-lg border-white/5 bg-slate-900 text-red-600 focus:ring-red-500/50 cursor-pointer"
                                    />
                                    <label htmlFor="priority" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer group-hover:text-red-400 transition-colors flex items-center gap-3 italic">
                                        <AlertCircle className="h-4 w-4 text-red-500 stroke-[2.5px]" /> TANDAI SEBAGAI PRIORITAS
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-3 flex flex-col">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-2">Isi Pesan</label>
                                <textarea
                                    required
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full flex-1 rounded-[24px] border border-white/5 bg-slate-950 py-6 px-8 text-[11px] font-black text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-800 italic uppercase tracking-[0.1em] shadow-inner min-h-[250px] leading-relaxed resize-none"
                                    placeholder="TULISKAN ISI PENGUMUMAN..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-12 pt-8 border-t border-white/5">
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="px-8 py-5 text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-[0.2em] italic"
                            >
                                BATAL
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="rounded-[24px] bg-indigo-600 px-12 py-5 text-[10px] font-black text-white shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-[0.2em] italic border-b-4 border-b-indigo-900"
                            >
                                {isSubmitting ? 'MENGIRIM...' : 'TERBITKAN SEKARANG'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8 mb-20">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center bg-slate-900/50 rounded-[40px] border border-white/5 backdrop-blur-xl">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shadow-lg shadow-indigo-500/20"></div>
                    </div>
                ) : announcements.filter(a =>
                    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    a.content.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                    <div className="flex h-96 flex-col items-center justify-center p-12 text-center bg-slate-900/50 rounded-[40px] border border-white/5 backdrop-blur-xl uppercase tracking-[0.3em] font-black italic text-[10px] gap-8">
                        <div className="h-24 w-24 rounded-[40px] bg-slate-950 border border-white/5 flex items-center justify-center shadow-inner">
                            <Search className="h-10 w-10 text-slate-800" />
                        </div>
                        <p className="text-glow-sm">Tidak ada pengumuman ditemukan untuk "{searchQuery}"</p>
                    </div>
                ) : (
                    announcements.filter(ann =>
                        ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        ann.content.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((ann) => (
                        <div
                            key={ann.id}
                            className={`bg-slate-900/50 rounded-[48px] border ${ann.isPriority ? 'border-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.1)]' : 'border-white/5'} p-10 transition-all hover:bg-slate-800/80 hover:-translate-y-2 group overflow-hidden relative backdrop-blur-xl`}
                        >
                            <div className="flex flex-col lg:flex-row gap-10 relative z-10">
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-4 mb-6">
                                        <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase group-hover:text-indigo-400 transition-colors text-glow-sm">
                                            {ann.title}
                                        </h3>
                                        {ann.isPriority && (
                                            <span className="bg-red-500/10 text-red-500 text-[9px] font-black px-4 py-1.5 rounded-full uppercase border border-red-500/20 tracking-[0.2em] shadow-lg shadow-red-500/10 animate-pulse italic">PRIORITAS</span>
                                        )}
                                        <div className="h-1 flex-1 bg-white/5 rounded-full min-w-[50px]"></div>
                                    </div>

                                    {ann.imageUrl && (
                                        <div className="mb-8 rounded-[32px] overflow-hidden border border-white/5 shadow-2xl relative aspect-[3/1]">
                                            <img
                                                src={ann.imageUrl}
                                                alt={ann.title}
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent"></div>
                                        </div>
                                    )}

                                    <div className="text-sm font-black text-slate-400 leading-relaxed whitespace-pre-wrap italic uppercase tracking-tight group-hover:text-slate-200 transition-colors">
                                        {ann.content}
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-10 pt-8 border-t border-white/5">
                                        <div className="flex items-center gap-4 text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] italic">
                                            <div className="h-8 w-8 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-indigo-500">
                                                <Calendar className="h-4 w-4 stroke-[2.5px]" />
                                            </div>
                                            <span>Diterbitkan: {formatDate(ann.createdAt)}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(ann.id)}
                                            className="h-12 w-12 flex items-center justify-center bg-slate-950 border border-white/5 text-slate-700 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                                            title="Hapus Pengumuman"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className={`absolute top-0 right-0 h-64 w-64 blur-[100px] pointer-events-none transition-all duration-700 opacity-0 group-hover:opacity-100 ${ann.isPriority ? 'bg-red-500/5' : 'bg-indigo-500/5'}`}></div>
                        </div>
                    ))
                )}
            </div>
        </DashboardLayout>
    );
}

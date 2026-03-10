'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Megaphone, Plus, Trash2, Calendar, AlertCircle, Send, X, Search } from 'lucide-react';

interface Announcement {
    id: number;
    title: string;
    content: string;
    imageUrl?: string; // New field for Phase 26
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Megaphone className="h-6 w-6 text-blue-600" /> Pengumuman Perusahaan
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Kirim informasi penting langsung ke aplikasi mobile karyawan.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari judul atau isi..."
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
                            Buat Pengumuman
                        </button>
                    )}
                </div>
            </div>

            {isFormOpen && (
                <div className="mb-8 bg-white border border-blue-100 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2">
                            <Send className="h-4 w-4" /> Form Pengumuman Baru
                        </h2>
                        <button onClick={() => setIsFormOpen(false)} className="text-blue-400 hover:text-blue-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Judul Pengumuman</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Contoh: Jadwal Libur Lebaran 2024"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Isi Pesan / Informasi</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Tuliskan detail pengumuman di sini..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Banner / Gambar (Opsional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">*Ukuran rekomendasi: 1200x400px</p>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 w-fit">
                                <input
                                    type="checkbox"
                                    id="priority"
                                    checked={formData.isPriority}
                                    onChange={e => setFormData({ ...formData, isPriority: e.target.checked })}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="priority" className="text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5 text-red-500" /> Tandai sebagai PENTING / PRIORITAS
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
                                    {isSubmitting ? 'Mengirim...' : 'Terbitkan Sekarang'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center bg-white rounded-xl border border-slate-200">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                ) : announcements.filter(a =>
                    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    a.content.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                        <Search className="h-12 w-12 text-slate-200 mb-4" />
                        <p className="font-medium text-lg mb-1">Tidak ada hasil ditemukan</p>
                        <p className="text-sm">Tidak ada pengumuman yang cocok dengan "{searchQuery}"</p>
                    </div>
                ) : (
                    announcements.filter(ann =>
                        ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        ann.content.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((ann) => (
                        <div
                            key={ann.id}
                            className={`bg-white rounded-xl border ${ann.isPriority ? 'border-red-200 shadow-sm shadow-red-50' : 'border-slate-200'} p-6 transition hover:shadow-md`}
                        >
                            <div className="flex justify-between items-start gap-4 mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                            {ann.title}
                                        </h3>
                                        {ann.isPriority && (
                                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Penting</span>
                                        )}
                                    </div>

                                    {ann.imageUrl && (
                                        <div className="mb-3 rounded-lg overflow-hidden border border-slate-100">
                                            <img
                                                src={`http://localhost:5000${ann.imageUrl}`}
                                                alt={ann.title}
                                                className="w-full h-32 object-cover"
                                            />
                                        </div>
                                    )}

                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                        {ann.content}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mt-3">
                                        <Calendar className="h-3 w-3" />
                                        <span>Diterbitkan pd: {formatDate(ann.createdAt)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(ann.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    title="Hapus Pengumuman"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </DashboardLayout>
    );
}

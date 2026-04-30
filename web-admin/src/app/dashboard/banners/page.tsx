'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Image as ImageIcon, Plus, Trash2, Link as LinkIcon, AlertCircle, Send, X, Search, ToggleLeft, ToggleRight } from 'lucide-react';

interface Banner {
    id: number;
    title?: string;
    imageUrl: string;
    linkUrl?: string;
    isActive: boolean;
    order: number;
    createdAt: string;
}

export default function BannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        linkUrl: '',
        order: 0,
        isActive: true
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fetchBanners = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/banners');
            setBanners(response.data);
        } catch (err) {
            setError('Gagal mengambil daftar banner promo.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('linkUrl', formData.linkUrl);
            data.append('order', String(formData.order));
            data.append('isActive', String(formData.isActive));
            if (selectedFile) {
                data.append('image', selectedFile);
            } else {
                alert('Gambar banner wajib diunggah.');
                setIsSubmitting(false);
                return;
            }

            await api.post('/banners', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            fetchBanners();
            setIsFormOpen(false);
            setFormData({ title: '', linkUrl: '', order: 0, isActive: true });
            setSelectedFile(null);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Gagal membuat banner promo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus banner promo ini?')) return;
        try {
            await api.delete(`/banners/${id}`);
            setBanners(prev => prev.filter(b => b.id !== id));
        } catch (err) {
            alert('Gagal menghapus banner.');
        }
    };

    const toggleActive = async (banner: Banner) => {
        try {
            await api.patch(`/banners/${banner.id}`, { isActive: !banner.isActive });
            setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, isActive: !b.isActive } : b));
        } catch (err) {
            alert('Gagal memperbarui status banner.');
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-8">
                <div>
                    <div className="flex items-center gap-4 mb-5">
                        <div className="h-14 w-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-lg shadow-orange-500/10">
                            <ImageIcon className="h-7 w-7 stroke-[2.5px]" />
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase text-glow-sm">
                            Promo <span className="text-orange-500">Banners</span>
                        </h1>
                    </div>
                    <p className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase italic max-w-2xl leading-relaxed">
                        Kelola spanduk promosi yang akan muncul di aplikasi Aivola GO pelanggan. Pastikan gambar menarik untuk meningkatkan penjualan.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative w-full sm:w-[350px] group/search">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700 group-focus-within/search:text-orange-500 transition-colors z-10" />
                        <input
                            type="text"
                            placeholder="CARI BANNER..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] font-black text-white focus:border-orange-500/50 outline-none transition-all italic tracking-[0.2em] uppercase placeholder:text-slate-800 shadow-inner"
                        />
                    </div>
                    {!isFormOpen && (
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="group flex items-center gap-4 rounded-2xl bg-orange-600 px-8 py-4 text-[11px] font-black text-white shadow-2xl shadow-orange-500/20 hover:bg-orange-700 active:scale-95 transition-all uppercase tracking-[0.2em] italic border border-white/10"
                        >
                            <Plus className="h-4 w-4 stroke-[3.2px] group-hover:rotate-90 transition-transform duration-300" /> Tambah Banner Baru
                        </button>
                    )}
                </div>
            </div>

            {isFormOpen && (
                <div className="mb-20 bg-slate-900/50 border border-white/5 rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-8 duration-500 backdrop-blur-xl">
                    <div className="p-8 bg-slate-950/50 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                                <Send className="h-5 w-5 stroke-[2.5px]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white italic tracking-tighter uppercase text-glow-sm">
                                    Upload <span className="text-orange-400">Banner Baru</span>
                                </h2>
                                <p className="text-[8px] font-black text-slate-600 tracking-[0.2em] uppercase mt-1 italic">Lengkapi data di bawah untuk menerbitkan promo</p>
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
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-2">Judul Promo (Opsional)</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full rounded-[24px] border border-white/5 bg-slate-950 py-5 px-8 text-[11px] font-black text-white focus:border-orange-500/50 outline-none transition-all placeholder:text-slate-800 italic uppercase tracking-[0.1em] shadow-inner"
                                        placeholder="MASUKKAN JUDUL PROMO..."
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-2">Link Tujuan / URL (Opsional)</label>
                                    <input
                                        type="text"
                                        value={formData.linkUrl}
                                        onChange={e => setFormData({ ...formData, linkUrl: e.target.value })}
                                        className="w-full rounded-[24px] border border-white/5 bg-slate-950 py-5 px-8 text-[11px] font-black text-white focus:border-orange-500/50 outline-none transition-all placeholder:text-slate-800 italic uppercase tracking-[0.1em] shadow-inner"
                                        placeholder="HTTP://LINK-PROMO.COM..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-2">Urutan Tampil</label>
                                        <input
                                            type="number"
                                            value={formData.order}
                                            onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                                            className="w-full rounded-[24px] border border-white/5 bg-slate-950 py-5 px-8 text-[11px] font-black text-white focus:border-orange-500/50 outline-none transition-all italic uppercase tracking-[0.1em] shadow-inner"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-2">Gambar Banner</label>
                                        <div className="bg-slate-950 border border-white/5 rounded-[24px] p-5 group focus-within:border-orange-500/30 transition-all">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                required
                                                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                                className="w-full text-xs text-slate-500 file:mr-6 file:py-2 file:px-4 file:rounded-xl file:border-white/5 file:text-[9px] file:font-black file:uppercase file:bg-orange-600 file:text-white hover:file:bg-orange-700 transition-all font-black uppercase tracking-widest italic"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 bg-slate-950/80 p-6 rounded-[24px] border border-white/5 w-fit group hover:border-orange-500/30 transition-all">
                                    <input
                                        type="checkbox"
                                        id="active"
                                        checked={formData.isActive}
                                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="h-5 w-5 rounded-lg border-white/5 bg-slate-900 text-orange-600 focus:ring-orange-500/50 cursor-pointer"
                                    />
                                    <label htmlFor="active" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer group-hover:text-orange-400 transition-colors flex items-center gap-3 italic">
                                        <ToggleRight className="h-4 w-4 text-orange-500 stroke-[2.5px]" /> AKTIFKAN SEKARANG
                                    </label>
                                </div>
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
                                className="rounded-[24px] bg-orange-600 px-12 py-5 text-[10px] font-black text-white shadow-2xl shadow-orange-500/20 hover:bg-orange-700 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-[0.2em] italic border-b-4 border-b-orange-900"
                            >
                                {isSubmitting ? 'MENGUPLOAD...' : 'SIMPAN PROMO'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
                {isLoading ? (
                    <div className="col-span-full flex h-64 items-center justify-center bg-slate-900/50 rounded-[40px] border border-white/5 backdrop-blur-xl">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent shadow-lg shadow-orange-500/20"></div>
                    </div>
                ) : banners.length === 0 ? (
                    <div className="col-span-full flex h-96 flex-col items-center justify-center p-12 text-center bg-slate-900/50 rounded-[40px] border border-white/5 backdrop-blur-xl uppercase tracking-[0.3em] font-black italic text-[10px] gap-8">
                        <div className="h-24 w-24 rounded-[40px] bg-slate-950 border border-white/5 flex items-center justify-center shadow-inner">
                            <ImageIcon className="h-10 w-10 text-slate-800" />
                        </div>
                        <p className="text-glow-sm">Belum ada banner promo yang diupload</p>
                    </div>
                ) : (
                    banners.filter(b => 
                        b.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        b.linkUrl?.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((banner) => (
                        <div
                            key={banner.id}
                            className={`bg-slate-900/50 rounded-[48px] border ${banner.isActive ? 'border-orange-500/40 shadow-[0_0_50px_rgba(249,115,22,0.1)]' : 'border-white/5'} p-8 transition-all hover:bg-slate-800/80 group overflow-hidden relative backdrop-blur-xl`}
                        >
                            <div className="relative z-10">
                                <div className="mb-6 rounded-[32px] overflow-hidden border border-white/5 shadow-2xl relative aspect-[21/9]">
                                    <img
                                        src={banner.imageUrl}
                                        alt={banner.title || 'Promo'}
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                                    />
                                    {!banner.isActive && (
                                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
                                            <span className="bg-slate-900 text-white text-[10px] font-black px-6 py-2 rounded-full border border-white/10 uppercase tracking-widest italic">NON-AKTIF</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <h3 className="text-xl font-black italic tracking-tighter text-white uppercase group-hover:text-orange-400 transition-colors text-glow-sm mb-2">
                                            {banner.title || 'Untitled Promo'}
                                        </h3>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 text-[9px] text-slate-500 font-black uppercase tracking-widest italic bg-slate-950 px-4 py-2 rounded-full border border-white/5">
                                                <span className="text-orange-500">#{banner.order}</span> URUTAN
                                            </div>
                                            {banner.linkUrl && (
                                                <div className="flex items-center gap-2 text-[9px] text-slate-500 font-black uppercase tracking-widest italic bg-slate-950 px-4 py-2 rounded-full border border-white/5 max-w-[200px] truncate">
                                                    <LinkIcon className="h-3 w-3 text-orange-500" /> {banner.linkUrl}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleActive(banner)}
                                            className={`h-12 w-12 flex items-center justify-center bg-slate-950 border border-white/5 rounded-2xl transition-all ${banner.isActive ? 'text-orange-500' : 'text-slate-700 hover:text-orange-400'}`}
                                            title={banner.isActive ? "Matikan" : "Aktifkan"}
                                        >
                                            {banner.isActive ? <ToggleRight className="h-6 w-6 stroke-[2.5px]" /> : <ToggleLeft className="h-6 w-6 stroke-[2.5px]" />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(banner.id)}
                                            className="h-12 w-12 flex items-center justify-center bg-slate-950 border border-white/5 text-slate-700 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                                            title="Hapus Banner"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </DashboardLayout>
    );
}

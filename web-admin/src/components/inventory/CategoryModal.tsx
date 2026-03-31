'use client';

import { useState, useEffect } from "react";
import { X, Tag, Plus, Trash2, Edit2, Check, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function CategoryModal({ isOpen, onClose, onSuccess }: any) {
    const [categories, setCategories] = useState<any[]>([]);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/pos/categories');
            setCategories(res.data);
        } catch (error) {
            console.error("Gagal mengambil kategori", error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setLoading(true);
        try {
            await api.post('/pos/categories', { name: newCategoryName });
            setNewCategoryName("");
            fetchCategories();
            onSuccess();
            toast.success("Kategori berhasil ditambahkan");
        } catch (error) {
            toast.error("Gagal menambah kategori");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id: number) => {
        if (!editingName.trim()) return;
        try {
            await api.patch(`/pos/categories/${id}`, { name: editingName });
            setEditingId(null);
            fetchCategories();
            onSuccess();
            toast.success("Kategori diperbarui");
        } catch (error) {
            toast.error("Gagal memperbarui kategori");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Hapus kategori ini? Produk dalam kategori ini akan menjadi 'Tanpa Kategori'.")) return;
        try {
            await api.delete(`/pos/categories/${id}`);
            fetchCategories();
            onSuccess();
            toast.success("Kategori dihapus");
        } catch (error) {
            toast.error("Gagal menghapus kategori");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white border-b border-orange-500/30">
                    <div className="flex items-center gap-3">
                        <Tag className="h-5 w-5 text-orange-400" />
                        <h2 className="text-lg font-black italic uppercase tracking-tight">Kelola Kategori</h2>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleAdd} className="flex gap-2 mb-6">
                        <input
                            type="text"
                            placeholder="Nama kategori baru..."
                            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-bold focus:border-orange-500 focus:bg-white focus:outline-none transition-all"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                        <button
                            disabled={loading || !newCategoryName.trim()}
                            className="p-2.5 rounded-xl bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition-all shadow-lg shadow-orange-100"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    </form>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {categories.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 italic text-sm">
                                <Tag className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                Belum ada kategori
                            </div>
                        ) : (
                            categories.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 group hover:border-orange-200 hover:bg-white transition-all">
                                    {editingId === cat.id ? (
                                        <div className="flex flex-1 gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 rounded-lg border border-orange-500 py-1 px-2 text-sm font-bold focus:outline-none"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                autoFocus
                                            />
                                            <button onClick={() => handleUpdate(cat.id)} className="text-emerald-600 p-1"><Check className="h-4 w-4" /></button>
                                            <button onClick={() => setEditingId(null)} className="text-slate-400 p-1"><X className="h-4 w-4" /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="font-bold text-slate-700 text-sm">{cat.name}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => {
                                                        setEditingId(cat.id);
                                                        setEditingName(cat.name);
                                                    }}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(cat.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-6 flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                        <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-blue-600 font-medium leading-relaxed">
                            Kategori membantu Anda mengelompokkan menu di aplikasi POS Mobile untuk pencarian yang lebih cepat.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

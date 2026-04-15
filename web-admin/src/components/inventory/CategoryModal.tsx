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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#050505]/95 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-slate-900 rounded-[40px] shadow-[0_0_100px_rgba(79,70,229,0.1)] overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-700/50 flex flex-col">
                <div className="bg-slate-950/50 border-b border-white/5 px-8 py-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <Tag className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Category Taxonomy</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Product Classification Matrix</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-8 space-y-8 bg-slate-950/20">
                    <form onSubmit={handleAdd} className="flex gap-3 mb-6">
                        <input
                            type="text"
                            placeholder="NEW CLASSIFICATION..."
                            className="flex-1 rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-6 text-[11px] font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase placeholder:text-slate-800 shadow-inner"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                        <button
                            disabled={loading || !newCategoryName.trim()}
                            className="h-12 w-12 flex items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-500/20 border border-white/10"
                        >
                            <Plus className="h-5 w-5 stroke-[3px]" />
                        </button>
                    </form>

                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {categories.length === 0 ? (
                            <div className="py-16 text-center text-slate-700 italic">
                                <Tag className="h-10 w-10 mx-auto mb-4 opacity-10" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Matrix Empty</p>
                                <p className="text-[9px] font-bold uppercase mt-1">NO CLASSIFICATION GROUPS REGISTERED.</p>
                            </div>
                        ) : (
                            categories.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between p-4 rounded-[28px] border border-white/5 bg-slate-900 group hover:border-indigo-500/30 hover:bg-slate-800 transition-all shadow-lg">
                                    {editingId === cat.id ? (
                                        <div className="flex flex-1 gap-3 animate-in fade-in duration-200">
                                            <input
                                                type="text"
                                                className="flex-1 rounded-xl bg-slate-950 border border-indigo-500 py-1.5 px-4 text-[10px] font-black text-white focus:outline-none uppercase italic tracking-widest"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                autoFocus
                                            />
                                            <button onClick={() => handleUpdate(cat.id)} className="text-emerald-400 p-1 hover:scale-110 transition-transform"><Check className="h-4 w-4 stroke-[3px]" /></button>
                                            <button onClick={() => setEditingId(null)} className="text-slate-600 p-1 hover:text-white transition-colors"><X className="h-4 w-4 stroke-[3px]" /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-4">
                                                <div className="h-2 w-2 rounded-full bg-slate-800 group-hover:bg-indigo-500 transition-colors"></div>
                                                <span className="font-black text-white text-[11px] uppercase tracking-widest italic">{cat.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                <button 
                                                    onClick={() => {
                                                        setEditingId(cat.id);
                                                        setEditingName(cat.name);
                                                    }}
                                                    className="h-8 w-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(cat.id)}
                                                    className="h-8 w-8 flex items-center justify-center text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl border border-white/5 hover:border-red-500/20 transition-all"
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

                    <div className="mt-6 flex items-start gap-4 p-5 rounded-[28px] bg-indigo-500/5 border border-white/5">
                        <AlertCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest">
                            CATEGORIES ENABLE ACCELERATED NAVIGATION WITHIN THE TERMINAL ECOSYSTEM. USE SPECIFIC TAGS FOR OPTIMAL TRANSACTION LATENCY.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

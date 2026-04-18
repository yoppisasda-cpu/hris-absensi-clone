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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
            <div className="glass w-full max-w-md rounded-[3rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-slate-950/50 border-b border-indigo-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <Tag className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Taxonomy Matrix</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Product Classification Protocol</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-10 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
                    <form onSubmit={handleAdd} className="flex gap-4">
                        <input
                            type="text"
                            placeholder="NEW IDENTIFIER..."
                            className="flex-1 rounded-2xl bg-slate-950 border border-white/5 py-4 px-6 text-xs font-black text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all italic tracking-widest uppercase placeholder:text-slate-800 shadow-inner"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                        <button
                            disabled={loading || !newCategoryName.trim()}
                            className="h-14 w-14 flex items-center justify-center rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-900/20 border border-white/10"
                        >
                            <Plus className="h-6 w-6 stroke-[3px]" />
                        </button>
                    </form>

                    <div className="space-y-3">
                        {categories.length === 0 ? (
                            <div className="py-16 text-center text-slate-800 italic bg-slate-950 border border-dashed border-white/5 rounded-[2.5rem]">
                                <Tag className="h-10 w-10 mx-auto mb-4 opacity-5" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Matrix Null</p>
                                <p className="text-[9px] font-bold uppercase mt-1">Initialize classification dataset</p>
                            </div>
                        ) : (
                            categories.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between p-5 rounded-[1.8rem] border border-white/5 bg-slate-950 group hover:border-indigo-500/30 transition-all shadow-inner">
                                    {editingId === cat.id ? (
                                        <div className="flex flex-1 gap-4 animate-in fade-in duration-300">
                                            <input
                                                type="text"
                                                className="flex-1 rounded-xl bg-slate-900 border border-indigo-500 py-2 px-4 text-xs font-black text-white focus:outline-none uppercase italic tracking-widest"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => handleUpdate(cat.id)} className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><Check className="h-4 w-4 stroke-[3px]" /></button>
                                                <button onClick={() => setEditingId(null)} className="h-10 w-10 rounded-xl bg-white/5 text-slate-500 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all"><X className="h-4 w-4 stroke-[3px]" /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-4">
                                                <div className="h-2 w-2 rounded-full bg-slate-800 group-hover:bg-indigo-500 transition-colors shadow-[0_0_10px_rgba(99,102,241,0)] group-hover:shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                                <span className="font-black text-white text-xs uppercase tracking-widest italic">{cat.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button 
                                                    onClick={() => {
                                                        setEditingId(cat.id);
                                                        setEditingName(cat.name);
                                                    }}
                                                    className="h-10 w-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(cat.id)}
                                                    className="h-10 w-10 flex items-center justify-center text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl border border-white/5 hover:border-rose-500/20 transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex items-start gap-4 p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10">
                        <AlertCircle className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-slate-600 font-bold leading-relaxed uppercase tracking-widest italic">
                            Taxing groups optimize terminal latency by accelerating product SKU retrieval within the POS ecosystem. Ensure unique identifiers are utilized.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

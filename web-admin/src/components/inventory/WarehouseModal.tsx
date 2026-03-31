'use client';

import { useState, useEffect } from "react";
import { X, Warehouse, Plus, Trash2, Edit2, Check, ExternalLink, MapPin, Store, Building2, Link } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function WarehouseModal({ isOpen, onClose, onSuccess }: any) {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        location: "",
        type: "STORE",
        branchId: "",
        isMain: false
    });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        try {
            const [wRes, bRes] = await Promise.all([
                api.get('/inventory/warehouses'),
                api.get('/branches')
            ]);
            setWarehouses(wRes.data);
            setBranches(bRes.data);
        } catch (error) {
            console.error("Gagal mengambil data", error);
        }
    };

    useEffect(() => {
        if (isOpen) fetchData();
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingId) {
                await api.patch(`/inventory/warehouses/${editingId}`, {
                    ...formData,
                    branchId: formData.branchId ? parseInt(formData.branchId) : null
                });
                toast.success("Gudang diperbarui");
            } else {
                await api.post('/inventory/warehouses', {
                    ...formData,
                    branchId: formData.branchId ? parseInt(formData.branchId) : null
                });
                toast.success("Gudang ditambahkan");
            }
            setFormData({ name: "", location: "", type: "STORE", branchId: "", isMain: false });
            setEditingId(null);
            fetchData();
            onSuccess();
        } catch (error) {
            toast.error("Gagal menyimpan gudang");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (w: any) => {
        setEditingId(w.id);
        setFormData({
            name: w.name,
            location: w.location || "",
            type: w.type || "STORE",
            branchId: w.branchId?.toString() || "",
            isMain: w.isMain || false
        });
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Hapus gudang ini? Peringatan: Data stok di gudang ini akan ikut terhapus.")) return;
        try {
            await api.delete(`/inventory/warehouses/${id}`);
            fetchData();
            onSuccess();
            toast.success("Gudang dihapus");
        } catch (error) {
            toast.error("Gagal menghapus gudang");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white border-b border-orange-500/30 shrink-0">
                    <div className="flex items-center gap-3">
                        <Warehouse className="h-5 w-5 text-orange-400" />
                        <h2 className="text-lg font-black italic uppercase tracking-tight">Manajemen Lokasi & Stok</h2>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-8 lg:flex lg:gap-8">
                    {/* Form Side */}
                    <div className="lg:w-1/3 mb-8 lg:mb-0">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                            {editingId ? <Edit2 className="h-3.5 w-3.5 text-blue-500" /> : <Plus className="h-3.5 w-3.5 text-orange-500" />}
                            {editingId ? "Edit Lokasi" : "Tambah Lokasi"}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 px-1">Nama Lokasi</label>
                                <input
                                    required
                                    className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-sm font-bold focus:border-orange-500 focus:outline-none transition-all"
                                    placeholder="Contoh: Toko Cabang Sudirman"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 px-1">Tipe Lokasi</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setFormData({...formData, type: 'STORE'})}
                                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all ${formData.type === 'STORE' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}
                                    >
                                        <Store className="h-4 w-4" />
                                        <span className="text-xs font-black uppercase italic">Toko</span>
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setFormData({...formData, type: 'WAREHOUSE'})}
                                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all ${formData.type === 'WAREHOUSE' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}
                                    >
                                        <Building2 className="h-4 w-4" />
                                        <span className="text-xs font-black uppercase italic">Gudang</span>
                                    </button>
                                </div>
                            </div>

                            {formData.type === 'STORE' && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 px-1 flex items-center gap-1">
                                        <Link className="h-3 w-3" /> Hubungkan Cabang Absensi
                                    </label>
                                    <select
                                        className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-sm font-bold focus:border-orange-500 focus:outline-none transition-all"
                                        value={formData.branchId}
                                        onChange={(e) => setFormData({...formData, branchId: e.target.value})}
                                    >
                                        <option value="">-- Pilih Cabang --</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-[9px] text-slate-400 italic font-medium px-1 leading-tight">
                                        Penting: Agar stok otomatis terpotong saat user login di cabang ini.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 px-1">Alamat/Lokasi</label>
                                <textarea
                                    className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-sm font-bold focus:border-orange-500 focus:outline-none transition-all resize-none"
                                    rows={2}
                                    placeholder="Alamat lengkap..."
                                    value={formData.location}
                                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                                />
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={formData.isMain}
                                    onChange={(e) => setFormData({...formData, isMain: e.target.checked})}
                                />
                                <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${formData.isMain ? 'bg-orange-600 border-orange-600' : 'border-slate-300 bg-white'}`}>
                                    {formData.isMain && <Check className="h-4 w-4 text-white" />}
                                </div>
                                <span className="text-xs font-black text-slate-700 uppercase italic">Gudang Utama</span>
                            </label>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-xs font-black uppercase italic tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    {editingId ? "Update" : "Simpan"}
                                </button>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingId(null);
                                            setFormData({ name: "", location: "", type: "STORE", branchId: "", isMain: false });
                                        }}
                                        className="px-4 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all font-black text-xs uppercase"
                                    >
                                        Batal
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* List Side */}
                    <div className="lg:w-2/3">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Daftar Lokasi Aktif</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {warehouses.map((w) => {
                                const branch = branches.find(b => b.id === w.branchId);
                                return (
                                    <div key={w.id} className="relative p-5 rounded-2xl border-2 border-slate-100 bg-white hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/5 transition-all group overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <button onClick={() => handleEdit(w)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"><Edit2 className="h-4 w-4" /></button>
                                            <button onClick={() => handleDelete(w.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                        
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-2xl transform transition-transform group-hover:scale-110 duration-300 ${w.type === 'STORE' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                                {w.type === 'STORE' ? <Store className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-black text-slate-900 leading-tight">{w.name}</h4>
                                                    {w.isMain && <span className="bg-orange-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">Utama</span>}
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase mb-2">
                                                    <MapPin className="h-3 w-3" /> {w.location || "Tanpa Alamat"}
                                                </p>
                                                
                                                <div className="flex flex-wrap gap-2">
                                                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${w.type === 'STORE' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                                        {w.type === 'STORE' ? 'Cabang Toko' : 'Gudang Pusat'}
                                                    </span>
                                                    {w.branchId && (
                                                        <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg border bg-blue-50 border-blue-100 text-blue-700 flex items-center gap-1">
                                                            <Link className="h-2.5 w-2.5" /> {branch?.name || "ID " + w.branchId}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

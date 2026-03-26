'use client';

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Plus, Search, MapPin, Edit3, Trash2, Home, Building2, X, Check } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
    const [formData, setFormData] = useState({ name: "", location: "", isMain: false });

    const fetchWarehouses = async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventory/warehouses');
            setWarehouses(res.data);
        } catch (error) {
            console.error("Gagal mengambil data gudang", error);
            toast.error("Gagal mengambil data gudang");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const handleOpenModal = (warehouse = null) => {
        if (warehouse) {
            setEditingWarehouse(warehouse);
            setFormData({ name: (warehouse as any).name, location: (warehouse as any).location || "", isMain: (warehouse as any).isMain });
        } else {
            setEditingWarehouse(null);
            setFormData({ name: "", location: "", isMain: false });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        try {
            if (editingWarehouse) {
                await api.patch(`/inventory/warehouses/${editingWarehouse.id}`, formData);
                toast.success("Gudang berhasil diperbarui");
            } else {
                await api.post('/inventory/warehouses', formData);
                toast.success("Gudang berhasil ditambahkan");
            }
            setIsModalOpen(false);
            fetchWarehouses();
        } catch (error) {
            console.error("Gagal menyimpan gudang", error);
            toast.error("Gagal menyimpan gudang");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Apakah Anda yakin ingin menghapus gudang ini?")) return;
        try {
            await api.delete(`/inventory/warehouses/${id}`);
            toast.success("Gudang berhasil dihapus");
            fetchWarehouses();
        } catch (error) {
            console.error("Gagal menghapus gudang", error);
            toast.error("Gagal menghapus gudang");
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <MapPin className="h-8 w-8 text-blue-600" /> Manajemen Gudang
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 font-medium">Kelola lokasi penyimpanan barang dan inventori perusahaan.</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
                >
                    <Plus className="h-4 w-4" /> Tambah Gudang Baru
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse bg-white rounded-3xl p-6 border border-slate-100 h-48"></div>
                    ))
                ) : warehouses.length > 0 ? (
                    warehouses.map((w) => (
                        <div key={w.id} className={`group relative bg-white rounded-3xl p-6 border-2 transition-all hover:shadow-xl ${w.isMain ? 'border-blue-500 bg-blue-50/10' : 'border-slate-100'}`}>
                            {w.isMain && (
                                <div className="absolute top-4 right-4 bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-md shadow-blue-500/20">
                                    <Home className="h-3 w-3" /> Gudang Utama
                                </div>
                            )}
                            
                            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                <Building2 className="h-6 w-6 text-slate-500 group-hover:text-white" />
                            </div>
                            
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{w.name}</h3>
                            <p className="text-sm text-slate-500 mb-6 flex items-start gap-2 h-10 line-clamp-2">
                                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                {w.location || 'Lokasi tidak diatur'}
                            </p>
                            
                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-50">
                                <button 
                                    onClick={() => handleOpenModal(w)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                >
                                    <Edit3 className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(w.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                                <Building2 className="h-12 w-12" />
                            </div>
                            <p className="text-slate-400 font-bold italic">Belum ada gudang yang terdaftar.</p>
                            <button 
                                onClick={() => handleOpenModal()}
                                className="text-blue-600 font-bold text-sm hover:underline"
                            >
                                Tambah Gudang Pertama Anda
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Tambah/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white border-b border-blue-500/30">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <Building2 className="h-6 w-6 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black italic tracking-tight uppercase">
                                        {editingWarehouse ? "Edit Gudang" : "Tambah Gudang"}
                                    </h2>
                                    <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase italic">Master Data Lokasi</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Nama Gudang</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Contoh: Gudang Utama Jakarta"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Lokasi / Alamat</label>
                                    <textarea
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold focus:border-blue-500 focus:bg-white focus:outline-none transition-all h-24 resize-none"
                                        placeholder="Alamat lengkap lokasi gudang..."
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <Home className={`h-5 w-5 ${formData.isMain ? 'text-blue-600' : 'text-slate-400'}`} />
                                        <div>
                                            <p className="text-xs font-black text-slate-900 uppercase">Gudang Utama</p>
                                            <p className="text-[9px] text-slate-500 font-medium">Banyak transaksi akan default ke gudang ini.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={formData.isMain}
                                            onChange={(e) => setFormData({ ...formData, isMain: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all font-mono"
                                >
                                    CLOSE
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-xl hover:bg-slate-800 transition-all active:scale-95"
                                >
                                    {editingWarehouse ? "UPDATE DATABASE" : "SIMPAN GUDANG"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

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
            <div className="mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                <div>
                    <div className="flex items-center gap-4 mb-5">
                        <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <MapPin className="h-7 w-7 stroke-[2.5px]" />
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase text-glow-sm">
                            Facility <span className="text-indigo-500">Orchestration</span>
                        </h1>
                    </div>
                    <p className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase italic max-w-2xl leading-relaxed">
                        Control the structural nodes of the supply chain. Define global storage facilities, logistical hubs, and localized distribution centers.
                    </p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="group flex items-center gap-4 rounded-2xl bg-indigo-600 px-8 py-4 text-[11px] font-black text-white shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-[0.2em] italic border border-white/10"
                >
                    <Plus className="h-4 w-4 stroke-[3.2px] group-hover:rotate-90 transition-transform duration-300" /> Register New Node
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse bg-slate-900 border border-white/5 rounded-[40px] p-10 h-64 shadow-2xl"></div>
                    ))
                ) : warehouses.length > 0 ? (
                    warehouses.map((w) => (
                        <div key={w.id} className={`group relative bg-slate-900 rounded-[40px] p-10 border transition-all hover:bg-slate-800 shadow-2xl overflow-hidden ${w.isMain ? 'border-indigo-500/40 shadow-[0_0_50px_rgba(79,70,229,0.1)]' : 'border-white/5 hover:border-white/10'}`}>
                            {w.isMain && (
                                <div className="absolute top-8 right-8 bg-indigo-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg shadow-indigo-500/30 italic z-10">
                                    <Home className="h-3 w-3" /> HUB_MASTER
                                </div>
                            )}
                            
                            <div className="h-16 w-16 rounded-[24px] bg-slate-950 border border-white/5 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:border-indigo-500 transition-all duration-500 shadow-inner group-hover:shadow-indigo-500/50">
                                <Building2 className="h-8 w-8 text-slate-600 group-hover:text-white transition-colors" />
                            </div>
                            
                            <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase mb-4 text-glow-sm">{w.name}</h3>
                            <div className="flex items-start gap-3 h-14">
                                <MapPin className="h-4 w-4 text-indigo-500 mt-1 shrink-0 stroke-[2.5px]" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic leading-relaxed group-hover:text-slate-300 transition-colors">
                                    {w.location || 'GEOLOCATION_NOT_EXTRACTED'}
                                </p>
                            </div>
                            
                            <div className="flex items-center justify-end gap-3 pt-8 mt-4 border-t border-white/5">
                                <button 
                                    onClick={() => handleOpenModal(w)}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-950 border border-white/5 text-slate-600 hover:text-white hover:bg-slate-800 transition-all"
                                >
                                    <Edit3 className="h-4.5 w-4.5" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(w.id)}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-950 border border-white/5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                >
                                    <Trash2 className="h-4.5 w-4.5" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-32 text-center bg-slate-900 rounded-[48px] border-2 border-dashed border-white/5">
                        <div className="flex flex-col items-center gap-8">
                            <div className="p-8 bg-slate-950 rounded-full text-slate-800 border border-white/5 shadow-inner">
                                <Building2 className="h-20 w-20" />
                            </div>
                            <div>
                                <p className="text-slate-500 font-black italic uppercase tracking-[0.2em] text-[11px] mb-4">LOGISTICS INFRASTRUCTURE NOT DETECTED</p>
                                <button 
                                    onClick={() => handleOpenModal()}
                                    className="text-indigo-400 font-black uppercase italic tracking-[0.2em] text-xs hover:text-white transition-colors underline decoration-2 underline-offset-8"
                                >
                                    Initialize First Supply Node
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Tambah/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/95 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-lg rounded-[48px] bg-slate-900 border border-white/5 shadow-[0_0_100px_rgba(79,70,229,0.1)] overflow-hidden animate-in zoom-in duration-300">
                        <div className="bg-slate-950/50 px-10 py-8 flex items-center justify-between text-white border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <Building2 className="h-6 w-6 stroke-[2.5px]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-glow-sm">
                                        {editingWarehouse ? "MOD_FACILITY" : "NEW_FACILITY"}
                                    </h2>
                                    <p className="text-[10px] text-slate-500 font-black tracking-[0.2em] uppercase italic opacity-70 mt-1">Infrastructure Schema Directive</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10">
                            <div className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 ml-2 italic">Faculty Nomenclature</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="INPUT NODE IDENTIFIER..."
                                        className="w-full rounded-[24px] border border-white/5 bg-slate-950 py-5 px-7 text-[11px] font-black text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-800 italic uppercase tracking-[0.1em]"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 ml-2 italic">Geolocation Directives</label>
                                    <textarea
                                        className="w-full rounded-[24px] border border-white/5 bg-slate-950 py-5 px-7 text-[11px] font-black text-white focus:border-indigo-500/50 outline-none transition-all h-32 resize-none placeholder:text-slate-800 italic uppercase tracking-[0.1em] leading-relaxed"
                                        placeholder="INPUT FULL LOGISTICS ADDRESS..."
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center justify-between p-7 bg-slate-950/50 rounded-[28px] border border-white/5 shadow-inner">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-10 w-10 h rounded-xl flex items-center justify-center border transition-all shadow-lg ${formData.isMain ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-slate-900 border-white/5 text-slate-600'}`}>
                                            <Home className="h-5 w-5 stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-white uppercase tracking-widest italic">Hub Master Protocol</p>
                                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-1 italic">Default Logistical Target</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={formData.isMain}
                                            onChange={(e) => setFormData({ ...formData, isMain: e.target.checked })}
                                        />
                                        <div className="w-14 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                                    </label>
                                </div>
                            </div>

                            <div className="mt-10 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 rounded-[24px] border border-white/5 bg-slate-950/50 py-5 text-[10px] font-black text-slate-500 hover:text-white hover:bg-slate-950 transition-all uppercase tracking-[0.2em] italic border-b-4 border-b-white/5"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] rounded-[24px] bg-indigo-600 py-5 text-[10px] font-black text-white shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-[0.2em] italic border-b-4 border-b-indigo-900"
                                >
                                    {editingWarehouse ? "UPDATE_VECTORS" : "INITIALIZE_NODE"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" />
            <div className="glass w-full max-w-6xl max-h-[90vh] rounded-[3rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
                <div className="bg-slate-950/50 border-b border-indigo-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <Warehouse className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Infrastructure Topology</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Supply Chain Logistics & Global Stock Hubs</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-8 lg:flex lg:gap-10 bg-slate-950/20">
                    {/* Form Side */}
                    <div className="lg:w-[38%] mb-10 lg:mb-0">
                        <div className="mb-6 flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${editingId ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                {editingId ? <Edit2 className="h-4 w-4 stroke-[2.5px]" /> : <Plus className="h-4 w-4 stroke-[3px]" />}
                            </div>
                            <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em] italic">
                                {editingId ? "Update Facility Specs" : "Register New Facility"}
                            </h3>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6 p-8 rounded-[32px] bg-slate-900 border border-white/5 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Building2 className="h-20 w-20 text-indigo-500" />
                            </div>
                            <div className="space-y-2 relative z-10">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Facility Descriptor</label>
                                <input
                                    required
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-6 text-[11px] font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase placeholder:text-slate-800 shadow-inner"
                                    placeholder="E.G. MAIN CENTRAL HUB"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2 relative z-10">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Operational Protocol</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setFormData({...formData, type: 'STORE'})}
                                        className={`flex items-center justify-center gap-3 py-3 rounded-2xl border transition-all ${formData.type === 'STORE' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold shadow-lg shadow-indigo-500/5' : 'border-slate-800 bg-slate-950 text-slate-600 hover:border-slate-700'}`}
                                    >
                                        <Store className="h-4 w-4" />
                                        <span className="text-[9px] font-black uppercase tracking-widest italic">Store</span>
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setFormData({...formData, type: 'WAREHOUSE'})}
                                        className={`flex items-center justify-center gap-3 py-3 rounded-2xl border transition-all ${formData.type === 'WAREHOUSE' ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold shadow-lg shadow-amber-500/5' : 'border-slate-800 bg-slate-950 text-slate-600 hover:border-slate-700'}`}
                                    >
                                        <Building2 className="h-4 w-4" />
                                        <span className="text-[9px] font-black uppercase tracking-widest italic">Hub</span>
                                    </button>
                                </div>
                            </div>

                            {formData.type === 'STORE' && (
                                <div className="space-y-2 relative z-10 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1 flex items-center gap-2">
                                        <Link className="h-3 w-3 text-indigo-400" /> Terminal Sync Integration
                                    </label>
                                    <div className="relative group">
                                        <select
                                            className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-6 text-[10px] font-black text-slate-400 group-focus-within:text-white outline-none transition-all italic tracking-widest uppercase appearance-none"
                                            value={formData.branchId}
                                            onChange={(e) => setFormData({...formData, branchId: e.target.value})}
                                        >
                                            <option value="">SELECT BRANCH SYNC...</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 text-[8px] pointer-events-none">▼</div>
                                    </div>
                                    <p className="mt-2 text-[8px] text-slate-600 font-bold italic px-1 leading-tight uppercase tracking-widest">
                                        CRITICAL: REQUIRED FOR AUTOMATED STOCK DEPLETION AT LOCAL TERMINALS.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2 relative z-10">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Geospatial Coordinates</label>
                                <textarea
                                    className="w-full rounded-[28px] bg-slate-950 border border-slate-800 py-4 px-6 text-sm font-bold text-white focus:border-indigo-500/50 outline-none transition-all resize-none italic placeholder:text-slate-800 shadow-inner"
                                    rows={2}
                                    placeholder="DETAILED LOCATION DATA..."
                                    value={formData.location}
                                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                                />
                            </div>

                            <label className="flex items-center gap-4 cursor-pointer group relative z-10">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.isMain}
                                        onChange={(e) => setFormData({...formData, isMain: e.target.checked})}
                                    />
                                    <div className="w-12 h-6 bg-slate-800 border border-white/5 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600 after:shadow-lg"></div>
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase italic tracking-[0.2em] group-hover:text-amber-500 transition-colors">Core Fulfillment Node</span>
                            </label>

                            <div className="flex gap-4 pt-4 relative z-10">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 border border-white/10"
                                >
                                    {editingId ? "Sync Updates" : "Commit Facility"}
                                </button>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingId(null);
                                            setFormData({ name: "", location: "", type: "STORE", branchId: "", isMain: false });
                                        }}
                                        className="flex-1 px-4 bg-white/5 text-slate-500 border border-white/5 rounded-2xl hover:text-white hover:bg-white/10 transition-all font-black text-[10px] uppercase italic tracking-widest"
                                    >
                                        Abort
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* List Side */}
                    <div className="lg:w-[62%]">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em] italic">Active Infrastructure Topology</h3>
                            <div className="px-5 py-2 rounded-full bg-slate-800 border border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest italic flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div> Network Optimal
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pr-2 custom-scrollbar overflow-y-auto max-h-[60vh]">
                            {warehouses.map((w) => {
                                const branch = branches.find(b => b.id === w.branchId);
                                return (
                                    <div key={w.id} className="relative p-6 rounded-[32px] border border-white/5 bg-slate-900 hover:border-indigo-500/30 hover:bg-slate-800 transition-all group overflow-hidden shadow-2xl">
                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 flex gap-2 z-20">
                                            <button onClick={() => handleEdit(w)} className="p-2.5 bg-white/5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-xl transition-all border border-white/5"><Edit2 className="h-4 w-4" /></button>
                                            <button onClick={() => handleDelete(w.id)} className="p-2.5 bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all border border-white/5"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                        
                                        <div className="flex items-start gap-5 relative z-10">
                                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transform transition-transform group-hover:scale-110 duration-500 shadow-xl ${w.type === 'STORE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-emerald-500/5' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-amber-500/5'}`}>
                                                {w.type === 'STORE' ? <Store className="h-7 w-7 stroke-[1.5px]" /> : <Building2 className="h-7 w-7 stroke-[1.5px]" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="text-sm font-black text-white leading-tight uppercase tracking-tight italic">{w.name}</h4>
                                                    {w.isMain && <span className="bg-amber-600/20 text-amber-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-lg tracking-widest border border-amber-500/20 italic">Core</span>}
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-bold flex items-center gap-2 uppercase tracking-tight mb-4 group-hover:text-slate-300 transition-colors">
                                                    <MapPin className="h-3 w-3 text-indigo-500" /> {w.location || "UNIDENTIFIED COORDINATES"}
                                                </p>
                                                
                                                <div className="flex flex-wrap gap-2">
                                                    <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border tracking-widest italic ${w.type === 'STORE' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}>
                                                        {w.type === 'STORE' ? 'POS Terminal Node' : 'Logistics Hub'}
                                                    </span>
                                                    {w.branchId && (
                                                        <span className="text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border bg-indigo-500/5 border-indigo-500/20 text-indigo-400 flex items-center gap-2 tracking-widest italic">
                                                            <Link className="h-3 w-3" /> {branch?.name?.toUpperCase() || "SYNC ACTIVE"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Decorative Grid Pattern */}
                                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity duration-700" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
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

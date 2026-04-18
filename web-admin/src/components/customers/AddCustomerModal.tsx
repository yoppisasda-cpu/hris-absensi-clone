'use client';

import { useState, useEffect } from "react";
import { X, Save, UserPlus, Phone, Mail, MapPin } from "lucide-react";
import api from "@/lib/api";

interface AddCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editData?: any;
}

export default function AddCustomerModal({ isOpen, onClose, onSuccess, editData }: AddCustomerModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: ''
    });

    useEffect(() => {
        if (editData) {
            setFormData({
                name: editData.name || '',
                phone: editData.phone || '',
                email: editData.email || '',
                address: editData.address || ''
            });
        } else {
            setFormData({
                name: '',
                phone: '',
                email: '',
                address: ''
            });
        }
    }, [editData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editData) {
                await api.patch(`/customers/${editData.id}`, formData);
            } else {
                await api.post('/customers', formData);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal menyimpan data pelanggan");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
            <div className="glass w-full max-w-lg rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-slate-950/50 border-b border-indigo-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <UserPlus className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">
                                {editData ? 'Nexus Personal Edit' : 'Nexus Identity Registry'}
                            </h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Global CRM & Client Correlation Map</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1 flex items-center gap-2">
                             Full Legal Descriptor
                        </label>
                        <div className="relative group">
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-2xl bg-slate-950 border border-slate-800 pl-14 pr-6 py-4 text-xs font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase placeholder:text-slate-800 shadow-inner"
                                placeholder="E.G. ALEXANDER STERLING"
                            />
                            <UserPlus className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700 group-focus-within:text-indigo-400 transition-colors" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Comm Link</label>
                            <div className="relative group">
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 pl-14 pr-6 py-4 text-xs font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase placeholder:text-slate-800 shadow-inner"
                                    placeholder="08XXX..."
                                />
                                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700 group-focus-within:text-indigo-400 transition-colors" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Data Anchor (Email)</label>
                            <div className="relative group">
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 pl-14 pr-6 py-4 text-xs font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase placeholder:text-slate-800 shadow-inner"
                                    placeholder="USER@Nexus.CO"
                                />
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700 group-focus-within:text-indigo-400 transition-colors" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Geospatial Coordinates</label>
                        <div className="relative group">
                            <textarea
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full rounded-[2rem] bg-slate-950 border border-slate-800 pl-14 pr-6 py-5 text-[11px] font-black text-white focus:border-indigo-500/50 outline-none transition-all min-h-[100px] resize-none italic placeholder:text-slate-800 shadow-inner"
                                placeholder="DETAILED LOCATION DATA..."
                            />
                            <MapPin className="absolute left-6 top-6 h-4 w-4 text-slate-700 group-focus-within:text-indigo-400 transition-colors" />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl bg-white/5 border border-white/5 py-5 text-[10px] font-black text-slate-500 hover:text-white hover:bg-white/10 transition-all uppercase tracking-[0.3em] italic"
                        >
                            Abort
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] rounded-2xl bg-indigo-600 py-5 text-[10px] font-black text-white shadow-2xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.3em] italic border border-white/10"
                        >
                            {loading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><Save className="h-4 w-4 stroke-[3px]" /> {editData ? 'Sync Identity' : 'Transmit Registry'}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

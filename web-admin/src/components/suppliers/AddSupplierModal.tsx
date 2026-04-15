'use client';

import { useState, useEffect } from "react";
import { X, Save, Truck, User, Phone, Mail, MapPin, Tag } from "lucide-react";
import api from "@/lib/api";

interface AddSupplierModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editData?: any;
}

export default function AddSupplierModal({ isOpen, onClose, onSuccess, editData }: AddSupplierModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        category: ''
    });

    useEffect(() => {
        if (editData) {
            setFormData({
                name: editData.name || '',
                contactPerson: editData.contactPerson || '',
                phone: editData.phone || '',
                email: editData.email || '',
                address: editData.address || '',
                category: editData.category || ''
            });
        } else {
            setFormData({
                name: '',
                contactPerson: '',
                phone: '',
                email: '',
                address: '',
                category: ''
            });
        }
    }, [editData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editData) {
                await api.patch(`/suppliers/${editData.id}`, formData);
            } else {
                await api.post('/suppliers', formData);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal menyimpan data supplier");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050505]/95 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="w-full max-w-lg rounded-[48px] bg-slate-900 border border-white/5 shadow-[0_0_100px_rgba(245,158,11,0.1)] animate-in zoom-in-95 duration-300 overflow-hidden">
                <div className="bg-slate-950/50 px-10 py-8 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                            <Truck className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black italic tracking-tighter uppercase text-white text-glow-sm">
                                {editData ? 'MOD_PARTNER' : 'NEW_PARTNER'}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-black tracking-[0.2em] uppercase italic mt-1 opacity-70">Logistics Schema Directive</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-2">Executive Nomenclature</label>
                        <div className="relative group">
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-[24px] border border-white/5 bg-slate-950 py-5 pl-14 pr-7 text-[11px] font-black text-white focus:border-amber-500/50 outline-none transition-all placeholder:text-slate-800 italic uppercase tracking-[0.1em] shadow-inner"
                                placeholder="INPUT BUSINESS ENTITY NAME..."
                            />
                            <Truck className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-700 group-focus-within:text-amber-500 transition-colors stroke-[2px]" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-2">Human Liaison (PIC)</label>
                        <div className="relative group">
                            <input
                                type="text"
                                value={formData.contactPerson}
                                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                className="w-full rounded-[24px] border border-white/5 bg-slate-950 py-5 pl-14 pr-7 text-[11px] font-black text-white focus:border-amber-500/50 outline-none transition-all placeholder:text-slate-800 italic uppercase tracking-[0.1em] shadow-inner"
                                placeholder="INPUT RESPONSIBLE PERSONNEL..."
                            />
                            <User className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-700 group-focus-within:text-amber-500 transition-colors stroke-[2px]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-2">Voice Comms</label>
                            <div className="relative group">
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full rounded-[24px] border border-white/5 bg-slate-950 py-5 pl-14 pr-7 text-[11px] font-black text-white focus:border-amber-500/50 outline-none transition-all placeholder:text-slate-800 italic uppercase tracking-[0.1em] shadow-inner"
                                    placeholder="TEL_NUMBER..."
                                />
                                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-700 group-focus-within:text-amber-500 transition-colors stroke-[2px]" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-2">Vector Typology</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full rounded-[24px] border border-white/5 bg-slate-950 py-5 pl-14 pr-7 text-[11px] font-black text-white focus:border-amber-500/50 outline-none transition-all placeholder:text-slate-800 italic uppercase tracking-[0.1em] shadow-inner"
                                    placeholder="RAW/LOG/UTILITY..."
                                />
                                <Tag className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-700 group-focus-within:text-amber-500 transition-colors stroke-[2px]" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-2">Digital Liaison (Email)</label>
                        <div className="relative group">
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full rounded-[24px] border border-white/5 bg-slate-950 py-5 pl-14 pr-7 text-[11px] font-black text-white focus:border-amber-500/50 outline-none transition-all placeholder:text-slate-800 italic uppercase tracking-[0.1em] shadow-inner"
                                placeholder="INPUT COMMUNICATIONS ENDPOINT..."
                            />
                            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-700 group-focus-within:text-amber-500 transition-colors stroke-[2px]" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-2">Geographic Directives (Address)</label>
                        <div className="relative group">
                            <textarea
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full rounded-[24px] border border-white/5 bg-slate-950 py-5 pl-14 pr-7 text-[11px] font-black text-white focus:border-amber-500/50 outline-none transition-all placeholder:text-slate-800 italic uppercase tracking-[0.1em] shadow-inner min-h-[120px] leading-relaxed resize-none"
                                placeholder="INPUT FULL LOGISTICS ADDRESS..."
                            />
                            <MapPin className="absolute left-6 top-6 h-5 w-5 text-slate-700 group-focus-within:text-amber-500 transition-colors stroke-[2px]" />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-8 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-[24px] border border-white/5 bg-slate-950/50 py-5 text-[10px] font-black text-slate-500 hover:text-white hover:bg-slate-950 transition-all uppercase tracking-[0.2em] italic border-b-4 border-b-white/5"
                        >
                            Abort
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] rounded-[24px] bg-amber-600 py-5 text-[10px] font-black text-white shadow-2xl shadow-amber-500/20 hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] border-b-4 border-b-amber-900"
                        >
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><Save className="h-4 w-4 stroke-[3px]" /> {editData ? 'UPDATE_SCHEMA' : 'INITIALIZE_PARTNER'}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

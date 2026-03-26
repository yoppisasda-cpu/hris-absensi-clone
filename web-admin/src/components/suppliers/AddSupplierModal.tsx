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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="bg-amber-500 px-6 py-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <Truck className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="text-xl font-black italic tracking-tight uppercase">
                            {editData ? 'Edit Supplier' : 'Tambah Supplier'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5 text-white" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Perusahaan / Toko</label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm font-bold focus:border-amber-500 outline-none transition-all"
                                placeholder="Contoh: PT. Sumber Makmur"
                            />
                            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kontak Person (Nama Sales/PIC)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.contactPerson}
                                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm font-bold focus:border-amber-500 outline-none transition-all"
                                placeholder="..."
                            />
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telepon</label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm font-bold focus:border-amber-500 outline-none transition-all"
                                    placeholder="0812..."
                                />
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm font-bold focus:border-amber-500 outline-none transition-all"
                                    placeholder="Food/Drink/Utility"
                                />
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                        <div className="relative">
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm font-bold focus:border-amber-500 outline-none transition-all"
                                placeholder="vendor@email.com"
                            />
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Kantor/Gudang</label>
                        <div className="relative">
                            <textarea
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm font-bold focus:border-amber-500 outline-none transition-all min-h-[80px]"
                                placeholder="Jl. Raya..."
                            />
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl border border-slate-200 py-3.5 text-sm font-black text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] rounded-2xl bg-amber-500 py-3.5 text-sm font-black text-white shadow-xl shadow-amber-100 hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                        >
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><Save className="h-5 w-5" /> {editData ? 'Simpan Perubahan' : 'Daftarkan Supplier'}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

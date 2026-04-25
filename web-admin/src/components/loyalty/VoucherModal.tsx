'use client';

import { useState, useEffect } from "react";
import { X, Tag, Percent, DollarSign, Calendar, Users, Activity } from "lucide-react";
import api from "@/lib/api";

interface VoucherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editData?: any;
}

export default function VoucherModal({ isOpen, onClose, onSuccess, editData }: VoucherModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        code: "",
        discountType: "PERCENTAGE",
        discountValue: "",
        minPurchase: "",
        maxDiscount: "",
        validFrom: "",
        validUntil: "",
        quota: "",
        isActive: true,
    });

    useEffect(() => {
        if (editData) {
            setFormData({
                code: editData.code || "",
                discountType: editData.discountType || "PERCENTAGE",
                discountValue: editData.discountValue?.toString() || "",
                minPurchase: editData.minPurchase?.toString() || "",
                maxDiscount: editData.maxDiscount?.toString() || "",
                validFrom: editData.validFrom ? new Date(editData.validFrom).toISOString().split('T')[0] : "",
                validUntil: editData.validUntil ? new Date(editData.validUntil).toISOString().split('T')[0] : "",
                quota: editData.quota?.toString() || "",
                isActive: editData.isActive ?? true,
            });
        } else {
            setFormData({
                code: "",
                discountType: "PERCENTAGE",
                discountValue: "",
                minPurchase: "",
                maxDiscount: "",
                validFrom: "",
                validUntil: "",
                quota: "",
                isActive: true,
            });
        }
    }, [editData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const payload = {
                code: formData.code,
                discountType: formData.discountType,
                discountValue: Number(formData.discountValue),
                minPurchase: formData.minPurchase ? Number(formData.minPurchase) : 0,
                maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
                validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
                validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
                quota: formData.quota ? Number(formData.quota) : 0,
                isActive: formData.isActive
            };

            if (editData) {
                await api.patch(`/vouchers/${editData.id}`, payload);
            } else {
                await api.post('/vouchers', payload);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal menyimpan voucher");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            <Tag className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white italic">{editData ? "Edit Voucher" : "Buat Voucher Baru"}</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{editData ? "Perbarui detail voucher" : "Konfigurasi promo baru"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <form id="voucherForm" onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Kode Voucher *</label>
                            <input 
                                type="text" 
                                required
                                placeholder="Cth: PROMO10"
                                value={formData.code}
                                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white font-bold focus:border-indigo-500 outline-none uppercase"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tipe Diskon *</label>
                                <select 
                                    value={formData.discountType}
                                    onChange={e => setFormData({...formData, discountType: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white font-bold focus:border-indigo-500 outline-none"
                                >
                                    <option value="PERCENTAGE">Persentase (%)</option>
                                    <option value="FIXED">Nominal Tetap (Rp)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Nilai Diskon * {formData.discountType === 'PERCENTAGE' ? '(%)' : '(Rp)'}
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                        {formData.discountType === 'PERCENTAGE' ? <Percent className="h-4 w-4 text-slate-400" /> : <DollarSign className="h-4 w-4 text-slate-400" />}
                                    </div>
                                    <input 
                                        type="number" 
                                        required
                                        min="0"
                                        placeholder={formData.discountType === 'PERCENTAGE' ? "10" : "50000"}
                                        value={formData.discountValue}
                                        onChange={e => setFormData({...formData, discountValue: e.target.value})}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white font-bold focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Minimal Belanja (Rp)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    placeholder="0 (Tanpa minimal)"
                                    value={formData.minPurchase}
                                    onChange={e => setFormData({...formData, minPurchase: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white font-bold focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Maksimal Diskon (Rp)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    disabled={formData.discountType === 'FIXED'}
                                    placeholder={formData.discountType === 'FIXED' ? "Tidak berlaku" : "Kosong = Tanpa batas"}
                                    value={formData.discountType === 'FIXED' ? "" : formData.maxDiscount}
                                    onChange={e => setFormData({...formData, maxDiscount: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white font-bold focus:border-indigo-500 outline-none disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Berlaku Mulai</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="date" 
                                        value={formData.validFrom}
                                        onChange={e => setFormData({...formData, validFrom: e.target.value})}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white font-bold focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Berakhir Pada</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="date" 
                                        value={formData.validUntil}
                                        onChange={e => setFormData({...formData, validUntil: e.target.value})}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white font-bold focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Kuota Penggunaan</label>
                                <div className="relative">
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="number" 
                                        min="0"
                                        placeholder="0 (Tanpa batas)"
                                        value={formData.quota}
                                        onChange={e => setFormData({...formData, quota: e.target.value})}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white font-bold focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Status Voucher</label>
                                <div className="flex items-center h-[50px] px-4 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer" onClick={() => setFormData({...formData, isActive: !formData.isActive})}>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.isActive ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                                        <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </div>
                                    <span className="ml-3 font-bold text-white text-sm">{formData.isActive ? 'Aktif' : 'Nonaktif'}</span>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                    >
                        Batal
                    </button>
                    <button 
                        type="submit" 
                        form="voucherForm"
                        disabled={loading}
                        className="px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
                    >
                        {loading ? 'Menyimpan...' : 'Simpan Voucher'}
                    </button>
                </div>
            </div>
        </div>
    );
}

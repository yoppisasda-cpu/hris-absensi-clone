'use client';

import { useState, useEffect } from "react";
import { 
    Tag, Gift, Search, Plus, Edit, Trash2, 
    Settings, Percent, Database, Save
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";
import VoucherModal from "@/components/loyalty/VoucherModal";

export default function LoyaltyPage() {
    const [activeTab, setActiveTab] = useState<'vouchers' | 'settings'>('settings');
    const [loading, setLoading] = useState(true);
    
    // Vouchers State
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState<any>(null);

    // Settings State
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [companySettings, setCompanySettings] = useState({
        pointsEarnRatio: "0",
        pointsRedeemValue: "0",
        memberDiscountType: 'PERCENTAGE',
        memberDiscountValue: "0",
    });

    useEffect(() => {
        if (activeTab === 'vouchers') {
            fetchVouchers();
        } else {
            fetchSettings();
        }
    }, [activeTab]);

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/vouchers');
            setVouchers(res.data);
        } catch (error) {
            console.error("Gagal mengambil data voucher", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get('/company/loyalty');
            if (res.data) {
                setCompanySettings({
                    pointsEarnRatio: res.data.pointsEarnRatio?.toString() || "0",
                    pointsRedeemValue: res.data.pointsRedeemValue?.toString() || "0",
                    memberDiscountType: res.data.memberDiscountType || 'PERCENTAGE',
                    memberDiscountValue: res.data.memberDiscountValue?.toString() || "0",
                });
            }
        } catch (error) {
            console.error("Gagal mengambil data pengaturan loyalitas", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteVoucher = async (id: number) => {
        if (!confirm("Apakah Anda yakin ingin menghapus voucher ini?")) return;
        try {
            await api.delete(`/vouchers/${id}`);
            fetchVouchers();
        } catch (error) {
            alert("Gagal menghapus voucher");
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSettingsLoading(true);
            const payload = {
                ...companySettings,
                pointsEarnRatio: Number(companySettings.pointsEarnRatio),
                pointsRedeemValue: Number(companySettings.pointsRedeemValue),
                memberDiscountValue: Number(companySettings.memberDiscountValue),
            };
            await api.patch('/company/loyalty', payload);
            alert("Pengaturan berhasil disimpan!");
        } catch (error) {
            alert("Gagal menyimpan pengaturan");
        } finally {
            setSettingsLoading(false);
        }
    };

    const toggleVoucherStatus = async (voucher: any) => {
        try {
            await api.patch(`/vouchers/${voucher.id}`, { isActive: !voucher.isActive });
            fetchVouchers();
        } catch (error) {
            alert("Gagal mengubah status voucher");
        }
    };

    const filteredVouchers = vouchers.filter(v => 
        v.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-fuchsia-600 flex items-center justify-center shadow-lg shadow-fuchsia-200">
                                <Gift className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase">Loyalty & Promo</h1>
                                <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Atur diskon member, poin, dan kode voucher</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-800 pb-px">
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-2 px-6 py-3 font-black text-xs uppercase tracking-widest rounded-t-2xl transition-all ${activeTab === 'settings' ? 'bg-slate-800 text-white border-t border-x border-slate-700' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                    >
                        <Settings className="h-4 w-4" /> Pengaturan Member
                    </button>
                    <button 
                        onClick={() => setActiveTab('vouchers')}
                        className={`flex items-center gap-2 px-6 py-3 font-black text-xs uppercase tracking-widest rounded-t-2xl transition-all ${activeTab === 'vouchers' ? 'bg-slate-800 text-white border-t border-x border-slate-700' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                    >
                        <Tag className="h-4 w-4" /> Manajemen Voucher
                    </button>
                </div>

                {/* Content */}
                <div className="bg-slate-900/50 rounded-b-[32px] rounded-tr-[32px] border border-slate-700 shadow-sm overflow-hidden p-6">
                    {activeTab === 'settings' ? (
                        <div className="max-w-3xl">
                            <h2 className="text-lg font-black text-white italic mb-6">Konfigurasi Poin & Diskon</h2>
                            
                            {loading ? (
                                <div className="animate-pulse space-y-6">
                                    <div className="h-20 bg-slate-800 rounded-2xl"></div>
                                    <div className="h-20 bg-slate-800 rounded-2xl"></div>
                                </div>
                            ) : (
                                <form onSubmit={handleSaveSettings} className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                                            <Database className="h-5 w-5 text-fuchsia-500" />
                                            <h3 className="font-bold text-slate-300">Sistem Poin</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Rasio Perolehan Poin</label>
                                                <p className="text-[10px] text-slate-500 mb-2">Setiap belanja Rp x, pelanggan mendapat 1 poin (0 = Nonaktif)</p>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={companySettings.pointsEarnRatio}
                                                    onChange={e => setCompanySettings({...companySettings, pointsEarnRatio: e.target.value})}
                                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-950 font-bold focus:border-fuchsia-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nilai Tukar Poin (Rp)</label>
                                                <p className="text-[10px] text-slate-500 mb-2">Berapa nilai Rupiah untuk setiap 1 poin yang ditukarkan?</p>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={companySettings.pointsRedeemValue}
                                                    onChange={e => setCompanySettings({...companySettings, pointsRedeemValue: e.target.value})}
                                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-950 font-bold focus:border-fuchsia-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                                            <Percent className="h-5 w-5 text-emerald-500" />
                                            <h3 className="font-bold text-slate-300">Diskon Member Default</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tipe Diskon</label>
                                                <select 
                                                    value={companySettings.memberDiscountType}
                                                    onChange={e => setCompanySettings({...companySettings, memberDiscountType: e.target.value})}
                                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-950 font-bold focus:border-emerald-500 outline-none"
                                                >
                                                    <option value="PERCENTAGE">Persentase (%)</option>
                                                    <option value="FIXED">Nominal Tetap (Rp)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nilai Diskon</label>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={companySettings.memberDiscountValue}
                                                    onChange={e => setCompanySettings({...companySettings, memberDiscountValue: e.target.value})}
                                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-950 font-bold focus:border-emerald-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={settingsLoading}
                                        className="flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-fuchsia-500/20 active:scale-95 transition-all w-full md:w-auto"
                                    >
                                        <Save className="h-4 w-4" /> {settingsLoading ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                    </button>
                                </form>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="relative flex-1 max-w-md">
                                    <input
                                        type="text"
                                        placeholder="Cari kode voucher..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-sm font-bold text-slate-950 focus:border-indigo-500 transition-all outline-none"
                                    />
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                </div>
                                <button 
                                    onClick={() => {
                                        setEditingVoucher(null);
                                        setIsVoucherModalOpen(true);
                                    }}
                                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                                >
                                    <Plus className="h-4 w-4" /> Buat Voucher
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-800/50">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 rounded-tl-xl">Kode</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800">Diskon</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800">Min. Belanja</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800">Masa Berlaku</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800">Kuota</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 rounded-tr-xl text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {loading ? (
                                            Array(3).fill(0).map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan={7} className="px-6 py-4">
                                                        <div className="h-10 bg-slate-800 rounded-xl"></div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : filteredVouchers.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-20 text-center space-y-3">
                                                    <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                                                        <Tag className="h-8 w-8 text-slate-500" />
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Belum ada data voucher</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredVouchers.map((v) => (
                                                <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="font-black text-white bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg border border-indigo-500/30">
                                                            {v.code}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-300">
                                                        {v.discountType === 'PERCENTAGE' ? `${v.discountValue}%` : `Rp ${v.discountValue.toLocaleString()}`}
                                                        {v.maxDiscount ? <span className="block text-[10px] text-slate-500 font-normal mt-1">Maks: Rp {v.maxDiscount.toLocaleString()}</span> : null}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-300">
                                                        {v.minPurchase ? `Rp ${v.minPurchase.toLocaleString()}` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-300">
                                                        {v.validFrom ? new Date(v.validFrom).toLocaleDateString() : '-'} <br/>
                                                        <span className="text-[10px] text-slate-500 font-normal">s/d</span> <br/>
                                                        {v.validUntil ? new Date(v.validUntil).toLocaleDateString() : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-300">
                                                        {v.usedCount} / {v.quota > 0 ? v.quota : '∞'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button 
                                                            onClick={() => toggleVoucherStatus(v)}
                                                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${v.isActive ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                                                        >
                                                            {v.isActive ? 'Aktif' : 'Nonaktif'}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingVoucher(v);
                                                                    setIsVoucherModalOpen(true);
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-800"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteVoucher(v.id)}
                                                                className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <VoucherModal 
                isOpen={isVoucherModalOpen} 
                onClose={() => setIsVoucherModalOpen(false)} 
                onSuccess={fetchVouchers}
                editData={editingVoucher}
            />
        </DashboardLayout>
    );
}

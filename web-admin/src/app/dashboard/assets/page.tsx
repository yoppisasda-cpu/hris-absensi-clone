'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Laptop, Plus, Search, Edit2, Trash2, User, Calendar, AlertCircle, Save, X, CheckCircle2, Calculator, Building, Truck, Settings, Armchair, HelpCircle } from 'lucide-react';

interface Asset {
    id: number;
    name: string;
    category: string;
    taxCategory: string | null;
    serialNumber: string | null;
    condition: 'GOOD' | 'FAIR' | 'BROKEN';
    imageUrl: string | null;
    purchaseDate: string | null;
    purchasePrice: number;
    residualValue: number;
    usefulLife: number;
    isDepreciating: boolean;
    userId: number | null;
    user?: {
        name: string;
        email: string;
    };
}

interface Employee {
    id: number;
    name: string;
    jobTitle: string | null;
}

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        id: 0,
        name: '',
        category: 'ELECTRONIC',
        taxCategory: 'NON_TAXABLE',
        serialNumber: '',
        condition: 'GOOD',
        purchaseDate: '',
        purchasePrice: '0',
        residualValue: '0',
        usefulLife: '0',
        isDepreciating: false,
        userId: '',
        imageUrl: ''
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [assetsRes, employeesRes] = await Promise.all([
                api.get('/assets'),
                api.get('/users') // List employees for assignment
            ]);
            setAssets(assetsRes.data);
            setEmployees(employeesRes.data);
        } catch (err: any) {
            setError('Gagal memuat data aset atau karyawan.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenAdd = () => {
        setIsEditMode(false);
        setFormData({
            id: 0,
            name: '',
            category: 'ELECTRONIC',
            taxCategory: 'NON_TAXABLE',
            serialNumber: '',
            condition: 'GOOD',
            purchaseDate: '',
            purchasePrice: '0',
            residualValue: '0',
            usefulLife: '0',
            isDepreciating: false,
            userId: '',
            imageUrl: ''
        });
        setSelectedFile(null);
        setImagePreview(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (asset: Asset) => {
        setIsEditMode(true);
        setFormData({
            id: asset.id,
            name: asset.name,
            category: asset.category || 'ELECTRONIC',
            taxCategory: asset.taxCategory || 'NON_TAXABLE',
            serialNumber: asset.serialNumber || '',
            condition: asset.condition as any,
            purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
            purchasePrice: asset.purchasePrice?.toString() || '0',
            residualValue: asset.residualValue?.toString() || '0',
            usefulLife: asset.usefulLife?.toString() || '0',
            isDepreciating: asset.isDepreciating || false,
            userId: asset.userId ? asset.userId.toString() : '',
            imageUrl: asset.imageUrl || ''
        });
        setSelectedFile(null);
        setImagePreview(asset.imageUrl ? asset.imageUrl : null);
        setIsModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('category', formData.category);
            data.append('taxCategory', formData.taxCategory);
            data.append('serialNumber', formData.serialNumber);
            data.append('condition', formData.condition);
            if (formData.purchaseDate) data.append('purchaseDate', formData.purchaseDate);
            data.append('purchasePrice', formData.purchasePrice);
            data.append('residualValue', formData.residualValue);
            data.append('usefulLife', formData.usefulLife);
            data.append('isDepreciating', formData.isDepreciating.toString());
            if (formData.userId) data.append('userId', formData.userId);
            if (selectedFile) data.append('image', selectedFile);

            if (isEditMode) {
                await api.put(`/assets/${formData.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/assets', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            setIsModalOpen(false);
            fetchData();
            alert(isEditMode ? 'Aset diperbarui!' : 'Aset berhasil ditambahkan!');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Gagal menyimpan aset.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus aset ini secara permanen?')) return;
        try {
            await api.delete(`/assets/${id}`);
            setAssets(assets.filter(a => a.id !== id));
        } catch (err) {
            alert('Gagal menghapus aset.');
        }
    };

    const filteredAssets = assets.filter(a =>
        (a.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.serialNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCategoryIcon = (category: string) => {
        switch(category) {
            case 'ELECTRONIC': return <Laptop className="h-4 w-4" />;
            case 'VEHICLE': return <Truck className="h-4 w-4" />;
            case 'PROPERTY': return <Building className="h-4 w-4" />;
            case 'MACHINERY': return <Settings className="h-4 w-4" />;
            case 'FURNITURE': return <Armchair className="h-4 w-4" />;
            default: return <HelpCircle className="h-4 w-4" />;
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-2xl shadow-indigo-500/10 transition-transform hover:scale-105">
                        <Laptop className="h-7 w-7 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">Manajemen Aset</h1>
                        <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase mt-2 italic">Corporate Inventory & Asset Assignment System</p>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 transition-colors group-focus-within:text-indigo-500" />
                        <input
                            type="text"
                            placeholder="Cari aset atau pemegang..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full md:w-80 pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-bold text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all outline-none placeholder:text-slate-700 shadow-inner group"
                        />
                    </div>
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/20 active:scale-95 transition-all border border-indigo-400/20 italic"
                    >
                        <Plus className="h-4 w-4 stroke-[3px]" /> Registrasi Aset
                    </button>
                </div>
            </div>

            <div className="bg-slate-900/50 rounded-[32px] border border-slate-700 shadow-2xl overflow-hidden backdrop-blur-xl min-h-[400px]">
                {isLoading ? (
                    <div className="flex h-96 items-center justify-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shadow-2xl shadow-indigo-500/20"></div>
                    </div>
                ) : error ? (
                    <div className="flex h-96 flex-col items-center justify-center p-8 text-center">
                        <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                            <AlertCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <p className="font-black text-white italic uppercase tracking-tighter text-lg">{error}</p>
                    </div>
                ) : filteredAssets.length === 0 ? (
                    <div className="flex h-96 flex-col items-center justify-center p-8 text-center space-y-4">
                        <div className="h-20 w-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/5 shadow-inner">
                            <Laptop className="h-10 w-10 text-slate-500 opacity-20" />
                        </div>
                        <div>
                            <p className="text-xl font-black italic text-white uppercase tracking-tighter">Inventaris Kosong</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Mulai tambahkan aset tetap perusahaan untuk pelacakan yang lebih baik.</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#050505] border-b border-slate-800">
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Identitas Aset & Spek</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Status Utilisasi</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Penanggung Jawab</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Model Depresiasi</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic text-right">Menu</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 transition-all">
                                {filteredAssets.map((asset) => (
                                    <tr key={asset.id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-5">
                                                <div className="h-16 w-20 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                                    {asset.imageUrl ? (
                                                        <img src={asset.imageUrl} alt={asset.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Laptop className="h-7 w-7 text-slate-700" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-black text-sm italic text-white uppercase tracking-tighter leading-none mb-2">{asset.name}</div>
                                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20 w-fit italic">
                                                        {getCategoryIcon(asset.category)} {asset.category?.replace('_', ' ')}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col gap-2.5">
                                                <span className={`inline-flex items-center w-fit px-3 py-1 rounded-xl text-[9px] font-black border uppercase tracking-[0.2em] italic ${asset.userId
                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                                                    }`}>
                                                    {asset.userId ? '🔴 SEDANG DIGUNAKAN' : '🟢 READY'}
                                                </span>
                                                <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 italic ${asset.condition === 'GOOD' ? 'text-emerald-500/80' :
                                                    asset.condition === 'FAIR' ? 'text-amber-500/80' : 'text-red-500/80'
                                                    }`}>
                                                    <div className={`h-1.5 w-1.5 rounded-full ${asset.condition === 'GOOD' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                        asset.condition === 'FAIR' ? 'bg-amber-500' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                                        }`} />
                                                    {asset.condition === 'GOOD' ? 'Sangat Baik' :
                                                        asset.condition === 'FAIR' ? 'Cukup (Ada Lecet)' : 'Kondisi Kritis'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            {asset.user ? (
                                                <div className="flex items-center gap-3.5">
                                                    <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                                        <User className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black italic text-white uppercase tracking-tighter leading-none mb-1">{asset.user.name}</div>
                                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{asset.user.email}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-[10px] italic font-black text-slate-600 uppercase tracking-widest">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-800" />
                                                    Belum diserahkan
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-6">
                                            {asset.isDepreciating ? (
                                                <div className="flex flex-col">
                                                    <div className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] italic mb-1">AUTOMATED</div>
                                                    <div className="text-sm font-black text-white italic tracking-tighter">
                                                        Rp {((asset.purchasePrice - asset.residualValue) / (asset.usefulLife || 1)).toLocaleString()}
                                                        <span className="text-slate-700 text-[10px] font-bold ml-1 uppercase not-italic">/mo</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] italic">NON-CALC</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleOpenEdit(asset)} 
                                                    className="h-10 w-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 rounded-xl border border-transparent hover:border-white/5 transition-all"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(asset.id)} 
                                                    className="h-10 w-10 flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Add/Edit Aset */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-xl bg-slate-900 rounded-[40px] shadow-[0_0_100px_rgba(79,70,229,0.1)] overflow-hidden animate-in fade-in zoom-in duration-300 h-[90vh] flex flex-col border border-slate-700/50">
                        <div className="bg-slate-950/50 border-b border-white/5 px-8 py-6 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                                    <Laptop className="h-6 w-6 stroke-[2.5px]" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">
                                        {isEditMode ? 'Update Dataset Aset' : 'Registrasi Aset Baru'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Fill detailed information about company asset</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-8 overflow-y-auto flex-grow custom-scrollbar bg-slate-950/20">
                            {/* Image Upload & Preview */}
                            <div className="flex justify-center">
                                <div className="relative group">
                                    <div className="h-44 w-72 rounded-[32px] bg-slate-950 border-2 border-dashed border-slate-800 overflow-hidden flex items-center justify-center transition-all group-hover:border-indigo-500/50 shadow-inner">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="h-full w-full object-cover transition-transform group-hover:scale-110 duration-500" />
                                        ) : (
                                            <div className="text-center p-6 space-y-3">
                                                <div className="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/5">
                                                    <Laptop className="h-8 w-8 text-slate-700" />
                                                </div>
                                                <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] italic leading-relaxed">Release to upload<br />photo documentation</p>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                    {imagePreview && (
                                        <button
                                            type="button"
                                            onClick={() => { setImagePreview(null); setSelectedFile(null); }}
                                            className="absolute -top-3 -right-3 h-10 w-10 bg-red-600 text-white rounded-2xl shadow-2xl hover:bg-red-700 transition-all border border-red-500/20 flex items-center justify-center vibrate"
                                        >
                                            <X className="h-5 w-5 stroke-[3px]" />
                                        </button>
                                    )}
                                </div>
                            </div>

                             <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Identitas Perangkat</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-5 text-sm font-bold text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-700 shadow-inner"
                                        placeholder="CTH: MACBOOK PRO 14 M3 MAX"
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Kategori Aset tetap</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-4 text-sm font-bold text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                                    >
                                        <option value="ELECTRONIC">ELECTRONIC / GADGET</option>
                                        <option value="VEHICLE">VEHICLE / FLEET</option>
                                        <option value="PROPERTY">PROPERTY / INFRA</option>
                                        <option value="MACHINERY">HEAVY MACHINERY</option>
                                        <option value="FURNITURE">CABINET / FURNITURE</option>
                                        <option value="OTHER">MISC ASSETS</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Kategori Pajak (PPH 21/23)</label>
                                    <select
                                        value={formData.taxCategory || 'NON_TAXABLE'}
                                        onChange={e => setFormData({ ...formData, taxCategory: e.target.value })}
                                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-4 text-sm font-bold text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                                    >
                                        <option value="NON_TAXABLE">NON-TAXABLE ASSET</option>
                                        <option value="KELOMPOK_1">KELOMPOK 1 (4 YEARS)</option>
                                        <option value="KELOMPOK_2">KELOMPOK 2 (8 YEARS)</option>
                                        <option value="KELOMPOK_3">KELOMPOK 3 (16 YEARS)</option>
                                        <option value="KELOMPOK_4">KELOMPOK 4 (20 YEARS)</option>
                                        <option value="PERMANENT_BUILDING">PERMANENT BLDG (20Y)</option>
                                        <option value="SEMI_PERMANENT_BUILDING">SEMI-PERM BLDG (10Y)</option>
                                    </select>
                                </div>
                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Serial Number / Unique ID</label>
                                    <input
                                        type="text"
                                        value={formData.serialNumber}
                                        onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-5 text-sm font-bold text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-800 font-mono italic"
                                        placeholder="SN-XXXX-XXXX-XXXX"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Kondisi Asset</label>
                                    <select
                                        value={formData.condition}
                                        onChange={e => setFormData({ ...formData, condition: e.target.value as any })}
                                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-4 text-sm font-bold text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                                    >
                                        <option value="GOOD">Sangat Baik (Ready)</option>
                                        <option value="FAIR">Cukup (Used)</option>
                                        <option value="BROKEN">Rusak (Service Needed)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Tanggal Akuisisi</label>
                                    <input
                                        type="date"
                                        value={formData.purchaseDate}
                                        onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-5 text-sm font-bold text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all shadow-inner uppercase"
                                    />
                                </div>
                            </div>

                            {/* Finance Automation Section */}
                            {/* Finance Automation Section */}
                            <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-8 space-y-6 shadow-inner">
                                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                            <Calculator className="h-5 w-5 stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] italic leading-none">
                                                Financial Automation System
                                            </label>
                                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1 italic">Calculated Depreciation & Amortization</p>
                                        </div>
                                    </div>
                                    <div className="scale-75">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.isDepreciating}
                                            onChange={(e) => setFormData({...formData, isDepreciating: e.target.checked})}
                                            className="h-6 w-6 rounded-lg text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                                        />
                                    </div>
                                </div>
                                
                                {formData.isDepreciating && (
                                    <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-500">
                                        <div className="col-span-2 sm:col-span-1 space-y-2">
                                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest italic ml-1">Capital Expenditure (CAPEX)</label>
                                            <input 
                                                type="number"
                                                value={formData.purchasePrice}
                                                onChange={e => setFormData({...formData, purchasePrice: e.target.value })}
                                                className="w-full rounded-2xl bg-slate-900 border border-slate-800 py-3.5 px-5 text-sm font-bold text-white focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                                                placeholder="RP. 0"
                                            />
                                        </div>
                                        <div className="sm:col-span-1 space-y-2">
                                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest italic ml-1">Residual Value / Salvage</label>
                                            <input 
                                                type="number"
                                                value={formData.residualValue}
                                                onChange={e => setFormData({...formData, residualValue: e.target.value})}
                                                className="w-full rounded-2xl bg-slate-900 border border-slate-800 py-3.5 px-5 text-sm font-bold text-white focus:border-emerald-500/50 outline-none"
                                                placeholder="RP. 0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest italic ml-1">Service Life (Months)</label>
                                            <input 
                                                type="number"
                                                value={formData.usefulLife}
                                                onChange={e => setFormData({...formData, usefulLife: e.target.value})}
                                                className="w-full rounded-2xl bg-slate-900 border border-slate-800 py-3.5 px-5 text-sm font-bold text-white focus:border-emerald-500/50 outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                                                <CheckCircle2 className="h-4 w-4 stroke-[3px]" /> 
                                                Automatic monthly Expense: <span className="text-white text-sm not-italic ml-2 tracking-tighter">Rp {((parseFloat(formData.purchasePrice || '0') - parseFloat(formData.residualValue || '0')) / (parseInt(formData.usefulLife || '1') || 1)).toLocaleString()}</span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1 flex items-center justify-between">
                                    Operator / User Assignment
                                    {formData.userId && (
                                        <button type="button" onClick={() => setFormData({ ...formData, userId: '' })} className="text-[9px] text-red-500 hover:text-red-400 font-black tracking-widest uppercase italic">🔴 Unlink current holder</button>
                                    )}
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors">
                                        <User className="h-full w-full" />
                                    </div>
                                    <select
                                        value={formData.userId}
                                        onChange={e => setFormData({ ...formData, userId: e.target.value })}
                                        className="w-full pl-12 pr-4 rounded-2xl bg-slate-950 border border-slate-800 py-3.5 text-sm font-bold text-white outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                    >
                                        <option value="">-- UNASSIGNED (AVAILABLE IN STORAGE) --</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id.toString()}>{emp.name.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </form>
                        <div className="p-8 bg-slate-950/50 border-t border-white/5 flex gap-4 shrink-0 backdrop-blur-3xl">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)} 
                                className="flex-1 py-4 text-[10px] font-black text-slate-500 bg-white/5 border border-white/5 hover:text-white hover:bg-white/10 rounded-2xl transition-all uppercase tracking-[0.2em] italic"
                            >
                                Batal
                            </button>
                            <button 
                                type="submit" 
                                onClick={handleSave} 
                                disabled={isSaving} 
                                className="flex-[2] flex items-center justify-center gap-3 py-4 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl disabled:opacity-50 transition-all shadow-2xl shadow-indigo-500/20 uppercase tracking-[0.2em] border border-white/10 italic"
                            >
                                {isSaving ? (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                                ) : (
                                    <><Save className="h-4 w-4 stroke-[3px]" /> {isEditMode ? 'Sync Dataset Changes' : 'Execute Asset Registry'}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

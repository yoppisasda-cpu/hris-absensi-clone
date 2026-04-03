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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Laptop className="h-6 w-6 text-blue-600" /> Manajemen Aset
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Lacak inventaris perusahaan dan penugasan ke karyawan.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari aset atau pemegang..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        />
                    </div>
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                    >
                        <Plus className="h-4 w-4" /> Tambah Aset
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                ) : error ? (
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-red-500">
                        <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
                        <p className="font-semibold">{error}</p>
                    </div>
                ) : filteredAssets.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-400">
                        <Laptop className="h-12 w-12 mb-2 opacity-20" />
                        <p className="text-lg font-medium">Belum ada aset terdaftar</p>
                        <p className="text-sm">Klik "Tambah Aset" untuk memulai inventarisir.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Aset & Kategori</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status & Kondisi</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Pemegang (User)</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Depresiasi</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAssets.map((asset) => (
                                    <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                    {asset.imageUrl ? (
                                                        <img src={asset.imageUrl} alt={asset.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Laptop className="h-6 w-6 text-slate-300" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">{asset.name}</div>
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 w-fit">
                                                        {getCategoryIcon(asset.category)} {asset.category?.replace('_', ' ')}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${asset.userId
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                    {asset.userId ? 'DIPAKAI' : 'TERSEDIA'}
                                                </span>
                                                <div className={`text-xs font-medium flex items-center gap-1 ${asset.condition === 'GOOD' ? 'text-emerald-600' :
                                                    asset.condition === 'FAIR' ? 'text-amber-600' : 'text-red-600'
                                                    }`}>
                                                    <div className={`h-1.5 w-1.5 rounded-full ${asset.condition === 'GOOD' ? 'bg-emerald-500' :
                                                        asset.condition === 'FAIR' ? 'bg-amber-500' : 'bg-red-500'
                                                        }`} />
                                                    {asset.condition === 'GOOD' ? 'Sangat Baik' :
                                                        asset.condition === 'FAIR' ? 'Cukup (Ada Lecet)' : 'Rusak / Perlu Servis'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {asset.user ? (
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-800">{asset.user.name}</div>
                                                        <div className="text-[11px] text-slate-400">{asset.user.email}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs italic text-slate-300">Belum diserahkan</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {asset.isDepreciating ? (
                                                <div className="flex flex-col">
                                                    <div className="text-xs font-bold text-emerald-600">Aktif</div>
                                                    <div className="text-[10px] text-slate-400">Rp {((asset.purchasePrice - asset.residualValue) / (asset.usefulLife || 1)).toLocaleString()}/bln</div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-300">Non-Aktif</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenEdit(asset)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit Aset">
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDelete(asset.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Hapus Aset">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 h-[85vh] flex flex-col">
                        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-slate-800">{isEditMode ? 'Edit Informasi Aset' : 'Registrasi Aset Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-grow custom-scrollbar">
                            {/* Image Upload & Preview */}
                            <div className="flex justify-center mb-4">
                                <div className="relative group">
                                    <div className="h-32 w-48 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center transition-all group-hover:border-blue-400">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <Laptop className="h-8 w-8 text-slate-300 mx-auto mb-1" />
                                                <p className="text-[10px] text-slate-400 font-medium">Klik untuk upload foto aset</p>
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
                                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Perangkat</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Cth: MacBook Pro 14 M3"
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategori Aset</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm focus:border-blue-500 outline-none bg-white"
                                    >
                                        <option value="ELECTRONIC">Elektronik / Gadget</option>
                                        <option value="VEHICLE">Kendaraan</option>
                                        <option value="PROPERTY">Bangunan / Properti</option>
                                        <option value="MACHINERY">Mesin / Peralatan</option>
                                        <option value="FURNITURE">Mebel / Furniture</option>
                                        <option value="OTHER">Lainnya</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategori Pajak (Opsional)</label>
                                    <select
                                        value={formData.taxCategory || 'NON_TAXABLE'}
                                        onChange={e => setFormData({ ...formData, taxCategory: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm focus:border-blue-500 outline-none bg-white"
                                    >
                                        <option value="NON_TAXABLE">Non-Pajak</option>
                                        <option value="KELOMPOK_1">Kelompok 1 (4 Thn)</option>
                                        <option value="KELOMPOK_2">Kelompok 2 (8 Thn)</option>
                                        <option value="KELOMPOK_3">Kelompok 3 (16 Thn)</option>
                                        <option value="KELOMPOK_4">Kelompok 4 (20 Thn)</option>
                                        <option value="PERMANENT_BUILDING">Bangunan Permanen (20 Thn)</option>
                                        <option value="SEMI_PERMANENT_BUILDING">Semi-Permanen (10 Thn)</option>
                                    </select>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nomor Seri / Dokumen</label>
                                    <input
                                        type="text"
                                        value={formData.serialNumber}
                                        onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono"
                                        placeholder="Cth: SN12345 / No IMB"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kondisi</label>
                                    <select
                                        value={formData.condition}
                                        onChange={e => setFormData({ ...formData, condition: e.target.value as any })}
                                        className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm focus:border-blue-500 outline-none bg-white"
                                    >
                                        <option value="GOOD">Sangat Baik</option>
                                        <option value="FAIR">Cukup (Lecet)</option>
                                        <option value="BROKEN">Rusak / Servis</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tgl Pembelian</label>
                                    <input
                                        type="date"
                                        value={formData.purchaseDate}
                                        onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm focus:border-blue-500 outline-none shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Finance Automation Section */}
                            <div className="bg-slate-50/80 p-4 rounded-2xl space-y-3 border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-tight flex items-center gap-2 italic">
                                        <Calculator className="h-4 w-4 text-emerald-600" /> Otomasi Depresiasi / Amortisasi
                                    </label>
                                    <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in font-bold text-xs pr-1">
                                        {formData.isDepreciating ? 'ON' : 'OFF'}
                                        <input 
                                            type="checkbox" 
                                            name="isDepreciating" 
                                            id="isDepreciating" 
                                            checked={formData.isDepreciating}
                                            onChange={(e) => setFormData({...formData, isDepreciating: e.target.checked})}
                                            className="ml-2 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>
                                
                                {formData.isDepreciating && (
                                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-300">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Harga Beli (Rp)</label>
                                            <input 
                                                type="number"
                                                value={formData.purchasePrice}
                                                onChange={e => setFormData({...formData, purchasePrice: e.target.value })}
                                                className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-slate-800 outline-none"
                                            />
                                        </div>
                                        <div className="sm:col-span-1">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nilai Residu (Rp)</label>
                                            <input 
                                                type="number"
                                                value={formData.residualValue}
                                                onChange={e => setFormData({...formData, residualValue: e.target.value})}
                                                className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm focus:border-emerald-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Umur (Bulan)</label>
                                            <input 
                                                type="number"
                                                value={formData.usefulLife}
                                                onChange={e => setFormData({...formData, usefulLife: e.target.value})}
                                                className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm focus:border-emerald-500 outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                                            <p className="text-[10px] font-bold text-emerald-800 flex items-center gap-1.5">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> 
                                                Beban Otomatis: Rp {((parseFloat(formData.purchasePrice || '0') - parseFloat(formData.residualValue || '0')) / (parseInt(formData.usefulLife || '1') || 1)).toLocaleString()}/bulan
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                                    Penugasan Karyawan
                                    {formData.userId && (
                                        <button type="button" onClick={() => setFormData({ ...formData, userId: '' })} className="text-[10px] text-red-500 hover:underline">Lepas Tugas</button>
                                    )}
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <select
                                        value={formData.userId}
                                        onChange={e => setFormData({ ...formData, userId: e.target.value })}
                                        className="w-full pl-10 pr-4 rounded-lg border border-slate-200 py-2.5 text-sm outline-none bg-white focus:border-blue-500"
                                    >
                                        <option value="">-- Tersedia (Belum Diserahkan) --</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id.toString()}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </form>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">Batal</button>
                            <button type="submit" onClick={handleSave} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25">
                                <Save className="h-4 w-4" /> {isSaving ? 'Menproses...' : (isEditMode ? 'Simpan Perubahan' : 'Daftarkan Aset')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

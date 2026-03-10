'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Laptop, Plus, Search, Edit2, Trash2, User, Calendar, AlertCircle, Save, X, CheckCircle2 } from 'lucide-react';

interface Asset {
    id: number;
    name: string;
    serialNumber: string;
    condition: 'GOOD' | 'FAIR' | 'BROKEN';
    imageUrl: string | null;
    purchaseDate: string | null;
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
        serialNumber: '',
        condition: 'GOOD',
        purchaseDate: '',
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
            serialNumber: '',
            condition: 'GOOD',
            purchaseDate: '',
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
            serialNumber: asset.serialNumber,
            condition: asset.condition,
            purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
            userId: asset.userId ? asset.userId.toString() : '',
            imageUrl: asset.imageUrl || ''
        });
        setSelectedFile(null);
        setImagePreview(asset.imageUrl ? `http://localhost:5000${asset.imageUrl}` : null);
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
            data.append('serialNumber', formData.serialNumber);
            data.append('condition', formData.condition);
            if (formData.purchaseDate) data.append('purchaseDate', formData.purchaseDate);
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
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Aset & No. Seri</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status & Kondisi</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Pemegang (User)</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tgl Pembelian</th>
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
                                                        <img src={`http://localhost:5000${asset.imageUrl}`} alt={asset.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Laptop className="h-6 w-6 text-slate-300" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">{asset.name}</div>
                                                    <div className="text-xs text-slate-500 font-mono mt-0.5">{asset.serialNumber}</div>
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
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('id-ID', {
                                                day: 'numeric', month: 'short', year: 'numeric'
                                            }) : '-'}
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
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">{isEditMode ? 'Edit Informasi Aset' : 'Registrasi Aset Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
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

                            <div>
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
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nomor Seri (Unique)</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.serialNumber}
                                    onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono"
                                    placeholder="Cth: C02XJ0L... / SN12345"
                                />
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
                                        className="w-full rounded-lg border border-slate-200 py-2 rx-3 text-sm focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <hr className="border-slate-100 my-2" />

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
                                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.jobTitle || 'No Title'})</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                                    Memilih karyawan akan menandai aset ini sebagai "DIPAKAI". Biarkan kosong jika aset masih tersedia di kantor.
                                </p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Batal</button>
                                <button type="submit" disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25">
                                    <Save className="h-4 w-4" /> {isSaving ? 'Memproses...' : (isEditMode ? 'Update Aset' : 'Simpan Aset')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

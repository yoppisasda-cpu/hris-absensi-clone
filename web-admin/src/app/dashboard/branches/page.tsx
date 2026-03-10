'use client';

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MapPin, Plus, Trash2, Loader2, Save, X } from "lucide-react";
import api from "@/lib/api";

interface Branch {
    id: number;
    name: string;
    latitude: number | null;
    longitude: number | null;
    radius: number | null;
}

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // New Branch State
    const [newBranch, setNewBranch] = useState({
        name: '',
        latitude: '',
        longitude: '',
        radius: 100
    });

    const fetchBranches = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/branches');
            setBranches(res.data);
        } catch (error) {
            console.error("Failed to fetch branches", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const handleAddBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/branches', {
                name: newBranch.name,
                latitude: newBranch.latitude ? parseFloat(newBranch.latitude) : null,
                longitude: newBranch.longitude ? parseFloat(newBranch.longitude) : null,
                radius: parseInt(newBranch.radius.toString(), 10)
            });
            setIsAdding(false);
            setNewBranch({ name: '', latitude: '', longitude: '', radius: 100 });
            fetchBranches();
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal menambahkan cabang.");
        }
    };

    const handleDeleteBranch = async (id: number) => {
        if (!confirm("Yakin ingin menghapus titik cabang ini?")) return;

        try {
            await api.delete(`/branches/${id}`);
            fetchBranches();
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal menghapus cabang, pastikan tidak ada karyawan yang tertaut.");
        }
    }

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <MapPin className="h-6 w-6 text-blue-600" /> Lokasi Cabang
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Kelola titik lokasi absensi (Geo-Fence) untuk setiap cabang perusahaan.</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" /> Tambah Cabang
                    </button>
                )}
            </div>

            {/* Error / Loading states go here... */}
            {isLoading && (
                <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                </div>
            )}

            {!isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Add Form Card */}
                    {isAdding && (
                        <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-lg shadow-blue-500/5 col-span-1 md:col-span-2 lg:col-span-3">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><MapPin className="h-4 w-4" /> Detail Cabang Baru</h3>
                                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleAddBranch} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Nama Cabang / Kedai</label>
                                        <input required value={newBranch.name} onChange={e => setNewBranch({ ...newBranch, name: e.target.value })} type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:bg-white outline-none" placeholder="Misal: Kedai Dharmawangsa" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Latitude (Garis Lintang)</label>
                                        <input value={newBranch.latitude} onChange={e => setNewBranch({ ...newBranch, latitude: e.target.value })} type="number" step="any" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:bg-white outline-none" placeholder="-6.123456" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Longitude (Garis Bujur)</label>
                                        <input value={newBranch.longitude} onChange={e => setNewBranch({ ...newBranch, longitude: e.target.value })} type="number" step="any" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:bg-white outline-none" placeholder="106.123456" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Berlaku Absen dalam Radius Radius (Meter)</label>
                                        <input required value={newBranch.radius} onChange={e => setNewBranch({ ...newBranch, radius: Number(e.target.value) })} type="number" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:bg-white outline-none" placeholder="100" />
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end gap-3">
                                    <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors">Batal</button>
                                    <button type="submit" className="px-5 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2">
                                        <Save className="h-4 w-4" /> Simpan Titik Cabang
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Branch List */}
                    {branches.length === 0 && !isAdding && (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white p-12 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-4">
                                <MapPin className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Belum ada cabang terdaftar</h3>
                            <p className="text-slate-500 max-w-sm mb-6">Tambahkan titik cabang perusahaan untuk mengatur titik lokasi absen bagi masing-masing karyawan lapangan.</p>
                            <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
                                <Plus className="h-4 w-4" /> Tambah Cabang Pertama
                            </button>
                        </div>
                    )}

                    {branches.map(branch => (
                        <div key={branch.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all hover:border-blue-200 hover:shadow-md">
                            <div className="p-6 flex-grow">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">{branch.name}</h3>
                                <div className="space-y-2 mt-4">
                                    <div className="flex justify-between text-xs border-b border-slate-50 pb-2">
                                        <span className="text-slate-500">Koordinat</span>
                                        <span className="font-medium text-slate-700 truncate max-w-[150px]">
                                            {branch.latitude || '-'}, {branch.longitude || '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs pb-1">
                                        <span className="text-slate-500">Radius Valid Absen</span>
                                        <span className="font-bold text-emerald-600">{branch.radius} m</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => handleDeleteBranch(branch.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Hapus Cabang"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}

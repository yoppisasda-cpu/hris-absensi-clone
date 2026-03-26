'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { TrendingUp, Plus, Trash2, UserCheck, Target, Award, Search, X, ChevronRight, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Indicator {
    id: number;
    name: string;
    description: string | null;
    target: number;
    weight: number;
    isSystem?: boolean;
    systemType?: string | null;
}

interface Employee {
    id: number;
    name: string;
    jobTitle: string | null;
    division: string | null;
}

export default function PerformancePage() {
    const [activeTab, setActiveTab] = useState<'indicators' | 'scoring'>('scoring');
    const [indicators, setIndicators] = useState<Indicator[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editIndicator, setEditIndicator] = useState<Partial<Indicator>>({});

    const [newIndicator, setNewIndicator] = useState({
        name: '',
        description: '',
        target: 100,
        weight: 1,
        systemType: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [indRes, empRes] = await Promise.all([
                api.get('/kpi/indicators'),
                api.get('/users')
            ]);
            setIndicators(indRes.data);
            setEmployees(empRes.data.filter((u: any) => u.role === 'EMPLOYEE'));
        } catch (err) {
            console.error('Gagal mengambil data performa', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateIndicator = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...newIndicator,
                isSystem: newIndicator.systemType === 'ATTENDANCE' || newIndicator.systemType === 'PUNCTUALITY',
                systemType: newIndicator.systemType || null
            };
            await api.post('/kpi/indicators', payload);
            setNewIndicator({ name: '', description: '', target: 100, weight: 1, systemType: '' });
            setIsFormOpen(false);
            fetchData();
        } catch (err) {
            alert('Gagal menambah indikator');
        }
    };

    const handleDeleteIndicator = async (id: number) => {
        if (!confirm('Hapus indikator ini?')) return;
        try {
            await api.delete(`/kpi/indicators/${id}`);
            setIndicators(prev => prev.filter(i => i.id !== id));
        } catch (err) {
            alert('Gagal menghapus indikator');
        }
    };

    const handleStartEdit = (ind: Indicator) => {
        setEditingId(ind.id);
        setEditIndicator({
            name: ind.name,
            description: ind.description || '',
            target: ind.target,
            weight: ind.weight,
            systemType: ind.systemType || ''
        });
    };

    const handleUpdateIndicator = async (id: number) => {
        try {
            const payload = {
                ...editIndicator,
                isSystem: editIndicator.systemType === 'ATTENDANCE' || editIndicator.systemType === 'PUNCTUALITY',
                systemType: editIndicator.systemType || null
            };
            await api.put(`/kpi/indicators/${id}`, payload);
            setEditingId(null);
            fetchData();
        } catch (err) {
            alert('Gagal memperbarui indikator');
        }
    };

    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.division?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-blue-600" /> Manajemen Performa KPI
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Kelola indikator kinerja dan berikan penilaian berkala bagi karyawan.</p>
                </div>
            </div>

            <div className="flex gap-1 mb-6 p-1 bg-slate-100 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('scoring')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'scoring'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    Penilaian Karyawan
                </button>
                <button
                    onClick={() => setActiveTab('indicators')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'indicators'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    Indikator KPI
                </button>
            </div>

            {activeTab === 'indicators' ? (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Target className="h-5 w-5" /> Daftar Indikator
                        </h2>
                        {!isFormOpen && (
                            <button
                                onClick={() => setIsFormOpen(true)}
                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                            >
                                <Plus className="h-4 w-4" /> Tambah Indikator
                            </button>
                        )}
                    </div>

                    {isFormOpen && (
                        <div className="bg-white border border-blue-100 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">Indikator Baru</h3>
                                <button onClick={() => setIsFormOpen(false)} className="text-blue-400 hover:text-blue-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleCreateIndicator} className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Indikator</label>
                                        <input
                                            type="text"
                                            required
                                            value={newIndicator.name}
                                            onChange={e => setNewIndicator({ ...newIndicator, name: e.target.value })}
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="Contoh: Produktivitas Harian"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Sumber Data (Otomasi)</label>
                                        <select
                                            value={newIndicator.systemType}
                                            onChange={e => setNewIndicator({ ...newIndicator, systemType: e.target.value })}
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="">Manual (Input Sendiri)</option>
                                            <option value="ATTENDANCE">Kehadiran (Sistem)</option>
                                            <option value="PUNCTUALITY">Ketepatan Waktu (Sistem)</option>
                                            <option value="LEARNING">Target Belajar (Module Learning)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Target Nilai</label>
                                        <input
                                            type="number"
                                            required
                                            value={newIndicator.target}
                                            onChange={e => setNewIndicator({ ...newIndicator, target: parseFloat(e.target.value) })}
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Bobot (Weight)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            required
                                            value={newIndicator.weight}
                                            onChange={e => setNewIndicator({ ...newIndicator, weight: parseFloat(e.target.value) })}
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                                        <textarea
                                            value={newIndicator.description}
                                            onChange={e => setNewIndicator({ ...newIndicator, description: e.target.value })}
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            rows={2}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600">Batal</button>
                                    <button type="submit" className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-700">Simpan Indikator</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {indicators.map(ind => (
                            <div key={ind.id} className={`bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between transition-all ${editingId === ind.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'}`}>
                                {editingId === ind.id ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Indikator</label>
                                            <input 
                                                type="text" 
                                                className="w-full text-sm font-bold border-b border-slate-200 focus:border-blue-500 outline-none pb-1"
                                                value={editIndicator.name}
                                                onChange={e => setEditIndicator({...editIndicator, name: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Sumber Data</label>
                                            <select 
                                                className="w-full text-[10px] font-bold border border-slate-100 rounded px-2 py-1 focus:border-blue-500 outline-none"
                                                value={editIndicator.systemType || ''}
                                                onChange={e => setEditIndicator({...editIndicator, systemType: e.target.value})}
                                            >
                                                <option value="">Manual (Input Sendiri)</option>
                                                <option value="ATTENDANCE">Kehadiran (Sistem)</option>
                                                <option value="PUNCTUALITY">Ketepatan Waktu (Sistem)</option>
                                                <option value="LEARNING">Target Belajar (Module Learning)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Deskripsi</label>
                                            <textarea 
                                                className="w-full text-xs text-slate-500 border border-slate-100 rounded p-2 focus:border-blue-500 outline-none"
                                                rows={2}
                                                value={editIndicator.description || ''}
                                                onChange={e => setEditIndicator({...editIndicator, description: e.target.value})}
                                            />
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Target</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full text-sm font-bold border-b border-slate-200 focus:border-blue-500 outline-none"
                                                    value={editIndicator.target}
                                                    onChange={e => setEditIndicator({...editIndicator, target: parseFloat(e.target.value)})}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Weight</label>
                                                <input 
                                                    type="number" 
                                                    step="0.1"
                                                    className="w-full text-sm font-bold border-b border-slate-200 focus:border-blue-500 outline-none"
                                                    value={editIndicator.weight}
                                                    onChange={e => setEditIndicator({...editIndicator, weight: parseFloat(e.target.value)})}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 hover:text-slate-800 font-medium">Batal</button>
                                            <button onClick={() => handleUpdateIndicator(ind.id)} className="text-xs text-blue-600 hover:text-blue-800 font-bold">Simpan</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <h3 className="font-bold text-slate-900 leading-tight">{ind.name}</h3>
                                                {ind.systemType && (
                                                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-0.5">
                                                        {ind.systemType === 'ATTENDANCE' ? 'Otomatis Kehadiran' : 
                                                         ind.systemType === 'PUNCTUALITY' ? 'Otomatis Ketepatan Waktu' : 
                                                         ind.systemType === 'LEARNING' ? 'Target Belajar' : 'Otomatis Sistem'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleStartEdit(ind)} className="text-slate-300 hover:text-blue-500 transition-colors">
                                                    <Plus className="h-4 w-4 rotate-45" /> {/* Use Plus rotated for "Edit" or just a text button */}
                                                </button>
                                                {!ind.isSystem && (
                                                    <button onClick={() => handleDeleteIndicator(ind.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-4 h-10 overflow-hidden line-clamp-2">{ind.description || 'Tidak ada deskripsi'}</p>
                                        <div className="flex gap-4">
                                            <div className="bg-slate-50 px-3 py-2 rounded-lg text-center flex-1">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Target</p>
                                                <p className="text-lg font-bold text-blue-600">{ind.target}</p>
                                            </div>
                                            <div className="bg-slate-50 px-3 py-2 rounded-lg text-center flex-1">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Weight</p>
                                                <p className="text-lg font-bold text-slate-700">{ind.weight}x</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex gap-4 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Cari karyawan..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(parseInt(e.target.value))}
                                >
                                    {months.map((m, i) => (
                                        <option key={m} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                                <select
                                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                                    value={selectedYear}
                                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                                >
                                    {[2024, 2025, 2026].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-center w-12 text-slate-400">#</th>
                                    <th className="px-6 py-4">Nama Karyawan</th>
                                    <th className="px-6 py-4">Divisi / Jabatan</th>
                                    <th className="px-6 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
                                        </td>
                                    </tr>
                                ) : filteredEmployees.map((emp, i) => (
                                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 text-center text-slate-400">{i + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-blue-600 font-bold uppercase">
                                                    {emp.name.charAt(0)}
                                                </div>
                                                <span className="font-bold text-slate-900">{emp.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-700">{emp.jobTitle || '-'}</span>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-tight">{emp.division || 'Umum'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/dashboard/performance/score?userId=${emp.id}&month=${selectedMonth}&year=${selectedYear}`}
                                                className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                                            >
                                                Beri Penilaian <ChevronRight className="h-3 w-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

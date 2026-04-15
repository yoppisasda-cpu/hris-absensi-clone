'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { UserPlus, Mail, Briefcase, X, Save, Edit2, Search, FileText, Clock, Laptop, UserX, UserCheck, Trash2, Camera, ShieldCheck, Smartphone } from 'lucide-react';
import EmployeeDocumentsModal from '@/components/dashboard/EmployeeDocumentsModal';
import EmployeeAssetsModal from '@/components/dashboard/EmployeeAssetsModal';

interface Shift {
    id: number;
    title: string;
    startTime: string;
    endTime: string;
}

interface Branch {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    basicSalary: number;
    allowance: number;
    jobTitle?: string;
    division?: string;
    grade?: string;
    joinDate?: string;
    overtimeRate?: number;
    bpjsKesehatan?: boolean;
    bpjsKetenagakerjaan?: boolean;
    shift?: Shift;
    branch?: Branch;
    contractEndDate?: string;
    reportToId?: number;
    isActive?: boolean;
    resignDate?: string;
    faceReferenceUrl?: string;
    mealAllowance?: number;
}

export default function EmployeesPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showExpiringOnly, setShowExpiringOnly] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

    // State untuk Modal Form Tambah Karyawan Baru
    const [isEditMode, setIsEditMode] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        id: 0, name: '', email: '', password: '', role: 'EMPLOYEE', companyId: '', branchId: '',
        basicSalary: 0, allowance: 0, mealAllowance: 0, overtimeRate: 0, jobTitle: '', division: '', grade: '', joinDate: '',
        contractEndDate: '', bpjsKesehatan: false, bpjsKetenagakerjaan: false, reportToId: ''
    });

    // State untuk Modal Dokumen (Phase 26)
    const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
    const [selectedUserForDocs, setSelectedUserForDocs] = useState({ id: 0, name: '' });

    const [isAssetsModalOpen, setIsAssetsModalOpen] = useState(false);
    const [selectedUserForAssets, setSelectedUserForAssets] = useState({ id: 0, name: '' });

    // State untuk Modal Face Reference
    const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
    const [selectedUserForFace, setSelectedUserForFace] = useState<{id: number, name: string, currentPhoto?: string}>({ id: 0, name: '' });
    const [faceFile, setFaceFile] = useState<File | null>(null);
    const [facePreview, setFacePreview] = useState<string | null>(null);
    const [isUploadingFace, setIsUploadingFace] = useState(false);

    const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);
    const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
    const [userRole, setUserRole] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userRole') || 'EMPLOYEE' : 'EMPLOYEE'));

    const fetchUsers = async () => {
        try {
            const [usersRes, shiftsRes, branchesRes] = await Promise.all([
                api.get('/users', { params: { status: activeTab } }),
                api.get('/shifts'),
                api.get('/branches')
            ]);
            setUsers(usersRes.data);
            setAvailableShifts(shiftsRes.data);
            setAvailableBranches(branchesRes.data);
        } catch (err) {
            setError('Gagal mengambil data sistem. Pastikan backend server menyala.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        fetchUsers();
    }, [activeTab]);

    const handleChangeShift = async (userId: number, shiftId: string) => {
        try {
            await api.put(`/users/${userId}/shift`, { shiftId: shiftId || null });
            fetchUsers(); // Refresh tabel setelah berhasil
        } catch (error) {
            const err = error as { response?: { data?: { error?: string } } };
            alert('Gagal merubah jadwal: ' + (err.response?.data?.error || 'Kesalahan Jaringan'));
        }
    };

    // Fungsi Submit Karyawan Baru / Edit Karyawan
    const handleSaveEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (isEditMode) {
                await api.put(`/users/${formData.id}`, formData);
                alert('Data Karyawan Berhasil Diperbarui!');
            } else {
                await api.post('/users', formData);
                alert('Karyawan Berhasil Ditambahkan!');
            }

            // Reload Tabel Karyawan & Tutup Modal
            setIsModalOpen(false);
            setFormData({
                id: 0, name: '', email: '', password: '', role: 'EMPLOYEE', companyId: '', branchId: '',
                basicSalary: 0, allowance: 0, mealAllowance: 0, overtimeRate: 0, jobTitle: '', division: '', grade: '', joinDate: '',
                contractEndDate: '', bpjsKesehatan: false, bpjsKetenagakerjaan: false, reportToId: ''
            });
            setIsEditMode(false);

            // Tarik ulang list dari server
            setIsLoading(true);
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (err) {
            const error = err as { response?: { data?: { error?: string } } };
            alert(error.response?.data?.error || 'Gagal menyimpan data karyawan.');
        } finally {
            setIsLoading(false);
            setIsSaving(false);
        }
    };

    const handleFaceUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!faceFile) return;

        setIsUploadingFace(true);
        const formData = new FormData();
        formData.append('photo', faceFile);

        try {
            await api.patch(`/users/${selectedUserForFace.id}/face-reference`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Foto referensi wajah berhasil diperbarui!');
            setIsFaceModalOpen(false);
            setFaceFile(null);
            setFacePreview(null);
            fetchUsers();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            alert(error.response?.data?.error || 'Gagal mengupload foto referensi.');
        } finally {
            setIsUploadingFace(false);
        }
    };

    const handleOpenEdit = (user: User) => {
        setFormData({
            id: user.id,
            name: user.name,
            email: user.email,
            password: '', // Kosongkan saat edit
            role: user.role,
            companyId: '', // Tetap biarkan atau set sesuai form creation
            branchId: user.branch?.id?.toString() || '',
            basicSalary: user.basicSalary || 0,
            allowance: user.allowance || 0,
            overtimeRate: user.overtimeRate || 0,
            jobTitle: user.jobTitle || '',
            division: user.division || '',
            grade: user.grade || '',
            joinDate: user.joinDate ? user.joinDate.split('T')[0] : '',
            contractEndDate: user.contractEndDate ? user.contractEndDate.split('T')[0] : '',
            bpjsKesehatan: user.bpjsKesehatan || false,
            bpjsKetenagakerjaan: user.bpjsKetenagakerjaan || false,
            mealAllowance: user.mealAllowance || 0,
            reportToId: user.reportToId?.toString() || ''
        });
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleDeactivate = async (user: User) => {
        if (!confirm(`Apakah Anda yakin ingin memindahkan ${user.name} ke daftar Ex-Employee?\nKaryawan ini tidak akan bisa login lagi.`)) return;
        
        try {
            await api.patch(`/users/${user.id}/deactivate`, {});
            alert('Karyawan telah dipindahkan ke daftar Ex-Employee.');
            fetchUsers();
        } catch (error) {
            const err = error as { response?: { data?: { error?: string } } };
            const errorMessage = err.response?.data?.error || 'Gagal menonaktifkan karyawan.';
            alert(errorMessage);
        }
    };

    const handleReactivate = async (user: User) => {
        if (!confirm(`Aktifkan kembali ${user.name}?`)) return;
        
        try {
            await api.put(`/users/${user.id}`, { ...user, isActive: true, resignDate: null });
            alert('Karyawan telah diaktifkan kembali.');
            setActiveTab('active');
        } catch (error) {
            alert('Gagal mengaktifkan kembali karyawan.');
        }
    };

    const handleDeleteUser = async (user: User) => {
        if (!confirm(`Hapus PERMANEN karyawan "${user.name}"?\nSemua histori absensi dan payroll akan ikut terhapus.`)) return;
        
        try {
            await api.delete(`/users/${user.id}`);
            alert('Karyawan berhasil dihapus secara permanen.');
            fetchUsers();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            console.error(error);
            alert(error.response?.data?.error || 'Gagal menghapus karyawan.');
        } finally {
        }
    };

    const handleResetDevice = async (user: User) => {
        if (!confirm(`Reset Device ID untuk ${user.name}?\n\nSetelah direset, karyawan bisa mendaftarkan HP baru pada absensi berikutnya.`)) return;
        try {
            const res = await api.patch(`/users/${user.id}/reset-device`);
            alert(res.data.message || 'Device ID berhasil direset.');
            fetchUsers();
        } catch (error) {
            const err = error as { response?: { data?: { error?: string } } };
            alert(err.response?.data?.error || 'Gagal mereset Device ID.');
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                <div>
                    <div className="flex items-center gap-5 mb-5">
                        <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-lg shadow-blue-500/10">
                            <Briefcase className="h-8 w-8 stroke-[2.5px]" />
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase text-glow-sm">
                            Manajemen <span className="text-blue-500">Karyawan</span>
                        </h1>
                    </div>
                    <p className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase italic max-w-2xl leading-relaxed">
                        Manajemen data karyawan secara lengkap untuk <span className="text-blue-400 font-bold border-b border-blue-500/30 pb-0.5">{activeTab === 'active' ? 'NODE_AKTIF' : 'ARSIP_EX_KARYAWAN'}</span>. Sinkronisasi data biometrik dan akses operasional.
                    </p>
                </div>
                {userRole !== 'FINANCE' && (
                    <button
                        onClick={() => {
                            setIsEditMode(false);
                            setFormData({
                                id: 0, name: '', email: '', password: '', role: 'EMPLOYEE', companyId: '', branchId: '',
                                basicSalary: 0, allowance: 0, mealAllowance: 0, overtimeRate: 0, jobTitle: '', division: '', grade: '', joinDate: '',
                                contractEndDate: '', bpjsKesehatan: false, bpjsKetenagakerjaan: false, reportToId: ''
                            });
                            setIsModalOpen(true);
                        }}
                        className="group flex items-center justify-center gap-4 rounded-2xl bg-blue-600 px-8 py-4 text-sm font-black italic uppercase tracking-widest text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 border border-blue-400/30 active:scale-95"
                    >
                        <UserPlus className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                        Tambah Karyawan
                    </button>
                )}
            </div>

            {/* QUICK STATS MATRIX */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="rounded-[40px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl transition-all hover:bg-slate-900/60 group relative overflow-hidden">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] italic mb-3">Total Karyawan</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter text-glow-md">{users.length}</p>
                    <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-blue-500/5 blur-3xl rounded-full"></div>
                </div>
                <div className="rounded-[40px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl transition-all hover:bg-slate-900/60 group relative overflow-hidden">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] italic mb-3">Kontrak Aktif</p>
                    <p className="text-4xl font-black text-emerald-500 italic tracking-tighter text-glow-md">
                        {users.filter(u => !u.contractEndDate || new Date(u.contractEndDate) > new Date()).length}
                    </p>
                    <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-emerald-500/5 blur-3xl rounded-full"></div>
                </div>
                <div className="rounded-[40px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl transition-all hover:bg-slate-900/60 group relative overflow-hidden">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] italic mb-3">Segera Berakhir</p>
                    <p className="text-4xl font-black text-amber-500 italic tracking-tighter text-glow-md">
                        {users.filter(u => {
                            if (!u.contractEndDate) return false;
                            const expiry = new Date(u.contractEndDate);
                            const today = new Date();
                            const thirtyDays = new Date();
                            thirtyDays.setDate(today.getDate() + 30);
                            return expiry >= today && expiry <= thirtyDays;
                        }).length}
                    </p>
                    <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-amber-500/5 blur-3xl rounded-full"></div>
                </div>
                <div className="rounded-[40px] border border-white/5 bg-slate-900/40 backdrop-blur-2xl p-10 shadow-2xl transition-all hover:bg-slate-900/60 group relative overflow-hidden">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] italic mb-3">Face ID Sinkron</p>
                    <p className="text-4xl font-black text-blue-400 italic tracking-tighter text-glow-md">
                        {Math.round((users.filter(u => u.faceReferenceUrl).length / (users.length || 1)) * 100)}%
                    </p>
                    <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-blue-500/5 blur-3xl rounded-full"></div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-8">
                <div className="flex bg-slate-950 p-2 rounded-2xl border border-white/5 shadow-inner">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-xl italic ${activeTab === 'active'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'text-slate-500 hover:text-white'
                            }`}
                    >
                        Matriks Karyawan
                    </button>
                    <button
                        onClick={() => setActiveTab('inactive')}
                        className={`px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-xl italic ${activeTab === 'inactive'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                            : 'text-slate-500 hover:text-white'
                            }`}
                    >
                        Arsip Karyawan
                    </button>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative group flex-grow sm:flex-grow-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari karyawan berdasarkan ID, nama, atau jabatan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-80 pl-12 pr-6 py-4 text-xs bg-slate-900/80 border border-white/5 text-white rounded-[24px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-600 italic font-black"
                        />
                    </div>
                    <button
                        onClick={() => setShowExpiringOnly(!showExpiringOnly)}
                        className={`flex items-center justify-center gap-3 h-14 px-6 rounded-[24px] border transition-all ${showExpiringOnly
                            ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-lg shadow-red-500/10'
                            : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
                            }`}
                    >
                        <Clock className={`h-5 w-5 ${showExpiringOnly ? 'animate-pulse' : ''}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">{showExpiringOnly ? 'LIHAT_SEMUA' : 'KONTRAK_BERAKHIR'}</span>
                    </button>
                </div>
            </div>

            <div className="bg-slate-900/50 rounded-[32px] border border-slate-700 overflow-hidden shadow-sm backdrop-blur-xl">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : error ? (
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-red-400">
                        <p className="text-lg font-black italic uppercase tracking-tighter mb-2">Terjadi Kesalahan</p>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-70">{error}</p>
                    </div>
                ) : users.filter(u => {
                    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (u.jobTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (u.division || '').toLowerCase().includes(searchQuery.toLowerCase());

                    if (!showExpiringOnly) return matchesSearch;

                    if (!u.contractEndDate) return false;
                    const expiryDate = new Date(u.contractEndDate);
                    const today = new Date();
                    const thirtyDaysLater = new Date();
                    thirtyDaysLater.setDate(today.getDate() + 30);

                    return matchesSearch && expiryDate >= today && expiryDate <= thirtyDaysLater;
                }).length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
                        <Search className="h-12 w-12 text-slate-800 mb-4" />
                        <p className="text-xl font-black italic tracking-tighter text-slate-300 uppercase mb-1">Tidak ada hasil ditemukan</p>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Tidak ada karyawan yang cocok dengan pencarian "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#050505] border-b border-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-[0.2em]">
                                <tr>
                                    <th className="px-6 py-5 italic">Nama Lengkap</th>
                                    <th className="px-6 py-5 italic">Kontak (Email)</th>
                                    <th className="px-6 py-5 italic">{activeTab === 'active' ? 'Jadwal (Shift)' : 'Tanggal Keluar'}</th>
                                    <th className="px-6 py-5 text-center italic">Finansial</th>
                                    <th className="px-6 py-5 text-center italic">Role Akses</th>
                                    <th className="px-6 py-5 text-right italic">Aksi {activeTab === 'active' ? '& Rotasi' : ''}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 transition-all">
                                {users.filter(u => {
                                    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        (u.jobTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        (u.division || '').toLowerCase().includes(searchQuery.toLowerCase());

                                    if (!showExpiringOnly) return matchesSearch;

                                    if (!u.contractEndDate) return false;
                                    const expiryDate = new Date(u.contractEndDate);
                                    const today = new Date();
                                    const thirtyDaysLater = new Date();
                                    thirtyDaysLater.setDate(today.getDate() + 30);

                                    return matchesSearch && expiryDate >= today && expiryDate <= thirtyDaysLater;
                                }).map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-black italic text-indigo-400 shadow-lg">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black italic text-white uppercase tracking-tighter">{user.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">
                                                        {user.jobTitle ? `${user.jobTitle} • ${user.division || '-'} ` : `ID: EMP-${user.id.toString().padStart(4, '0')}`}
                                                        {user.branch && ` • ${user.branch.name}`}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-slate-400 font-black italic text-[11px] uppercase tracking-widest">
                                                <Mail className="h-3 w-3 text-indigo-400" />
                                                {user.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {activeTab === 'active' ? (
                                                user.shift ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-800 font-semibold">{user.shift.title}</span>
                                                        <span className="text-xs text-slate-500 font-mono mt-0.5">{user.shift.startTime} - {user.shift.endTime}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-sm">Belum Ditugaskan</span>
                                                )
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="text-red-600 font-semibold">Resign</span>
                                                    <span className="text-xs text-slate-500">{user.resignDate ? new Date(user.resignDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col gap-1 items-center">
                                         <span className="text-sm font-medium text-slate-700">Rp {(user.basicSalary || 0).toLocaleString('id-ID')}</span>
                                                <div className="flex flex-col text-[10px] items-center">
                                                    <span className="text-green-600">Tj: Rp {(user.allowance || 0).toLocaleString('id-ID')}</span>
                                                    <span className="text-orange-600">Mkn: Rp {(user.mealAllowance || 0).toLocaleString('id-ID')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Briefcase className="h-4 w-4 text-slate-400" />
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                          ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {activeTab === 'active' && (
                                                    <select
                                                        value={user.shift?.id || ''}
                                                        onChange={(e) => handleChangeShift(user.id, e.target.value)}
                                                        className="w-32 text-xs border border-slate-300 rounded py-1 px-1 bg-white text-slate-700 outline-none focus:border-blue-500 transition-colors"
                                                    >
                                                        <option value="">- Lepas Jadwal -</option>
                                                        {availableShifts.map(s => (
                                                            <option key={s.id} value={s.id}>{s.title}</option>
                                                        ))}
                                                    </select>
                                                )}

                                                <button
                                                    onClick={() => {
                                                        setSelectedUserForDocs({ id: user.id, name: user.name });
                                                        setIsDocsModalOpen(true);
                                                    }}
                                                    className="p-1 px-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                                                    title="Dokumen Karyawan"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </button>
                                                {userRole !== 'FINANCE' && (
                                                    <>
                                                        <button onClick={() => handleOpenEdit(user)} className="p-1 px-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors" title="Edit Karyawan">
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUserForAssets({ id: user.id, name: user.name });
                                                                setIsAssetsModalOpen(true);
                                                            }}
                                                            className="p-1 px-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                                                            title="Aset Inventaris"
                                                        >
                                                            <Laptop className="h-4 w-4" />
                                                        </button>

                                                        {activeTab === 'active' ? (
                                                            <button
                                                                onClick={() => handleDeactivate(user)}
                                                                className="p-1 px-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Menonaktifkan (Ex-Employee)"
                                                            >
                                                                <UserX className="h-4 w-4" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleReactivate(user)}
                                                                className="p-1 px-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                                                title="Aktifkan Kembali"
                                                            >
                                                                <UserCheck className="h-4 w-4" />
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => {
                                                                setSelectedUserForFace({ 
                                                                    id: user.id, 
                                                                    name: user.name, 
                                                                    currentPhoto: user.faceReferenceUrl 
                                                                });
                                                                setIsFaceModalOpen(true);
                                                            }}
                                                            className={`p-1 px-2 rounded transition-colors ${user.faceReferenceUrl ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                                            title="Foto Referensi Wajah (AI)"
                                                        >
                                                            <Camera className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            onClick={() => handleResetDevice(user)}
                                                            className="p-1 px-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                                                            title="Reset Device ID (Ganti HP)"
                                                        >
                                                            <Smartphone className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            onClick={() => handleDeleteUser(user)}
                                                            className="p-1 px-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Hapus Permanen"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                                {userRole === 'FINANCE' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUserForAssets({ id: user.id, name: user.name });
                                                            setIsAssetsModalOpen(true);
                                                        }}
                                                        className="p-1 px-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                                                        title="Aset Inventaris"
                                                    >
                                                        <Laptop className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Footer */}
                {!isLoading && !error && users.length > 0 && (
                    <div className="border-t border-slate-800 bg-[#050505]/60 px-6 py-5 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Menampilkan <span className="text-white italic">{users.filter(u => {
                            const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (u.jobTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (u.division || '').toLowerCase().includes(searchQuery.toLowerCase());

                            if (!showExpiringOnly) return matchesSearch;

                            if (!u.contractEndDate) return false;
                            const expiryDate = new Date(u.contractEndDate);
                            const today = new Date();
                            const thirtyDaysLater = new Date();
                            thirtyDaysLater.setDate(today.getDate() + 30);

                            return matchesSearch && expiryDate >= today && expiryDate <= thirtyDaysLater;
                        }).length}</span> dari <span className="text-white italic">{users.length}</span> tim
                        </span>
                        <div className="flex gap-2">
                            <button disabled className="px-4 py-1.5 rounded-xl bg-white/5 text-slate-600 border border-white/5 text-[10px] font-black uppercase tracking-widest cursor-not-allowed">Halaman Sebelumnya</button>
                            <button disabled className="px-4 py-1.5 rounded-xl bg-white/5 text-slate-600 border border-white/5 text-[10px] font-black uppercase tracking-widest cursor-not-allowed">Selanjutnya</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Tambah Karyawan */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/80 backdrop-blur-xl p-4">
                        <div className="w-full max-w-lg bg-slate-900 rounded-[32px] border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between bg-slate-950/50 border-b border-white/5 px-8 py-6">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 italic">{isEditMode ? 'Edit Profil Karyawan' : 'Merekrut Karyawan Baru'}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEmployee} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Nama Lengkap</label>
                                        <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="Cth. John Doe" />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Alamat Email</label>
                                        <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="Cth. john@pt.com" />
                                    </div>
                                    {!isEditMode && (
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Kata Sandi</label>
                                            <input required type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="Min. 6 Karakter" />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Jabatan</label>
                                        <input type="text" value={formData.jobTitle} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="Cth. Staff" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Divisi</label>
                                        <input type="text" value={formData.division} onChange={e => setFormData({ ...formData, division: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="Cth. IT" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Golongan</label>
                                        <input type="text" value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="Cth. 3A" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Tgl Bergabung</label>
                                        <input type="date" value={formData.joinDate} onChange={e => setFormData({ ...formData, joinDate: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Masa Kontrak Berakhir</label>
                                        <input type="date" value={formData.contractEndDate} onChange={e => setFormData({ ...formData, contractEndDate: e.target.value })} className="w-full bg-slate-950 border border-red-500/30 rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-red-500 outline-none transition-all shadow-[0_0_10px_rgba(239,68,68,0.05)]" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Gaji Pokok</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-indigo-400">Rp</span>
                                            <input required type="number" value={formData.basicSalary || ''} onChange={e => setFormData({ ...formData, basicSalary: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="0" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Tunjangan</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-indigo-400">Rp</span>
                                            <input type="number" value={formData.allowance || ''} onChange={e => setFormData({ ...formData, allowance: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="0" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Uang Makan</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-indigo-400">Rp</span>
                                            <input type="number" value={formData.mealAllowance || ''} onChange={e => setFormData({ ...formData, mealAllowance: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="0" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Overtime / Jam</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-indigo-400">Rp</span>
                                            <input type="number" value={formData.overtimeRate || ''} onChange={e => setFormData({ ...formData, overtimeRate: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="0" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-950/50 border border-white/5 rounded-[24px]">
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 italic flex items-center gap-2">
                                        <ShieldCheck className="h-3 w-3 text-indigo-400" /> Integrasi BPJS
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <label className="flex items-start gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer hover:border-indigo-500/30 transition-all group">
                                            <input
                                                type="checkbox"
                                                checked={formData.bpjsKesehatan}
                                                onChange={e => setFormData({ ...formData, bpjsKesehatan: e.target.checked })}
                                                className="mt-1 h-5 w-5 bg-slate-950 border-slate-700 rounded-lg text-indigo-500 focus:ring-indigo-500/20"
                                            />
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-tight text-white group-hover:text-indigo-400 transition-colors">Kesehatan</p>
                                                <p className="text-[9px] font-bold text-slate-500 mt-1">Potong 1% dari Gaji Pokok</p>
                                            </div>
                                        </label>
                                        <label className="flex items-start gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer hover:border-indigo-500/30 transition-all group">
                                            <input
                                                type="checkbox"
                                                checked={formData.bpjsKetenagakerjaan}
                                                onChange={e => setFormData({ ...formData, bpjsKetenagakerjaan: e.target.checked })}
                                                className="mt-1 h-5 w-5 bg-slate-950 border-slate-700 rounded-lg text-indigo-500 focus:ring-indigo-500/20"
                                            />
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-tight text-white group-hover:text-indigo-400 transition-colors">Ketenagakerjaan</p>
                                                <p className="text-[9px] font-bold text-slate-500 mt-1">Potong 3% dari Gaji Pokok</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-950/50 border border-white/5 rounded-[24px]">
                                    <div className="col-span-2">
                                         <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 italic flex items-center gap-2">
                                            <Briefcase className="h-3 w-3 text-indigo-400" /> Penugasan & Akses
                                        </h4>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Role Akses HRIS</label>
                                        <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm text-indigo-400 font-black italic uppercase tracking-tighter outline-none cursor-pointer">
                                            <option value="OWNER">Owner (Pemilik)</option>
                                            <option value="ADMIN">Administrator HR</option>
                                            <option value="MANAGER">Manager / Supervisor</option>
                                            <option value="FINANCE">Finance (Keuangan)</option>
                                            <option value="PURCHASING">Purchasing (Pembelian)</option>
                                            <option value="OPERATIONAL">Operational (Gudang/Toko)</option>
                                            <option value="CASHIER">Cashier (Kasir)</option>
                                            <option value="POS_VIEWER">POS Viewer (Monitoring Omset)</option>
                                            <option value="EMPLOYEE">Karyawan Biasa</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Atasan Langsung</label>
                                        <select value={formData.reportToId} onChange={e => setFormData({ ...formData, reportToId: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white outline-none cursor-pointer">
                                            <option value="">-- Lapor ke Admin --</option>
                                            {users
                                                .filter(u => u.id !== formData.id && (u.role === 'ADMIN' || u.role === 'MANAGER' || u.role === 'OWNER'))
                                                .map(u => (
                                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                                ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Cabang Utama</label>
                                        <select value={formData.branchId} onChange={e => setFormData({ ...formData, branchId: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white outline-none cursor-pointer">
                                            <option value="">-- Tanpa Cabang (Pusat) --</option>
                                            {availableBranches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="sticky bottom-0 bg-slate-900 pt-8 flex gap-4 justify-end border-t border-white/5">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">Batal</button>
                                    <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 shadow-lg shadow-indigo-500/20 border border-indigo-500/20 active:scale-95 transition-all">
                                        <Save className="h-4 w-4" /> {isSaving ? 'Menyimpan...' : 'Simpan Profil'}
                                    </button>
                                </div>
                            </form>

                        </div>
                    </div>
                )
            }

            <EmployeeDocumentsModal
                userId={selectedUserForDocs.id}
                userName={selectedUserForDocs.name}
                isOpen={isDocsModalOpen}
                onClose={() => setIsDocsModalOpen(false)}
            />

            <EmployeeAssetsModal
                userId={selectedUserForAssets.id}
                userName={selectedUserForAssets.name}
                isOpen={isAssetsModalOpen}
                onClose={() => setIsAssetsModalOpen(false)}
            />

            {/* Modal Face Reference Registration */}
            {isFaceModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#050505]/80 backdrop-blur-xl p-4">
                    <div className="w-full max-w-sm bg-slate-900 rounded-[32px] border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between bg-slate-950/50 border-b border-white/5 px-8 py-6">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 italic">Registrasi Wajah AI</h3>
                            <button onClick={() => setIsFaceModalOpen(false)} className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleFaceUpload} className="p-8">
                            <p className="text-[10px] font-bold text-slate-500 mb-8 text-center uppercase tracking-widest leading-relaxed px-4">
                                Daftarkan foto wajah resmi <strong>{selectedUserForFace.name}</strong> sebagai referensi biometrik untuk verifikasi presensi berbasis AI.
                            </p>

                            <div className="flex flex-col items-center gap-6 mb-8">
                                <div className="relative h-56 w-56 rounded-[2rem] border-2 border-dashed border-white/10 bg-slate-950 flex items-center justify-center overflow-hidden group transition-all hover:border-indigo-500/50 shadow-2xl">
                                    {facePreview ? (
                                        <img src={facePreview} alt="Preview" className="h-full w-full object-cover" />
                                    ) : selectedUserForFace.currentPhoto ? (
                                        <img src={selectedUserForFace.currentPhoto} alt="Current" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-600">
                                            <Camera className="h-12 w-12 mb-3 opacity-20" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Ambil Foto</span>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="user"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setFaceFile(file);
                                                setFacePreview(URL.createObjectURL(file));
                                            }
                                        }}
                                        className="absolute inset-0 opacity-0 cursor-pointer" 
                                    />
                                </div>
                                <p className="text-[9px] font-black text-slate-500 italic text-center px-4 uppercase tracking-tighter opacity-50">
                                    Pastikan wajah terlihat jelas, tanpa atribut aksesoris, dan pencahayaan optimal.
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    type="button" 
                                    onClick={() => setIsFaceModalOpen(false)} 
                                    className="flex-1 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isUploadingFace || !faceFile} 
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 border border-indigo-500/20 active:scale-95 transition-all"
                                >
                                    <Save className="h-4 w-4" /> {isUploadingFace ? 'Mengirim...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

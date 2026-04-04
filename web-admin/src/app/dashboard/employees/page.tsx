'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { UserPlus, Mail, Briefcase, X, Save, Edit2, Search, FileText, Clock, Laptop, UserX, UserCheck, Trash2, Camera } from 'lucide-react';
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
        basicSalary: 0, allowance: 0, overtimeRate: 0, jobTitle: '', division: '', grade: '', joinDate: '',
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
                basicSalary: 0, allowance: 0, overtimeRate: 0, jobTitle: '', division: '', grade: '', joinDate: '',
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

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Manajemen Karyawan</h1>
                    <p className="text-sm text-slate-500">
                        {activeTab === 'active' ? 'Kelola data dan akses tim perusahaan Anda.' : 'Data histori karyawan yang sudah tidak bekerja.'}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="flex gap-2">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari nama, email, atau jabatan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setShowExpiringOnly(!showExpiringOnly)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${showExpiringOnly
                                ? 'bg-red-50 text-red-700 border border-red-200 shadow-inner'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <Clock className={`h-4 w-4 ${showExpiringOnly ? 'animate-pulse' : ''}`} />
                            {showExpiringOnly ? 'Semua Karyawan' : 'Kontrak Habis 30hr'}
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            setIsEditMode(false);
                            setFormData({
                                id: 0, name: '', email: '', password: '', role: 'EMPLOYEE', companyId: '', branchId: '',
                                basicSalary: 0, allowance: 0, overtimeRate: 0, jobTitle: '', division: '', grade: '', joinDate: '',
                                contractEndDate: '', bpjsKesehatan: false, bpjsKetenagakerjaan: false, reportToId: ''
                            });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                    >
                        <UserPlus className="h-4 w-4" />
                        Tambah Karyawan
                    </button>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-slate-200 mb-6">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'active'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Karyawan Aktif ({activeTab === 'active' ? users.length : '-'})
                </button>
                <button
                    onClick={() => setActiveTab('inactive')}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'inactive'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Ex-Employee ({activeTab === 'inactive' ? users.length : '-'})
                </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                ) : error ? (
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-red-500">
                        <p className="font-medium text-lg mb-2">Terjadi Kesalahan</p>
                        <p className="text-sm">{error}</p>
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
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-500">
                        <Search className="h-12 w-12 text-slate-200 mb-4" />
                        <p className="font-medium text-lg mb-1">Tidak ada hasil ditemukan</p>
                        <p className="text-sm">Tidak ada karyawan yang cocok dengan pencarian "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Nama Lengkap</th>
                                    <th className="px-6 py-4">Kontak (Email)</th>
                                    <th className="px-6 py-4">{activeTab === 'active' ? 'Jadwal (Shift)' : 'Tanggal Keluar'}</th>
                                    <th className="px-6 py-4 text-center">Gaji Pokok & Tunjangan</th>
                                    <th className="px-6 py-4 text-center">Role Akses</th>
                                    <th className="px-6 py-4 text-right">Aksi {activeTab === 'active' ? '& Rotasi' : ''}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
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
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{user.name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {user.jobTitle ? `${user.jobTitle} • ${user.division || '-'} ` : `ID: EMP-${user.id.toString().padStart(4, '0')}`}
                                                        {user.branch && ` • Cabang: ${user.branch.name}`}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Mail className="h-4 w-4" />
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
                                                    <span className="text-red-600 font-semibold">Resigned</span>
                                                    <span className="text-xs text-slate-500">{user.resignDate ? new Date(user.resignDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col gap-1 items-center">
                                                <span className="text-sm font-medium text-slate-700">Rp {user.basicSalary.toLocaleString('id-ID')}</span>
                                                <span className="text-xs text-green-600">+ Rp {user.allowance.toLocaleString('id-ID')}</span>
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
                                                    onClick={() => handleDeleteUser(user)}
                                                    className="p-1 px-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Hapus Permanen"
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

                {/* Pagination Footer */}
                {!isLoading && !error && users.length > 0 && (
                    <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between text-sm text-slate-500">
                        <span>Menampilkan {users.filter(u => {
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
                        }).length} dari {users.length} karyawan</span>
                        <div className="flex gap-2">
                            <button disabled className="px-3 py-1 rounded bg-slate-200 text-slate-400 cursor-not-allowed">Halaman Sebelumnya</button>
                            <button disabled className="px-3 py-1 rounded bg-slate-200 text-slate-400 cursor-not-allowed">Selanjutnya</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Tambah Karyawan */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between border-b px-6 py-4 border-slate-100">
                                <h3 className="font-semibold text-slate-800">{isEditMode ? 'Edit Profil Karyawan' : 'Merekrut Karyawan Baru'}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Cth. John Doe" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Alamat Email Karyawan</label>
                                    <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Cth. john@pt.com" />
                                </div>
                                {!isEditMode && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Kata Sandi Awal</label>
                                        <input required type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Password rahasia employee" />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Jabatan</label>
                                        <input type="text" value={formData.jobTitle} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })} className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Cth. Staff" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Divisi</label>
                                        <input type="text" value={formData.division} onChange={e => setFormData({ ...formData, division: e.target.value })} className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Cth. IT" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Golongan</label>
                                        <input type="text" value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Cth. 3A" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Bergabung</label>
                                        <input type="date" value={formData.joinDate} onChange={e => setFormData({ ...formData, joinDate: e.target.value })} className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Kontrak Berakhir</label>
                                        <input type="date" value={formData.contractEndDate} onChange={e => setFormData({ ...formData, contractEndDate: e.target.value })} className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:ring-1 focus:ring-blue-500 border-red-200 outline-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Gaji Pokok</label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-2.5 text-sm font-semibold text-slate-400">Rp</span>
                                            <input required type="number" value={isNaN(formData.basicSalary) ? '' : formData.basicSalary} onChange={e => setFormData({ ...formData, basicSalary: parseFloat(e.target.value) || 0 })} className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Cth. 5000000" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tunjangan</label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-2.5 text-sm font-semibold text-slate-400">Rp</span>
                                            <input required type="number" value={isNaN(formData.allowance) ? '' : formData.allowance} onChange={e => setFormData({ ...formData, allowance: parseFloat(e.target.value) || 0 })} className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Cth. 500000" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tarif Lembur (per Jam)</label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-2.5 text-sm font-semibold text-slate-400">Rp</span>
                                            <input required type="number" value={formData.overtimeRate} onChange={e => setFormData({ ...formData, overtimeRate: parseFloat(e.target.value) || 0 })} className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Cth. 25000" />
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-slate-100 my-4" />
                                <h4 className="text-sm font-semibold text-slate-800 mb-3">Integrasi BPJS (Fase 21)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.bpjsKesehatan}
                                            onChange={e => setFormData({ ...formData, bpjsKesehatan: e.target.checked })}
                                            className="mt-1 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">BPJS Kesehatan</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Potong 1% dari Gaji Pokok</p>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.bpjsKetenagakerjaan}
                                            onChange={e => setFormData({ ...formData, bpjsKetenagakerjaan: e.target.checked })}
                                            className="mt-1 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">BPJS Ketenagakerjaan</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Potong 3% dari Gaji Pokok</p>
                                        </div>
                                    </label>
                                </div>

                                <hr className="border-slate-100 my-4" />

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Role Akses HRIS</label>
                                        <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm outline-none bg-white font-bold text-indigo-600">
                                            <option value="OWNER">Owner (Pemilik)</option>
                                            <option value="ADMIN">Administrator HR</option>
                                            <option value="MANAGER">Manager / Supervisor</option>
                                            <option value="PURCHASING">Purchasing (Pembelian)</option>
                                            <option value="OPERATIONAL">Operational (Gudang/Toko)</option>
                                            <option value="CASHIER">Cashier (Kasir)</option>
                                            <option value="EMPLOYEE">Karyawan Biasa</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Lapor Ke (Atasan)</label>
                                        <select value={formData.reportToId} onChange={e => setFormData({ ...formData, reportToId: e.target.value })} className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm outline-none bg-white">
                                            <option value="">-- Tidak Ada (Lapor ke Admin) --</option>
                                            {users
                                                .filter(u => u.id !== formData.id && (u.role === 'ADMIN' || u.role === 'MANAGER'))
                                                .map(u => (
                                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                                ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Penugasan Cabang GPS</label>
                                        <select value={formData.branchId} onChange={e => setFormData({ ...formData, branchId: e.target.value })} className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm outline-none bg-white">
                                            <option value="">-- Tanpa Cabang (Pusat) --</option>
                                            {availableBranches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="sticky bottom-0 bg-white pt-4 pb-0 flex gap-3 justify-end border-t border-slate-50">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Batal</button>
                                    <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 shadow-lg shadow-blue-500/20">
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b px-6 py-4 border-slate-100">
                            <h3 className="font-bold text-slate-800">Registrasi Wajah AI</h3>
                            <button onClick={() => setIsFaceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleFaceUpload} className="p-8">
                            <p className="text-sm text-slate-500 mb-6 text-center">
                                Daftarkan foto wajah resmi <strong>{selectedUserForFace.name}</strong> sebagai referensi verifikasi absensi.
                            </p>

                            <div className="flex flex-col items-center gap-6 mb-8">
                                <div className="relative h-48 w-48 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden group transition-all hover:border-blue-400">
                                    {facePreview ? (
                                        <img src={facePreview} alt="Preview" className="h-full w-full object-cover" />
                                    ) : selectedUserForFace.currentPhoto ? (
                                        <img src={selectedUserForFace.currentPhoto} alt="Current" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-400">
                                            <Camera className="h-10 w-10 mb-2 opacity-20" />
                                            <span className="text-xs">Pilih Foto Jelas</span>
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
                                <p className="text-[10px] text-slate-400 italic text-center px-4">
                                    Pastikan wajah terlihat jelas, tanpa masker/kacamata hitam, dan pencahayaan cukup.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsFaceModalOpen(false)} 
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isUploadingFace || !faceFile} 
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                                >
                                    <Save className="h-4 w-4" /> {isUploadingFace ? 'Mengirim...' : 'Simpan Wajah'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

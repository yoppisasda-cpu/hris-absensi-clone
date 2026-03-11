'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";
import { Building2, MapPin, Save, AlertTriangle } from 'lucide-react';

interface Company {
    id: number;
    name: string;
    latitude: number | null;
    longitude: number | null;
    radius: number | null;
    picName: string | null;
    picPhone: string | null;
    contractType: 'LUMSUM' | 'SATUAN';
    contractValue: number;
    contractStart: string | null;
    contractEnd: string | null;
    employeeLimit: number;
}

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const isNearingExpiry = (dateString: string | null) => {
        if (!dateString) return false;
        const expiryDate = new Date(dateString);
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30 && diffDays > 0;
    };

    const isExpired = (dateString: string | null) => {
        if (!dateString) return false;
        const expiryDate = new Date(dateString);
        const now = new Date();
        return expiryDate < now;
    };

    // Form States
    const [name, setName] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [radius, setRadius] = useState('100'); // Default 100m
    
    // contract states
    const [picName, setPicName] = useState('');
    const [picPhone, setPicPhone] = useState('');
    const [contractType, setContractType] = useState('LUMSUM');
    const [contractValue, setContractValue] = useState('0');
    const [contractStart, setContractStart] = useState('');
    const [contractEnd, setContractEnd] = useState('');
    const [employeeLimit, setEmployeeLimit] = useState('0');

    // Admin Account States
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    // Fetch daftar perusahaan saat komponen dimuat
    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const res = await api.get('/companies');
            setCompanies(res.data);
        } catch (error) {
            console.error('Gagal mengambil data klien:', error);
        }
    };

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await api.post('/companies', {
                name,
                latitude,
                longitude,
                radius,
                picName,
                picPhone,
                contractType,
                contractValue,
                contractStart,
                contractEnd,
                employeeLimit,
                adminName,
                adminEmail,
                adminPassword
            });

            if (res.status === 200 || res.status === 201) {
                // Reset form
                setName('');
                setLatitude('');
                setLongitude('');
                setRadius('100');
                setPicName('');
                setPicPhone('');
                setContractType('LUMSUM');
                setContractValue('0');
                setContractStart('');
                setContractEnd('');
                setEmployeeLimit('0');
                setAdminName('');
                setAdminEmail('');
                setAdminPassword('');
                
                // Tarik ulang data tabel
                fetchCompanies();
                alert('Berhasil mendaftarkan klien dan admin baru!');
            } else {
                alert('Gagal mendaftar klien.');
            }
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.error || 'Terjadi kesalahan jaringan.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Manajemen Klien (Tenant)</h1>
                <p className="text-sm text-slate-500">Daftarkan perusahaan baru lengkap dengan titik lokasi kantor absensinya.</p>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Bagian Kiri: Form Input */}
                <div className="lg:col-span-1 border border-slate-200 bg-white p-6 shadow-sm rounded-xl h-fit">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-slate-800">Registrasi Tenant Baru</h2>
                    </div>

                    <form onSubmit={handleCreateCompany} className="space-y-4">
                        <div className="space-y-4 border-b border-slate-50 pb-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Informasi Dasar & PIC</h3>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Nama Perusahaan Klien</label>
                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Misal: PT Angin Ribut"
                                    className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Nama PIC</label>
                                    <input
                                        type="text"
                                        value={picName}
                                        onChange={(e) => setPicName(e.target.value)}
                                        placeholder="Nama Lengkap PIC"
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">No. HP PIC</label>
                                    <input
                                        type="text"
                                        value={picPhone}
                                        onChange={(e) => setPicPhone(e.target.value)}
                                        placeholder="0812..."
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 border-b border-slate-50 pb-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Detail Kontrak</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Jenis Kontrak</label>
                                    <select
                                        value={contractType}
                                        onChange={(e) => setContractType(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="LUMSUM">Lumsum</option>
                                        <option value="SATUAN">Satuan</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Nilai Kontrak (Rp)</label>
                                    <input
                                        type="number"
                                        value={contractValue}
                                        onChange={(e) => setContractValue(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-700 text-slate-500">Mulai</label>
                                    <input
                                        type="date"
                                        value={contractStart}
                                        onChange={(e) => setContractStart(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-700 text-slate-500">Berakhir</label>
                                    <input
                                        type="date"
                                        value={contractEnd}
                                        onChange={(e) => setContractEnd(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Limit Karyawan</label>
                                <input
                                    type="number"
                                    value={employeeLimit}
                                    onChange={(e) => setEmployeeLimit(e.target.value)}
                                    placeholder="0 = Tanpa Batas"
                                    className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <p className="mt-1 text-[10px] text-slate-400 italic">Membatasi jumlah karyawan yang bisa didaftarkan oleh tenant ini.</p>
                            </div>
                        </div>

                        <div className="space-y-4 border-b border-slate-50 pb-4 bg-blue-50/50 -mx-6 px-6 pt-4 mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                                Akun Administrator Pertama
                            </h3>
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Nama Admin</label>
                                <input
                                    type="text"
                                    value={adminName}
                                    onChange={(e) => setAdminName(e.target.value)}
                                    placeholder="Nama Lengkap Admin"
                                    className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Admin</label>
                                <input
                                    type="email"
                                    value={adminEmail}
                                    onChange={(e) => setAdminEmail(e.target.value)}
                                    placeholder="hrd@perusahaan.com"
                                    className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Password Awal</label>
                                <input
                                    type="password"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-slate-400">Lokasi Kantor (Opsional)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700 text-xs">Lat (Gmaps)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={latitude}
                                        onChange={(e) => setLatitude(e.target.value)}
                                        placeholder="-6.2..."
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700 text-xs">Lng (Gmaps)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={longitude}
                                        onChange={(e) => setLongitude(e.target.value)}
                                        placeholder="106.8..."
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 text-xs">Radius (Meter)</label>
                                <input
                                    type="number"
                                    value={radius}
                                    onChange={(e) => setRadius(e.target.value)}
                                    className="w-full rounded-md border border-slate-300 py-2 px-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:bg-blue-300"
                        >
                            <Save className="h-4 w-4" />
                            {isLoading ? 'Memproses...' : 'Daftarkan Klien'}
                        </button>
                    </form>
                </div>

                {/* Bagian Kanan: Tabel Data */}
                <div className="lg:col-span-2 border border-slate-200 bg-white p-6 shadow-sm rounded-xl">
                    <h2 className="text-lg font-semibold text-slate-800 mb-6">Daftar Klien Terdaftar</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-500">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-700">
                                <tr>
                                    <th className="px-4 py-3 border-b">Detail Klien & PIC</th>
                                    <th className="px-4 py-3 border-b text-center">Status Kontrak</th>
                                    <th className="px-4 py-3 border-b text-right">Nilai Kontrak</th>
                                    <th className="px-4 py-3 border-b text-center">Limit</th>
                                    <th className="px-4 py-3 border-b">GPS / Radius</th>
                                </tr>
                            </thead>
                            <tbody>
                                {companies.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                            Sedang memuat data... atau belum ada data klien.
                                        </td>
                                    </tr>
                                ) : (
                                    companies.map((company) => (
                                        <tr key={company.id} className="border-b hover:bg-slate-50">
                                            <td className="px-4 py-4 border-b border-slate-100">
                                                <div className="font-bold text-slate-900">{company.name}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">ID: TENANT-{company.id.toString().padStart(3, '0')}</div>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">PIC: {company.picName || '-'}</span>
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{company.picPhone || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 border-b border-slate-100 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                    company.contractType === 'LUMSUM' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                    {company.contractType}
                                                </span>
                                                <div className="text-[10px] text-slate-400 mt-1 italic flex flex-col gap-1 items-center">
                                                    <span>
                                                        {company.contractStart ? new Date(company.contractStart).toLocaleDateString('id-ID') : '-'} s/d {company.contractEnd ? new Date(company.contractEnd).toLocaleDateString('id-ID') : '-'}
                                                    </span>
                                                    {isExpired(company.contractEnd) ? (
                                                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                                                            <AlertTriangle className="h-3 w-3" /> Kontrak Habis
                                                        </span>
                                                    ) : isNearingExpiry(company.contractEnd) ? (
                                                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                            <AlertTriangle className="h-3 w-3" /> Segera Habis
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 border-b border-slate-100 text-right font-mono font-bold text-slate-700">
                                                Rp {company.contractValue?.toLocaleString('id-ID') || 0}
                                            </td>
                                            <td className="px-4 py-4 border-b border-slate-100 text-center">
                                                <div className="text-xs font-bold text-slate-800">{company.employeeLimit || '∞'}</div>
                                                <div className="text-[10px] text-slate-400">User</div>
                                            </td>
                                            <td className="px-4 py-4 border-b border-slate-100">
                                                <div className="text-[10px] text-slate-500">Lat: {company.latitude ?? '-'}</div>
                                                <div className="text-[10px] text-slate-500">Lng: {company.longitude ?? '-'}</div>
                                                <div className="mt-1 text-[10px] font-bold text-blue-600">{company.radius ?? 0}m Radius</div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

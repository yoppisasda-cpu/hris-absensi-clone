'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Building2, Save, MapPin, Navigation, Loader2, Shield } from 'lucide-react';

interface Company {
    id: number;
    name: string;
    address: string | null;
    logoUrl: string | null;
    picName: string | null;
    picPhone: string | null;
    longitude: number | null;
    latitude: number | null;
    radius: number | null;
    integrationApiKey: string | null;
    isApiEnabled: boolean;
    lateDeductionRate?: number;
    absenceDeductionType?: string;
    absenceDeductionRate?: number;
    sickLeaveDeductionRate?: number;
    photoRetentionDays?: number;
    workDaysPerMonth?: number;
    lateGracePeriod?: number;
    waApiKey?: string | null;
    waGatewayUrl?: string | null;
    waProspectTemplate?: string | null;
    timezone: string;
    addons: string[];
    primaryColor: string | null;
    secondaryColor: string | null;
    posBlindClosing: boolean;
}

export default function CompanyProfilePage() {
    const [company, setCompany] = useState<Company | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        picName: '',
        picPhone: '',
        latitude: '',
        longitude: '',
        radius: '',
        photoRetentionDays: '30',
        waApiKey: '',
        waGatewayUrl: '',
        waProspectTemplate: '',
        timezone: 'Asia/Jakarta',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E293B',
        posBlindClosing: false
    });
    const [payrollData, setPayrollData] = useState({
        lateDeductionRate: '50000',
        absenceDeductionType: 'PRO_RATA',
        absenceDeductionRate: '0',
        sickLeaveDeductionRate: '0',
        workDaysPerMonth: '25',
        lateGracePeriod: '0'
    });
    const [isSavingPayroll, setIsSavingPayroll] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [apiReqStatus, setApiReqStatus] = useState<any>(null);
    const [isRequestingApi, setIsRequestingApi] = useState(false);

    const fetchCompany = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/companies/my');
            setCompany(response.data);
            
            // Check API Request Status
            try {
                const reqStatus = await api.get('/integrations/my-status');
                setApiReqStatus(reqStatus.data.request);
            } catch (e) {
                console.log("No API request yet");
            }

            setFormData({
                name: response.data.name || '',
                address: response.data.address || '',
                picName: response.data.picName || '',
                picPhone: response.data.picPhone || '',
                latitude: response.data.latitude?.toString() || '',
                longitude: response.data.longitude?.toString() || '',
                radius: response.data.radius?.toString() || '100',
                photoRetentionDays: response.data.photoRetentionDays?.toString() || '30',
                waApiKey: response.data.waApiKey || '',
                waGatewayUrl: response.data.waGatewayUrl || '',
                waProspectTemplate: response.data.waProspectTemplate || '',
                timezone: response.data.timezone || 'Asia/Jakarta',
                primaryColor: response.data.primaryColor || '#3B82F6',
                secondaryColor: response.data.secondaryColor || '#1E293B',
                posBlindClosing: response.data.posBlindClosing || false
            });
            setPayrollData({
                lateDeductionRate: response.data.lateDeductionRate?.toString() || '50000',
                absenceDeductionType: response.data.absenceDeductionType || 'PRO_RATA',
                absenceDeductionRate: response.data.absenceDeductionRate?.toString() || '0',
                sickLeaveDeductionRate: response.data.sickLeaveDeductionRate?.toString() || '0',
                workDaysPerMonth: response.data.workDaysPerMonth?.toString() || '25',
                lateGracePeriod: response.data.lateGracePeriod?.toString() || '0'
            });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Gagal mengambil data perusahaan.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCompany();
        const role = localStorage.getItem('userRole');
        setUserRole(role);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await api.patch('/companies/my', {
                name: formData.name,
                address: formData.address,
                picName: formData.picName,
                picPhone: formData.picPhone,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null,
                radius: formData.radius ? parseInt(formData.radius, 10) : 100,
                photoRetentionDays: formData.photoRetentionDays ? parseInt(formData.photoRetentionDays, 10) : 30,
                waApiKey: formData.waApiKey,
                waGatewayUrl: formData.waGatewayUrl,
                waProspectTemplate: formData.waProspectTemplate,
                timezone: formData.timezone,
                primaryColor: formData.primaryColor,
                secondaryColor: formData.secondaryColor,
                posBlindClosing: formData.posBlindClosing
            });
            setMessage({ type: 'success', text: 'Profil perusahaan berhasil diperbarui!' });
            fetchCompany();
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Gagal memperbarui profil perusahaan.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePayroll = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingPayroll(true);
        setMessage({ type: '', text: '' });

        try {
            await api.patch('/companies/my/payroll-settings', {
                lateDeductionRate: parseFloat(payrollData.lateDeductionRate),
                absenceDeductionType: payrollData.absenceDeductionType,
                absenceDeductionRate: parseFloat(payrollData.absenceDeductionRate),
                sickLeaveDeductionRate: parseFloat(payrollData.sickLeaveDeductionRate),
                workDaysPerMonth: parseInt(payrollData.workDaysPerMonth, 10),
                lateGracePeriod: parseInt(payrollData.lateGracePeriod, 10)
            });
            setMessage({ type: 'success', text: 'Aturan potongan gaji berhasil diperbarui!' });
            fetchCompany();
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Gagal memperbarui aturan gaji.' });
        } finally {
            setIsSavingPayroll(false);
        }
    };

    const handleGenerateApiKey = async () => {
        if (!confirm("PENTING: Generate ulang API Key akan membuat aplikasi yang sebelumnya terhubung tidak bisa menarik data lagi sebelum kuncinya diperbarui. Lanjutkan?")) return;

        try {
            const res = await api.post('/companies/my/api-key');
            setCompany(prev => prev ? { ...prev, integrationApiKey: res.data.apiKey } : null);
            alert("API Key berhasil di-generate ulang!");
        } catch (error: any) {
            alert(error.response?.data?.message || "Gagal meng-generate API Key.");
        }
    };

    const handleRequestApi = async () => {
        const note = prompt("Catatan (Opsional): Untuk apa Anda memerlukan integrasi ini? (Misal: Integrasi Mesin Pabrik)");
        setIsRequestingApi(true);
        try {
            await api.post('/integrations/request', { note });
            alert("Permintaan berhasil dikirim. Tim kami akan segera meninjau dan menghubungi Anda.");
            fetchCompany();
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal mengirim permintaan.");
        } finally {
            setIsRequestingApi(false);
        }
    };

    const handleCopyApiKey = () => {
        if (company?.integrationApiKey) {
            navigator.clipboard.writeText(company.integrationApiKey);
            alert("API Key berhasil disalin!");
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('logo', file);

        try {
            setIsSaving(true);
            const res = await api.patch('/companies/my/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setCompany(prev => prev ? { ...prev, logoUrl: res.data.logoUrl } : null);
            alert("Logo berhasil diperbarui!");
        } catch (error) {
            console.error(error);
            alert("Gagal mengupload logo.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                        Profil Bisnis & Identitas
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Kustomisasi identitas perusahaan dan pengaturan operasional pusat.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex h-96 items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                        <p className="text-slate-400 font-medium animate-pulse">Memuat data perusahaan...</p>
                    </div>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
                    {/* Left Column: Logo & Important Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden sticky top-8">
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="relative group cursor-pointer w-32 h-32 mb-6">
                                    <div className="w-full h-full rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 group-hover:border-blue-400 transition-colors">
                                        {company?.logoUrl ? (
                                            <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <Building2 className="h-12 w-12 text-slate-300" />
                                        )}
                                    </div>
                                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer">
                                        <span className="text-white text-xs font-bold uppercase tracking-wider">Ubah Logo</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                    </label>
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg">{formData.name || 'Nama Perusahaan'}</h3>
                                <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest leading-none">ID Perusahaan: #{company?.id}</p>
                                
                                <div className="w-full h-px bg-slate-100 my-6"></div>
                                
                                <div className="w-full space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Status</span>
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase">Aktif</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Integrasi POS</span>
                                        <span className={`px-2 py-0.5 ${company?.integrationApiKey ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'} rounded-full text-[10px] font-black uppercase`}>
                                            {company?.integrationApiKey ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 border-t border-slate-100 italic">
                                <p className="text-[10px] text-slate-400 text-center uppercase tracking-tight font-bold">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Forms */}
                    <div className="lg:col-span-2 space-y-8">
                        {message.text && (
                            <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm' : 'bg-rose-50 text-rose-700 border border-rose-100 shadow-sm'}`}>
                                <div className={`h-2 w-2 rounded-full ${message.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                            <div className="px-8 py-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                                <h2 className="font-extrabold text-slate-800 tracking-tight text-lg">Detail Identitas Dasar</h2>
                                <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-md uppercase">Wajib Diisi</span>
                            </div>
                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nama Bisnis / Instansi</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none hover:border-slate-300 placeholder:font-normal"
                                        placeholder="Contoh: PT Aivola Digital Indonesia"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Alamat Lengkap Pusat</label>
                                    <textarea
                                        rows={3}
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none hover:border-slate-300 placeholder:font-normal"
                                        placeholder="Jl. Raya Utama No. 123, Jakarta"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nama PIC / Owner</label>
                                        <input
                                            type="text"
                                            value={formData.picName}
                                            onChange={e => setFormData({ ...formData, picName: e.target.value })}
                                            className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none hover:border-slate-300"
                                            placeholder="Nama Penanggung Jawab"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">WA / Telepon PIC</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-3 text-slate-400 font-bold">+62</span>
                                            <input
                                                type="text"
                                                value={formData.picPhone}
                                                onChange={e => setFormData({ ...formData, picPhone: e.target.value })}
                                                className="w-full rounded-xl border border-slate-200 py-3 pl-14 pr-4 text-sm font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none hover:border-slate-300"
                                                placeholder="8123XXX"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="h-6 w-1 bg-indigo-500 rounded-full"></div>
                                        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase tracking-widest">Identitas Visual (Branding)</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Warna Utama (Primary)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={formData.primaryColor}
                                                    onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                                                    className="h-11 w-11 rounded-lg border border-slate-200 cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={formData.primaryColor}
                                                    onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                                                    className="flex-grow rounded-xl border border-slate-200 py-3 px-4 text-sm font-mono font-bold text-slate-700 transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none hover:border-slate-300"
                                                    placeholder="#3B82F6"
                                                />
                                            </div>
                                            <p className="mt-1.5 text-[10px] text-slate-400 font-medium italic">* Digunakan untuk tombol dan elemen utama di aplikasi.</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Warna Latar (Secondary)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={formData.secondaryColor}
                                                    onChange={e => setFormData({ ...formData, secondaryColor: e.target.value })}
                                                    className="h-11 w-11 rounded-lg border border-slate-200 cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={formData.secondaryColor}
                                                    onChange={e => setFormData({ ...formData, secondaryColor: e.target.value })}
                                                    className="flex-grow rounded-xl border border-slate-200 py-3 px-4 text-sm font-mono font-bold text-slate-700 transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none hover:border-slate-300"
                                                    placeholder="#1E293B"
                                                />
                                            </div>
                                            <p className="mt-1.5 text-[10px] text-slate-400 font-medium italic">* Digunakan untuk warna background aplikasi mobile.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-6 w-1 bg-amber-500 rounded-full"></div>
                                        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase tracking-widest">Geo-Fence & Retensi Data</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Titik Koordinat (Maps)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    required
                                                    type="number"
                                                    step="any"
                                                    value={formData.latitude}
                                                    onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                                    className="w-full rounded-xl border border-slate-200 py-3 px-4 text-xs font-mono font-bold text-slate-700 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                                                    placeholder="Lat"
                                                />
                                                <input
                                                    required
                                                    type="number"
                                                    step="any"
                                                    value={formData.longitude}
                                                    onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                                    className="w-full rounded-xl border border-slate-200 py-3 px-4 text-xs font-mono font-bold text-slate-700 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                                                    placeholder="Long"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Radius & Retensi</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-grow">
                                                    <input
                                                        required
                                                        type="number"
                                                        value={formData.radius}
                                                        onChange={e => setFormData({ ...formData, radius: e.target.value })}
                                                        className="w-full rounded-xl border border-slate-200 py-3 px-4 pr-10 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                                                        placeholder="100"
                                                    />
                                                    <span className="absolute right-3 top-3 text-[10px] text-slate-400 font-black">M</span>
                                                </div>
                                                <div className="relative flex-grow">
                                                    <input
                                                        required
                                                        type="number"
                                                        value={formData.photoRetentionDays}
                                                        onChange={e => setFormData({ ...formData, photoRetentionDays: e.target.value })}
                                                        className="w-full rounded-xl border border-slate-200 py-3 px-4 pr-10 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                                                        placeholder="30"
                                                    />
                                                    <span className="absolute right-3 top-3 text-[10px] text-slate-400 font-black">D</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-[11px] text-slate-400 font-medium italic">* Titik koordinat adalah titik pusat di mana karyawan diperbolehkan melakukan absen masuk (clock-in).</p>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-1 bg-blue-500 rounded-full"></div>
                                            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase tracking-widest">Regional & Waktu Internasional</h3>
                                        </div>
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">Supports IANA Timezones 🌍</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Zona Waktu Operasional</label>
                                            <select
                                                value={formData.timezone}
                                                onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                                                className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none hover:border-slate-300 bg-white"
                                            >
                                                <optgroup label="Indonesia (Utama)">
                                                    <option value="Asia/Jakarta">WIB - Jakarta (GMT+7)</option>
                                                    <option value="Asia/Makassar">WITA - Makassar (GMT+8)</option>
                                                    <option value="Asia/Jayapura">WIT - Jayapura (GMT+9)</option>
                                                </optgroup>
                                                <optgroup label="Dunia (Pilihan Lengkap)">
                                                    {Intl.supportedValuesOf('timeZone').map((tz) => (
                                                        <option key={tz} value={tz}>
                                                            {tz.replace(/_/g, ' ')}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                            <p className="mt-2 text-[10px] text-slate-400 font-medium italic">
                                                * Zona waktu ini menentukan kapan hari dimulai (00:00) untuk perhitungan absen harian dan status "Sedang Bekerja".
                                            </p>
                                        </div>
                                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                            <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2">Tips Global</h4>
                                            <p className="text-[11px] text-blue-600 leading-relaxed font-medium">
                                                Jika Anda memiliki cabang di luar negeri, sistem akan otomatis menyesuaikan perhitungan keterlambatan dan jam pulang berdasarkan zona waktu yang Anda pilih di sini.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* --- SECTION WHATSAPP --- */}
                                <div className="pt-8 border-t border-slate-100">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase tracking-widest">WhatsApp Gateway (Wablas)</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Domain / Server Wablas</label>
                                            <input
                                                type="text"
                                                value={formData.waGatewayUrl}
                                                onChange={e => setFormData({ ...formData, waGatewayUrl: e.target.value })}
                                                className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none hover:border-slate-300"
                                                placeholder="Contoh: https://solo.wablas.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">API Key Wablas (Token)</label>
                                            <input
                                                type="password"
                                                value={formData.waApiKey}
                                                onChange={e => setFormData({ ...formData, waApiKey: e.target.value })}
                                                className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none hover:border-slate-300"
                                                placeholder="Masukkan Token Wablas"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Template Pesan Penawaran (WA)</label>
                                        <textarea
                                            value={formData.waProspectTemplate}
                                            onChange={e => setFormData({ ...formData, waProspectTemplate: e.target.value })}
                                            rows={3}
                                            className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none hover:border-slate-300"
                                            placeholder="Gunakan {{name}} untuk menyapa nama prospek..."
                                        />
                                        <p className="mt-2 text-[10px] text-slate-400 italic">
                                            * Kosongkan jika ingin menggunakan sistem WhatsApp default Aivola.
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-slate-100">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="h-6 w-1 bg-rose-500 rounded-full"></div>
                                        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase tracking-widest">Sistem Kasir (POS)</h3>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 shadow-sm border border-rose-200">
                                                <Shield className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">Blind Closing (Tutup Kasir Buta)</h4>
                                                <p className="text-xs text-slate-500 max-w-sm mt-0.5">Sembunyikan target uang dari kasir saat tutup shift. Kasir wajib hitung manual tanpa tahu nominal sistem.</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, posBlindClosing: !formData.posBlindClosing })}
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none ${formData.posBlindClosing ? 'bg-rose-500' : 'bg-slate-300'}`}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${formData.posBlindClosing ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-8 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="group relative flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl text-sm font-black shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        SIMPAN IDENTITAS BISNIS
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Payroll Settings Section - Revamped */}
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden group">
                            <div className="px-8 py-5 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
                                <h2 className="font-extrabold text-white tracking-tight text-lg">Konfigurasi & Aturan Payroll</h2>
                                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                            </div>
                            <form onSubmit={handleSavePayroll} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Denda Telat (Harian)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-3.5 text-blue-400 font-black text-sm">Rp</span>
                                            <input
                                                required
                                                type="number"
                                                value={payrollData.lateDeductionRate}
                                                onChange={e => setPayrollData({ ...payrollData, lateDeductionRate: e.target.value })}
                                                className="w-full rounded-xl bg-slate-800 border border-slate-700 py-3.5 pl-12 pr-4 text-sm font-black text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                placeholder="50000"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipe Potongan Mangkir</label>
                                        <select
                                            value={payrollData.absenceDeductionType}
                                            onChange={e => setPayrollData({ ...payrollData, absenceDeductionType: e.target.value })}
                                            className="w-full rounded-xl bg-slate-800 border border-slate-700 py-3.5 px-4 text-sm font-black text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="PRO_RATA">🚀 PROPORSIONAL (GAJI/HARI)</option>
                                            <option value="FIXED_AMOUNT">💰 NOMINAL TETAP PER HARI</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hari Kerja Per Bulan (Standard)</label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                value={payrollData.workDaysPerMonth}
                                                onChange={e => setPayrollData({ ...payrollData, workDaysPerMonth: e.target.value })}
                                                className="w-full rounded-xl bg-slate-800 border border-slate-700 py-3.5 px-4 text-sm font-black text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                placeholder="25"
                                            />
                                            <span className="absolute right-4 top-3.5 text-slate-500 font-bold text-xs uppercase">Hari</span>
                                        </div>
                                        <p className="mt-1.5 text-[10px] text-slate-500 italic">Digunakan untuk menghitung gaji harian (Gaji Pokok / Hari Kerja).</p>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Toleransi Telat (Grace Period)</label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                value={payrollData.lateGracePeriod}
                                                onChange={e => setPayrollData({ ...payrollData, lateGracePeriod: e.target.value })}
                                                className="w-full rounded-xl bg-slate-800 border border-slate-700 py-3.5 px-4 text-sm font-black text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-4 top-3.5 text-slate-500 font-bold text-xs uppercase">Menit</span>
                                        </div>
                                        <p className="mt-1.5 text-[10px] text-slate-500 italic">Karyawan tidak dianggap telat jika masuk dalam rentang menit ini.</p>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSavingPayroll}
                                        className="bg-white hover:bg-slate-100 text-slate-900 px-6 py-3 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isSavingPayroll ? <Loader2 className="h-3 w-3 animate-spin text-slate-900" /> : <Save className="h-3 w-3" />}
                                        <span className="ml-2">UPDATE ATURAN PAYROLL</span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        
                        {/* Integration Section */}
                        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-1 shadow-2xl shadow-blue-500/20">
                            <div className="bg-slate-900 rounded-[14px] p-8">
                                <div className="flex items-start justify-between mb-8">
                                    <div>
                                        <h2 className="text-white font-extrabold text-xl tracking-tight">Kunci Integrasi Metrik</h2>
                                        <p className="text-blue-100/60 text-xs mt-1 font-medium italic">Rahasia. Hubungkan HRIS dengan sistem POS/Kasir eksternal.</p>
                                    </div>
                                    <div className="bg-blue-500/20 p-2.5 rounded-xl border border-blue-500/30">
                                        <span className="text-xl">🛠️</span>
                                    </div>
                                </div>

                                {company?.isApiEnabled ? (
                                    <div className="space-y-4">
                                        {company?.integrationApiKey ? (
                                            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-2 flex items-center group">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={company?.integrationApiKey || 'API Key belum dibuat...'}
                                                    className="flex-grow bg-transparent px-4 py-3 text-sm font-mono font-bold text-blue-400 outline-none"
                                                />
                                                <button
                                                    onClick={handleCopyApiKey}
                                                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors mr-2 shadow-lg"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-6 text-center mb-4">
                                                <p className="text-blue-400 text-xs font-bold mb-3 uppercase tracking-wider">🎉 Akses Telah Disetujui!</p>
                                                <p className="text-slate-400 text-[10px] mb-4">Akses API Anda sudah aktif. Silakan buat kunci rahasia pertama Anda untuk mulai integrasi.</p>
                                                <button
                                                    onClick={handleGenerateApiKey}
                                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                                >
                                                    Generate Kunci API Pertama
                                                </button>
                                            </div>
                                        )}
                                        {company?.integrationApiKey && (
                                            <button
                                                onClick={handleGenerateApiKey}
                                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-700"
                                            >
                                                Generate Ulang Kunci Rahasia
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        {apiReqStatus?.status === 'PENDING' ? (
                                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center">
                                                <div className="h-12 w-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
                                                </div>
                                                <h3 className="text-amber-500 font-black text-sm uppercase tracking-widest">Menunggu Approval</h3>
                                                <p className="text-slate-400 text-xs mt-2">Permintaan Anda sedang ditinjau oleh Admin Aivola. Kami akan menghubungi Anda segera.</p>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8">
                                                <p className="text-slate-400 text-sm mb-6 font-medium">Buka akses API untuk menghubungkan Aivola dengan aplikasi eksternal (Pabrik, POS, IoT).</p>
                                                <button
                                                    onClick={handleRequestApi}
                                                    disabled={isRequestingApi}
                                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/30 active:scale-[0.98] flex items-center justify-center gap-3"
                                                >
                                                    {isRequestingApi ? <Loader2 className="h-4 w-4 animate-spin" /> : "🚀 Request Akses Integrasi"}
                                                </button>
                                                <p className="text-[10px] text-slate-500 mt-4 italic">* Layanan ini mungkin memerlukan biaya tambahan sesuai paket langganan.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

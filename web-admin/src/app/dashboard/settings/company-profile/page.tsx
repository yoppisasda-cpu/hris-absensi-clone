'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Building2, Save, MapPin, Navigation, Loader2 } from 'lucide-react';

interface Company {
    id: number;
    name: string;
    longitude: number | null;
    radius: number | null;
    integrationApiKey: string | null;
    lateDeductionRate?: number;
    absenceDeductionType?: string;
    absenceDeductionRate?: number;
    sickLeaveDeductionRate?: number;
    photoRetentionDays?: number;
}

export default function CompanyProfilePage() {
    const [company, setCompany] = useState<Company | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [formData, setFormData] = useState({
        name: '',
        latitude: '',
        longitude: '',
        radius: '',
        photoRetentionDays: '30'
    });
    const [payrollData, setPayrollData] = useState({
        lateDeductionRate: '50000',
        absenceDeductionType: 'PRO_RATA',
        absenceDeductionRate: '0',
        sickLeaveDeductionRate: '0'
    });
    const [isSavingPayroll, setIsSavingPayroll] = useState(false);

    const fetchCompany = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/companies/my');
            setCompany(response.data);
            setFormData({
                name: response.data.name || '',
                latitude: response.data.latitude?.toString() || '',
                longitude: response.data.longitude?.toString() || '',
                radius: response.data.radius?.toString() || '100',
                photoRetentionDays: response.data.photoRetentionDays?.toString() || '30'
            });
            setPayrollData({
                lateDeductionRate: response.data.lateDeductionRate?.toString() || '50000',
                absenceDeductionType: response.data.absenceDeductionType || 'PRO_RATA',
                absenceDeductionRate: response.data.absenceDeductionRate?.toString() || '0',
                sickLeaveDeductionRate: response.data.sickLeaveDeductionRate?.toString() || '0'
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
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await api.patch('/companies/my', {
                name: formData.name,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null,
                radius: formData.radius ? parseInt(formData.radius, 10) : 100,
                photoRetentionDays: formData.photoRetentionDays ? parseInt(formData.photoRetentionDays, 10) : 30
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
                sickLeaveDeductionRate: parseFloat(payrollData.sickLeaveDeductionRate)
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
        } catch (error) {
            alert("Gagal meng-generate API Key.");
        }
    };

    const handleCopyApiKey = () => {
        if (company?.integrationApiKey) {
            navigator.clipboard.writeText(company.integrationApiKey);
            alert("API Key berhasil disalin!");
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-blue-600" /> Profil Perusahaan & Geo-Fence
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Kelola identitas perusahaan dan zona absensi pagar virtual.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            ) : (
                <div className="max-w-2xl mx-auto space-y-6">
                    {message.text && (
                        <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="border-b border-slate-100 px-6 py-4 bg-slate-50">
                            <h2 className="font-semibold text-slate-800">Detail Dasar</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Perusahaan</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Nama PT / Instansi"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Retensi Foto (Hari)</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="number"
                                            value={formData.photoRetentionDays}
                                            onChange={e => setFormData({ ...formData, photoRetentionDays: e.target.value })}
                                            className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="30"
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">hari</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1.5">* Foto absensi akan otomatis dihapus setelah jumlah hari ini.</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Navigation className="h-4 w-4 text-blue-500" /> Pengaturan Geo-Fence (Pagar Virtual)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5 text-slate-400" /> Latitude
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            step="any"
                                            value={formData.latitude}
                                            onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                            className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="-6.123456"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5 text-slate-400" /> Longitude
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            step="any"
                                            value={formData.longitude}
                                            onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                            className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="106.123456"
                                        />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Radius Toleransi (Meter)</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="number"
                                            value={formData.radius}
                                            onChange={e => setFormData({ ...formData, radius: e.target.value })}
                                            className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="100"
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">meter</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1.5">* Karyawan hanya bisa clock-in jika berada di dalam radius ini dari titik koordinat kantor.</p>
                                </div>
                            </div>

                            <div className="pt-6 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Payroll Settings Section */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-slate-800">
                        <div className="border-b border-slate-100 px-6 py-4 bg-slate-50">
                            <h2 className="font-semibold text-slate-800 text-lg">Aturan Potongan Gaji (Payroll)</h2>
                            <p className="text-sm text-slate-500 mt-1">Konfigurasi pemotongan untuk karyawan yang terlambat atau tidak masuk.</p>
                        </div>
                        <form onSubmit={handleSavePayroll} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal Denda Terlambat (Per Hari)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-500 font-medium">Rp</span>
                                    <input
                                        required
                                        type="number"
                                        value={payrollData.lateDeductionRate}
                                        onChange={e => setPayrollData({ ...payrollData, lateDeductionRate: e.target.value })}
                                        className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="50000"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sistem Potongan Tidak Masuk (Mangkir/Absen)</label>
                                <select
                                    value={payrollData.absenceDeductionType}
                                    onChange={e => setPayrollData({ ...payrollData, absenceDeductionType: e.target.value })}
                                    className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                >
                                    <option value="PRO_RATA">Proporsional (Gaji dibagi jumlah hari kerja sebulan)</option>
                                    <option value="FIXED_AMOUNT">Nominal Tetap (Potong nilai tertentu per hari absen)</option>
                                </select>
                            </div>

                            {payrollData.absenceDeductionType === 'FIXED_AMOUNT' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nominal Potongan Tidak Masuk (Per Hari)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-500 font-medium">Rp</span>
                                        <input
                                            required
                                            type="number"
                                            value={payrollData.absenceDeductionRate}
                                            onChange={e => setPayrollData({ ...payrollData, absenceDeductionRate: e.target.value })}
                                            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="100000"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1.5">* Tipe pemotongan ini akan memberikan gaji pokok utuh, namun mencatat denda harian sebesar nilai di atas untuk setiap absen tanpa keterangan.</p>
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal Potongan Sakit (Maksimal Sebesar Tunjangan Tetap / Transport per Hari)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-500 font-medium">Rp</span>
                                    <input
                                        required
                                        type="number"
                                        value={payrollData.sickLeaveDeductionRate}
                                        onChange={e => setPayrollData({ ...payrollData, sickLeaveDeductionRate: e.target.value })}
                                        className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5">* Ketidakhadiran karena izin sakit sah tidak akan memotong Gaji Pokok, namun bisa memotong Tunjangan Transport/Makan sebesar nilai di atas per hari. Isi dengan 0 jika sakit dibayar penuh.</p>
                            </div>

                            <div className="pt-6 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSavingPayroll}
                                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                                >
                                    {isSavingPayroll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Simpan Aturan Gaji
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* API Key Section */}
                    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden text-white">
                        <div className="border-b border-slate-800 px-6 py-4 bg-slate-800/50">
                            <h2 className="font-semibold text-slate-100 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span> Integrasi Sistem Eksternal (Labor Cost)
                            </h2>
                            <p className="text-xs text-slate-400 mt-1">Kunci rahasia untuk dihubungkan ke aplikasi POS / Kasir Anda.</p>
                        </div>
                        <div className="p-6">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">API Key Anda</label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-grow flex items-center bg-slate-800 border-2 border-slate-700 hover:border-blue-500/50 transition-colors rounded-lg overflow-hidden group">
                                    <input
                                        type="text"
                                        readOnly
                                        value={company?.integrationApiKey || 'Belum di-generate. Klik tombol di samping.'}
                                        className="w-full bg-transparent px-4 py-3 text-sm font-mono text-blue-400 outline-none select-all"
                                    />
                                    {company?.integrationApiKey && (
                                        <button
                                            onClick={handleCopyApiKey}
                                            className="px-4 py-3 bg-slate-700/50 hover:bg-blue-600 text-slate-300 hover:text-white font-medium text-xs transition-colors border-l border-slate-700"
                                        >
                                            Salin
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={handleGenerateApiKey}
                                    className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg whitespace-nowrap transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    {company?.integrationApiKey ? 'Generate Ulang' : 'Buat API Key'}
                                </button>
                            </div>
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mt-4 flex gap-3 text-orange-200">
                                <span className="text-xl">⚠️</span>
                                <p className="text-xs leading-relaxed">
                                    Jaga kerahasiaan API Key Anda. Siapapun yang memiliki kunci ini dapat menarik data metrik gaji karyawan secara otomatis dari sistem HRIS.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex gap-4">
                        <div className="bg-blue-100 p-2.5 rounded-lg h-fit text-blue-600">
                            <Navigation className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-blue-900">Tips Mencari Koordinat</h4>
                            <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                                Anda bisa membuka Google Maps, klik kanan pada lokasi kantor Anda, dan pilih angka koordinat yang muncul untuk disalin ke kolom Latitude & Longitude di atas.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

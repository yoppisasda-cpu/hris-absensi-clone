'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Settings, Shield, BellRing, Key, Building2, User, Mail, ShieldCheck, Save, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState<'security' | 'notifications' | 'password'>('security');
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Password state
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const fetchProfile = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/users/me');
            setUser(res.data);
        } catch (error) {
            console.error("Failed to fetch profile", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleToggleNotifications = async () => {
        if (!user) return;
        try {
            const newValue = !user.emailNotifications;
            await api.patch('/users/me/settings', { emailNotifications: newValue });
            setUser({ ...user, emailNotifications: newValue });
        } catch (error) {
            alert("Gagal memperbarui pengaturan notifikasi.");
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert("Konfirmasi kata sandi tidak cocok.");
            return;
        }
        if (passwordData.newPassword.length < 6) {
            alert("Kata sandi minimal 6 karakter.");
            return;
        }

        setIsSaving(true);
        try {
            await api.patch('/auth/change-password', {
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            alert("Kata sandi berhasil diubah.");
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            alert(error.response?.data?.error || "Gagal mengubah kata sandi.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Settings className="h-6 w-6 text-slate-600" /> Pengaturan Akun
                </h1>
                <p className="text-sm text-slate-500 mt-1">Konfigurasi preferensi keamanan dan notifikasi akun personal Anda.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Sidebar Navigation */}
                <div className="md:col-span-1 space-y-2">
                    <button
                        onClick={() => setActiveSection('security')}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-all ${activeSection === 'security' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                        <div className="flex items-center gap-3"><Shield className="h-5 w-5" /> Keamanan Akun</div>
                    </button>
                    <button
                        onClick={() => setActiveSection('notifications')}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-all ${activeSection === 'notifications' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                        <div className="flex items-center gap-3"><BellRing className="h-5 w-5" /> Notifikasi Email</div>
                    </button>
                    <button
                        onClick={() => setActiveSection('password')}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-all ${activeSection === 'password' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                        <div className="flex items-center gap-3"><Key className="h-5 w-5" /> Ubah Kata Sandi</div>
                    </button>
                    <div className="pt-4 mt-4 border-t border-slate-100">
                        <Link href="/dashboard/settings/company-profile" className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-slate-400 text-sm font-medium rounded-lg">
                            <div className="flex items-center gap-3"><Building2 className="h-4 w-4" /> Profil Perusahaan</div>
                        </Link>
                    </div>
                </div>

                {/* Content Area */}
                <div className="md:col-span-3">
                    {isLoading ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-500" />
                            <p>Memuat pengaturan...</p>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {activeSection === 'security' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                            <h3 className="text-lg font-bold text-slate-800">Ringkasan Keamanan</h3>
                                            <p className="text-xs text-slate-500">Informasi profil dan tingkat akses Anda saat ini.</p>
                                        </div>
                                        <div className="p-8 space-y-8">
                                            <div className="flex items-center gap-6">
                                                <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold">
                                                    {user?.name?.[0]}
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
                                                    <p className="text-slate-500 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {user?.email}</p>
                                                    <span className="mt-2 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 uppercase">
                                                        {user?.role}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                                                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status Akun</p>
                                                    <div className="flex items-center gap-2 text-green-600 font-bold">
                                                        <ShieldCheck className="h-4 w-4" /> Aktif
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Terakhir Diperbarui</p>
                                                    <div className="text-slate-700 font-medium">
                                                        {new Date(user?.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'notifications' && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                        <h3 className="text-lg font-bold text-slate-800">Preferensi Notifikasi</h3>
                                        <p className="text-xs text-slate-500">Kontrol informasi apa yang ingin Anda terima melalui email.</p>
                                    </div>
                                    <div className="p-8">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                                    <BellRing className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-slate-800">Notifikasi Email</p>
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">Soon</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500">Terima update status pengajuan (Cuti, Reimbursement, dll) via email.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleToggleNotifications}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${user?.emailNotifications ? 'bg-blue-600' : 'bg-slate-300'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user?.emailNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'password' && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                        <h3 className="text-lg font-bold text-slate-800">Perbarui Kata Sandi</h3>
                                        <p className="text-xs text-slate-500">Pastikan menggunakan kombinasi kata sandi yang kuat.</p>
                                    </div>
                                    <form onSubmit={handleChangePassword} className="p-8 max-w-md space-y-5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Kata Sandi Saat Ini</label>
                                            <input
                                                type="password"
                                                required
                                                value={passwordData.oldPassword}
                                                onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Kata Sandi Baru</label>
                                            <input
                                                type="password"
                                                required
                                                value={passwordData.newPassword}
                                                onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Konfirmasi Kata Sandi Baru</label>
                                            <input
                                                type="password"
                                                required
                                                value={passwordData.confirmPassword}
                                                onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <button
                                                type="submit"
                                                disabled={isSaving}
                                                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 active:scale-95"
                                            >
                                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                Simpan Perubahan
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

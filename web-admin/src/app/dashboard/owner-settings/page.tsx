'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Save, Trash2, ShieldCheck, Clock, RefreshCw } from 'lucide-react';

export default function OwnerSettingsPage() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/admin/settings');
            setSettings(response.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            setMessage({ type: 'error', text: 'Gagal mengambil pengaturan.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await api.patch('/admin/settings', settings);
            setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan.' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan.' });
        } finally {
            setSaving(false);
        }
    };

    const triggerCleanup = async () => {
        if (!confirm('Apakah Anda yakin ingin menjalankan pembersihan foto sekarang? File yang sudah melewati batas retensi akan dihapus permanen.')) return;
        
        setSaving(true);
        try {
            await api.post('/admin/cleanup-photos');
            alert('Proses pembersihan foto selesai dijalankan.');
        } catch (error) {
            alert('Gagal menjalankan pembersihan.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Memuat pengaturan...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Owner Settings</h1>
                    <p className="text-slate-500 text-sm">Pengaturan global platform Aivola</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
            </div>

            {message.text && (
                <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <h2 className="font-semibold text-slate-800">Kebijakan Retensi Data</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Retensi Foto (Hari)
                            </label>
                            <input
                                type="number"
                                value={settings.photo_retention_days || '30'}
                                onChange={(e) => setSettings({ ...settings, photo_retention_days: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                placeholder="Contoh: 30"
                            />
                            <p className="mt-2 text-xs text-slate-500">
                                Foto absensi dan kuitansi reimbursement yang lebih lama dari jumlah hari ini akan dihapus otomatis setiap malam pukul 02:00.
                            </p>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <button
                                onClick={triggerCleanup}
                                disabled={saving}
                                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                            >
                                <RefreshCw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
                                Jalankan Pembersihan Sekarang
                            </button>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-blue-600" />
                        <h2 className="font-semibold text-slate-800">Sistem & Keamanan</h2>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-slate-500">
                            Pengaturan keamanan global lainnya akan tersedia di sini pada update berikutnya.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { FileSpreadsheet, Download, Calendar, User, Clock, Search, Smile, Meh, Frown, AlertCircle, TrendingUp, ShieldCheck, ShieldAlert, Shield, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Attendance {
    id: number;
    clockIn: string;
    clockOut: string | null;
    lat: number | null;
    lng: number | null;
    clockOutLat: number | null;
    clockOutLng: number | null;
    user: {
        name: string;
        email: string;
    };
    photoUrl: string | null;
    clockOutPhotoUrl: string | null;
    mood: string | null;
    moodScore: number | null;
    faceSimilarityScore: number | null;
    isFaceVerified: boolean;
    fraudScore: number | null;
    isSuspicious: boolean;
    deviceId: string | null;
    status: 'PRESENT' | 'LATE' | 'ABSENT';
    lateMinutes: number | null;
    earlyCheckOutMinutes: number | null;
}

export default function AttendancePage() {
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState<{ url: string, title: string } | null>(null);

    const fetchAttendances = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/attendance');
            setAttendances(response.data);
        } catch (err) {
            setError('Gagal mengambil data absensi.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendances();
    }, []);

    const handleExportExcel = () => {
        if (attendances.length === 0) return;

        // Prepare data for Excel
        const exportData = attendances.map(att => ({
            'Nama Karyawan': att.user.name,
            'Email': att.user.email,
            'Tanggal': new Date(att.clockIn).toLocaleDateString('id-ID'),
            'Jam Masuk': new Date(att.clockIn).toLocaleTimeString('id-ID'),
            'Jam Keluar': att.clockOut ? new Date(att.clockOut).toLocaleTimeString('id-ID') : '-',
            'In Lat': att.lat || '-',
            'In Lng': att.lng || '-',
            'Out Lat': att.clockOutLat || '-',
            'Out Lng': att.clockOutLng || '-',
            'Mood': att.mood || '-',
            'Status Presensi': att.status === 'LATE' ? 'Terlambat' : 'Hadir',
            'Menit Terlambat': att.lateMinutes || 0,
            'Menit Pulang Cepat': att.earlyCheckOutMinutes || 0,
            'Fraud Score': att.fraudScore || 0,
            'Suspicious': att.isSuspicious ? 'YES' : 'NO'
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Absensi");

        // Generate filename with current date
        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Laporan_Absensi_${date}.xlsx`);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getFullImageUrl = (path: string | null) => {
        try {
            if (!path) return '';
            if (typeof path !== 'string') return '';
            
            // If already a full cloud URL (Supabase/S3), return as is
            if (path.startsWith('http')) return path;
            
            // If a relative path, resolve it against the backend baseURL
            // Remove /api from the end of baseURL if present to get the static files root
            let backendBase = api.defaults.baseURL || '';
            if (backendBase.endsWith('/api')) {
                backendBase = backendBase.substring(0, backendBase.length - 4);
            }
            
            // Fallback for production if baseURL is just a relative path
            if (!backendBase || backendBase === '/api') {
                backendBase = 'https://api.aivola.id';
            }
            
            const cleanPath = path.startsWith('/') ? path : `/${path}`;
            return `${backendBase}${cleanPath}`;
        } catch (err) {
            console.error("Error resolving image URL:", err);
            return '';
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FileSpreadsheet className="h-6 w-6 text-green-500" /> Laporan Absensi
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Rekapitulasi log kehadiran karyawan (GPS & Wajah).</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cari nama atau email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm bg-slate-900/50 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-500"
                        />
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                    >
                        <Printer className="h-4 w-4" />
                        Cetak Laporan
                    </button>
                    <button
                        onClick={handleExportExcel}
                        disabled={isLoading || attendances.length === 0}
                        className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="h-4 w-4" />
                        Export ke Excel
                    </button>
                </div>
            </div>

            <div className="printable-content">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Senang', count: attendances.filter(a => a.mood === 'Senang').length, icon: Smile, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'Netral', count: attendances.filter(a => a.mood === 'Netral').length, icon: Meh, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
                    { label: 'Lelah', count: attendances.filter(a => a.mood === 'Lelah').length, icon: Frown, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
                    { label: 'Stres', count: attendances.filter(a => a.mood === 'Stres').length, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                ].map((stat, i) => (
                    <div key={i} className={`p-5 rounded-[2rem] border ${stat.border} bg-[#050505]/40 backdrop-blur-xl shadow-2xl flex items-center gap-5 transition-all hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-2 duration-500 delay-${i * 100}`}>
                        <div className={`h-14 w-14 rounded-2xl ${stat.bg} flex items-center justify-center shadow-lg`}>
                            <stat.icon className={`h-7 w-7 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic mb-1">{stat.label}</p>
                            <p className="text-2xl font-black text-white italic tracking-tighter">{stat.count}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900/50 rounded-[32px] border border-slate-700 overflow-hidden shadow-sm backdrop-blur-xl">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : error ? (
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-red-500">
                        <p className="text-lg font-black uppercase italic tracking-tighter mb-2">Terjadi Kesalahan</p>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-70">{error}</p>
                    </div>
                ) : attendances.filter(a =>
                    a.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    a.user.email.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
                        <Search className="h-12 w-12 text-slate-800 mb-4" />
                        <p className="text-xl font-black italic tracking-tighter text-slate-300 uppercase mb-1">Tidak ada hasil ditemukan</p>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Tidak ada data absensi yang cocok dengan &quot;{searchQuery}&quot;</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#050505] border-b border-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-[0.2em]">
                                <tr>
                                    <th className="px-6 py-5">Karyawan</th>
                                    <th className="px-6 py-5 text-nowrap">Tanggal</th>
                                    <th className="px-6 py-5 text-center">Foto Masuk</th>
                                    <th className="px-6 py-5 text-center">Foto Pulang</th>
                                    <th className="px-6 py-5 text-center">Clock-In</th>
                                    <th className="px-6 py-5 text-center">Clock-Out</th>
                                    <th className="px-6 py-5 text-center">Presensi</th>
                                    <th className="px-6 py-5 text-center">Mood</th>
                                    <th className="px-6 py-5 text-center">Verifikasi</th>
                                    <th className="px-6 py-5 text-center">Risiko</th>
                                    <th className="px-6 py-5 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 transition-all">
                                {attendances.filter(a =>
                                    a.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    a.user.email.toLowerCase().includes(searchQuery.toLowerCase())
                                ).map((att) => (
                                    <tr key={att.id} className="hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-black italic text-white uppercase tracking-tighter">{att.user.name}</span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{att.user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-nowrap">
                                            <div className="flex items-center gap-2 text-slate-400 font-black italic text-[11px] uppercase tracking-widest">
                                                <Calendar className="h-3 w-3 text-indigo-400" />
                                                <span>{formatDate(att.clockIn)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            {att.photoUrl ? (
                                                <button
                                                    onClick={() => setSelectedPhoto({ url: getFullImageUrl(att.photoUrl), title: 'Foto Clock-In' })}
                                                    className="group relative h-12 w-12 overflow-hidden rounded-xl border border-slate-700 bg-[#050505] inline-block shadow-lg"
                                                >
                                                    <img
                                                        src={getFullImageUrl(att.photoUrl)}
                                                        alt="In"
                                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-125 group-hover:rotate-6"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-indigo-600/40 opacity-0 transition group-hover:opacity-100">
                                                        <Search className="h-5 w-5 text-white" />
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-xl bg-slate-800 text-slate-600 border border-slate-700">
                                                    <User className="h-6 w-6" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            {att.clockOutPhotoUrl ? (
                                                <button
                                                    onClick={() => setSelectedPhoto({ url: getFullImageUrl(att.clockOutPhotoUrl), title: 'Foto Clock-Out' })}
                                                    className="group relative h-12 w-12 overflow-hidden rounded-xl border border-slate-700 bg-[#050505] inline-block shadow-lg"
                                                >
                                                    <img
                                                        src={getFullImageUrl(att.clockOutPhotoUrl)}
                                                        alt="Out"
                                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-125 group-hover:rotate-6"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-indigo-600/40 opacity-0 transition group-hover:opacity-100">
                                                        <Search className="h-5 w-5 text-white" />
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-xl bg-slate-800 text-slate-600 border border-slate-700">
                                                    <User className="h-6 w-6" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="inline-flex items-center gap-1.5 font-black text-indigo-400 italic bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 shadow-lg">
                                                <Clock className="h-3.5 w-3.5" />
                                                {formatTime(att.clockIn)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            {att.clockOut ? (
                                                <div className="inline-flex items-center gap-1.5 font-black text-emerald-400 italic bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 shadow-lg">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {formatTime(att.clockOut)}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-slate-600 italic font-black uppercase tracking-widest">Belum Pulang</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                {att.status === 'LATE' && (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-red-100">
                                                            <AlertCircle className="h-3 w-3" /> TERLAMBAT
                                                        </span>
                                                        <span className="text-[10px] text-red-500 font-medium">{att.lateMinutes} Menit</span>
                                                    </div>
                                                )}
                                                {att.earlyCheckOutMinutes && att.earlyCheckOutMinutes > 0 ? (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-orange-100">
                                                            <Clock className="h-3 w-3" /> PULANG CEPAT
                                                        </span>
                                                        <span className="text-[10px] text-orange-500 font-medium">{att.earlyCheckOutMinutes} Menit</span>
                                                    </div>
                                                ) : (
                                                    att.status === 'PRESENT' && (
                                                        <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-green-100">
                                                            <Clock className="h-3 w-3" /> HADIR
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {att.mood === 'Senang' && <span className="flex items-center justify-center gap-1 text-green-600"><Smile className="h-5 w-5" /> <span className="text-xs font-medium">Senang</span></span>}
                                            {att.mood === 'Netral' && <span className="flex items-center justify-center gap-1 text-blue-600"><Meh className="h-5 w-5" /> <span className="text-xs font-medium">Netral</span></span>}
                                            {att.mood === 'Lelah' && <span className="flex items-center justify-center gap-1 text-orange-600"><Frown className="h-5 w-5" /> <span className="text-xs font-medium">Lelah</span></span>}
                                            {att.mood === 'Stres' && <span className="flex items-center justify-center gap-1 text-red-600"><AlertCircle className="h-5 w-5" /> <span className="text-xs font-medium">Stres</span></span>}
                                            {!att.mood && <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {att.faceSimilarityScore !== null ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    {att.isFaceVerified ? (
                                                        <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-100">
                                                            <ShieldCheck className="h-3 w-3" /> VERIFIED
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-100">
                                                            <ShieldAlert className="h-3 w-3" /> MISMATCH
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-slate-400 font-mono">Score: {(att.faceSimilarityScore * 100).toFixed(0)}%</span>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full text-[10px] font-medium border border-slate-100">
                                                    <Shield className="h-3 w-3 opacity-30" /> No Reference
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {att.fraudScore !== null ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    {att.isSuspicious ? (
                                                        <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200 animate-pulse">
                                                            <ShieldAlert className="h-3 w-3" /> 🚨 TINGGI
                                                        </span>
                                                    ) : att.fraudScore > 30 ? (
                                                        <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-orange-100">
                                                            <Shield className="h-3 w-3" /> SEDANG
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-100">
                                                            <ShieldCheck className="h-3 w-3" /> RENDAH
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-slate-400 font-mono">ID: {att.deviceId?.substring(0, 8) || 'N/A'}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${att.clockOut ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {att.clockOut ? 'Lengkap' : 'Sedang Bekerja'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>

            {/* Modal Foto Selfie */}
            {selectedPhoto && (
                <div
                    role="dialog"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-xl"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <div className="relative max-w-lg w-full bg-slate-900 rounded-[32px] border border-slate-700 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6 bg-slate-950/50 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 italic">{selectedPhoto.title}</h3>
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition border border-white/5 text-slate-500 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="aspect-[4/3] bg-black flex items-center justify-center border-y border-white/5">
                            <img src={getFullImageUrl(selectedPhoto.url)} alt="Zoom Selfie" className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="p-6 bg-slate-950/50 text-center">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Karyawan wajib melakukan selfie saat absensi sebagai bukti kehadiran valid yang diverifikasi menggunakan teknologi bio-metrik wajah.</p>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

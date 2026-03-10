'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { FileSpreadsheet, Download, Calendar, User, Clock, Search, Smile, Meh, Frown, AlertCircle, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Attendance {
    id: number;
    clockIn: string;
    clockOut: string | null;
    latitude: number;
    longitude: number;
    user: {
        name: string;
        email: string;
    };
    photoUrl: string | null;
    mood: string | null;
    moodScore: number | null;
}

export default function AttendancePage() {
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

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
            'Lokasi Lat': att.latitude,
            'Lokasi Lng': att.longitude,
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

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet className="h-6 w-6 text-green-600" /> Laporan Absensi
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Rekapitulasi log kehadiran karyawan (GPS & Wajah).</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari nama atau email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Senang', count: attendances.filter(a => a.mood === 'Senang').length, icon: Smile, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Netral', count: attendances.filter(a => a.mood === 'Netral').length, icon: Meh, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Lelah', count: attendances.filter(a => a.mood === 'Lelah').length, icon: Frown, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'Stres', count: attendances.filter(a => a.mood === 'Stres').length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
                ].map((stat, i) => (
                    <div key={i} className={`p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-${i * 100}`}>
                        <div className={`h-12 w-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                            <p className="text-xl font-bold text-slate-900">{stat.count}</p>
                        </div>
                    </div>
                ))}
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
                ) : attendances.filter(a =>
                    a.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    a.user.email.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-500">
                        <Search className="h-12 w-12 text-slate-200 mb-4" />
                        <p className="font-medium text-lg mb-1">Tidak ada hasil ditemukan</p>
                        <p className="text-sm">Tidak ada data absensi yang cocok dengan "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Karyawan</th>
                                    <th className="px-6 py-4 text-nowrap">Tanggal</th>
                                    <th className="px-6 py-4 text-center">Foto</th>
                                    <th className="px-6 py-4 text-center">Clock-In</th>
                                    <th className="px-6 py-4 text-center">Clock-Out</th>
                                    <th className="px-6 py-4 text-center">Mood</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {attendances.filter(a =>
                                    a.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    a.user.email.toLowerCase().includes(searchQuery.toLowerCase())
                                ).map((att) => (
                                    <tr key={att.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900">{att.user.name}</span>
                                                <span className="text-xs text-slate-500">{att.user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                <span>{formatDate(att.clockIn)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {att.photoUrl ? (
                                                <button
                                                    onClick={() => setSelectedPhoto(att.photoUrl!)}
                                                    className="group relative h-10 w-10 overflow-hidden rounded-lg border border-slate-200 inline-block"
                                                >
                                                    <img
                                                        src={att.photoUrl}
                                                        alt="Selfie"
                                                        className="h-full w-full object-cover transition group-hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                                                        <Search className="h-4 w-4 text-white" />
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="mx-auto h-10 w-10 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                                                    <User className="h-5 w-5" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 font-medium text-blue-600">
                                                <Clock className="h-3.5 w-3.5" />
                                                {formatTime(att.clockIn)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {att.clockOut ? (
                                                <div className="inline-flex items-center gap-1.5 font-medium text-orange-600">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {formatTime(att.clockOut)}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">Belum Keluar</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {att.mood === 'Senang' && <span className="flex items-center justify-center gap-1 text-green-600"><Smile className="h-5 w-5" /> <span className="text-xs font-medium">Senang</span></span>}
                                            {att.mood === 'Netral' && <span className="flex items-center justify-center gap-1 text-blue-600"><Meh className="h-5 w-5" /> <span className="text-xs font-medium">Netral</span></span>}
                                            {att.mood === 'Lelah' && <span className="flex items-center justify-center gap-1 text-orange-600"><Frown className="h-5 w-5" /> <span className="text-xs font-medium">Lelah</span></span>}
                                            {att.mood === 'Stres' && <span className="flex items-center justify-center gap-1 text-red-600"><AlertCircle className="h-5 w-5" /> <span className="text-xs font-medium">Stres</span></span>}
                                            {!att.mood && <span className="text-slate-300">-</span>}
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

            {/* Modal Foto Selfie */}
            {selectedPhoto && (
                <div
                    role="dialog"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">Bukti Foto Absensi</h3>
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition"
                            >
                                <Search className="h-4 w-4 rotate-45 text-slate-500" />
                            </button>
                        </div>
                        <div className="aspect-[4/3] bg-slate-900 flex items-center justify-center">
                            <img src={selectedPhoto} alt="Zoom Selfie" className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="p-4 bg-slate-50 text-center">
                            <p className="text-xs text-slate-500">Karyawan wajib melakukan selfie saat clock-in sebagai bukti kehadiran valid.</p>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

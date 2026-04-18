'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Lock, MapPin, Camera, Mail, Info, ChevronLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
    const updatedAt = '18 April 2026';

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Header / Navbar */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <Shield className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-black text-slate-900 tracking-tight uppercase">Aivola.id</span>
                    </div>
                    <Link href="/" className="text-xs font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-1 transition-colors">
                        <ChevronLeft className="h-4 w-4" /> Kembali
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="bg-white border-b border-slate-200 py-12 px-6">
                <div className="max-w-4xl mx-auto text-center md:text-left">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Kebijakan Privasi</h1>
                    <p className="text-slate-500 font-medium">Terakhir diperbarui: <span className="text-slate-900 font-bold">{updatedAt}</span></p>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 mt-12 space-y-12">
                {/* 1. Pengenalan */}
                <section className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                            <Info className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">1. Pendahuluan</h2>
                    </div>
                    <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed font-medium">
                        <p>Selamat datang di Aivola.id. Kami sangat menghargai privasi Anda dan berkomitmen untuk melindungi data pribadi karyawan dan perusahaan Anda.</p>
                        <p>Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda saat Anda menggunakan aplikasi mobile Aivola dan web admin panel kami.</p>
                    </div>
                </section>

                {/* 2. Data yang Kami Kumpulkan */}
                <section className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                            <Lock className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">2. Pengumpulan Data</h2>
                    </div>
                    <div className="space-y-6">
                        <p className="text-slate-600 font-medium">Untuk menjalankan fungsi HR dan absensi, kami mengumpulkan jenis data berikut:</p>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                                <div className="flex items-center gap-3 mb-3 text-indigo-600 font-bold">
                                    <MapPin className="h-5 w-5" /> Lokasi (Geofencing)
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">Kami mengakses lokasi perangkat Anda pada saat melakukan **Clock-In** dan **Clock-Out** untuk memverifikasi kehadiran Anda di zona kantor yang ditentukan.</p>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                                <div className="flex items-center gap-3 mb-3 text-indigo-600 font-bold">
                                    <Camera className="h-5 w-5" /> Kamera (E-KYC)
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">Kami memerlukan akses kamera untuk mengambil foto wajah sebagai bukti kehadiran (Face Scan) dan mengunggah foto profil di sistem HR.</p>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5 font-medium">
                                <li><strong>Informasi Identitas</strong>: Nama lengkap, alamat email, nomor telepon, dan ID Karyawan.</li>
                                <li><strong>Data Perangkat</strong>: Model perangkat, versi sistem operasi, dan pengenal perangkat unik (Device ID).</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* 3. Penggunaan Data */}
                <section className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                            <Shield className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">3. Penggunaan Informasi</h2>
                    </div>
                    <div className="prose prose-slate max-w-none text-slate-600 font-medium space-y-4">
                        <p>Data yang kami kumpulkan digunakan semata-mata untuk kebutuhan operasional perusahaan, termasuk:</p>
                        <ul className="list-decimal pl-5 space-y-2">
                            <li>Memvalidasi kehadiran karyawan di lokasi kerja yang sah.</li>
                            <li>Menghitung jam kerja dan gaji (payroll) secara akurat.</li>
                            <li>Meningkatkan keamanan sistem dari penyalahgunaan akun (misal: titip absen).</li>
                        </ul>
                    </div>
                </section>

                {/* 4. Keamanan Data */}
                <section className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                            <Lock className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">4. Keamanan Data</h2>
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed">Kami menerapkan standar keamanan enkripsi SSL (Secure Socket Layer) untuk setiap transmisi data. Data pribadi Anda disimpan di server yang aman dengan akses terbatas hanya untuk Admin HR di perusahaan Anda masing-masing.</p>
                </section>

                {/* 5. Kontak */}
                <section className="bg-white p-8 rounded-[32px] border bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-white/20 rounded-xl text-white">
                            <Mail className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight">5. Hubungi Kami</h2>
                    </div>
                    <p className="font-medium mb-4 opacity-90">Jika Anda memiliki pertanyaan mengenai kebijakan privasi ini atau penggunaan data Anda, silakan hubungi tim kami:</p>
                    <div className="bg-white/10 p-5 rounded-2xl border border-white/20">
                        <p className="font-black text-lg">Aivola.id Support Team</p>
                        <p className="text-sm opacity-80">Email: support@aivola.id</p>
                        <p className="text-sm opacity-80 mt-2 italic">*Atau hubungi Departemen HR di PT. DAPUR BASAMO SAMO.</p>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="max-w-4xl mx-auto px-6 mt-16 text-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">&copy; 2026 Aivola.id HR Systems. All rights reserved.</p>
            </footer>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Building2, Lock, Mail, ArrowRight, UserCircle, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: '',
    adminName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Konfirmasi password tidak cocok.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post('/auth/register', {
        companyName: formData.companyName,
        adminName: formData.adminName,
        email: formData.email,
        password: formData.password
      });

      if (res.data.status === 'success') {
        setIsSuccess(true);
        // Tunggu 3 detik lalu redirect ke login
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || 'Gagal melakukan registrasi. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl animate-in zoom-in-95 duration-500">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Registrasi Berhasil!</h2>
          <p className="mt-4 text-slate-600">
            Akun trial 14 hari Anda telah aktif. Anda akan diarahkan ke halaman login dalam beberapa saat...
          </p>
          <div className="mt-8">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-blue-600 animate-progress origin-left"></div>
            </div>
          </div>
          <style jsx>{`
            @keyframes progress {
              from { transform: scaleX(0); }
              to { transform: scaleX(1); }
            }
            .animate-progress {
              animation: progress 3s linear forwards;
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <style jsx global>{`
        .register-card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); }
        @media (min-width: 768px) { .register-card { padding: 3rem; } }
      `}</style>

      {/* Sisi Kiri: Info & Trust */}
      <div className="hidden w-1/2 flex-col justify-between bg-blue-600 p-12 text-white md:flex relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <img src="/logo.png" alt="aivola" className="h-10 w-10 bg-white rounded-lg p-1" />
            <span className="text-2xl font-bold tracking-tight">aivola</span>
          </div>
          
          <h1 className="text-4xl font-bold leading-tight lg:text-5xl">
            Mulai Transformasi Digital HR Anda Hari Ini.
          </h1>
          <p className="mt-6 text-xl text-blue-100 max-w-lg">
            Gabung dengan ribuan perusahaan yang telah mengotomatisasi absensi dan penggajian dengan Aivola.
          </p>

          <div className="mt-12 space-y-6">
            {[
              'Uji coba gratis 14 hari penuh',
              'Tanpa kartu kredit diperlukan',
              'Akses semua fitur (KPI, Payroll, dll)',
              'Bantuan setup dari tim ahli kami'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="font-medium text-blue-50/90">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-auto pt-10 border-t border-blue-400/30">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-blue-600 bg-blue-400"></div>
              ))}
            </div>
            <p className="text-sm text-blue-100">
              <span className="font-bold text-white">500+</span> Perusahaan baru bergabung bulan ini
            </p>
          </div>
        </div>
      </div>

      {/* Sisi Kanan: Form Registrasi */}
      <div className="flex w-full items-center justify-center p-6 md:w-1/2 lg:p-12">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="mb-8 md:hidden">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="aivola" className="h-8 w-8" />
              <span className="text-xl font-bold text-slate-900">aivola</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Dapatkan 14 Hari Gratis</h2>
            <p className="mt-2 text-slate-500">Isi data di bawah untuk memulai akun trial Anda.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Nama Perusahaan</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  name="companyName"
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="PT. Maju Bersama Jaya"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-11 pr-4 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Nama Lengkap Anda</label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    name="adminName"
                    type="text"
                    required
                    value={formData.adminName}
                    onChange={handleChange}
                    placeholder="Budi Santoso"
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-11 pr-4 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email Kerja</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="budi@majujaya.com"
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-11 pr-4 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-11 pr-12 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Konfirmasi Password</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-11 pr-4 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="group flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-blue-500/30 focus:outline-none disabled:bg-blue-400"
              >
                {isLoading ? 'Memproses...' : 'Daftar Sekarang'}
                {!isLoading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </button>
            </div>
            
            <p className="text-center text-sm text-slate-500">
              Sudah punya akun?{' '}
              <Link href="/" className="font-semibold text-blue-600 hover:text-blue-500">
                Masuk ke Portal
              </Link>
            </p>

            <div className="mt-8 rounded-lg bg-slate-100 p-4 text-[11px] text-slate-500 leading-relaxed">
              Dengan mendaftar, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi Aivola. Kami tidak akan membagikan data Anda dengan pihak ketiga mana pun sesuai dengan GDPR.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

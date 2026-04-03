'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Lock, Mail, ArrowRight, UserCircle, Eye, EyeOff, AlertTriangle, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHardBlocked, setIsHardBlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsHardBlocked(false);
    setErrorMsg('');

    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;
      
      if (user.role === 'EMPLOYEE') {
        setErrorMsg('Akses Web Admin Ditolak: Hanya Admin yang dapat masuk ke panel ini.');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('jwt_token', token);
      localStorage.setItem('companyId', user.companyId.toString());
      localStorage.setItem('userName', user.name);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('userPlan', user.plan || 'STARTER');
      localStorage.setItem('userAddons', JSON.stringify(user.addons || []));
      router.push('/dashboard');
    } catch (error: any) {
      const status = error?.response?.status;
      const msg = error?.response?.data?.error || 'Email atau Kata Sandi salah.';
      
      // Hard Block: Contract expired > 30 days
      if (status === 403 && msg.toLowerCase().includes('dibekukan')) {
        setIsHardBlocked(true);
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <style jsx global>{`
        .login-container { display: flex; width: 100%; flex-direction: column; justify-content: center; background: white; padding: 2rem; }
        @media (min-width: 768px) { .login-container { width: 50%; padding: 4rem; } }
        .input-field { width: 100%; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.75rem 1rem; margin-top: 0.5rem; outline: none; }
        .input-field:focus { border-color: #2563eb; ring: 2px #2563eb; }
        .btn-primary { background: #2563eb; color: white; border-radius: 0.5rem; padding: 0.75rem; font-weight: 600; width: 100%; transition: all; }
        .btn-primary:hover { background: #1d4ed8; }
      `}</style>

      {/* Sisi Kiri: Form Login */}
      <div className="login-container shadow-2xl" style={{ position: 'relative', zIndex: 10 }}>
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex flex-col items-center text-center">
            <img 
              src="/logo.png" 
              alt="aivola Logo" 
              className="mb-4" 
              style={{ height: '60px', width: 'auto', marginBottom: '1rem' }} 
            />
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              aivola <span className="text-blue-600">Portal</span>
            </h1>
            <p className="mt-4 text-slate-500">
              Selamat datang kembali. Masuk ke panel admin untuk mengelola karyawan perusahaan Anda.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@perusahaan.com"
                  className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  Lupa password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            {/* Hard Block Banner */}
            {isHardBlocked && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-5 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="rounded-full bg-red-100 p-3">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <p className="font-bold text-red-800">Langganan Anda Telah Berakhir</p>
                <p className="text-xs text-red-600 leading-relaxed">
                  Akses akun Anda dibekukan karena periode berlangganan telah berlalu lebih dari 30 hari. Perpanjang sekarang untuk memulihkan akses.
                </p>
                <a
                  href="http://localhost:5173/#renewal"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 transition-all"
                >
                  <RefreshCw className="h-4 w-4" />
                  Perpanjang Langganan Sekarang
                </a>
              </div>
            )}

            {!isHardBlocked && (
              <button
                type="submit"
                disabled={isLoading}
                className="group flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
              >
                {isLoading ? 'Memproses...' : 'Masuk ke Dashboard'}
                {!isLoading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </button>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Belum punya akun?{' '}
            <a href="http://localhost:3000/register" className="font-semibold text-blue-600 hover:text-blue-500">
              Coba Gratis 14 Hari
            </a>
          </p>
        </div>
      </div>

      {/* Sisi Kanan: Visual Branding */}
      <div className="hidden w-1/2 bg-slate-900 md:block relative overflow-hidden">
        {/* Dekorasi Abstract Blob */}
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-blue-600/20 blur-3xl"></div>
        <div className="absolute top-[60%] -left-[10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-3xl"></div>

        <div className="flex h-full flex-col justify-center px-16 relative z-10">
          <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Sistem HR yang Mengerti Bisnis Anda.
          </h1>
          <p className="mt-6 text-lg text-slate-300 max-w-lg">
            Satu platform (SaaS) untuk absensi wajah, perhitungan lembur, pajak, hingga penggajian otomatis. Multi-Perusahaan.
          </p>

          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center">
                  <UserCircle className="text-slate-400 w-6 h-6" />
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-slate-400">
              Dipercaya oleh +5.000 HRD di Indonesia
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCcw, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function EmployeeIdPage() {
    const [token, setToken] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchToken = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/employee/qr');
            setToken(res.data.token);
            
            // Hitung sisa waktu dari expiresAt (kurang lebih 60 detik)
            const expiresAt = new Date(res.data.expiresAt).getTime();
            const now = new Date().getTime();
            const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
            setTimeLeft(remaining);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Gagal membuat QR Code');
            toast.error('Gagal memuat QR Code');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchToken();
    }, []);

    useEffect(() => {
        if (timeLeft <= 0) {
            if (token) {
                // Auto refresh ketika waktu habis
                fetchToken();
            }
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, token]);

    return (
        <DashboardLayout>
            <div className="max-w-md mx-auto py-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black tracking-tight text-white mb-2">Aivola ID</h1>
                    <p className="text-slate-400">Scan QR Code ini di Kasir untuk klaim Diskon Karyawan Anda.</p>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                    
                    {error ? (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <p className="text-slate-600 font-medium">{error}</p>
                            <button 
                                onClick={fetchToken}
                                className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-full font-bold text-sm"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center space-x-2 text-emerald-600 font-bold mb-6 bg-emerald-50 px-4 py-2 rounded-full text-sm">
                                <ShieldCheck className="w-4 h-4" />
                                <span>Anti-Fraud Active</span>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 mb-6 relative group">
                                {loading ? (
                                    <div className="w-48 h-48 flex items-center justify-center">
                                        <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full"></div>
                                    </div>
                                ) : token ? (
                                    <>
                                        <QRCodeSVG 
                                            value={token} 
                                            size={200}
                                            level="M"
                                            includeMargin={false}
                                        />
                                        <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl cursor-pointer" onClick={() => {
                                            navigator.clipboard.writeText(token);
                                            toast.success('Token disalin untuk simulasi scan!');
                                        }}>
                                            <span className="text-sm font-bold text-slate-800">Klik untuk copy Token (Simulasi Scanner)</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-48 h-48 bg-slate-100 rounded-xl"></div>
                                )}
                            </div>

                            <div className="w-full mb-6">
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                                    <span>Berlaku selama</span>
                                    <span className={timeLeft < 10 ? 'text-red-500' : 'text-blue-600'}>
                                        {timeLeft} Detik
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 10 ? 'bg-red-500' : 'bg-blue-500'}`}
                                        style={{ width: `${(timeLeft / 60) * 100}%` }}
                                    ></div>
                                </div>
                                <p className="text-[10px] text-center text-slate-400 mt-3">
                                    QR Code dinamis ini berubah setiap menit untuk keamanan. Jangan berikan screenshot kepada siapapun.
                                </p>
                            </div>

                            <button 
                                onClick={fetchToken}
                                disabled={loading}
                                className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
                            >
                                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                <span>Perbarui Sekarang</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

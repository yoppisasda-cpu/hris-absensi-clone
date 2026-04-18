'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Loader2, CheckCircle, XCircle, Clock, ExternalLink, Building2, Laptop, Copy, ArrowRight, Zap, Database } from 'lucide-react';

interface IntegrationRequest {
    id: number;
    companyId: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    note: string | null;
    createdAt: string;
    company: {
        id: number;
        name: string;
        plan: string;
    };
}

interface CompanyData {
    id: number;
    name: string;
    isApiEnabled: boolean;
    integrationApiKey: string | null;
}

export default function IntegrationPage() {
    const [requests, setRequests] = useState<IntegrationRequest[]>([]);
    const [myCompany, setMyCompany] = useState<CompanyData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchRequests = async () => {
        try {
            const response = await api.get('/admin/integrations/requests');
            setRequests(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchMyCompany = async () => {
        try {
            const response = await api.get('/companies/my');
            setMyCompany(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const init = async () => {
        setIsLoading(true);
        const role = localStorage.getItem('userRole');
        setUserRole(role);

        if (role === 'SUPERADMIN') {
            await fetchRequests();
        } else if (role === 'OWNER') {
            await fetchMyCompany();
        }
        setIsLoading(false);
    };

    useEffect(() => {
        init();
    }, []);

    const handleAction = async (requestId: number, status: 'APPROVED' | 'REJECTED') => {
        if (!confirm(`Konfirmasi: Anda yakin ingin ${status === 'APPROVED' ? 'MENYETUJUI' : 'MENOLAK'} permintaan ini?`)) return;
        
        setIsProcessing(requestId);
        try {
            await api.patch(`/admin/integrations/requests/${requestId}`, { status });
            alert(`Permintaan berhasil ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}.`);
            fetchRequests();
        } catch (error) {
            alert("Gagal memproses permintaan.");
        } finally {
            setIsProcessing(null);
        }
    };

    const handleCopy = () => {
        if (myCompany?.integrationApiKey) {
            navigator.clipboard.writeText(myCompany.integrationApiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (userRole !== 'SUPERADMIN' && userRole !== 'OWNER') {
        return (
            <DashboardLayout>
                <div className="flex h-96 items-center justify-center">
                    <div className="text-center">
                        <XCircle className="mx-auto h-12 w-12 text-rose-500 mb-4" />
                        <h2 className="text-xl font-bold text-slate-900">Akses Terbatas</h2>
                        <p className="text-slate-500">Hanya Admin Pusat atau Pemilik Perusahaan yang dapat mengakses halaman ini.</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // --- RENDER OWNER VIEW ---
    if (userRole === 'OWNER') {
        return (
            <DashboardLayout>
                <div className="mb-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-amber-500 rounded-lg shadow-lg shadow-amber-200">
                                    <Laptop className="h-6 w-6 text-white" />
                                </div>
                                Integrasi API & Eksternal
                            </h1>
                            <p className="text-slate-500 mt-2 font-medium">Hubungkan aplikasi pabrik, POS kustom, atau perangkat IoT Anda secara langsung ke ekosistem Aivola.id.</p>
                        </div>
                        
                        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${myCompany?.isApiEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                            {myCompany?.isApiEnabled ? (
                                <><Zap className="h-4 w-4 fill-emerald-500" /> <span className="text-xs font-black uppercase tracking-widest">Koneksi Aktif</span></>
                            ) : (
                                <><Clock className="h-4 w-4" /> <span className="text-xs font-black uppercase tracking-widest">Koneksi Nonaktif</span></>
                            )}
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                    </div>
                ) : (
                    <div className="grid gap-8 max-w-5xl">
                        {/* API KEY SECTION */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden border-b-4 border-b-amber-500">
                            <div className="p-6 md:p-8">
                                <h2 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-amber-500" />
                                    Kredensial Akses (API Key)
                                </h2>

                                {!myCompany?.isApiEnabled ? (
                                    <div className="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-300">
                                        <XCircle className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                                        <h3 className="text-slate-900 font-bold mb-1">API Belum Diaktifkan</h3>
                                        <p className="text-xs text-slate-500 mb-6 px-4">Modul integrasi untuk perusahaan Anda belum disetujui atau diaktifkan oleh Admin Pusat.</p>
                                        <button className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
                                            Ajukan Aktivasi API
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="relative group">
                                            <div className="absolute -top-2 left-6 px-2 bg-white text-[10px] font-black text-amber-600 uppercase tracking-widest z-10">Integration Secret Key</div>
                                            <div className="flex items-center gap-2 p-4 md:p-5 bg-slate-950 rounded-2xl border border-slate-800 group-hover:border-amber-500/50 transition-all">
                                                <code className="flex-1 text-amber-400 font-mono text-xs md:text-sm break-all">
                                                    {myCompany.integrationApiKey || 'BELUM_ADA_KEY'}
                                                </code>
                                                <button 
                                                    onClick={handleCopy}
                                                    className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all flex items-center gap-2"
                                                >
                                                    {copied ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                                    <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Salin</span>
                                                </button>
                                            </div>
                                            <p className="mt-3 text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                                <XCircle className="h-3 w-3 text-rose-500" />
                                                Jangan bagikan key ini kepada siapapun kecuali developer sistem integrasi Anda.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* DOCUMENTATION SECTION */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 md:p-8">
                                <h2 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center gap-2">
                                    <Database className="h-5 w-5 text-indigo-500" />
                                    Endpoint Sinkronisasi (Pabrik ke Aivola)
                                </h2>

                                <div className="space-y-8">
                                    <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                                        <div className="flex items-center gap-2 text-indigo-700 mb-2">
                                            <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-black">POST</span>
                                            <span className="text-xs font-black font-mono">/api/products/sync-bulk-stock</span>
                                        </div>
                                        <p className="text-xs text-indigo-900/70 font-medium">Gunakan endpoint ini untuk mengirim data update stok secara massal dari sistem internal pabrik Anda.</p>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                            Struktur JSON Request
                                        </h3>
                                        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800">
                                            <pre className="text-indigo-300 font-mono text-[11px] md:text-xs overflow-x-auto">
{`{
  "warehouseId": 1, // Optional: Target Gudang Utama
  "items": [
    { "sku": "DBSKM011", "quantity": 1500 },
    { "sku": "DBSKM009", "quantity": 800 }
  ]
}`}
                                            </pre>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold hover:text-indigo-600 transition-colors cursor-pointer group">
                                            Lihat Dokumentasi API Lengkap
                                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DashboardLayout>
        );
    }

    // --- RENDER SUPERADMIN VIEW ---
    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                        <ExternalLink className="h-6 w-6 text-white" />
                    </div>
                    Manajemen Integrasi Eksternal (Admin Pusat)
                </h1>
                <p className="text-slate-500 mt-2 font-medium italic">Kelola persetujuan akses API untuk koneksi mesin pabrik, POS pihak ketiga, dan IoT dari seluruh klien Aivola.id.</p>
            </div>

            {isLoading ? (
                <div className="flex h-96 items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                </div>
            ) : (
                <div className="grid gap-6">
                    {requests.length === 0 ? (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                            <Clock className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                            <p className="text-slate-500 font-bold">Belum ada permintaan integrasi baru.</p>
                        </div>
                    ) : (
                        requests.map((req) => (
                            <div key={req.id} className={`bg-white rounded-2xl border ${req.status === 'PENDING' ? 'border-amber-200' : 'border-slate-200'} shadow-sm overflow-hidden transition-all hover:shadow-md`}>
                                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mt-1">
                                            <Building2 className="h-6 w-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight">{req.company.name}</h3>
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-black uppercase tracking-widest">{req.company.plan}</span>
                                            </div>
                                            <p className="text-slate-400 text-xs font-bold mt-1">ID Perusahaan: #{req.companyId}</p>
                                            
                                            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 relative">
                                                <div className="absolute -top-2 left-4 px-2 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">Catatan Klien</div>
                                                <p className="text-sm text-slate-700 font-medium italic">"{req.note || 'Tidak ada catatan khusus'}"</p>
                                            </div>
                                            <div className="mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                Tanggal Request: {new Date(req.createdAt).toLocaleString('id-ID')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {req.status === 'PENDING' ? (
                                            <>
                                                <button
                                                    onClick={() => handleAction(req.id, 'REJECTED')}
                                                    disabled={isProcessing !== null}
                                                    className="flex items-center gap-2 px-6 py-3 border border-rose-100 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                                >
                                                    Tolak
                                                </button>
                                                <button
                                                    onClick={() => handleAction(req.id, 'APPROVED')}
                                                    disabled={isProcessing !== null}
                                                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                                                >
                                                    {isProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                    Setujui (Aktifkan API)
                                                </button>
                                            </>
                                        ) : (
                                            <div className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {req.status === 'APPROVED' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                                Sudah {req.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </DashboardLayout>
    );
}

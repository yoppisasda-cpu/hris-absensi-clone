'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Loader2, CheckCircle, XCircle, Clock, ExternalLink, Building2 } from 'lucide-react';

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

export default function IntegrationApprovalPage() {
    const [requests, setRequests] = useState<IntegrationRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/admin/integrations/requests');
            setRequests(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        setUserRole(localStorage.getItem('userRole'));
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

    if (userRole !== 'SUPERADMIN' && userRole !== 'OWNER') {
        return (
            <DashboardLayout>
                <div className="flex h-96 items-center justify-center">
                    <div className="text-center">
                        <XCircle className="mx-auto h-12 w-12 text-rose-500 mb-4" />
                        <h2 className="text-xl font-bold text-slate-900">Akses Terbatas</h2>
                        <p className="text-slate-500">Hanya Admin Pusat yang dapat mengakses halaman ini.</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                        <ExternalLink className="h-6 w-6 text-white" />
                    </div>
                    Manajemen Integrasi Eksternal
                </h1>
                <p className="text-slate-500 mt-2 font-medium italic">Kelola persetujuan akses API untuk koneksi mesin pabrik, POS pihak ketiga, dan IoT.</p>
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

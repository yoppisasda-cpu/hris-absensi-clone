'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Receipt, CheckCircle, XCircle, User, Eye, Download, Search, AlertTriangle, Cpu, CreditCard } from 'lucide-react';

interface Reimbursement {
    id: number;
    userId: number;
    user: {
        name: string;
        email: string;
    };
    title: string;
    description: string;
    amount: number;
    receiptUrl: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;

    // Phase 34: AI Fields
    ocrAmount?: number;
    ocrDate?: string;
    ocrCategory?: string;
    isFraud: boolean;
    fraudReason?: string;
    isPaid: boolean;
    paidAt?: string;
}

export default function ReimbursementsPage() {
    const [claims, setClaims] = useState<Reimbursement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Finance Integration States
    const [accounts, setAccounts] = useState<any[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
    const [showPayModal, setShowPayModal] = useState(false);
    const [payData, setPayData] = useState<{ claimId: number, accountId: string, categoryId: string, amount: number, title: string } | null>(null);
    const [isSubmittingPay, setIsSubmittingPay] = useState(false);

    const fetchClaims = async () => {
        try {
            const response = await api.get('/reimbursements');
            setClaims(response.data);
        } catch (err: any) {
            setError('Gagal memuat data reimbursement.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchFinanceData = async () => {
        try {
            const [accRes, catRes] = await Promise.all([
                api.get('/finance/accounts'),
                api.get('/finance/expense-categories')
            ]);
            setAccounts(accRes.data);
            setExpenseCategories(catRes.data);
        } catch (err) {
            console.error("Gagal memuat data finansial untuk integrasi.");
        }
    };

    useEffect(() => {
        fetchClaims();
        fetchFinanceData();
    }, []);

    const handleUpdateStatus = async (id: number, status: 'APPROVED' | 'REJECTED') => {
        try {
            await api.patch(`/reimbursements/${id}`, { status });
            setClaims(prev => prev.map(item => item.id === id ? { ...item, status } : item));
        } catch (err: any) {
            alert('Gagal memperbarui status: ' + (err.response?.data?.error || 'Kesalahan Server'));
        }
    };

    const openPayModal = (claim: Reimbursement) => {
        setPayData({
            claimId: claim.id,
            accountId: accounts.length > 0 ? accounts[0].id.toString() : '',
            categoryId: expenseCategories.length > 0 ? expenseCategories[0].id.toString() : '',
            amount: claim.amount,
            title: claim.title
        });
        setShowPayModal(true);
    };

    const handleConfirmPayment = async () => {
        if (!payData || !payData.accountId || !payData.categoryId) {
            alert('Mohon pilih akun kas/bank dan kategori pengeluaran.');
            return;
        }

        setIsSubmittingPay(true);
        try {
            await api.patch(`/reimbursements/${payData.claimId}/pay`, {
                accountId: payData.accountId,
                categoryId: payData.categoryId
            });
            
            setClaims(prev => prev.map(item => item.id === payData.claimId ? { ...item, isPaid: true, paidAt: new Date().toISOString() } : item));
            setShowPayModal(false);
            setPayData(null);
            alert('Pembayaran berhasil diproses dan tercatat di Modul Keuangan.');
        } catch (err: any) {
            alert('Gagal memproses pembayaran: ' + (err.response?.data?.error || 'Kesalahan Server'));
        } finally {
            setIsSubmittingPay(false);
        }
    };

    const handlePay = async (id: number) => {
        // Fallback or simple pay if no finance data
        if (!confirm('Tandai reimbursement ini sebagai SUDAH DIBAYAR?')) return;
        try {
            await api.patch(`/reimbursements/${id}/pay`);
            setClaims(prev => prev.map(item => item.id === id ? { ...item, isPaid: true, paidAt: new Date().toISOString() } : item));
        } catch (err: any) {
            alert('Gagal memproses pembayaran: ' + (err.response?.data?.error || 'Kesalahan Server'));
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
            case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200';
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const getFullImageUrl = (path: string | null) => {
        if (!path) return '';
        if (path.startsWith('http')) return path; // already a full URL (Supabase)
        
        // Handle potential absolute paths saved in DB by mistake
        let cleanPath = path;
        const uploadsMatch = path.match(/uploads[\\/].*/i);
        if (uploadsMatch) {
            cleanPath = '/' + uploadsMatch[0].replace(/\\/g, '/');
        }

        let backendBase = api.defaults.baseURL || 'https://api.aivola.id/api';
        if (backendBase.endsWith('/api')) backendBase = backendBase.slice(0, -4);
        if (!backendBase) backendBase = 'https://api.aivola.id';
        
        const finalPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
        return `${backendBase}${finalPath}`;
    };

    const handleDownload = async (url: string) => {
        try {
            const fullUrl = getFullImageUrl(url);
            const response = await fetch(fullUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = 'kuitansi-' + Date.now() + '.jpg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (e) {
            alert('Gagal mengunduh gambar.');
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Manajemen Reimbursement</h1>
                    <p className="text-sm text-slate-400">Tinjau klaim biaya operasional dan bukti kuitansi dari karyawan.</p>
                </div>
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Cari nama, email, atau judul..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm bg-slate-900/50 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-500"
                    />
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-red-500">{error}</div>
                ) : claims.filter(c =>
                    c.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.title.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-500">
                        <Search className="h-12 w-12 text-slate-200 mb-4" />
                        <p className="font-medium text-lg mb-1">Tidak ada hasil ditemukan</p>
                        <p className="text-sm">Tidak ada klaim yang cocok dengan "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Karyawan</th>
                                    <th className="px-6 py-4">Judul / Detail</th>
                                    <th className="px-6 py-4">Nominal</th>
                                    <th className="px-6 py-4">Kuitansi</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Aksi HRD</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {claims.filter(c =>
                                    c.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    c.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    c.title.toLowerCase().includes(searchQuery.toLowerCase())
                                ).map((claim) => (
                                    <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <User className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{claim.user.name}</p>
                                                    <p className="text-xs text-slate-400">{claim.user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-700 font-medium">{claim.title}</span>
                                                <span className="text-xs text-slate-400">{claim.description || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900">{formatCurrency(claim.amount)}</span>
                                                {claim.ocrAmount && Math.abs(claim.ocrAmount - claim.amount) > 100 && (
                                                    <span className="text-[10px] text-amber-600 flex items-center gap-1">
                                                        <Cpu className="h-3 w-3" />
                                                        AI Scan: {formatCurrency(claim.ocrAmount)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {claim.receiptUrl ? (
                                                <button
                                                    onClick={() => setSelectedImage(claim.receiptUrl!)}
                                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Lihat Foto
                                                </button>
                                            ) : (
                                                <span className="text-slate-400">Tidak ada bukti</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusStyle(claim.status)}`}>
                                                    {claim.status === 'PENDING' ? 'Menunggu' : claim.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                                                </span>
                                                {claim.isPaid ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                                        <CheckCircle className="h-3 w-3" />
                                                        LUNAS
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                        BELUM DIBAYAR
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {claim.status === 'PENDING' ? (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleUpdateStatus(claim.id, 'APPROVED')}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200"
                                                        title="Setujui"
                                                    >
                                                        <CheckCircle className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(claim.id, 'REJECTED')}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                                                        title="Tolak"
                                                    >
                                                        <XCircle className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ) : (claim.status === 'APPROVED' && !claim.isPaid) ? (
                                                <button
                                                    onClick={() => openPayModal(claim)}
                                                    className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                >
                                                    <CreditCard className="h-3.5 w-3.5" />
                                                    BAYAR SEKARANG
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-400">Selesai</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Konfirmasi Pembayaran (Integrasi Finance) */}
            {showPayModal && payData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-amber-500 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Konfirmasi Pembayaran
                            </h3>
                            <button onClick={() => setShowPayModal(false)} className="hover:bg-white/20 p-1 rounded-full text-white">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Detail Klaim</p>
                                <p className="font-bold text-slate-900">{payData.title}</p>
                                <p className="text-lg font-black text-amber-600">{formatCurrency(payData.amount)}</p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">
                                        Bayar Menggunakan (Kas/Bank)
                                    </label>
                                    <select 
                                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                                        value={payData.accountId}
                                        onChange={(e) => setPayData({...payData, accountId: e.target.value})}
                                    >
                                        <option value="">Pilih Akun Kas/Bank</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name} (Saldo: {formatCurrency(acc.balance)})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">
                                        Kategori Pengeluaran
                                    </label>
                                    <select 
                                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                                        value={payData.categoryId}
                                        onChange={(e) => setPayData({...payData, categoryId: e.target.value})}
                                    >
                                        <option value="">Pilih Kategori</option>
                                        {expenseCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t flex gap-3">
                            <button 
                                onClick={() => setShowPayModal(false)}
                                className="flex-1 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleConfirmPayment}
                                disabled={isSubmittingPay}
                                className="flex-1 py-2.5 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
                            >
                                {isSubmittingPay ? 'Memproses...' : 'Proses Bayar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Preview Gambar */}
            {
                selectedImage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedImage(null)}>
                        <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b flex justify-between items-center">
                                <h3 className="font-bold text-slate-900">Bukti Transfer / Kuitansi</h3>
                                <button onClick={() => setSelectedImage(null)} className="p-1 hover:bg-slate-100 rounded-full">
                                    <XCircle className="h-6 w-6 text-slate-400" />
                                </button>
                            </div>
                            <div className="p-4 overflow-auto flex justify-center bg-slate-100">
                                <img src={getFullImageUrl(selectedImage)} alt="Receipt" className="max-w-full h-auto rounded shadow-lg" />
                            </div>
                            <div className="p-4 border-t text-right">
                                <button
                                    onClick={() => handleDownload(selectedImage!)}
                                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Download className="h-4 w-4" />
                                    Download Gambar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </DashboardLayout >
    );
}

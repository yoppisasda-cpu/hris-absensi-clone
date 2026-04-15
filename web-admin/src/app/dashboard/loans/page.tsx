'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import {
    Plus,
    Search,
    CreditCard,
    Clock,
    CheckCircle,
    XCircle,
    User,
    Calendar
} from "lucide-react";

interface Loan {
    id: number;
    amount: number;
    monthlyDeduction: number;
    remainingAmount: number;
    status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'REJECTED';
    description: string;
    createdAt: string;
    user: {
        name: string;
        email: string;
    }
}

interface Employee {
    id: number;
    name: string;
}

export default function LoanPage() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        userId: '',
        amount: '',
        monthlyDeduction: '',
        description: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [loansRes, employeesRes] = await Promise.all([
                api.get('/loans'),
                api.get('/users')
            ]);
            setLoans(loansRes.data);
            setEmployees(employeesRes.data);
        } catch (error) {
            console.error("Gagal mengambil data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.post('/loans', formData);
            setIsModalOpen(false);
            setFormData({ userId: '', amount: '', monthlyDeduction: '', description: '' });
            fetchData();
        } catch (error) {
            alert("Gagal membuat pinjaman");
        } finally {
            setIsSaving(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Aktif</span>;
            case 'COMPLETED':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Lunas</span>;
            case 'PENDING':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Menunggu</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{status}</span>;
        }
    };

    return (
        <DashboardLayout>
            <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Manajemen Pinjaman</h1>
                        <p className="text-slate-400">Kelola pinjaman karyawan dan potongan otomatis.</p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                        <div className="relative flex-grow sm:flex-grow-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Cari nama, email, atau alasan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full sm:w-64 pl-10 pr-4 py-2 text-sm border border-slate-700 bg-slate-900/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-500"
                            />
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 whitespace-nowrap"
                        >
                            <Plus className="h-5 w-5" />
                            Catat Pinjaman Baru
                        </button>
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="rounded-full bg-blue-900/30 p-3 text-blue-400">
                                <CreditCard className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-400">Total Pinjaman Aktif</p>
                                <h3 className="text-2xl font-bold text-white">
                                    {loans.filter(l => l.status === 'ACTIVE').length}
                                </h3>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="rounded-full bg-orange-900/30 p-3 text-orange-400">
                                <Clock className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-400">Total Sisa Saldo</p>
                                <h3 className="text-2xl font-bold text-orange-400">
                                    {formatCurrency(loans.reduce((acc, curr) => acc + (curr.status === 'ACTIVE' ? curr.remainingAmount : 0), 0))}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-6 py-4">Karyawan</th>
                                <th className="px-6 py-4">Total Pinjaman</th>
                                <th className="px-6 py-4">Potongan / Bln</th>
                                <th className="px-6 py-4">Sisa Saldo</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Tgl Dibuat</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-slate-600">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-400">Memuat data pinjaman...</td>
                                </tr>
                            ) : loans.filter(l =>
                                l.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                l.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                l.description.toLowerCase().includes(searchQuery.toLowerCase())
                            ).length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-500">
                                        <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                        <p className="font-medium text-lg mb-1">Tidak ada hasil ditemukan</p>
                                        <p className="text-sm">Tidak ada data pinjaman yang cocok dengan "{searchQuery}"</p>
                                    </td>
                                </tr>
                            ) : (
                                loans.filter(l =>
                                    l.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    l.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    l.description.toLowerCase().includes(searchQuery.toLowerCase())
                                ).map((loan) => (
                                    <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <User className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-700">{loan.user.name}</p>
                                                    <p className="text-xs text-slate-400">{loan.user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            {formatCurrency(loan.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-orange-600 font-medium">
                                            {formatCurrency(loan.monthlyDeduction)}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800">
                                            {formatCurrency(loan.remainingAmount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(loan.status)}
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            {new Date(loan.createdAt).toLocaleDateString('id-ID')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal Tambah Pinjaman */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-800">Catat Pinjaman Baru</h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <XCircle className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateLoan} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Karyawan</label>
                                    <select
                                        required
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                        value={formData.userId}
                                        onChange={e => setFormData({ ...formData, userId: e.target.value })}
                                    >
                                        <option value="">-- Pilih Karyawan --</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Total Pinjaman</label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-2.5 text-sm font-semibold text-slate-400">Rp</span>
                                            <input required type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="0" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Potongan / Bln</label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-2.5 text-sm font-semibold text-slate-400">Rp</span>
                                            <input required type="number" value={formData.monthlyDeduction} onChange={e => setFormData({ ...formData, monthlyDeduction: e.target.value })} className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="0" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan / Alasan</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none h-24"
                                        placeholder="Opsional: Misal Pinjaman Darurat Keluarga"
                                    ></textarea>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-md border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Batal</button>
                                    <button disabled={isSaving} type="submit" className="flex-1 rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-400">
                                        {isSaving ? 'Menyimpan...' : 'Simpan Pinjaman'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

'use client';

import { useState, useEffect } from "react";
import { 
    Users, Search, Plus, Filter, MoreVertical, 
    Edit, Trash2, History, Phone, Mail, 
    CreditCard, Star, ChevronRight
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";
import AddCustomerModal from "@/components/customers/AddCustomerModal";

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<any>(null);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/customers');
            setCustomers(res.data);
        } catch (error) {
            console.error("Gagal mengambil data pelanggan", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Apakah Anda yakin ingin menghapus pelanggan ini?")) return;
        try {
            await api.delete(`/customers/${id}`);
            fetchCustomers();
        } catch (error) {
            alert("Gagal menghapus pelanggan");
        }
    };

    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Users className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">Manajemen Pelanggan</h1>
                                <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Kelola database member & riwayat loyalitas</p>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => {
                            setEditingCustomer(null);
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 active:scale-95 transition-all"
                    >
                        <Plus className="h-4 w-4" /> Tambah Pelanggan Baru
                    </button>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-black">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <Users className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Total Pelanggan</p>
                            <p className="text-2xl text-slate-900">{customers.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                            <CreditCard className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Total Belanja (All)</p>
                            <p className="text-2xl text-slate-900">
                                Rp {customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                            <Star className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Loyalty Points</p>
                            <p className="text-2xl text-slate-900">
                                {customers.reduce((sum, c) => sum + (c.points || 0), 0).toLocaleString()} Pts
                            </p>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <input
                                type="text"
                                placeholder="Cari nama, email, atau nomor telepon..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-500 transition-all outline-none"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        </div>
                        <div className="flex gap-2">
                            <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors">
                                <Filter className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Pelanggan</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Kontak</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Total Belanja</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Poin</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-6 py-4">
                                                <div className="h-10 bg-slate-50 rounded-xl"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center space-y-3">
                                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                                <Users className="h-8 w-8 text-slate-200" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Belum ada data pelanggan</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCustomers.map((customer) => (
                                        <tr key={customer.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs">
                                                        {customer.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 leading-none">{customer.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase truncate max-w-[150px]">{customer.address || "No Address"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                                        <Phone className="h-3 w-3 text-indigo-400" />
                                                        {customer.phone || "-"}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                                        <Mail className="h-3 w-3" />
                                                        {customer.email || "-"}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-sm font-black text-slate-900 italic">Rp {(customer.totalSpent || 0).toLocaleString()}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black">
                                                    <Star className="h-3 w-3 fill-amber-500" />
                                                    {customer.points || 0}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button 
                                                        onClick={() => {
                                                            setEditingCustomer(customer);
                                                            setIsAddModalOpen(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-white border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button 
                                                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-white border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm"
                                                        title="Riwayat Belanja"
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(customer.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-white border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <p>Menampilkan {filteredCustomers.length} Pelanggan</p>
                        <div className="flex gap-2">
                             {/* Pagination Mockup */}
                             <button className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50">1</button>
                        </div>
                    </div>
                </div>
            </div>

            <AddCustomerModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onSuccess={fetchCustomers}
                editData={editingCustomer}
            />
        </DashboardLayout>
    );
}

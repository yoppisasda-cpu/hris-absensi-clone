'use client';

import { useState, useEffect } from "react";
import { 
    Truck, Search, Plus, Filter, 
    Edit, Trash2, Phone, Mail, 
    Tag, MapPin, User, ChevronRight,
    Building2, Briefcase
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";
import AddSupplierModal from "@/components/suppliers/AddSupplierModal";

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/suppliers');
            setSuppliers(res.data);
        } catch (error) {
            console.error("Gagal mengambil data supplier", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Apakah Anda yakin ingin menghapus supplier ini?")) return;
        try {
            await api.delete(`/suppliers/${id}`);
            fetchSuppliers();
        } catch (error) {
            alert("Gagal menghapus supplier");
        }
    };

    const filteredSuppliers = suppliers.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-100">
                                <Truck className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">Database Supplier</h1>
                                <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Kelola vendor, pemasok bahan baku & logistik</p>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => {
                            setEditingSupplier(null);
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-100 active:scale-95 transition-all"
                    >
                        <Plus className="h-4 w-4" /> Tambah Supplier Baru
                    </button>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-black">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                            <Truck className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Total Supplier</p>
                            <p className="text-2xl text-slate-900">{suppliers.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Kategori Bisnis</p>
                            <p className="text-2xl text-slate-900">
                                {new Set(suppliers.map(s => s.category)).size} Bidang
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <Briefcase className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Verified Vendors</p>
                            <p className="text-2xl text-slate-900">{suppliers.filter(s => s.phone).length}</p>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <input
                                type="text"
                                placeholder="Cari supplier, kategori, atau PIC..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-amber-500 transition-all outline-none"
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
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Nama Supplier</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Kategori</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Kontak Person (PIC)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Informasi Kontak</th>
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
                                ) : filteredSuppliers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center space-y-3">
                                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                                <Truck className="h-8 w-8 text-slate-200" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Belum ada data supplier</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSuppliers.map((supplier) => (
                                        <tr key={supplier.id} className="hover:bg-amber-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-black text-xs">
                                                        {supplier.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 leading-none">{supplier.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase truncate max-w-[150px]">{supplier.address || "No Address"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                    <Tag className="h-3 w-3" />
                                                    {supplier.category || "General"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                                    <User className="h-3.5 w-3.5 text-amber-500" />
                                                    {supplier.contactPerson || "-"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                                        <Phone className="h-3 w-3 text-amber-400" />
                                                        {supplier.phone || "-"}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                                        <Mail className="h-3 w-3" />
                                                        {supplier.email || "-"}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button 
                                                        onClick={() => {
                                                            setEditingSupplier(supplier);
                                                            setIsAddModalOpen(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-amber-600 transition-colors rounded-lg hover:bg-white border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(supplier.id)}
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
                </div>
            </div>

            <AddSupplierModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onSuccess={fetchSuppliers}
                editData={editingSupplier}
            />
        </DashboardLayout>
    );
}

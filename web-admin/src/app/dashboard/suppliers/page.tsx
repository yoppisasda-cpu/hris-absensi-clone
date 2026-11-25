'use client';

import { useState, useEffect } from "react";
import { 
    Truck, Search, Plus, Filter, 
    Edit, Trash2, Phone, Mail, 
    Tag, MapPin, User, ChevronRight,
    Building2, Briefcase, Wallet, ArrowUpRight, 
    ArrowDownRight, Receipt, DollarSign
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";
import AddSupplierModal from "@/components/suppliers/AddSupplierModal";
import SupplierFinancialModal from "@/components/suppliers/SupplierFinancialModal";

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);
    const [selectedFinancialSupplier, setSelectedFinancialSupplier] = useState<any>(null);
    const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);

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

    const totalDeposit = suppliers.reduce((sum, s) => sum + (Number(s.depositBalance) || 0), 0);
    const totalHutang = suppliers.reduce((sum, s) => sum + (Number(s.payableBalance) || 0), 0);
    const totalPiutang = suppliers.reduce((sum, s) => sum + (Number(s.receivableBalance) || 0), 0);

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
                {/* Header Section */}
                <div className="mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                    <div>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
                                <Truck className="h-7 w-7 stroke-[2.5px]" />
                            </div>
                            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase text-glow-sm">
                                Data <span className="text-amber-500">Supplier</span>
                            </h1>
                        </div>
                        <p className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase italic max-w-2xl leading-relaxed">
                            Kelola data pemasok bahan baku, pantau kontak, serta lacak saldo deposit jaminan (DP), tagihan tempo, dan angsuran piutang mitra secara real-time.
                        </p>
                    </div>
                    <button 
                        onClick={() => {
                            setEditingSupplier(null);
                            setIsAddModalOpen(true);
                        }}
                        className="group flex items-center gap-4 rounded-2xl bg-amber-600 px-8 py-4 text-[11px] font-black text-white shadow-2xl shadow-amber-500/20 hover:bg-amber-700 active:scale-95 transition-all uppercase tracking-[0.2em] italic border border-white/10"
                    >
                        <Plus className="h-4 w-4 stroke-[3.2px] group-hover:rotate-90 transition-transform duration-300" /> Tambah Supplier
                    </button>
                </div>

                {/* 4 STATS SUMMARY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {/* Card 1: Total Supplier */}
                    <div className="bg-slate-900/50 p-8 rounded-[32px] border border-white/5 shadow-2xl backdrop-blur-xl group hover:bg-slate-800 transition-all overflow-hidden relative">
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
                                <Truck className="h-7 w-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 italic">Total Supplier</p>
                                <p className="text-3xl font-black italic tracking-tighter text-white">{suppliers.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Total Deposit Mengendap */}
                    <div className="bg-slate-900/50 p-8 rounded-[32px] border border-emerald-500/20 shadow-2xl backdrop-blur-xl group hover:bg-slate-800 transition-all overflow-hidden relative">
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 text-emerald-400">
                                <ArrowUpRight className="h-7 w-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1 italic">Total Saldo Deposit</p>
                                <p className="text-2xl font-black italic tracking-tighter text-emerald-400">Rp {totalDeposit.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl"></div>
                    </div>

                    {/* Card 3: Total Hutang Tempo */}
                    <div className="bg-slate-900/50 p-8 rounded-[32px] border border-rose-500/20 shadow-2xl backdrop-blur-xl group hover:bg-slate-800 transition-all overflow-hidden relative">
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="h-14 w-14 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/30 text-rose-400">
                                <ArrowDownRight className="h-7 w-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-1 italic">Total Hutang Tempo</p>
                                <p className="text-2xl font-black italic tracking-tighter text-rose-400">Rp {totalHutang.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-rose-500/10 blur-2xl"></div>
                    </div>

                    {/* Card 4: Total Piutang Supplier */}
                    <div className="bg-slate-900/50 p-8 rounded-[32px] border border-amber-500/20 shadow-2xl backdrop-blur-xl group hover:bg-slate-800 transition-all overflow-hidden relative">
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/30 text-amber-400">
                                <Receipt className="h-7 w-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-1 italic">Piutang Angsuran</p>
                                <p className="text-2xl font-black italic tracking-tighter text-amber-300">Rp {totalPiutang.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-amber-500/10 blur-2xl"></div>
                    </div>
                </div>

                {/* TABLE CARD */}
                <div className="rounded-[40px] border border-white/5 bg-slate-900/50 shadow-2xl overflow-hidden mb-20 backdrop-blur-xl">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 border-b border-white/5 p-8 bg-slate-950/30">
                        <div className="relative w-full lg:w-[450px] group">
                            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors z-10" />
                            <input
                                type="text"
                                placeholder="CARI NAMA, PIC, ATAU KATEGORI..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 pl-12 pr-6 text-[10px] font-black text-white focus:border-amber-500/50 outline-none transition-all italic tracking-widest uppercase placeholder:text-slate-800 shadow-inner"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="px-5 py-2 rounded-full bg-white/5 border border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest italic flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div> DATA TERSINKRONISASI
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-950/50">
                                <tr>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 italic">Nama Supplier</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 italic">Kategori</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 italic">Ringkasan Finansial</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 italic">Penanggung Jawab</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 italic">Kontak</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 text-center italic">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse border-b border-white/5">
                                            <td colSpan={6} className="px-8 py-8">
                                                <div className="h-10 bg-white/5 rounded-2xl"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredSuppliers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-32 text-center text-slate-600 uppercase tracking-[0.2em] font-black italic text-xs">
                                            <div className="flex flex-col items-center gap-8">
                                                <div className="h-20 w-20 rounded-[32px] bg-slate-950 border border-white/5 flex items-center justify-center text-slate-800">
                                                    <Truck className="h-10 w-10" />
                                                </div>
                                                Belum ada data supplier
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSuppliers.map((supplier) => (
                                        <tr key={supplier.id} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="px-8 py-8">
                                                <div className="flex items-center gap-5">
                                                    <div className="h-14 w-14 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center text-amber-500 font-black text-xs group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-500 transition-all duration-500 shadow-inner group-hover:shadow-amber-500/50">
                                                        {supplier.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black italic text-white leading-none uppercase tracking-tighter group-hover:text-amber-500 transition-colors text-glow-sm">{supplier.name}</p>
                                                        <p className="text-[9px] font-black text-slate-600 mt-2 uppercase tracking-[0.1em] italic max-w-xs truncate group-hover:text-slate-400">
                                                            {supplier.address || "ALAMAT BELUM DIISI"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-8">
                                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 text-amber-500 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border border-amber-500/20 italic">
                                                    <Tag className="h-3 w-3 stroke-[2.5px]" />
                                                    {supplier.category || "UNCLASSIFIED"}
                                                </div>
                                            </td>
                                            {/* FINANCIAL SUMMARY COLUMN */}
                                            <td className="px-8 py-8">
                                                <div className="flex flex-col gap-1.5 min-w-[180px]">
                                                    {Number(supplier.depositBalance) > 0 && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                                            <ArrowUpRight size={13} /> DP: Rp {Number(supplier.depositBalance).toLocaleString()}
                                                        </span>
                                                    )}
                                                    {Number(supplier.payableBalance) > 0 && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                                                            <ArrowDownRight size={13} /> Hutang: Rp {Number(supplier.payableBalance).toLocaleString()}
                                                        </span>
                                                    )}
                                                    {Number(supplier.receivableBalance) > 0 && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                                                            <Receipt size={13} /> Piutang: Rp {Number(supplier.receivableBalance).toLocaleString()}
                                                        </span>
                                                    )}
                                                    {!Number(supplier.depositBalance) && !Number(supplier.payableBalance) && !Number(supplier.receivableBalance) && (
                                                        <span className="text-[10px] text-slate-600 font-bold italic">Nihil / Lunas</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-8">
                                                <div className="flex items-center gap-3 text-[10px] font-black italic text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">
                                                    <User className="h-3.5 w-3.5 text-amber-500 stroke-[2.5px]" />
                                                    {supplier.contactPerson || "BELUM ADA PIC"}
                                                </div>
                                            </td>
                                            <td className="px-8 py-8">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest italic group-hover:text-emerald-400 transition-colors">
                                                        <Phone className="h-3 w-3 text-emerald-500 stroke-[2.5px]" />
                                                        {supplier.phone || "No. HP belum diisi"}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest italic group-hover:text-indigo-400 transition-colors">
                                                        <Mail className="h-3 w-3 text-indigo-400 stroke-[2.5px]" />
                                                        {supplier.email || "Email belum diisi"}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-8 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* KELOLA FINANSIAL BUTTON */}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedFinancialSupplier(supplier);
                                                            setIsFinancialModalOpen(true);
                                                        }}
                                                        className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition-all flex items-center gap-1.5 text-xs font-bold"
                                                        title="Kelola Finansial, Deposit, Hutang & Angsuran"
                                                    >
                                                        <Wallet size={15} />
                                                        <span className="hidden xl:inline">Buku Finansial</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setEditingSupplier(supplier);
                                                            setIsAddModalOpen(true);
                                                        }}
                                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-950 border border-white/5 text-slate-600 hover:text-white hover:bg-slate-800 transition-all"
                                                        title="Edit Data Supplier"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(supplier.id)}
                                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-950 border border-white/5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                        title="Hapus Supplier"
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

            <SupplierFinancialModal
                isOpen={isFinancialModalOpen}
                onClose={() => {
                    setIsFinancialModalOpen(false);
                    setSelectedFinancialSupplier(null);
                }}
                supplier={selectedFinancialSupplier}
                onSuccess={fetchSuppliers}
            />
        </DashboardLayout>
    );
}

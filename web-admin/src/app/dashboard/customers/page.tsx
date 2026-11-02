'use client';

import { useState, useEffect, useMemo } from "react";
import { 
    Users, Search, Plus, Filter, 
    Edit, Trash2, History, Phone, Mail, 
    CreditCard, Star, ChevronRight, ChevronLeft,
    ArrowUpDown, ArrowUp, ArrowDown, Briefcase, 
    Award, UserCheck, Sparkles
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";
import AddCustomerModal from "@/components/customers/AddCustomerModal";
import CustomerHistoryModal from "@/components/customers/CustomerHistoryModal";

type CategoryFilter = 'ALL' | 'MEMBER' | 'EMPLOYEE' | 'REGULAR';
type SortField = 'name' | 'category' | 'totalSpent' | 'points' | 'lastPurchaseDate';
type SortOrder = 'asc' | 'desc';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
    const [showInactiveOnly, setShowInactiveOnly] = useState(false);
    
    // Sorting state
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<any>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<any>(null);

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

    // Helper to identify customer type
    const getCustomerCategory = (c: any): 'EMPLOYEE' | 'MEMBER' | 'REGULAR' => {
        const isEmployee = Boolean(
            c.name?.includes('(Karyawan)') || 
            (c.phone && String(c.phone).startsWith('EMP-'))
        );
        if (isEmployee) return 'EMPLOYEE';
        if (c.isMember) return 'MEMBER';
        return 'REGULAR';
    };

    // Category Counts
    const counts = useMemo(() => {
        let memberCount = 0;
        let employeeCount = 0;
        let regularCount = 0;
        let inactiveCount = 0;
        const now = new Date().getTime();

        customers.forEach(c => {
            const cat = getCustomerCategory(c);
            if (cat === 'EMPLOYEE') employeeCount++;
            else if (cat === 'MEMBER') memberCount++;
            else regularCount++;

            if (!c.lastPurchaseDate) {
                inactiveCount++;
            } else {
                const daysSince = (now - new Date(c.lastPurchaseDate).getTime()) / (1000 * 3600 * 24);
                if (daysSince > 30) inactiveCount++;
            }
        });

        return {
            all: customers.length,
            member: memberCount,
            employee: employeeCount,
            regular: regularCount,
            inactive: inactiveCount
        };
    }, [customers]);

    // Handle column header sort toggle
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder(field === 'totalSpent' || field === 'points' || field === 'lastPurchaseDate' ? 'desc' : 'asc');
        }
        setCurrentPage(1);
    };

    // Filtered & Sorted Customers
    const processedCustomers = useMemo(() => {
        // 1. Filter
        let result = customers.filter(c => {
            const matchesSearch = 
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.phone && c.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));

            if (!matchesSearch) return false;

            const category = getCustomerCategory(c);
            if (selectedCategory === 'MEMBER' && category !== 'MEMBER') return false;
            if (selectedCategory === 'EMPLOYEE' && category !== 'EMPLOYEE') return false;
            if (selectedCategory === 'REGULAR' && category !== 'REGULAR') return false;

            if (showInactiveOnly) {
                if (!c.lastPurchaseDate) return true;
                const daysSince = (new Date().getTime() - new Date(c.lastPurchaseDate).getTime()) / (1000 * 3600 * 24);
                return daysSince > 30;
            }

            return true;
        });

        // 2. Sort
        result.sort((a, b) => {
            let comp = 0;
            if (sortField === 'name') {
                comp = a.name.localeCompare(b.name, 'id');
            } else if (sortField === 'category') {
                const catWeight = { EMPLOYEE: 3, MEMBER: 2, REGULAR: 1 };
                comp = catWeight[getCustomerCategory(a)] - catWeight[getCustomerCategory(b)];
            } else if (sortField === 'totalSpent') {
                comp = (Number(a.totalSpent) || 0) - (Number(b.totalSpent) || 0);
            } else if (sortField === 'points') {
                comp = (Number(a.points) || 0) - (Number(b.points) || 0);
            } else if (sortField === 'lastPurchaseDate') {
                const dateA = a.lastPurchaseDate ? new Date(a.lastPurchaseDate).getTime() : 0;
                const dateB = b.lastPurchaseDate ? new Date(b.lastPurchaseDate).getTime() : 0;
                comp = dateA - dateB;
            }
            return sortOrder === 'asc' ? comp : -comp;
        });

        return result;
    }, [customers, searchQuery, selectedCategory, showInactiveOnly, sortField, sortOrder]);

    // Pagination calculations
    const totalPages = Math.ceil(processedCustomers.length / itemsPerPage) || 1;
    const paginatedCustomers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processedCustomers.slice(start, start + itemsPerPage);
    }, [processedCustomers, currentPage, itemsPerPage]);

    // Render Sort Icon Helper
    const renderSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return <ArrowUpDown className="h-3.5 w-3.5 text-slate-600 opacity-60 group-hover:opacity-100 transition-opacity" />;
        }
        return sortOrder === 'asc' 
            ? <ArrowUp className="h-3.5 w-3.5 text-indigo-400" />
            : <ArrowDown className="h-3.5 w-3.5 text-indigo-400" />;
    };

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Users className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase">Data Pelanggan & Member</h1>
                                <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Database keanggotaan, loyalitas poin, dan klasifikasi pelanggan</p>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => {
                            setEditingCustomer(null);
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30 active:scale-95 transition-all"
                    >
                        <Plus className="h-4 w-4" /> Tambah Pelanggan Baru
                    </button>
                </div>

                {/* Stats Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-black">
                    {/* Total Pelanggan */}
                    <div 
                        onClick={() => { setSelectedCategory('ALL'); setShowInactiveOnly(false); setCurrentPage(1); }}
                        className={`p-5 rounded-3xl border transition-all cursor-pointer ${selectedCategory === 'ALL' && !showInactiveOnly ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'bg-slate-900/50 border-slate-700/80 hover:bg-slate-800'}`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Semua Pelanggan</p>
                                <p className="text-2xl text-white mt-1">{counts.all}</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                <Users className="h-5 w-5 text-indigo-400" />
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-indigo-400 mt-3 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Total terdaftar dalam sistem
                        </p>
                    </div>

                    {/* Member Aktif */}
                    <div 
                        onClick={() => { setSelectedCategory('MEMBER'); setShowInactiveOnly(false); setCurrentPage(1); }}
                        className={`p-5 rounded-3xl border transition-all cursor-pointer ${selectedCategory === 'MEMBER' ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'bg-slate-900/50 border-slate-700/80 hover:bg-slate-800'}`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-emerald-400 uppercase tracking-widest">Member Umum</p>
                                <p className="text-2xl text-white mt-1">{counts.member}</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                <Star className="h-5 w-5 text-emerald-400 fill-emerald-400/30" />
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-emerald-400 mt-3 flex items-center gap-1">
                            <UserCheck className="h-3 w-3" /> Memiliki status member aktif
                        </p>
                    </div>

                    {/* Karyawan */}
                    <div 
                        onClick={() => { setSelectedCategory('EMPLOYEE'); setShowInactiveOnly(false); setCurrentPage(1); }}
                        className={`p-5 rounded-3xl border transition-all cursor-pointer ${selectedCategory === 'EMPLOYEE' ? 'bg-purple-950/40 border-purple-500/50 shadow-lg shadow-purple-500/10' : 'bg-slate-900/50 border-slate-700/80 hover:bg-slate-800'}`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-purple-400 uppercase tracking-widest">Karyawan (Internal)</p>
                                <p className="text-2xl text-white mt-1">{counts.employee}</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                <Briefcase className="h-5 w-5 text-purple-400" />
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-purple-400 mt-3 flex items-center gap-1">
                            <Award className="h-3 w-3" /> Diskon & Poin member berlaku
                        </p>
                    </div>

                    {/* Total Loyalty Points */}
                    <div className="bg-slate-900/50 p-5 rounded-3xl border border-slate-700/80 hover:bg-slate-800 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-amber-400 uppercase tracking-widest">Loyalty Points (Total)</p>
                                <p className="text-2xl text-white mt-1">
                                    {customers.reduce((sum, c) => sum + (Number(c.points) || 0), 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">Pts</span>
                                </p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                <CreditCard className="h-5 w-5 text-amber-400" />
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-amber-400 mt-3 flex items-center gap-1">
                            Rp {customers.reduce((sum, c) => sum + (Number(c.totalSpent) || 0), 0).toLocaleString()} Total Belanja
                        </p>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-slate-900/50 rounded-[32px] border border-slate-700/80 shadow-sm overflow-hidden">
                    {/* Controls: Search, Category Filters, Sorting */}
                    <div className="p-6 border-b border-slate-800 space-y-4">
                        {/* Search & Inactive Toggle */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <input
                                    type="text"
                                    placeholder="Cari nama, email, atau no. telepon..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-2xl text-sm font-bold text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                                />
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                            </div>

                            {/* Sort Selector & Inactive Toggle */}
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Quick Sort Dropdown */}
                                <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 px-3 py-2 rounded-xl text-xs font-bold text-slate-300">
                                    <span className="text-slate-500 text-[10px] uppercase tracking-wider">Urutkan:</span>
                                    <select
                                        value={`${sortField}-${sortOrder}`}
                                        onChange={(e) => {
                                            const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                                            setSortField(field);
                                            setSortOrder(order);
                                            setCurrentPage(1);
                                        }}
                                        className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
                                    >
                                        <option value="name-asc" className="bg-slate-900">Nama (A - Z)</option>
                                        <option value="name-desc" className="bg-slate-900">Nama (Z - A)</option>
                                        <option value="category-desc" className="bg-slate-900">Kategori (Karyawan &gt; Member)</option>
                                        <option value="points-desc" className="bg-slate-900">Poin (Terbanyak)</option>
                                        <option value="points-asc" className="bg-slate-900">Poin (Tersedikit)</option>
                                        <option value="totalSpent-desc" className="bg-slate-900">Total Belanja (Tertinggi)</option>
                                        <option value="totalSpent-asc" className="bg-slate-900">Total Belanja (Terendah)</option>
                                        <option value="lastPurchaseDate-desc" className="bg-slate-900">Terakhir Belanja (Terbaru)</option>
                                        <option value="lastPurchaseDate-asc" className="bg-slate-900">Terakhir Belanja (Terlama)</option>
                                    </select>
                                </div>

                                {/* Pasif > 30 Hari Toggle */}
                                <button 
                                    onClick={() => { setShowInactiveOnly(!showInactiveOnly); setCurrentPage(1); }}
                                    className={`px-3 py-2.5 rounded-xl transition-all font-bold text-xs flex items-center gap-2 ${showInactiveOnly ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}
                                >
                                    <History className="h-4 w-4" />
                                    <span>Pasif &gt; 30 Hari</span>
                                    <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px]">{counts.inactive}</span>
                                </button>
                            </div>
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-1">Kategori:</span>

                            <button
                                onClick={() => { setSelectedCategory('ALL'); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${selectedCategory === 'ALL' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/60'}`}
                            >
                                <Users className="h-3.5 w-3.5" />
                                <span>Semua</span>
                                <span className="ml-1 px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-bold">{counts.all}</span>
                            </button>

                            <button
                                onClick={() => { setSelectedCategory('MEMBER'); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${selectedCategory === 'MEMBER' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/60'}`}
                            >
                                <Star className="h-3.5 w-3.5 fill-current" />
                                <span>Member</span>
                                <span className="ml-1 px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-bold">{counts.member}</span>
                            </button>

                            <button
                                onClick={() => { setSelectedCategory('EMPLOYEE'); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${selectedCategory === 'EMPLOYEE' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/60'}`}
                            >
                                <Briefcase className="h-3.5 w-3.5" />
                                <span>Karyawan</span>
                                <span className="ml-1 px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-bold">{counts.employee}</span>
                            </button>

                            <button
                                onClick={() => { setSelectedCategory('REGULAR'); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${selectedCategory === 'REGULAR' ? 'bg-slate-700 text-white shadow-md' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/60'}`}
                            >
                                <span>Reguler</span>
                                <span className="ml-1 px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-bold">{counts.regular}</span>
                            </button>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900/60">
                                    {/* Kolom Pelanggan */}
                                    <th 
                                        onClick={() => handleSort('name')}
                                        className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 cursor-pointer select-none group hover:text-white transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>Pelanggan</span>
                                            {renderSortIcon('name')}
                                        </div>
                                    </th>

                                    {/* Kolom Kategori */}
                                    <th 
                                        onClick={() => handleSort('category')}
                                        className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 cursor-pointer select-none group hover:text-white transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>Kategori</span>
                                            {renderSortIcon('category')}
                                        </div>
                                    </th>

                                    {/* Kolom Kontak */}
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800">
                                        Kontak
                                    </th>

                                    {/* Kolom Total Belanja */}
                                    <th 
                                        onClick={() => handleSort('totalSpent')}
                                        className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 text-right cursor-pointer select-none group hover:text-white transition-colors"
                                    >
                                        <div className="flex items-center justify-end gap-2">
                                            <span>Total Belanja</span>
                                            {renderSortIcon('totalSpent')}
                                        </div>
                                    </th>

                                    {/* Kolom Poin */}
                                    <th 
                                        onClick={() => handleSort('points')}
                                        className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 text-right cursor-pointer select-none group hover:text-white transition-colors"
                                    >
                                        <div className="flex items-center justify-end gap-2">
                                            <span>Poin</span>
                                            {renderSortIcon('points')}
                                        </div>
                                    </th>

                                    {/* Kolom Terakhir Belanja */}
                                    <th 
                                        onClick={() => handleSort('lastPurchaseDate')}
                                        className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 text-right cursor-pointer select-none group hover:text-white transition-colors"
                                    >
                                        <div className="flex items-center justify-end gap-2">
                                            <span>Terakhir Belanja</span>
                                            {renderSortIcon('lastPurchaseDate')}
                                        </div>
                                    </th>

                                    {/* Kolom Aksi */}
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 text-center">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={7} className="px-6 py-4">
                                                <div className="h-10 bg-slate-800/60 rounded-xl"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : paginatedCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center space-y-3">
                                            <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-500">
                                                <Users className="h-8 w-8" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                                Tidak ada data pelanggan yang cocok dengan filter
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedCustomers.map((customer) => {
                                        const category = getCustomerCategory(customer);
                                        return (
                                            <tr key={customer.id} className="hover:bg-slate-800/50 transition-colors group">
                                                {/* Pelanggan */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                                                            category === 'EMPLOYEE'
                                                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                                : category === 'MEMBER'
                                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                                        }`}>
                                                            {customer.name ? customer.name.substring(0, 2).toUpperCase() : '??'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-black text-white leading-none truncate max-w-[220px]">
                                                                {customer.name}
                                                            </p>
                                                            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase truncate max-w-[200px]">
                                                                {customer.address || "Tidak ada alamat"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Kategori Badge */}
                                                <td className="px-6 py-4">
                                                    {category === 'EMPLOYEE' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm">
                                                            <Briefcase className="h-3 w-3" />
                                                            KARYAWAN
                                                        </span>
                                                    ) : category === 'MEMBER' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm">
                                                            <Star className="h-3 w-3 fill-emerald-400" />
                                                            MEMBER
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-800 text-slate-400 border border-slate-700">
                                                            REGULER
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Kontak */}
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                                                            <Phone className="h-3 w-3 text-indigo-400" />
                                                            <span>{customer.phone || "-"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                            <Mail className="h-3 w-3" />
                                                            <span className="truncate max-w-[180px]">{customer.email || "-"}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Total Belanja */}
                                                <td className="px-6 py-4 text-right">
                                                    <p className="text-sm font-black text-white italic">
                                                        Rp {(Number(customer.totalSpent) || 0).toLocaleString('id-ID')}
                                                    </p>
                                                    {customer.totalOrders > 0 && (
                                                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                                                            {customer.totalOrders} Transaksi
                                                        </p>
                                                    )}
                                                </td>

                                                {/* Poin */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-black shadow-sm">
                                                        <Star className="h-3 w-3 fill-amber-400" />
                                                        <span>{(Number(customer.points) || 0).toLocaleString('id-ID')}</span>
                                                    </div>
                                                </td>

                                                {/* Terakhir Belanja */}
                                                <td className="px-6 py-4 text-right">
                                                    {customer.lastPurchaseDate ? (
                                                        <div>
                                                            <p className="text-xs font-black text-white">
                                                                {new Date(customer.lastPurchaseDate).toLocaleDateString('id-ID', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    year: 'numeric'
                                                                })}
                                                            </p>
                                                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">
                                                                {Math.floor((new Date().getTime() - new Date(customer.lastPurchaseDate).getTime()) / (1000 * 3600 * 24))} hari lalu
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] font-bold text-slate-500 italic">Belum Pernah</p>
                                                    )}
                                                </td>

                                                {/* Aksi */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingCustomer(customer);
                                                                setIsAddModalOpen(true);
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700"
                                                            title="Edit Pelanggan"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedHistoryCustomer(customer);
                                                                setIsHistoryModalOpen(true);
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-emerald-400 transition-colors rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700"
                                                            title="Riwayat Belanja"
                                                        >
                                                            <History className="h-4 w-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(customer.id)}
                                                            className="p-2 text-slate-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700"
                                                            title="Hapus Pelanggan"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Footer */}
                    <div className="p-6 bg-slate-900/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-400">
                        <div className="flex items-center gap-3">
                            <p>
                                Menampilkan {processedCustomers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, processedCustomers.length)} dari {processedCustomers.length} Pelanggan
                            </p>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
                            >
                                <option value={15}>15 / hal</option>
                                <option value={25}>25 / hal</option>
                                <option value={50}>50 / hal</option>
                                <option value={100}>100 / hal</option>
                            </select>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                
                                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                                    let pageNum = currentPage;
                                    if (totalPages <= 5) {
                                        pageNum = idx + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = idx + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + idx;
                                    } else {
                                        pageNum = currentPage - 2 + idx;
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`h-8 w-8 rounded-xl font-black text-xs transition-colors ${
                                                currentPage === pageNum 
                                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                                                    : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AddCustomerModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onSuccess={fetchCustomers}
                editData={editingCustomer}
            />

            <CustomerHistoryModal 
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                customer={selectedHistoryCustomer}
            />
        </DashboardLayout>
    );
}
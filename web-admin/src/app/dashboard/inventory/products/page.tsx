'use client';

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Plus, Search, Filter, MoreVertical, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, Edit3, Trash2, Box, Info, TrendingUp, ScanLine, MapPin, Edit2, Tag, ChefHat, Building2, CheckCircle2, Truck } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import AddProductModal from "@/components/inventory/AddProductModal";
import StockAdjustModal from "@/components/inventory/StockAdjustModal";
import ProductionModal from "@/components/inventory/ProductionModal";
import CategoryModal from "@/components/inventory/CategoryModal";
import WarehouseModal from "@/components/inventory/WarehouseModal";
import StockTransferModal from "@/components/inventory/StockTransferModal";

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedType, setSelectedType] = useState<string>("all");
    const [categories, setCategories] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all");
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventory/products', {
                params: {
                    branchId: selectedBranchId,
                    warehouseId: selectedWarehouseId
                }
            });
            setProducts(res.data);
        } catch (error) {
            console.error("Gagal mengambil data produk", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await api.get('/branches');
            setBranches(res.data);
        } catch (error) {
            console.error("Gagal mengambil data cabang", error);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const res = await api.get('/inventory/warehouses');
            setWarehouses(res.data);
        } catch (error) {
            console.error("Gagal mengambil data gudang", error);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await api.get('/pos/categories');
            setCategories(res.data);
        } catch (error) {
            console.error("Gagal mengambil kategori", error);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [selectedBranchId, selectedWarehouseId]);

    useEffect(() => {
        fetchCategories();
        fetchBranches();
        fetchWarehouses();
    }, []);

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = selectedCategory === "all" || p.categoryId?.toString() === selectedCategory;
        const matchesType = selectedType === "all" || p.type === selectedType;
        
        return matchesSearch && matchesCategory && matchesType;
    });

    const handleAdjustStock = (product: any) => {
        setSelectedProduct(product);
        setIsAdjustModalOpen(true);
    };

    const handleEditProduct = (product: any) => {
        setSelectedProduct(product);
        setIsAddModalOpen(true);
    };
    const handleDeleteProduct = async (id: number, name: string) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus produk "${name}"? Seluruh riwayat stok dan resep terkait juga akan dihapus.`)) {
            return;
        }

        try {
            await api.delete(`/inventory/products/${id}`);
            toast.success("Produk berhasil dihapus");
            fetchProducts();
        } catch (error: any) {
            console.error("Gagal menghapus produk", error);
            toast.error("Gagal menghapus produk: " + error.response?.data?.error || error.message);
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-2xl shadow-indigo-500/10">
                        <Box className="h-7 w-7 text-indigo-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">Produk & Stok</h1>
                        <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase mt-2 italic">Sistem Kontrol Inventaris & Katalog Real-time</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => setIsWarehouseModalOpen(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-3.5 text-[10px] font-black text-slate-400 hover:bg-slate-800 hover:text-white transition-all uppercase tracking-widest italic"
                    >
                        <MapPin className="h-4 w-4" /> Lokasi
                    </button>
                    <button 
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-3.5 text-[10px] font-black text-slate-400 hover:bg-slate-800 hover:text-white transition-all uppercase tracking-widest italic"
                    >
                        <Tag className="h-4 w-4" /> Kategori
                    </button>
                    <button 
                        onClick={() => {
                            setSelectedProduct(null);
                            setIsTransferModalOpen(true);
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-3.5 text-[10px] font-black text-indigo-400/80 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all uppercase tracking-widest italic"
                    >
                        <Truck className="h-4 w-4" /> Mutasi Stok
                    </button>
                    <button 
                        onClick={() => {
                            setSelectedProduct(null);
                            setIsAddModalOpen(true);
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/20 active:scale-95 transition-all border border-indigo-400/20 italic"
                    >
                        <Plus className="h-4 w-4 stroke-[3px]" /> Product Baru
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-slate-900/50 p-8 rounded-[32px] border border-slate-700/50 shadow-2xl backdrop-blur-xl group hover:border-indigo-500/30 transition-all">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                            <Box className="h-7 w-7 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total SKU</p>
                            <p className="text-3xl font-black italic tracking-tighter text-white">{products.length} <span className="text-slate-700 text-xl">Items</span></p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 p-8 rounded-[32px] border border-slate-700/50 shadow-2xl backdrop-blur-xl group hover:border-red-500/30 transition-all">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform">
                            <AlertTriangle className="h-7 w-7 text-red-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Low Stock Warning</p>
                            <p className="text-3xl font-black italic tracking-tighter text-red-500">
                                {products.filter(p => p.trackStock && p.stock <= p.minStock).length} <span className="text-slate-700 text-xl uppercase">Critical</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-amber-600 p-8 rounded-[32px] border border-amber-400/20 shadow-2xl shadow-amber-500/20 group hover:scale-[1.02] transition-all overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
                        <TrendingUp className="h-32 w-32 text-white" />
                    </div>
                    <div className="relative z-10 flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30">
                            <TrendingUp className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-1">Inventory Valuation</p>
                            <p className="text-3xl font-black italic tracking-tighter text-white">
                                Rp {products.reduce((sum, p) => sum + (p.stock * (p.recipeCogs > 0 ? p.recipeCogs : p.costPrice)), 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-[40px] border border-slate-700 shadow-2xl bg-slate-900/50 backdrop-blur-xl overflow-hidden mb-12">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 border-b border-slate-800/50 p-8 bg-slate-950/20">
                    <div className="relative w-full lg:w-[450px] group flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Cari SKU atau nama produk..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-3.5 pl-12 pr-4 text-sm text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all outline-none placeholder:text-slate-700 shadow-inner font-bold"
                            />
                        </div>
                        <button 
                            className="h-12 w-12 flex items-center justify-center rounded-xl bg-slate-800 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-xl"
                            title="Scan Barcode untuk Cari"
                            onClick={() => alert("Barcode Scanner Ready!")}
                        >
                            <ScanLine className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                         <div className="relative group min-w-[160px]">
                            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 pointer-events-none z-10" />
                            <select 
                                className="w-full appearance-none rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-10 py-3 text-[10px] font-black text-slate-400 hover:bg-slate-800 transition-all shadow-inner outline-none focus:border-indigo-500 uppercase tracking-widest italic"
                                value={selectedBranchId}
                                onChange={(e) => {
                                    setSelectedBranchId(e.target.value);
                                    setSelectedWarehouseId("all");
                                }}
                            >
                                <option value="all">SEMUA CABANG</option>
                                <option value="null">KANTOR PUSAT</option>
                                {branches.map((b: any) => (
                                    <option key={b.id} value={b.id.toString()}>{b.name.toUpperCase()}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-700 font-bold text-[8px]">▼</div>
                        </div>

                        <div className="relative group min-w-[160px]">
                            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 pointer-events-none z-10" />
                            <select 
                                className="w-full appearance-none rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-10 py-3 text-[10px] font-black text-slate-400 hover:bg-slate-800 transition-all shadow-inner outline-none focus:border-indigo-500 uppercase tracking-widest italic"
                                value={selectedWarehouseId}
                                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                            >
                                <option value="all">SEMUA GUDANG</option>
                                {warehouses
                                    .filter(w => selectedBranchId === "all" || (selectedBranchId === "null" ? w.branchId === null : w.branchId === Number(selectedBranchId)))
                                    .map((w: any) => (
                                        <option key={w.id} value={w.id.toString()}>{w.name.toUpperCase()}</option>
                                    ))
                                }
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-700 font-bold text-[8px]">▼</div>
                        </div>

                        <select 
                            className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-3 text-[10px] font-black text-slate-400 hover:bg-slate-800 transition-all shadow-inner outline-none focus:border-indigo-500 uppercase tracking-widest italic"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">FILTER KATEGORI</option>
                            {categories.map((cat: any) => (
                                <option key={cat.id} value={cat.id.toString()}>{cat.name.toUpperCase()}</option>
                            ))}
                        </select>
                        <select 
                            className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-3 text-[10px] font-black text-slate-400 hover:bg-slate-800 transition-all shadow-inner outline-none focus:border-indigo-500 uppercase tracking-widest italic"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                        >
                            <option value="all">SEMUA TIPE</option>
                            <option value="FINISHED_GOOD">PRODUCTS / MENU</option>
                            <option value="WIP">SETENGAH JADI (WIP)</option>
                            <option value="RAW_MATERIAL">BAHAN BAKU (RAW)</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="bg-[#050505]">
                                <th className="px-4 py-5 font-black uppercase tracking-[0.2em] text-[10px] border-b border-slate-800 text-slate-500 italic min-w-[250px]">Identitas & Deskripsi</th>
                                <th className="px-4 py-5 font-black uppercase tracking-[0.2em] text-[10px] border-b border-slate-800 text-slate-500 italic">Global SKU</th>
                                <th className="px-4 py-5 font-black uppercase tracking-[0.2em] text-[10px] border-b border-slate-800 text-slate-500 italic text-right">CAPEX / HPP</th>
                                <th className="px-4 py-5 font-black uppercase tracking-[0.2em] text-[10px] border-b border-slate-800 text-slate-500 italic text-center">POS</th>
                                <th className="px-4 py-5 font-black uppercase tracking-[0.2em] text-[10px] border-b border-slate-800 text-slate-500 italic text-right">Market Price</th>
                                <th className="px-4 py-5 font-black uppercase tracking-[0.2em] text-[10px] border-b border-slate-800 text-slate-500 italic text-center">Margin</th>
                                <th className="px-4 py-5 font-black uppercase tracking-[0.2em] text-[10px] border-b border-slate-800 text-slate-500 italic text-center">Stock Level</th>
                                <th className="px-4 py-5 font-black uppercase tracking-[0.2em] text-[10px] border-b border-slate-800 text-amber-500 italic text-right bg-amber-500/5 min-w-[120px]">Total Nilai</th>
                                <th className="px-4 py-5 font-black uppercase tracking-[0.2em] text-[10px] border-b border-slate-800 text-slate-500 italic text-center">Integrity</th>
                                <th className="px-4 py-5 font-black uppercase tracking-[0.2em] text-[10px] border-b border-slate-800 text-slate-500 italic text-right">Menu</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 transition-all">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="px-6 py-4"><div className="h-10 w-full rounded bg-slate-50"></div></td>
                                    </tr>
                                ))
                            ) : filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-4 py-6">
                                            <div className="flex items-center gap-5">
                                                <div className="h-14 w-14 flex-shrink-0 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                    <Package className="h-6 w-6 text-indigo-500" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <p className="font-black text-sm italic text-white uppercase tracking-tighter leading-none">{product.name}</p>
                                                        {product.type === 'WIP' && (
                                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 italic">
                                                                WIP
                                                            </span>
                                                        )}
                                                        {product.type === 'RAW_MATERIAL' && (
                                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-slate-800 text-slate-500 border border-white/5 italic">
                                                                RAW
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {product.category && (
                                                            <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 italic tracking-widest">
                                                                {product.category.name}
                                                            </span>
                                                        )}
                                                        <p className="text-[10px] text-slate-600 font-bold truncate max-w-[200px] uppercase tracking-widest italic">{product.description || 'GENERIC ITEM DATA'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 font-mono text-[11px] text-slate-600 font-black italic tracking-widest">{product.sku || '-----------'}</td>
                                        <td className="px-4 py-6 text-right">
                                            <div className="flex flex-col items-end">
                                                 <span className="text-xs font-black text-slate-500 italic tracking-tighter">
                                                    { (product.recipeCogs > 0 || product.costPrice > 0) ? `Rp ${(product.recipeCogs > 0 ? product.recipeCogs : product.costPrice).toLocaleString('id-ID')}` : 'N/A' }
                                                 </span>
                                                {product.recipeCogs > 0 && (
                                                    <span className="text-[8px] text-amber-500 flex items-center gap-1 font-black uppercase tracking-[0.2em] mt-1 italic">
                                                        <ChefHat className="h-3 w-3" /> Formula-Base
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            {product.showInPos ? (
                                                <div className="h-2 w-2 rounded-full bg-indigo-500 mx-auto shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                            ) : (
                                                <div className="h-2 w-2 rounded-full bg-slate-800 mx-auto" />
                                            )}
                                        </td>
                                        <td className="px-6 py-6 text-right font-black text-white italic tracking-tighter text-sm uppercase">Rp {product.price.toLocaleString('id-ID')}</td>
                                        <td className="px-4 py-6 text-center">
                                            {(() => {
                                                const hpp = product.recipeCogs > 0 ? product.recipeCogs : product.costPrice;
                                                if (product.price <= 0 || hpp <= 0) return <span className="text-slate-800 font-black text-[10px]">--</span>;
                                                const margin = ((product.price - hpp) / product.price) * 100;
                                                return (
                                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg italic tracking-widest ${margin > 30 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : margin > 15 ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                        {margin.toFixed(0)}%
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            {product.trackStock ? (
                                                <div className="flex flex-col items-center group/tooltip relative text-center">
                                                     <span className={`text-lg font-black italic tracking-tighter ${product.stock <= 0 ? 'text-red-500' : product.stock <= product.minStock ? 'text-amber-500' : 'text-white'}`}>
                                                        {(() => {
                                                            const qty = product.stock;
                                                            const unit = product.unit;
                                                            if (unit === 'Gram' && Math.abs(qty) >= 1000) {
                                                                return (
                                                                    <>
                                                                        {(qty / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} <span className="text-[9px] not-italic text-amber-500 font-black uppercase tracking-widest ml-1">Kg</span>
                                                                    </>
                                                                );
                                                            }
                                                            if (unit === 'ml' && Math.abs(qty) >= 1000) {
                                                                return (
                                                                    <>
                                                                        {(qty / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} <span className="text-[9px] not-italic text-amber-500 font-black uppercase tracking-widest ml-1">Liter</span>
                                                                    </>
                                                                );
                                                            }
                                                            return (
                                                                <>
                                                                    {qty.toLocaleString('id-ID')} <span className="text-[9px] not-italic text-slate-600 font-black uppercase tracking-widest ml-1">{unit}</span>
                                                                </>
                                                            );
                                                        })()}
                                                     </span>
                                                    {product.stock < 0 && (
                                                        <span className="text-[7px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-lg font-black uppercase mt-2 tracking-widest border border-red-500/20 animate-pulse">
                                                            SYNC ERR
                                                        </span>
                                                    )}
                                                    {product.stock === 0 && (
                                                        <span className="text-[7px] bg-white/5 text-slate-600 px-2 py-0.5 rounded-lg font-black uppercase mt-2 tracking-widest border border-white/5 italic">
                                                            DEPLETED
                                                        </span>
                                                    )}
                                                    {product.WarehouseStock && product.WarehouseStock.length > 0 && (
                                                        <>
                                                            <div className="text-[8px] text-slate-600 font-black uppercase tracking-[0.2em] flex items-center gap-1 justify-center mt-2 italic hover:text-indigo-400 transition-colors cursor-help">
                                                                <MapPin className="h-2 w-2" /> LOC: {product.WarehouseStock.length}
                                                            </div>
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 hidden group-hover/tooltip:block z-20 w-56 bg-[#050505] text-white p-5 rounded-[24px] shadow-2xl animate-in fade-in zoom-in duration-300 border border-white/10 backdrop-blur-3xl">
                                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5 pb-3 mb-4 text-center italic text-indigo-400 text-glow">Warehouse Matrix</p>
                                                                <div className="space-y-3">
                                                                    {product.WarehouseStock.map((ws: any) => (
                                                                        <div key={ws.warehouseId} className="flex justify-between items-center text-[10px]">
                                                                            <span className="text-slate-500 font-black uppercase tracking-widest truncate pr-3 italic">{ws.warehouse.name}</span>
                                                                            <span className="font-black text-white italic tracking-tighter">
                                                                                {(() => {
                                                                                    const qty = ws.quantity;
                                                                                    const unit = product.unit;
                                                                                    if (unit === 'Gram' && Math.abs(qty) >= 1000) {
                                                                                        return `${(qty / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} Kg`;
                                                                                    }
                                                                                    if (unit === 'ml' && Math.abs(qty) >= 1000) {
                                                                                        return `${(qty / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} L`;
                                                                                    }
                                                                                    return `${qty.toLocaleString('id-ID')} ${unit}`;
                                                                                })()}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#050505]"></div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-black uppercase text-slate-700 italic tracking-[0.2em] block text-center">
                                                    ON-DEMAND
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-6 text-right bg-amber-500/5">
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-black text-amber-500 italic tracking-tighter">
                                                    Rp {((product.stock || 0) * (product.recipeCogs > 0 ? product.recipeCogs : product.costPrice)).toLocaleString('id-ID')}
                                                </span>
                                                <span className="text-[7px] text-slate-500 uppercase font-black tracking-widest mt-1">Asset Value</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            {!product.trackStock ? (
                                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest italic border-b border-indigo-500/20 pb-1">MTO SYSTEM</span>
                                            ) : product.stock <= product.minStock ? (
                                                <div className="flex items-center justify-center gap-2 text-red-500 animate-pulse">
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest italic">CRITICAL</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2 text-emerald-500/50">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest italic">HEALTHY</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-6 text-right relative">
                                            <div className="flex items-center justify-end">
                                                <button 
                                                    onClick={() => setOpenMenuId(openMenuId === product.id ? null : product.id)}
                                                    className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all border ${openMenuId === product.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
                                                >
                                                    <MoreVertical className="h-5 w-5" />
                                                </button>

                                                {openMenuId === product.id && (
                                                    <>
                                                        <div 
                                                            className="fixed inset-0 z-30" 
                                                            onClick={() => setOpenMenuId(null)}
                                                        ></div>
                                                        <div className="absolute right-6 top-12 z-40 w-64 bg-[#050505] rounded-[24px] shadow-2xl border border-white/10 py-3 animate-in fade-in zoom-in duration-300 overflow-hidden backdrop-blur-3xl">
                                                            <p className="px-5 py-3 text-[9px] font-black uppercase text-slate-600 tracking-[0.3em] border-b border-white/5 mb-2 italic">Product Operations</p>
                                                            <button 
                                                                onClick={() => {
                                                                    handleEditProduct(product);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full px-5 py-3 text-left text-[10px] font-black text-slate-400 hover:bg-white/5 hover:text-white uppercase tracking-widest flex items-center gap-3 transition-all italic"
                                                            >
                                                                <Edit2 className="h-4 w-4 text-indigo-500" /> Profil Produk
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    handleAdjustStock(product);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full px-5 py-3 text-left text-[10px] font-black text-slate-400 hover:bg-white/5 hover:text-white uppercase tracking-widest flex items-center gap-3 transition-all italic"
                                                            >
                                                                <Edit3 className="h-4 w-4 text-amber-500" /> Koreksi Stok (Opname)
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedProduct(product);
                                                                    setIsTransferModalOpen(true);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full px-5 py-3 text-left text-[10px] font-black text-slate-400 hover:bg-white/5 hover:text-white uppercase tracking-widest flex items-center gap-3 transition-all italic"
                                                            >
                                                                <Truck className="h-4 w-4 text-indigo-400" /> Mutasi Stok
                                                            </button>

                                                            {(product.type === 'FINISHED_GOOD' || product.type === 'WIP') && (
                                                                <button 
                                                                    onClick={() => {
                                                                        if (!product.Recipes || product.Recipes.length === 0) {
                                                                            toast.error("Atur BOM resep terlebih dahulu!");
                                                                            return;
                                                                        }
                                                                        setSelectedProduct(product);
                                                                        setIsProductionModalOpen(true);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full px-5 py-3 text-left text-[10px] font-black text-slate-400 hover:bg-white/5 hover:text-white uppercase tracking-widest flex items-center gap-3 transition-all italic"
                                                                >
                                                                    <ChefHat className="h-4 w-4 text-emerald-500" /> Execute Batch
                                                                </button>
                                                            )}
                                                            <div className="h-px bg-white/5 my-2 mx-5"></div>
                                                            <button 
                                                                onClick={() => {
                                                                    handleDeleteProduct(product.id, product.name);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full px-5 py-3 text-left text-[10px] font-black text-red-900 hover:bg-red-500/10 hover:text-red-500 flex items-center gap-3 transition-all uppercase tracking-widest italic"
                                                            >
                                                                <Trash2 className="h-4 w-4" /> Terminate SKU
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="rounded-full bg-slate-50 p-6"><Package className="h-10 w-10 text-slate-200" /></div>
                                            <p className="text-sm font-bold text-slate-400 italic">Belum ada produk yang terdaftar.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 border-t border-slate-200 italic">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <p>© 2026 aivola.id - Smart Inventory Management</p>
                    <span className="h-4 w-[1px] bg-slate-200"></span>
                    <p>SKU Integrity Verified</p>
                </div>
                <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                    <div className="h-3 w-3 rounded-full bg-slate-200"></div>
                </div>
            </div>

            {/* Modals */}
            <AddProductModal 
                isOpen={isAddModalOpen} 
                onClose={() => {
                    setIsAddModalOpen(false);
                    setSelectedProduct(null);
                }} 
                onSuccess={fetchProducts} 
                product={selectedProduct}
            />

            <StockAdjustModal 
                isOpen={isAdjustModalOpen}
                onClose={() => {
                    setIsAdjustModalOpen(false);
                    setSelectedProduct(null);
                }}
                onSuccess={fetchProducts}
                product={selectedProduct}
            />


            <CategoryModal 
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onSuccess={fetchProducts}
            />

            <WarehouseModal
                isOpen={isWarehouseModalOpen}
                onClose={() => setIsWarehouseModalOpen(false)}
                onSuccess={fetchProducts}
            />

            <ProductionModal
                isOpen={isProductionModalOpen}
                onClose={() => {
                    setIsProductionModalOpen(false);
                    setSelectedProduct(null);
                }}
                onSuccess={fetchProducts}
                product={selectedProduct}
            />

            <StockTransferModal
                isOpen={isTransferModalOpen}
                onClose={() => {
                    setIsTransferModalOpen(false);
                    setSelectedProduct(null);
                }}
                onSuccess={fetchProducts}
                product={selectedProduct}
            />
        </DashboardLayout>
    );
}

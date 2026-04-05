'use client';

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Plus, Search, Filter, MoreVertical, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, Edit3, Trash2, Box, Info, TrendingUp, ScanLine, MapPin, Edit2, Tag, ChefHat, Building2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import AddProductModal from "@/components/inventory/AddProductModal";
import StockAdjustModal from "@/components/inventory/StockAdjustModal";
import CategoryModal from "@/components/inventory/CategoryModal";
import WarehouseModal from "@/components/inventory/WarehouseModal";

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
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
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Produk & Stok
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 font-medium">Kelola katalog barang dan pantau ketersediaan stok secara real-time.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsWarehouseModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                        <MapPin className="h-4 w-4" /> Kelola Lokasi
                    </button>
                    <button 
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                        <Tag className="h-4 w-4" /> Kelola Kategori
                    </button>
                    <button 
                        onClick={() => {
                            setSelectedProduct(null);
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-100 hover:bg-orange-700 active:scale-95 transition-all"
                    >
                        <Plus className="h-4 w-4" /> Tambah Produk Baru
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-white">
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Produk</p>
                        <p className="text-3xl font-black italic">{products.length} Items</p>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-xl "><Box className="h-6 w-6 text-orange-400" /></div>
                </div>
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Stok Menipis</p>
                        <p className="text-3xl font-black italic text-red-400">{products.filter(p => p.trackStock && p.stock <= p.minStock).length}</p>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-xl "><AlertTriangle className="h-6 w-6 text-red-400" /></div>
                </div>
                <div className="rounded-2xl bg-orange-600 p-6 shadow-xl shadow-orange-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">Nilai Inventori</p>
                        <p className="text-3xl font-black italic">Rp {products.reduce((sum, p) => sum + (p.stock * (p.recipeCogs > 0 ? p.recipeCogs : p.costPrice)), 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl "><TrendingUp className="h-6 w-6 text-white" /></div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-12">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 p-6">
                    <div className="relative w-full sm:w-96 group flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Cari SKU atau nama produk..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all font-medium"
                            />
                        </div>
                        <button 
                            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-all"
                            title="Scan Barcode untuk Cari"
                            onClick={() => alert("Barcode Scanner Siap! (Simulasi)")}
                        >
                            <ScanLine className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="relative group">
                            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 pointer-events-none z-10" />
                            <select 
                                className="appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm outline-none focus:border-orange-500"
                                value={selectedBranchId}
                                onChange={(e) => {
                                    setSelectedBranchId(e.target.value);
                                    setSelectedWarehouseId("all");
                                }}
                            >
                                <option value="all">Semua Cabang</option>
                                <option value="null">Kantor Pusat</option>
                                {branches.map((b: any) => (
                                    <option key={b.id} value={b.id.toString()}>{b.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold text-[10px]">▼</div>
                        </div>

                        <div className="relative group">
                            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 pointer-events-none z-10" />
                            <select 
                                className="appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm outline-none focus:border-orange-500"
                                value={selectedWarehouseId}
                                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                            >
                                <option value="all">Semua Gudang</option>
                                {warehouses
                                    .filter(w => selectedBranchId === "all" || (selectedBranchId === "null" ? w.branchId === null : w.branchId === Number(selectedBranchId)))
                                    .map((w: any) => (
                                        <option key={w.id} value={w.id.toString()}>{w.name}</option>
                                    ))
                                }
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold text-[10px]">▼</div>
                        </div>

                        <select 
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm outline-none focus:border-orange-500"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">Semua Kategori</option>
                            {categories.map((cat: any) => (
                                <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                            ))}
                        </select>
                        <select 
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm outline-none focus:border-orange-500"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                        >
                            <option value="all">Semua Tipe</option>
                            <option value="FINISHED_GOOD">Produk Jadi / Menu</option>
                            <option value="WIP">Setengah Jadi (WIP)</option>
                            <option value="RAW_MATERIAL">Bahan Baku</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr className="border-b border-slate-100">
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Info Produk</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">SKU</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Harga Beli</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-center">POS</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Harga Jual</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-center">% Margin</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-center">Sisa Stok</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-center">Status</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="px-6 py-4"><div className="h-10 w-full rounded bg-slate-50"></div></td>
                                    </tr>
                                ))
                            ) : filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-orange-100 flex items-center justify-center">
                                                    <Package className="h-5 w-5 text-orange-600" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-slate-900 line-clamp-1">{product.name}</p>
                                                        {product.type === 'WIP' && (
                                                            <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                                                                WIP
                                                            </span>
                                                        )}
                                                        {product.type === 'RAW_MATERIAL' && (
                                                            <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                                BAHAN
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {product.category && (
                                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
                                                                {product.category.name}
                                                            </span>
                                                        )}
                                                        <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{product.description || 'Tidak ada deskripsi'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[11px] text-slate-500 font-bold">{product.sku || '-'}</td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-500 italic">
                                            <div className="flex flex-col items-end">
                                                 <span>{ (product.recipeCogs > 0 || product.costPrice > 0) ? `Rp ${(product.recipeCogs > 0 ? product.recipeCogs : product.costPrice).toLocaleString()}` : <span className="text-slate-300">Belum diatur</span> }</span>
                                                {product.recipeCogs > 0 && (
                                                    <span className="text-[10px] text-orange-500 flex items-center gap-0.5 font-bold uppercase tracking-tighter not-italic">
                                                        <ChefHat className="h-3 w-3" /> Resep
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {product.showInPos ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-600 border border-blue-100 uppercase tracking-tighter">
                                                    Aktif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[9px] font-black text-slate-400 border border-slate-100 uppercase tracking-tighter">
                                                    OFF
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-slate-900">Rp {product.price.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            {(() => {
                                                const hpp = product.recipeCogs > 0 ? product.recipeCogs : product.costPrice;
                                                if (product.price <= 0 || hpp <= 0) return <span className="text-slate-300">-</span>;
                                                const margin = ((product.price - hpp) / product.price) * 100;
                                                return (
                                                    <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${margin > 20 ? 'bg-emerald-100 text-emerald-700' : margin > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                        {margin.toFixed(1)}%
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {product.trackStock ? (
                                                <div className="flex flex-col items-center group/tooltip relative text-center">
                                                     <span className={`text-lg font-black italic ${product.stock <= 0 ? 'text-red-600' : product.stock <= product.minStock ? 'text-orange-500' : 'text-slate-900'}`}>
                                                        <span className="text-sm not-italic opacity-50 mr-1">Sisa:</span> {product.stock} <span className="text-[10px] not-italic text-slate-400 font-bold uppercase">{product.unit}</span>
                                                     </span>
                                                    {product.stock < 0 && (
                                                        <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-black uppercase mt-1 animate-pulse">
                                                            Out of Sync
                                                        </span>
                                                    )}
                                                    {product.stock === 0 && (
                                                        <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-black uppercase mt-1">
                                                            Habis
                                                        </span>
                                                    )}
                                                    {product.WarehouseStock && product.WarehouseStock.length > 0 && (
                                                        <>
                                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter flex items-center gap-0.5 justify-center mt-1">
                                                                <MapPin className="h-2 w-2" /> {product.WarehouseStock.length} Lokasi
                                                            </div>
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block z-20 w-48 bg-slate-900 text-white p-3 rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200">
                                                                <p className="text-[10px] font-black uppercase tracking-widest border-b border-white/10 pb-1.5 mb-2 text-center">Rincian Gudang</p>
                                                                <div className="space-y-1.5">
                                                                    {product.WarehouseStock.map((ws: any) => (
                                                                        <div key={ws.warehouseId} className="flex justify-between items-center text-[10px]">
                                                                            <span className="text-slate-400 truncate pr-2">{ws.warehouse.name}</span>
                                                                            <span className="font-bold text-white">{ws.quantity} {product.unit}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase text-slate-300 italic tracking-widest">
                                                    MTO (Sesuai Pesanan)
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {!product.trackStock ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-600 border border-blue-100 uppercase tracking-tighter">
                                                    Made to Order
                                                </span>
                                            ) : product.stock <= product.minStock ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                                                    <AlertTriangle className="h-3 w-3" /> Stok Rendah
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
                                                    Aman
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right relative">
                                            <div className="flex items-center justify-end">
                                                <button 
                                                    onClick={() => setOpenMenuId(openMenuId === product.id ? null : product.id)}
                                                    className={`p-2 rounded-lg transition-all hover:bg-slate-100 ${openMenuId === product.id ? 'bg-slate-100 text-orange-600' : 'text-slate-400'}`}
                                                >
                                                    <MoreVertical className="h-5 w-5" />
                                                </button>

                                                {openMenuId === product.id && (
                                                    <>
                                                        <div 
                                                            className="fixed inset-0 z-30" 
                                                            onClick={() => setOpenMenuId(null)}
                                                        ></div>
                                                        <div className="absolute right-6 top-12 z-40 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 animate-in fade-in zoom-in duration-200 overflow-hidden">
                                                            <p className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 mb-1">Menu Aksi</p>
                                                            <button 
                                                                onClick={() => {
                                                                    handleEditProduct(product);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                                                            >
                                                                <Edit2 className="h-4 w-4" /> Edit Info
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    handleAdjustStock(product);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-3 transition-colors"
                                                            >
                                                                <Edit3 className="h-4 w-4" /> Sesuaikan Stok
                                                            </button>
                                                            <div className="h-px bg-slate-50 my-1"></div>
                                                            <button 
                                                                onClick={() => {
                                                                    handleDeleteProduct(product.id, product.name);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" /> Hapus Produk
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
        </DashboardLayout>
    );
}

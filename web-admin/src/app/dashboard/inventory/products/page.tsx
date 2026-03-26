'use client';

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Plus, Search, Filter, MoreVertical, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, Edit3, Trash2, Box, Info, TrendingUp, ScanLine, MapPin, Edit2 } from "lucide-react";
import api from "@/lib/api";
import AddProductModal from "@/components/inventory/AddProductModal";
import StockAdjustModal from "@/components/inventory/StockAdjustModal";

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventory/products');
            setProducts(res.data);
        } catch (error) {
            console.error("Gagal mengambil data produk", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAdjustStock = (product: any) => {
        setSelectedProduct(product);
        setIsAdjustModalOpen(true);
    };

    const handleEditProduct = (product: any) => {
        setSelectedProduct(product);
        setIsAddModalOpen(true);
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
                        <p className="text-3xl font-black italic text-red-400">{products.filter(p => p.stock <= p.minStock).length}</p>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-xl "><AlertTriangle className="h-6 w-6 text-red-400" /></div>
                </div>
                <div className="rounded-2xl bg-orange-600 p-6 shadow-xl shadow-orange-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">Nilai Inventori</p>
                        <p className="text-3xl font-black italic">Rp {products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0).toLocaleString()}</p>
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
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                            <Filter className="h-4 w-4" /> Semua Kategori
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr className="border-b border-slate-100">
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Info Produk</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">SKU</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-center">Satuan</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Harga Beli</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Harga Jual</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-center">Stok</th>
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
                                                    <p className="font-bold text-slate-900">{product.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{product.description || 'Tidak ada deskripsi'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[11px] text-slate-500 font-bold">{product.sku || '-'}</td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-600 uppercase text-[11px] tracking-tight">{product.unit || 'Pcs'}</td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-500 italic">Rp {product.costPrice.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-black text-slate-900">Rp {product.price.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center group/tooltip relative">
                                                <span className={`text-lg font-black italic ${product.stock <= product.minStock ? 'text-red-600' : 'text-slate-900'}`}>
                                                    {product.stock}
                                                </span>
                                                {product.WarehouseStock && product.WarehouseStock.length > 0 && (
                                                    <>
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter flex items-center gap-0.5">
                                                            <MapPin className="h-2 w-2" /> {product.WarehouseStock.length} Lokasi
                                                        </div>
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block z-20 w-48 bg-slate-900 text-white p-3 rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200">
                                                            <p className="text-[10px] font-black uppercase tracking-widest border-b border-white/10 pb-1.5 mb-2">Rincian Gudang</p>
                                                            <div className="space-y-1.5">
                                                                {product.WarehouseStock.map((ws: any) => (
                                                                    <div key={ws.warehouseId} className="flex justify-between items-center text-[10px]">
                                                                        <span className="text-slate-400 truncate pr-2">{ws.warehouse.name}</span>
                                                                        <span className="font-bold text-white">{ws.stock} {product.unit}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {product.stock <= product.minStock ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                                                    <AlertTriangle className="h-3 w-3" /> Stok Rendah
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
                                                    Aman
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleEditProduct(product)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100 shadow-sm"
                                                    title="Edit Info Produk"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleAdjustStock(product)}
                                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-orange-100 shadow-sm"
                                                    title="Sesuaikan Stok"
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </button>
                                                <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100">
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
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
            
            {selectedProduct && isAdjustModalOpen && (
                <StockAdjustModal 
                    product={selectedProduct}
                    isOpen={isAdjustModalOpen}
                    onClose={() => {
                        setIsAdjustModalOpen(false);
                        setSelectedProduct(null);
                    }}
                    onSuccess={fetchProducts}
                />
            )}
        </DashboardLayout>
    );
}

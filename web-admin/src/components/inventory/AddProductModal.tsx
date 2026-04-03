'use client';

import { useState, useEffect } from "react";
import { X, Package, Tag, Box, AlertCircle, Layers, Plus, Trash2, ChefHat, ScanLine, MapPin } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function AddProductModal({ isOpen, onClose, onSuccess, product }: any) {
    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        categoryId: "",
        unit: "Pcs",
        description: "",
        minStock: 5,
        price: 0,
        costPrice: 0,
        warehouseId: "",
        stock: 0,
        showInPos: true,
        type: "FINISHED_GOOD",
        trackStock: true,
        priceGofood: 0,
        priceGrabfood: 0,
        priceShopeefood: 0
    });
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [hasRecipe, setHasRecipe] = useState(false);
    const [recipeItems, setRecipeItems] = useState<any[]>([]);
    const [productList, setProductList] = useState<any[]>([]);
    const [customizations, setCustomizations] = useState<any[]>([]);
    const [selectedCustomizations, setSelectedCustomizations] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
            fetchWarehouses();
            fetchCategories();
            fetchCustomizations();
            if (product) {
                setFormData({
                    name: product.name || "",
                    sku: product.sku || "",
                    categoryId: product.categoryId?.toString() || "",
                    unit: product.unit || "Pcs",
                    description: product.description || "",
                    minStock: product.minStock || 0,
                    price: product.price || 0,
                    costPrice: product.costPrice || 0,
                    warehouseId: "",
                    stock: product.stock || 0,
                    showInPos: product.showInPos !== undefined ? product.showInPos : true,
                    type: product.type || "FINISHED_GOOD",
                    trackStock: product.trackStock !== undefined ? product.trackStock : true,
                    priceGofood: product.priceGofood || 0,
                    priceGrabfood: product.priceGrabfood || 0,
                    priceShopeefood: product.priceShopeefood || 0
                });
                fetchRecipe(product.id);
                if (product.customizations) {
                    setSelectedCustomizations(product.customizations.map((c: any) => c.groupId));
                } else {
                    setSelectedCustomizations([]);
                }
            } else {
                setFormData({
                    name: "", sku: "", categoryId: "", unit: "Pcs", description: "", minStock: 5, price: 0, costPrice: 0, warehouseId: "", stock: 0, showInPos: true, type: "FINISHED_GOOD", trackStock: true, priceGofood: 0, priceGrabfood: 0, priceShopeefood: 0
                });
                setHasRecipe(false);
                setRecipeItems([]);
                setSelectedCustomizations([]);
            }
        }
    }, [isOpen, product]);

    const fetchRecipe = async (id: number) => {
        try {
            const res = await api.get(`/inventory/products/${id}/recipe`);
            if (res.data && res.data.length > 0) {
                setRecipeItems(res.data.map((r: any) => ({ 
                    materialId: r.materialId.toString(), 
                    quantity: r.quantity 
                })));
                setHasRecipe(true);
            }
        } catch (error) {
            console.error("Gagal mengambil resep", error);
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

    const fetchCustomizations = async () => {
        try {
            const res = await api.get('/pos/customizations');
            setCustomizations(res.data);
        } catch (error) {
            console.error("Gagal mengambil add-ons", error);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const res = await api.get('/inventory/warehouses');
            setWarehouses(res.data);
            if (!product && res.data.length > 0) {
                const main = res.data.find((w: any) => w.isMain) || res.data[0];
                setFormData(prev => ({ ...prev, warehouseId: main.id.toString() }));
            }
        } catch (error) {
            console.error("Gagal mengambil gudang", error);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await api.get('/inventory/products');
            setProductList(res.data);
        } catch (error) {
            console.error("Gagal mengambil produk", error);
        }
    };

    if (!isOpen) return null;

    const addRecipeItem = () => {
        setRecipeItems([...recipeItems, { materialId: "", quantity: 1 }]);
    };

    const removeRecipeItem = (index: number) => {
        setRecipeItems(recipeItems.filter((_, i) => i !== index));
    };

    const updateRecipeItem = (index: number, field: string, value: any) => {
        const newItems = [...recipeItems];
        newItems[index][field] = value;
        setRecipeItems(newItems);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = product 
                ? await api.patch(`/inventory/products/${product.id}`, formData)
                : await api.post('/inventory/products', formData);
            
            const productId = product ? product.id : res.data.productId;

            if (hasRecipe && recipeItems.length > 0) {
                await api.post(`/inventory/products/${productId}/recipe`, { items: recipeItems });
            }

            await api.patch(`/pos/products/${productId}/customizations`, { groupIds: selectedCustomizations });

            setFormData({
                name: "", sku: "", categoryId: "", unit: "Pcs", description: "", minStock: 5, price: 0, costPrice: 0, warehouseId: warehouses[0]?.id.toString() || "", stock: 0, showInPos: true, type: "FINISHED_GOOD", trackStock: true, priceGofood: 0, priceGrabfood: 0, priceShopeefood: 0
            });
            setHasRecipe(false);
            setRecipeItems([]);
            setSelectedCustomizations([]);
            onSuccess();
            onClose();
            toast.success(product ? "Produk diperbarui" : "Produk ditambahkan");
        } catch (error) {
            console.error("Gagal menyimpan produk", error);
            alert("Gagal menyimpan produk.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white border-b border-orange-500/30 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                            <Package className="h-6 w-6 text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic tracking-tight uppercase">
                                {product ? "Edit Produk" : "Registrasi Produk"}
                            </h2>
                            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Master Data Inventori</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto">
                    <div className="space-y-6">
                        {/* Section 1: Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Nama Produk</label>
                                <div className="relative group">
                                    <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                                    <input
                                        required
                                        type="text"
                                        placeholder="Contoh: Nasi Goreng Spesial"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-bold focus:border-orange-500 focus:bg-white focus:outline-none transition-all"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">SKU / Kode</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="PROD-001"
                                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold focus:border-orange-500 focus:bg-white focus:outline-none transition-all uppercase"
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => toast.success("Barcode Scanner Siap! (Simulasi: Silakan masukkan kode manual atau gunakan alat scan fisik)")}
                                        className="p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                        title="Scan Barcode"
                                    >
                                        <ScanLine className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Satuan</label>
                                <select
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold focus:border-orange-500 focus:bg-white focus:outline-none transition-all appearance-none cursor-pointer"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                >
                                    <option value="Pcs">Pcs</option>
                                    <option value="Porsi">Porsi</option>
                                    <option value="Box">Box</option>
                                    <option value="Kg">Kg</option>
                                    <option value="Gram">Gram</option>
                                    <option value="Liter">Liter</option>
                                    <option value="Pack">Pack</option>
                                    <option value="ml">ml</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Tipe Produk</label>
                                <select
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold focus:border-orange-500 focus:bg-white focus:outline-none transition-all appearance-none cursor-pointer text-blue-600 italic"
                                    value={formData.type}
                                    onChange={(e) => {
                                        const newType = e.target.value;
                                        const updates: any = { type: newType };
                                        if (newType === 'RAW_MATERIAL') {
                                            updates.showInPos = false;
                                            updates.price = 0;
                                        }
                                        setFormData({ ...formData, ...updates });
                                    }}
                                >
                                    <option value="FINISHED_GOOD">Produk Jadi / Menu</option>
                                    <option value="WIP">Setengah Jadi (WIP)</option>
                                    <option value="RAW_MATERIAL">Bahan Baku</option>
                                </select>
                            </div>
                            <div className="flex items-end pb-1 border-b border-slate-100 sm:border-none">
                                <label className={`flex items-center gap-3 cursor-pointer group w-full py-2 ${formData.type === 'RAW_MATERIAL' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={formData.showInPos}
                                            disabled={formData.type === 'RAW_MATERIAL'}
                                            onChange={(e) => setFormData({ ...formData, showInPos: e.target.checked })}
                                        />
                                        <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest group-hover:text-orange-600 transition-colors">Tampilkan di POS</span>
                                </label>
                            </div>
                            <div className="flex items-end pb-1 border-b border-slate-100 sm:border-none">
                                <label className="flex items-center gap-3 cursor-pointer group w-full py-2">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={formData.trackStock}
                                            onChange={(e) => setFormData({ ...formData, trackStock: e.target.checked })}
                                        />
                                        <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest group-hover:text-blue-600 transition-colors">Cek Stok di POS</span>
                                </label>
                            </div>
                            {formData.showInPos && formData.type !== 'RAW_MATERIAL' && (
                                <div className="col-span-2 mt-4 bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tersedia Kustomisasi (Add-ons)</h4>
                                        <a href="/dashboard/pos/customizations" target="_blank" className="text-[10px] font-black uppercase text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1">
                                            + Tambah Baru
                                        </a>
                                    </div>
                                    {customizations.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {customizations.map(c => (
                                                <label key={c.id} className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 p-2 rounded-lg hover:border-orange-300">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
                                                        checked={selectedCustomizations.includes(c.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedCustomizations([...selectedCustomizations, c.id]);
                                                            else setSelectedCustomizations(selectedCustomizations.filter(id => id !== c.id));
                                                        }}
                                                    />
                                                    <span className="text-xs font-bold text-slate-700">{c.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-white rounded-lg border border-dashed border-orange-200 text-center">
                                            <p className="text-[11px] font-bold text-slate-400 italic mb-1">Belum ada Add-ons yang tersimpan.</p>
                                            <a href="/dashboard/pos/customizations" target="_blank" className="text-[10px] font-black uppercase text-orange-600 hover:underline">
                                                ➔ Buat Add-ons Baru di sini
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                            {formData.type !== 'RAW_MATERIAL' && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Kategori POS</label>
                                    <select
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold focus:border-orange-500 focus:bg-white focus:outline-none transition-all appearance-none cursor-pointer text-orange-600"
                                        value={formData.categoryId}
                                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    >
                                        <option value="">-- Tanpa Kategori --</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id.toString()}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Harga Beli (Modal Rp)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold focus:border-indigo-500 focus:bg-white focus:outline-none transition-all text-indigo-600"
                                    value={formData.costPrice || ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, costPrice: val === "" ? 0 : parseFloat(val) });
                                    }}
                                />
                            </div>
                            {formData.type !== 'RAW_MATERIAL' && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Harga Jual POS (Rp)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold focus:border-orange-500 focus:bg-white focus:outline-none transition-all text-blue-600"
                                        value={formData.price || ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFormData({ ...formData, price: val === "" ? 0 : parseFloat(val) });
                                        }}
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Batas Stok Aman (Alert)</label>
                                <input
                                    type="number"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold focus:border-red-500 focus:bg-white focus:outline-none transition-all text-red-600"
                                    value={formData.minStock || ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, minStock: val === "" ? 0 : parseFloat(val) });
                                    }}
                                />
                            </div>
                        </div>

                        {/* Marketplace Prices Section */}
                        {formData.showInPos && formData.type !== 'RAW_MATERIAL' && (
                            <div className="bg-blue-50 -mx-8 px-8 py-6 border-y border-blue-100 italic">
                                <div className="flex items-center gap-2 mb-4">
                                    <Tag className="h-5 w-5 text-blue-600" />
                                    <h3 className="text-sm font-black uppercase text-slate-700 tracking-tight">Harga Marketplace (Online)</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">GoFood (Rp)</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm font-bold focus:border-blue-500 focus:outline-none transition-all text-blue-600"
                                            value={formData.priceGofood || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData({ ...formData, priceGofood: val === "" ? 0 : parseFloat(val) });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">GrabFood (Rp)</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm font-bold focus:border-blue-500 focus:outline-none transition-all text-blue-600"
                                            value={formData.priceGrabfood || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData({ ...formData, priceGrabfood: val === "" ? 0 : parseFloat(val) });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">ShopeeFood (Rp)</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm font-bold focus:border-blue-500 focus:outline-none transition-all text-blue-600"
                                            value={formData.priceShopeefood || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData({ ...formData, priceShopeefood: val === "" ? 0 : parseFloat(val) });
                                            }}
                                        />
                                    </div>
                                </div>
                                <p className="mt-3 text-[9px] text-blue-400 font-bold uppercase tracking-tight">* Kosongkan atau isi 0 jika ingin menggunakan harga dasar (Walk-in).</p>
                            </div>
                        )}

                        {/* Section 2: Initial Stock (Only for NEW Product) */}
                        {!product && (
                            <div className="bg-orange-50 -mx-8 px-8 py-6 border-y border-orange-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Box className="h-5 w-5 text-orange-600" />
                                    <h3 className="text-sm font-black uppercase text-slate-700 tracking-tight">Stok Awal & Lokasi</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Gudang Penyimpanan</label>
                                        <select
                                            required
                                            className="w-full rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm font-bold focus:border-orange-500 focus:outline-none transition-all appearance-none cursor-pointer"
                                            value={formData.warehouseId}
                                            onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                                        >
                                            <option value="">Pilih Gudang...</option>
                                            {warehouses.map((w) => (
                                                <option key={w.id} value={w.id.toString()}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Jumlah Stok Awal</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm font-bold focus:border-orange-500 focus:outline-none transition-all"
                                            value={formData.stock || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData({ ...formData, stock: val === "" ? 0 : parseFloat(val) || 0 });
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BOM / RECIPE SECTION */}
                        <div className="bg-slate-50 -mx-8 px-8 py-6 border-y border-slate-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <ChefHat className="h-5 w-5 text-indigo-600" />
                                    <h3 className="text-sm font-black uppercase text-slate-700 tracking-tight">Bill of Materials</h3>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={hasRecipe}
                                        onChange={(e) => setHasRecipe(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            {hasRecipe ? (
                                <div className="space-y-3">
                                    {recipeItems.map((item, index) => (
                                        <div key={index} className="flex gap-2 animate-in slide-in-from-left-2 duration-200">
                                            <select
                                                required
                                                className="flex-[3] rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all"
                                                value={item.materialId}
                                                onChange={(e) => updateRecipeItem(index, 'materialId', e.target.value)}
                                            >
                                                <option value="">Pilih Bahan Baku...</option>
                                                {productList.map((p) => (
                                                    <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                                                ))}
                                            </select>
                                            <input
                                                required
                                                type="number"
                                                placeholder="Qty"
                                                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all"
                                                value={isNaN(item.quantity) ? "" : item.quantity}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    updateRecipeItem(index, 'quantity', isNaN(val) ? 0 : val);
                                                }}
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => removeRecipeItem(index)}
                                                className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addRecipeItem}
                                        className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Tambah Bahan Baku
                                    </button>
                                </div>
                            ) : (
                                <p className="text-[10px] font-medium text-slate-400 italic">Aktifkan untuk membuat produk yang terdiri dari beberapa bahan baku (seperti menu makanan/minuman).</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Keterangan</label>
                            <textarea
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-bold focus:border-orange-500 focus:bg-white focus:outline-none transition-all h-20 resize-none"
                                placeholder="..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50"
                        >
                            {loading ? "Menyimpan..." : "Simpan Produk"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from "react";
import { X, Package, Tag, Box, AlertCircle, Layers, Plus, Trash2, ChefHat, ScanLine, MapPin, Save, Info, TrendingUp } from "lucide-react";
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

        // Sanitize numeric fields to ensure they are numbers, defaulting to 0 if blank
        const sanitizedData = {
            ...formData,
            price: Number(formData.price) || 0,
            costPrice: Number(formData.costPrice) || 0,
            minStock: Number(formData.minStock) || 0,
            stock: Number(formData.stock) || 0,
            priceGofood: Number(formData.priceGofood) || 0,
            priceGrabfood: Number(formData.priceGrabfood) || 0,
            priceShopeefood: Number(formData.priceShopeefood) || 0
        };

        try {
            const res = product 
                ? await api.patch(`/inventory/products/${product.id}`, sanitizedData)
                : await api.post('/inventory/products', sanitizedData);
            
            const productId = product ? product.id : res.data.productId;

            if (hasRecipe && recipeItems.length > 0) {
                // Ensure recipe quantities are also sanitized
                const sanitizedRecipe = recipeItems.map(item => ({
                    ...item,
                    quantity: Number(item.quantity) || 0
                }));
                await api.post(`/inventory/products/${productId}/recipe`, { items: sanitizedRecipe });
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
            <div className="glass w-full max-w-2xl rounded-[3rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-slate-950/50 border-b border-indigo-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <Package className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">
                                {product ? "Sync Product Dataset" : "Catalog Registration"}
                            </h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Global SKU & Lifecycle Management</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto flex-grow custom-scrollbar bg-slate-950/20">
                    <div className="space-y-6">
                        {/* Section 1: Basic Info */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Nama Produk / SKU Deskripsi</label>
                                <div className="relative group">
                                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        required
                                        type="text"
                                        placeholder="CONTOH: ESPRESSO BLEND 1KG"
                                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 pl-12 pr-4 text-sm font-bold text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-700 shadow-inner italic"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Global SKU ID</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="PROD-XXX-XXX"
                                        className="flex-1 rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-5 text-sm font-black text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-800 uppercase italic font-mono shadow-inner"
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => toast.success("Laser Scanner Active...")}
                                        className="h-12 w-12 flex items-center justify-center rounded-xl bg-slate-800 border border-white/5 text-slate-400 hover:text-white transition-all shadow-xl"
                                        title="Scan Barcode"
                                    >
                                        <ScanLine className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Inventory Unit</label>
                                <select
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-5 text-sm font-black text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all italic"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                >
                                    <option value="Pcs">PIECES (PCS)</option>
                                    <option value="Porsi">PORSI (PORTION)</option>
                                    <option value="Box">BOX / DUS</option>
                                    <option value="Carton">CARTON (KARTON)</option>
                                    <option value="Pack">PACK / BUNGKUS</option>
                                    <option value="Kg">KILOGRAM (KG)</option>
                                    <option value="Gram">GRAM (G)</option>
                                    <option value="Liter">LITER (L)</option>
                                    <option value="ml">MILLILITER (ML)</option>
                                    <option value="Tabung">TABUNG</option>
                                    <option value="Butir">BUTIR</option>
                                    <option value="Karung">KARUNG</option>
                                    <option value="Jerigen">JERIGEN</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Product Classification</label>
                                <select
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-5 text-sm font-black text-indigo-400 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all italic"
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
                                    <option value="FINISHED_GOOD">FINISHED GOODS / MENU</option>
                                    <option value="WIP">WORK IN PROGRESS (WIP)</option>
                                    <option value="RAW_MATERIAL">RAW MATERIAL / STOCK</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-6 py-4 px-1">
                                <label className={`flex items-center gap-4 cursor-pointer group ${formData.type === 'RAW_MATERIAL' ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={formData.showInPos}
                                            disabled={formData.type === 'RAW_MATERIAL'}
                                            onChange={(e) => setFormData({ ...formData, showInPos: e.target.checked })}
                                        />
                                        <div className="w-12 h-6 bg-slate-800 border border-white/5 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 after:shadow-lg"></div>
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic group-hover:text-indigo-400 transition-colors">POS VISIBILITY</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-6 py-4 px-1">
                                <label className="flex items-center gap-4 cursor-pointer group">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={formData.trackStock}
                                            onChange={(e) => setFormData({ ...formData, trackStock: e.target.checked })}
                                        />
                                        <div className="w-12 h-6 bg-slate-800 border border-white/5 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 after:shadow-lg"></div>
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic group-hover:text-indigo-400 transition-colors">REAL-TIME TRACKING</span>
                                </label>
                            </div>
                            {formData.showInPos && formData.type !== 'RAW_MATERIAL' && (
                                <div className="col-span-2 mt-2 bg-slate-950/50 p-6 rounded-[32px] border border-slate-800 shadow-inner">
                                    <div className="flex justify-between items-center mb-5">
                                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1 flex items-center gap-2">
                                            <Layers className="h-4 w-4 text-indigo-400" /> Catalog Add-ons & Customizations
                                        </h4>
                                        <a href="/dashboard/pos/customizations" target="_blank" className="text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 tracking-widest italic flex items-center gap-1">
                                            Manage Matrix ➔
                                        </a>
                                    </div>
                                    {customizations.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {customizations.map(c => (
                                                <label key={c.id} className={`flex items-center gap-3 cursor-pointer p-3 rounded-2xl border transition-all ${selectedCustomizations.includes(c.id) ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5' : 'bg-slate-900 border-white/5 hover:border-slate-700'}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded-lg bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500/20"
                                                        checked={selectedCustomizations.includes(c.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedCustomizations([...selectedCustomizations, c.id]);
                                                            else setSelectedCustomizations(selectedCustomizations.filter(id => id !== c.id));
                                                        }}
                                                    />
                                                    <span className={`text-[11px] font-black uppercase tracking-tighter italic ${selectedCustomizations.includes(c.id) ? 'text-indigo-400 text-glow' : 'text-slate-500'}`}>{c.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-10 bg-slate-900 rounded-[28px] border border-dashed border-slate-800 text-center">
                                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] italic mb-2">No active add-on groups found</p>
                                            <p className="text-[9px] font-bold text-slate-800 uppercase italic">Create customization groups to enable UPSYNC at the checkout terminal.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            {formData.type !== 'RAW_MATERIAL' && (
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Terminal Category</label>
                                    <select
                                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-5 text-sm font-black text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all italic text-glow"
                                        value={formData.categoryId}
                                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    >
                                        <option value="">-- NO POS CATEGORY --</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id.toString()}>{c.name.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Purchase Price (IDR)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-5 text-sm font-black text-indigo-400 focus:border-indigo-500/50 outline-none transition-all shadow-inner italic"
                                    value={formData.costPrice || ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, costPrice: val === "" ? 0 : parseFloat(val) });
                                    }}
                                />
                            </div>
                            {formData.type !== 'RAW_MATERIAL' && (
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Catalog Sell Price (IDR)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-5 text-sm font-black text-emerald-400 focus:border-emerald-500/50 outline-none transition-all italic shadow-inner"
                                        value={formData.price || ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFormData({ ...formData, price: val === "" ? 0 : parseFloat(val) });
                                        }}
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Stock Warning Level</label>
                                <input
                                    type="number"
                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 px-5 text-sm font-black text-red-500 focus:border-red-500/50 outline-none transition-all italic shadow-inner"
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
                            <div className="bg-indigo-500/5 -mx-8 px-8 py-8 border-y border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <TrendingUp className="h-24 w-24 text-indigo-500" />
                                </div>
                                <div className="flex items-center gap-3 mb-6 relative z-10">
                                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <Tag className="h-4 w-4 stroke-[2.5px]" />
                                    </div>
                                    <h3 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.3em] italic">Online Ecosystem Strategy</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-6 relative z-10">
                                    <div className="space-y-2">
                                        <label className="block text-[9px] font-black uppercase text-slate-600 tracking-widest italic ml-1">GoFood SKU Price</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-2xl bg-slate-900 border border-slate-800 py-3.5 px-5 text-sm font-black text-white focus:border-indigo-500/50 outline-none transition-all shadow-inner text-glow-sm"
                                            value={formData.priceGofood || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData({ ...formData, priceGofood: val === "" ? 0 : parseFloat(val) });
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[9px] font-black uppercase text-slate-600 tracking-widest italic ml-1">GrabFood SKU Price</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-2xl bg-slate-900 border border-slate-800 py-3.5 px-5 text-sm font-black text-white focus:border-indigo-500/50 outline-none transition-all shadow-inner text-glow-sm"
                                            value={formData.priceGrabfood || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData({ ...formData, priceGrabfood: val === "" ? 0 : parseFloat(val) });
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[9px] font-black uppercase text-slate-600 tracking-widest italic ml-1">Shopee SKU Price</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-2xl bg-slate-900 border border-slate-800 py-3.5 px-5 text-sm font-black text-white focus:border-indigo-500/50 outline-none transition-all shadow-inner text-glow-sm"
                                            value={formData.priceShopeefood || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData({ ...formData, priceShopeefood: val === "" ? 0 : parseFloat(val) });
                                            }}
                                        />
                                    </div>
                                </div>
                                <p className="mt-4 text-[9px] text-slate-700 font-bold uppercase tracking-[0.2em] italic flex items-center gap-2">
                                    <Info className="h-3 w-3" /> System will default to manual price if field is null (zero)
                                </p>
                            </div>
                        )}

                        {/* Section 2: Initial Stock (Only for NEW Product) */}
                        {!product && (
                            <div className="bg-emerald-500/5 -mx-8 px-8 py-8 border-y border-white/5">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                        <Box className="h-4 w-4 stroke-[2.5px]" />
                                    </div>
                                    <h3 className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.3em] italic">Stock Origin & Deployment</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-[9px] font-black uppercase text-slate-600 tracking-widest italic ml-1">Target Storage Facility</label>
                                        <select
                                            required
                                            className="w-full rounded-2xl bg-slate-900 border border-slate-800 py-3.5 px-5 text-sm font-black text-white focus:border-emerald-500/50 outline-none transition-all italic"
                                            value={formData.warehouseId}
                                            onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                                        >
                                            <option value="">SELECT FACILITY</option>
                                            {warehouses.map((w) => (
                                                <option key={w.id} value={w.id.toString()}>{w.name.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[9px] font-black uppercase text-slate-600 tracking-widest italic ml-1">Initial Quantity Injected</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-2xl bg-slate-900 border border-slate-800 py-3.5 px-5 text-sm font-black text-white focus:border-emerald-500/50 outline-none transition-all shadow-inner text-glow-sm"
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
                        <div className="bg-slate-900/50 -mx-8 px-8 py-8 border-y border-white/5 relative">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                        <ChefHat className="h-4 w-4 stroke-[2.5px]" />
                                    </div>
                                    <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-[0.3em] italic">Bill Of Materials (BOM)</h3>
                                </div>
                                <label className="flex items-center gap-4 cursor-pointer group">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={hasRecipe}
                                            onChange={(e) => setHasRecipe(e.target.checked)}
                                        />
                                        <div className="w-12 h-6 bg-slate-800 border border-white/5 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600 after:shadow-lg"></div>
                                    </div>
                                    <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest italic group-hover:text-amber-400 transition-colors">ENABLE RECIPE</span>
                                </label>
                            </div>                            {hasRecipe ? (
                                <div className="space-y-4">
                                    {recipeItems.map((item, index) => (
                                        <div key={index} className="flex gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                                            <div className="flex-[3] relative">
                                                <select
                                                    required
                                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3 px-5 text-[11px] font-black text-white focus:border-amber-500/50 outline-none transition-all italic text-glow-sm"
                                                    value={item.materialId}
                                                    onChange={(e) => updateRecipeItem(index, 'materialId', e.target.value)}
                                                >
                                                    <option value="">SELECT RAW MATERIAL...</option>
                                                    {productList.map((p) => (
                                                        <option key={p.id} value={p.id}>{p.name.toUpperCase()} ({p.unit.toUpperCase()})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    required
                                                    type="number"
                                                    placeholder="QTY"
                                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3 px-5 text-[11px] font-black text-white focus:border-amber-500/50 outline-none transition-all text-center italic"
                                                    value={isNaN(item.quantity) ? "" : item.quantity}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        updateRecipeItem(index, 'quantity', isNaN(val) ? 0 : val);
                                                    }}
                                                />
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => removeRecipeItem(index)}
                                                className="h-12 w-12 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all shrink-0 shadow-lg shadow-red-500/5"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addRecipeItem}
                                        className="w-full py-4 bg-slate-950 border border-dashed border-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] hover:text-amber-500 hover:border-amber-500/50 transition-all flex items-center justify-center gap-3 italic"
                                    >
                                        <Plus className="h-3 w-3" /> Insert Material Component
                                    </button>
                                </div>
                            ) : (
                                <div className="p-8 bg-slate-950/50 border border-dashed border-slate-800 rounded-[28px] text-center">
                                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] italic">Decomposition matrix disabled</p>
                                    <p className="text-[9px] font-bold text-slate-800 uppercase italic mt-1">Enable to calculate automated COGS based on recipe components.</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Internal Log / Field Notes</label>
                            <textarea
                                className="w-full rounded-[28px] bg-slate-950 border border-slate-800 py-4 px-6 text-sm font-bold text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all h-28 resize-none placeholder:text-slate-800 italic"
                                placeholder="ENTER TECHNICAL SPECIFICATIONS OR LOGISTICS NOTES..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mt-10 flex gap-4 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 text-[10px] font-black text-slate-500 bg-white/5 border border-white/5 hover:text-white hover:bg-white/10 rounded-2xl transition-all uppercase tracking-[0.2em] italic"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] flex items-center justify-center gap-3 py-4 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl disabled:opacity-50 transition-all shadow-2xl shadow-indigo-500/20 uppercase tracking-[0.2em] border border-white/10 italic"
                        >
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><Save className="h-4 w-4 stroke-[3px]" /> {product ? "Sync Product Dataset" : "Execute Catalog Entry"}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

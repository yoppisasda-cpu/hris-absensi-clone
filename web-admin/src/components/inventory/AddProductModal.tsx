'use client';

import { useState, useEffect } from "react";
import { X, Package, Tag, Box, AlertCircle, Layers, Plus, Trash2, ChefHat, ScanLine, MapPin, Save, Info, TrendingUp, Calculator } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import SearchableSelect from "../common/SearchableSelect";

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
        priceShopeefood: 0,
        recipeYield: 0
    });
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [hasRecipe, setHasRecipe] = useState(false);
    const [recipeItems, setRecipeItems] = useState<any[]>([]);
    const [productList, setProductList] = useState<any[]>([]);
    const [customizations, setCustomizations] = useState<any[]>([]);
    const [selectedCustomizations, setSelectedCustomizations] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCalc, setShowCalc] = useState(false);
    const [calcData, setCalcData] = useState({ total: 0, qty: 1000 });
    const [totalBatchCost, setTotalBatchCost] = useState(0);
    const [unitHpp, setUnitHpp] = useState(0);

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
                    priceShopeefood: product.priceShopeefood || 0,
                    recipeYield: product.recipeYield !== undefined ? product.recipeYield : 0
                });
                fetchRecipe(product.id);
                if (product.customizations) {
                    setSelectedCustomizations(product.customizations.map((c: any) => c.groupId));
                } else {
                    setSelectedCustomizations([]);
                }
            } else {
                setFormData({
                    name: "", sku: "", categoryId: "", unit: "Pcs", description: "", minStock: 5, price: 0, costPrice: 0, warehouseId: "", stock: 0, showInPos: true, type: "FINISHED_GOOD", trackStock: true, priceGofood: 0, priceGrabfood: 0, priceShopeefood: 0, recipeYield: 0
                });
                setHasRecipe(false);
                setRecipeItems([]);
                setSelectedCustomizations([]);
            }
        }
    }, [isOpen, product]);

    const fetchRecipe = async (id: number) => {
        let isMounted = true;
        try {
            const res = await api.get(`/inventory/products/${id}/recipe`);
            if (isMounted && res.data && res.data.length > 0) {
                setRecipeItems(res.data.map((r: any) => ({ 
                    materialId: r.materialId.toString(), 
                    quantity: r.quantity 
                })));
                setHasRecipe(true);
            }
        } catch (error) {
            console.error("Gagal mengambil resep", error);
        }
        return () => { isMounted = false; };
    };

    // Automatic HPP (COGS) Calculation from BOM
    useEffect(() => {
        if (hasRecipe && recipeItems.length > 0) {
            let totalMaterialCost = 0;
            recipeItems.forEach(item => {
                const material = productList.find(p => p.id.toString() === item.materialId.toString());
                if (material) {
                    const materialCost = material.costPrice || 0;
                    totalMaterialCost += materialCost * (Number(item.quantity) || 0);
                }
            });

            const yieldVal = Number(formData.recipeYield) || 1;
            const calculatedHpp = totalMaterialCost / yieldVal;
            
            setTotalBatchCost(totalMaterialCost);
            setUnitHpp(calculatedHpp);

            // Only update the main purchase price if it's different
            if (Math.abs(formData.costPrice - calculatedHpp) > 0.01) {
                setFormData(prev => ({ ...prev, costPrice: Number(calculatedHpp.toFixed(2)) }));
            }
        } else {
            setTotalBatchCost(0);
            setUnitHpp(0);
        }
    }, [recipeItems, formData.recipeYield, hasRecipe, productList]);

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

    const generateSuggestedSku = (type: string) => {
        if (!productList || productList.length === 0) {
            if (type === 'RAW_MATERIAL') return "DBS001";
            if (type === 'WIP') return "WIP001";
            return "RFS001";
        }

        // 1. Filter products of this specific type to find the dominant prefix
        const typeProducts = productList.filter((p: any) => p.type === type && p.sku);
        
        let prefix = "";
        let numberLength = 3;

        if (typeProducts.length > 0) {
            const prefixCounts: Record<string, number> = {};
            typeProducts.forEach((p: any) => {
                // Match pattern: (prefix)(trailing digits)
                const match = p.sku.toUpperCase().match(/^(.*?)(\d+)$/);
                if (match) {
                    const pfx = match[1];
                    prefixCounts[pfx] = (prefixCounts[pfx] || 0) + 1;
                }
            });

            // Find the most frequently used prefix for this classification
            let maxCount = 0;
            for (const pfx in prefixCounts) {
                if (prefixCounts[pfx] > maxCount) {
                    maxCount = prefixCounts[pfx];
                    prefix = pfx;
                }
            }
        }

        // 2. If no prefix detected for this type, use defaults
        if (!prefix) {
            if (type === 'RAW_MATERIAL') prefix = "DBS";
            else if (type === 'WIP') prefix = "WIP";
            else prefix = "RFS"; 
        }

        // 3. Find the highest number for this specific prefix in the ENTIRE product list
        let maxNum = -1;
        productList.forEach((p: any) => {
            if (!p.sku) return;
            const sku = p.sku.toUpperCase();
            if (sku.startsWith(prefix)) {
                const numPart = sku.substring(prefix.length);
                const digitsMatch = numPart.match(/^(\d+)/);
                if (digitsMatch) {
                    const numStr = digitsMatch[1];
                    const num = parseInt(numStr);
                    if (num > maxNum) {
                        maxNum = num;
                        numberLength = Math.max(numberLength, numStr.length);
                    }
                }
            }
        });

        // 4. Increment and format
        const nextNum = maxNum === -1 ? 1 : maxNum + 1;
        const nextNumStr = nextNum.toString().padStart(numberLength, '0');
        
        return `${prefix}${nextNumStr}`;
    };

    const handleTypeChange = (newType: string) => {
        const updates: any = { type: newType };
        if (newType === 'RAW_MATERIAL') {
            updates.showInPos = false;
            updates.price = 0;
        }

        if (!product) {
            const suggested = generateSuggestedSku(newType);
            if (suggested) {
                updates.sku = suggested;
            }
        }

        setFormData(prev => ({ ...prev, ...updates }));
    };

    useEffect(() => {
        if (isOpen && !product && productList.length > 0 && formData.sku === "") {
            const suggested = generateSuggestedSku(formData.type);
            setFormData(prev => ({ ...prev, sku: suggested }));
        }
    }, [isOpen, product, productList, formData.type]);

    if (!isOpen) return null;

    const addRecipeItem = () => {
        setRecipeItems([...recipeItems, { materialId: "", quantity: 0 }]);
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
            priceShopeefood: Number(formData.priceShopeefood) || 0,
            recipeYield: formData.recipeYield !== undefined ? Number(formData.recipeYield) : 0
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
            } else {
                // IMPORTANT: Clear the recipe if toggled off or empty
                await api.post(`/inventory/products/${productId}/recipe`, { items: [] });
            }

            await api.patch(`/pos/products/${productId}/customizations`, { groupIds: selectedCustomizations });

            setFormData({
                name: "", sku: "", categoryId: "", unit: "Pcs", description: "", minStock: 5, price: 0, costPrice: 0, warehouseId: warehouses[0]?.id.toString() || "", stock: 0, showInPos: true, type: "FINISHED_GOOD", trackStock: true, priceGofood: 0, priceGrabfood: 0, priceShopeefood: 0, recipeYield: 0
            });
            setHasRecipe(false);
            setRecipeItems([]);
            setSelectedCustomizations([]);
            onSuccess();
            onClose();
            toast.success(product ? "Produk diperbarui" : "Produk ditambahkan");
        } catch (error: any) {
            console.error("Gagal menyimpan produk", error);
            const errorMsg = error.response?.data?.error || error.message || "Gagal menyimpan produk.";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" />
            <div className="glass w-full max-w-2xl max-h-[90vh] rounded-[3rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
                <div className="bg-slate-950/50 border-b border-indigo-500/20 px-10 py-8 flex items-center justify-between shrink-0">
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
                                    onChange={(e) => handleTypeChange(e.target.value)}
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
                            <div className="space-y-2 relative group-calc">
                                <div className="flex justify-between items-center">
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1">Purchase Price (IDR)</label>
                                    <button 
                                        type="button"
                                        onClick={() => setShowCalc(!showCalc)}
                                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border transition-all ${showCalc ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-slate-800 text-slate-400 border-white/5 hover:text-indigo-400'}`}
                                    >
                                        Calculator
                                    </button>
                                </div>
                                
                                {showCalc && (
                                    <div className="absolute bottom-full mb-3 left-0 right-0 bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 shadow-2xl z-50 animate-in slide-in-from-bottom-2 duration-200">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="h-6 w-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                <Info className="h-3.5 w-3.5" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest italic">Unit Price Helper</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                placeholder="Total Price (e.g. 140000)"
                                                className="flex-[2] bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-[10px] font-bold text-white outline-none focus:border-indigo-500/50"
                                                value={calcData.total || ""}
                                                onChange={(e) => {
                                                    const total = parseFloat(e.target.value) || 0;
                                                    const result = total / (calcData.qty || 1);
                                                    setCalcData({ ...calcData, total });
                                                    setFormData({ ...formData, costPrice: Number(result.toFixed(2)) });
                                                }}
                                            />
                                            <span className="text-slate-600 font-black">/</span>
                                            <input 
                                                type="number" 
                                                placeholder="Qty (e.g. 1000)"
                                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-[10px] font-bold text-white outline-none focus:border-indigo-500/50"
                                                value={calcData.qty || ""}
                                                onChange={(e) => {
                                                    const qty = parseFloat(e.target.value) || 1;
                                                    const result = (calcData.total || 0) / qty;
                                                    setCalcData({ ...calcData, qty });
                                                    setFormData({ ...formData, costPrice: Number(result.toFixed(2)) });
                                                }}
                                            />
                                        </div>
                                        <p className="mt-3 text-[9px] text-slate-500 font-bold italic uppercase tracking-tighter">
                                            Result: <span className="text-emerald-400">Rp {formData.costPrice}</span> / {formData.unit}
                                        </p>
                                    </div>
                                )}

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
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="block text-[9px] font-black uppercase text-slate-600 tracking-widest italic">Purchase Price (IDR)</label>
                                            {hasRecipe && (
                                                <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 animate-pulse">
                                                    Calculated from BOM
                                                </span>
                                            )}
                                            {!hasRecipe && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCalc(!showCalc)}
                                                    className="bg-slate-800 hover:bg-slate-700 text-[8px] font-black uppercase text-slate-300 px-2.5 py-1 rounded-lg border border-white/5 transition-all shadow-lg"
                                                >
                                                    Calculator
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                readOnly={hasRecipe}
                                                className={`w-full rounded-2xl bg-slate-900 border border-slate-800 py-3.5 px-5 text-sm font-black text-white focus:border-emerald-500/50 outline-none transition-all shadow-inner ${hasRecipe ? 'opacity-70 cursor-not-allowed bg-slate-950 border-amber-500/20 text-amber-500' : ''}`}
                                                value={formData.costPrice || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFormData({ ...formData, costPrice: val === "" ? 0 : parseFloat(val) || 0 });
                                                }}
                                            />
                                            {hasRecipe && <ChefHat className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500/50" />}
                                        </div>
                                    </div>
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
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="bg-amber-500/10 p-2.5 rounded-2xl border border-amber-500/20">
                                        <ChefHat className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Bill of Materials (BOM)</h3>
                                        <p className="text-[10px] text-slate-500 font-bold italic">Define ingredients and production yield</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Yield Amount</span>
                                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-amber-500/30 transition-all">
                                            <input 
                                                type="number"
                                                className="w-12 bg-transparent text-xs font-black text-emerald-400 outline-none text-right"
                                                value={formData.recipeYield || ""}
                                                onChange={(e) => setFormData({...formData, recipeYield: parseFloat(e.target.value) || 0})}
                                            />
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">{formData.unit || 'Pack'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-2xl border border-white/5">
                                        <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-all duration-300 ${hasRecipe ? 'bg-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.4)]' : 'bg-slate-800'}`} onClick={() => setHasRecipe(!hasRecipe)}>
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${hasRecipe ? 'left-6' : 'left-1'}`} />
                                        </div>
                                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest italic">Enable Recipe</span>
                                    </div>
                                </div>
                            </div>
                            {hasRecipe ? (
                                <div className="space-y-4">
                                    {recipeItems.map((item, index) => (
                                        <div key={index} style={{ zIndex: 50 - index }} className="flex gap-3 animate-in fade-in slide-in-from-left-4 duration-300 relative">
                                            <div className="flex-[3]">
                                                <SearchableSelect
                                                    options={productList.map((p) => ({
                                                        id: p.id.toString(),
                                                        name: p.name
                                                    }))}
                                                    value={item.materialId}
                                                    onChange={(val) => updateRecipeItem(index, 'materialId', val.toString())}
                                                    placeholder="Select Raw Material..."
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    required
                                                    type="number"
                                                    placeholder="QTY"
                                                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3 px-5 text-[11px] font-black text-white focus:border-amber-500/50 outline-none transition-all text-center italic"
                                                    value={item.quantity || ""}
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
                                    {/* COST SUMMARY FOOTER */}
                                    <div className="mt-8 pt-6 border-t border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="bg-slate-950/80 rounded-3xl p-6 border border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden group">
                                            {/* Decorative radial background */}
                                            <div className="absolute inset-0 bg-radial-gradient from-amber-500/5 to-transparent opacity-50 pointer-events-none" />
                                            
                                            <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                                                <div className="flex items-center gap-6">
                                                    <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform duration-300">
                                                        <Calculator className="h-7 w-7 opacity-80" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Batch Cost Analysis</h4>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span className="text-[11px] font-bold text-slate-400">Yield: {formData.recipeYield || 0} {formData.unit || 'Units'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-10">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Total Batch Value</span>
                                                        <div className="flex items-baseline gap-1.5 font-black">
                                                            <span className="text-xs text-slate-500 uppercase">Rp</span>
                                                            <span className="text-xl text-white tracking-tight">{totalBatchCost.toLocaleString('id-ID')}</span>
                                                        </div>
                                                    </div>

                                                    <div className="h-10 w-[1px] bg-white/5 hidden md:block" />

                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest italic drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">Unit HPP Result</span>
                                                        <div className="flex items-baseline gap-1.5 font-black">
                                                            <span className="text-xs text-amber-500 uppercase">Rp</span>
                                                            <span className="text-3xl text-amber-500 tracking-tighter drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                                                                {unitHpp.toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="button"
                                            onClick={addRecipeItem}
                                            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-slate-800 hover:border-amber-500/30 hover:bg-amber-500/5 text-slate-500 hover:text-amber-500 transition-all duration-300 group"
                                        >
                                            <div className="h-6 w-6 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Plus className="h-3 w-3" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Insert Material Component</span>
                                        </button>
                                    </div>
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

'use client';

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";
import { 
    Search, 
    ShoppingCart, 
    Trash2, 
    Plus, 
    Minus, 
    CheckCircle2, 
    CreditCard, 
    Wallet, 
    User, 
    Tag,
    X,
    Printer,
    Monitor
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
    image?: string;
    categoryId?: number;
    category?: { name: string };
    unit: string;
}

interface CartItem extends Product {
    qty: number;
}

export default function POSPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastSale, setLastSale] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [prodRes, catRes, accRes] = await Promise.all([
                api.get('/pos/products'),
                api.get('/pos/categories'),
                api.get('/finance/accounts')
            ]);
            setProducts(prodRes.data);
            setCategories(catRes.data);
            setAccounts(accRes.data);
            
            if (accRes.data.length > 0) {
                setSelectedAccount(accRes.data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch POS data", error);
            toast.error("Gagal mengambil data produk");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = selectedCategory ? p.categoryId === selectedCategory : true;
            return matchSearch && matchCat;
        });
    }, [products, searchTerm, selectedCategory]);

    const addToCart = (product: Product) => {
        if (product.stock <= 0) {
            toast.error("Stok habis!");
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                if (existing.qty >= product.stock) {
                    toast.error("Stok tidak cukup");
                    return prev;
                }
                return prev.map(item => 
                    item.id === product.id ? { ...item, qty: item.qty + 1 } : item
                );
            }
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const updateQty = (id: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.qty + delta;
                if (newQty <= 0) return item;
                if (newQty > item.stock) {
                    toast.error("Stok tidak cukup");
                    return item;
                }
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (id: number) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const totalAmount = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    }, [cart]);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        if (!selectedAccount) {
            toast.error("Pilih metode pembayaran");
            return;
        }

        setCheckoutLoading(true);
        try {
            const payload = {
                items: cart.map(item => ({
                    productId: item.id,
                    quantity: item.qty,
                    price: item.price
                })),
                accountId: selectedAccount,
                totalAmount
            };

            const res = await api.post('/pos/checkout', payload);
            setLastSale(res.data.sale);
            toast.success("Transaksi Berhasil!");
            setCart([]);
            fetchData(); // Refresh stock
            setShowReceipt(true);
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Gagal memproses transaksi");
        } finally {
            setCheckoutLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] gap-6 overflow-hidden">
                
                {/* LEFT: Product Section */}
                <div className="flex-1 flex flex-col min-w-0 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                    {/* Header: Search & Filter */}
                    <div className="p-6 border-b border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                <Monitor className="h-6 w-6 text-blue-600" />
                                Aivola POS <span className="text-sm font-medium text-slate-400">v2.0</span>
                            </h1>
                            <div className="relative w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Cari produk..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Category Pills */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            <button 
                                onClick={() => setSelectedCategory(null)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                                    selectedCategory === null 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                                }`}
                            >
                                Semua Menu
                            </button>
                            {categories.map(cat => (
                                <button 
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                                        selectedCategory === cat.id 
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                                {[1,2,3,4,5,6,7,8].map(i => (
                                    <div key={i} className="h-48 bg-slate-100 rounded-3xl" />
                                ))}
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredProducts.map(product => (
                                    <div 
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="group relative flex flex-col bg-white border border-slate-100 rounded-3xl p-4 cursor-pointer hover:shadow-2xl hover:shadow-blue-200/50 hover:border-blue-200 transition-all active:scale-95"
                                    >
                                        <div className="aspect-square w-full rounded-2xl bg-slate-50 mb-3 flex items-center justify-center overflow-hidden">
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <Tag className="h-10 w-10 text-slate-200 group-hover:rotate-12 transition-transform" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 inline-block px-2 py-0.5 rounded-full mb-1">
                                                {product.category?.name || 'Umum'}
                                            </p>
                                            <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{product.name}</h3>
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="font-black text-slate-900 text-base">Rp {product.price.toLocaleString()}</p>
                                                <p className={`text-[10px] font-bold ${product.stock < 10 ? 'text-orange-500' : 'text-slate-400'}`}>
                                                    Sisa: {product.stock}
                                                </p>
                                            </div>
                                        </div>
                                        {/* Overlay Bagde */}
                                        {cart.find(c => c.id === product.id) && (
                                            <div className="absolute top-2 right-2 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg">
                                                {cart.find(c => c.id === product.id)?.qty}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 italic">
                                <Search className="h-12 w-12 mb-2 opacity-20" />
                                <p>Produk tidak ditemukan</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Cart Section */}
                <div className="w-full lg:w-[400px] flex flex-col bg-slate-900 rounded-3xl shadow-2xl overflow-hidden text-white">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <h2 className="text-xl font-black flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5 text-blue-400" />
                            Keranjang
                        </h2>
                        <button 
                            onClick={() => setCart([])}
                            className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-red-400 transition-colors"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-hide">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                <ShoppingCart className="h-16 w-16 mb-4 opacity-10" />
                                <p className="font-medium">Belum ada item pesanan</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex items-center gap-4 group animate-in slide-in-from-right-4">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm tracking-tight">{item.name}</h4>
                                        <p className="text-[10px] text-slate-400 font-medium tracking-wide">Rp {item.price.toLocaleString()} x {item.qty}</p>
                                    </div>
                                    <div className="flex items-center bg-white/5 rounded-2xl p-1 gap-1 border border-white/10">
                                        <button 
                                            onClick={() => updateQty(item.id, -1)}
                                            className="p-1 px-2 hover:bg-white/10 rounded-xl transition-colors"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="w-8 text-center text-xs font-black">{item.qty}</span>
                                        <button 
                                            onClick={() => updateQty(item.id, 1)}
                                            className="p-1 px-2 hover:bg-white/10 rounded-xl transition-colors"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => removeFromCart(item.id)}
                                        className="p-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Summary & Checkout */}
                    <div className="p-6 bg-white/5 border-t border-white/10 space-y-4">
                        <div className="space-y-2">
                             <div className="flex justify-between items-center text-slate-400 text-sm">
                                <span>Subtotal</span>
                                <span>Rp {totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 text-sm">
                                <span>Pajak (0%)</span>
                                <span>Rp 0</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-white/10 pt-2 text-white">
                                <span className="font-bold">Total Tagihan</span>
                                <span className="text-2xl font-black text-blue-400">Rp {totalAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Account Selector */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Metode Pembayaran</label>
                            <div className="grid grid-cols-2 gap-2">
                                {accounts.map(acc => (
                                    <button 
                                        key={acc.id}
                                        onClick={() => setSelectedAccount(acc.id)}
                                        className={`flex items-center gap-2 p-3 rounded-2xl text-[10px] font-black border transition-all ${
                                            selectedAccount === acc.id 
                                            ? 'bg-blue-600 border-blue-600 text-white' 
                                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-blue-400'
                                        }`}
                                    >
                                        {acc.type === 'CASH' ? <Wallet className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                                        {acc.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            disabled={cart.length === 0 || checkoutLoading}
                            onClick={handleCheckout}
                            className={`w-full py-4 rounded-3xl font-black text-lg shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                                cart.length === 0 || checkoutLoading
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'
                            }`}
                        >
                            {checkoutLoading ? (
                                <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 className="h-6 w-6" />
                                    Bayer Sekarang
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* RECEIPT MODAL */}
            {showReceipt && lastSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center border-b border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800">Pembayaran Berhasil!</h3>
                            <p className="text-sm text-slate-500 mt-1">Invoice #{lastSale.invoiceNumber}</p>
                        </div>
                        <div className="p-8 space-y-4">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span className="text-slate-400">Total Dibayar</span>
                                <span className="text-slate-900 font-bold">Rp {lastSale.totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span className="text-slate-400">Metode</span>
                                <span className="text-slate-900 font-bold">{accounts.find(a => a.id === selectedAccount)?.name}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-medium pb-4 border-b border-slate-50">
                                <span className="text-slate-400">Waktu</span>
                                <span className="text-slate-900 font-bold font-mono text-[10px]">
                                    {new Date(lastSale.createdAt).toLocaleString('id-ID')}
                                </span>
                            </div>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setShowReceipt(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                                >
                                    Tutup
                                </button>
                                <button 
                                    onClick={() => window.print()}
                                    className="flex items-center justify-center gap-2 flex-[2] py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                                >
                                    <Printer className="h-4 w-4" />
                                    Cetak Struk
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

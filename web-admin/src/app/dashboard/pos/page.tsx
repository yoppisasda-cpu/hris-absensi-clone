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
            
            // Force manual selection to prevent accidental usage of default account
            setSelectedAccount(null);
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
            
            // OPTIMIZATION: Update local stock instantly without full re-fetch flicker
            const cartMap = new Map(cart.map(item => [item.id, item.qty]));
            setProducts(prev => prev.map(p => {
                const qtySold = cartMap.get(p.id);
                return qtySold ? { ...p, stock: p.stock - qtySold } : p;
            }));

            setCart([]);
            setShowReceipt(true);
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Gagal memproses transaksi");
        } finally {
            setCheckoutLoading(false);
        }
    };

    // KEYBOARD SHORTCUTS
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // '/' to search
            if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                document.getElementById('pos-search')?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <DashboardLayout>
            <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-8 overflow-hidden p-2">
                
                {/* LEFT: Product Section */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-900/40 rounded-[40px] border border-white/5 shadow-2xl overflow-hidden backdrop-blur-xl group">
                    {/* Header: Search & Filter */}
                    <div className="p-8 border-b border-white/5 space-y-8 bg-slate-950/30">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform duration-500">
                                    <Monitor className="h-7 w-7 stroke-[2.5px]" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase text-glow-sm">
                                        Nexus <span className="text-blue-500">Terminal</span>
                                    </h1>
                                    <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase mt-1 italic">Authorized Transaction Interface</p>
                                </div>
                            </div>
                            <div className="relative w-full xl:w-[400px] group/search">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700 group-focus-within/search:text-blue-500 transition-colors z-10" />
                                <input 
                                    id="pos-search"
                                    type="text" 
                                    placeholder="SCAN_OR_SEARCH_PRODUCT..."
                                    className="w-full pl-12 pr-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] font-black text-white focus:border-blue-500/50 outline-none transition-all italic tracking-[0.2em] uppercase placeholder:text-slate-800 shadow-inner"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Category Pills */}
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide py-1">
                            <button 
                                onClick={() => setSelectedCategory(null)}
                                className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border italic ${
                                    selectedCategory === null 
                                    ? 'bg-blue-600 text-white border-blue-400 shadow-2xl shadow-blue-500/20' 
                                    : 'bg-slate-950 text-slate-600 border-white/5 hover:border-blue-500/50 hover:text-blue-400'
                                }`}
                            >
                                All Schema
                            </button>
                            {categories.map(cat => (
                                <button 
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border italic ${
                                        selectedCategory === cat.id 
                                        ? 'bg-blue-600 text-white border-blue-400 shadow-2xl shadow-blue-500/20' 
                                        : 'bg-slate-950 text-slate-600 border-white/5 hover:border-blue-500/50 hover:text-blue-400'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1 overflow-y-auto p-8 scrollbar-hide bg-slate-950/10">
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                                {[1,2,3,4,5,6,7,8].map(i => (
                                    <div key={i} className="h-56 bg-white/5 rounded-[32px] border border-white/5" />
                                ))}
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredProducts.map(product => (
                                    <div 
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="group relative flex flex-col bg-slate-900/50 border border-white/5 rounded-[32px] p-5 cursor-pointer hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all active:scale-95 overflow-hidden"
                                    >
                                        <div className="aspect-square w-full rounded-2xl bg-slate-950/50 mb-4 flex items-center justify-center overflow-hidden border border-white/5 group-hover:border-blue-500/20 transition-colors relative">
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                    <Tag className="h-10 w-10 text-slate-800 group-hover:text-blue-500/50 transition-colors group-hover:rotate-12 duration-500" />
                                                    <span className="text-[8px] font-black text-slate-800 tracking-tighter uppercase whitespace-nowrap">NO_MEDIA_SOURCE</span>
                                                </div>
                                            )}
                                            {/* Stock Indicator Overlay */}
                                            <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                                                <span className={`text-[8px] font-black uppercase tracking-widest ${product.stock < 10 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                                                    STK: {product.stock}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 inline-block px-2 py-0.5 rounded-full mb-2 italic">
                                                    {product.category?.name || 'GENERAL'}
                                                </p>
                                                <h3 className="font-black text-white text-xs leading-tight line-clamp-2 uppercase tracking-tight group-hover:text-blue-400 transition-colors duration-300">{product.name}</h3>
                                            </div>
                                            <div className="flex items-end justify-between mt-4">
                                                <p className="font-black text-lg text-white italic tracking-tighter group-hover:scale-110 transition-transform origin-left text-glow-sm">
                                                    Rp {product.price.toLocaleString()}
                                                </p>
                                                <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all shadow-inner">
                                                    <Plus className="h-4 w-4 stroke-[3px]" />
                                                </div>
                                            </div>
                                        </div>
                                        {/* Overlay Badge */}
                                        {cart.find(c => c.id === product.id) && (
                                            <div className="absolute top-3 right-3 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shadow-2xl border-2 border-slate-900 animate-in zoom-in spin-in-90 duration-300">
                                                {cart.find(c => c.id === product.id)?.qty}
                                            </div>
                                        )}
                                        {/* Glass Glow */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:to-blue-500/5 transition-all duration-500"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-700 uppercase tracking-[0.2em] font-black italic">
                                <Search className="h-20 w-20 mb-6 opacity-5" />
                                <p className="text-glow-sm">Terminal Scan: No Product Matches Detected</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Cart Section */}
                <div className="w-full lg:w-[450px] flex flex-col bg-slate-900 border border-white/5 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden text-white backdrop-blur-3xl relative">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-950/50">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-500">
                                <ShoppingCart className="h-5 w-5 stroke-[2.5px]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black italic tracking-tighter uppercase text-glow-sm">
                                    Current <span className="text-blue-500">Manifest</span>
                                </h2>
                                <p className="text-[8px] font-black text-slate-600 tracking-[0.2em] uppercase italic">Order Validation Node</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setCart([])}
                            className="h-10 w-10 flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-500 rounded-xl border border-white/5 transition-all active:scale-95"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scrollbar-hide bg-slate-950/20">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-800 uppercase tracking-[0.3em] font-black italic text-[10px] text-center gap-6">
                                <div className="h-24 w-24 rounded-[40px] bg-slate-900 border border-white/5 flex items-center justify-center shadow-inner">
                                    <ShoppingCart className="h-10 w-10 opacity-30" />
                                </div>
                                <p>MANIFEST_EMPTY: Waiting for Product Input</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex items-center gap-5 group animate-in slide-in-from-right-8 duration-500">
                                    <div className="h-14 w-14 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center text-blue-500 font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner relative overflow-hidden">
                                        {item.image ? (
                                            <img src={item.image} className="w-full h-full object-cover opacity-60" />
                                        ) : (
                                            item.name.substring(0, 2).toUpperCase()
                                        )}
                                        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 transition-all"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-[11px] tracking-tight text-white uppercase group-hover:text-blue-400 transition-colors truncate italic">{item.name}</h4>
                                        <p className="text-[9px] text-slate-500 font-black tracking-widest uppercase italic mt-1.5 flex items-center gap-2">
                                            Rp {item.price.toLocaleString()} <span className="text-slate-700">|</span> QTY: {item.qty}
                                        </p>
                                    </div>
                                    <div className="flex items-center bg-slate-950/80 rounded-2xl p-1 gap-1 border border-white/5 shadow-inner">
                                        <button 
                                            onClick={() => updateQty(item.id, -1)}
                                            className="h-8 w-8 flex items-center justify-center hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white active:scale-90"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="w-8 text-center text-xs font-black italic tracking-tighter text-blue-500">{item.qty}</span>
                                        <button 
                                            onClick={() => updateQty(item.id, 1)}
                                            className="h-8 w-8 flex items-center justify-center hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white active:scale-90"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => removeFromCart(item.id)}
                                        className="h-10 w-10 flex items-center justify-center text-slate-700 hover:text-red-500 transition-all hover:bg-red-500/10 rounded-xl"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Summary & Checkout */}
                    <div className="p-8 bg-slate-950/80 border-t border-white/5 space-y-8 relative overflow-hidden">
                        {/* Sub-pulsing ambient glow */}
                        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-500/5 blur-[100px] animate-pulse"></div>

                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] italic">
                                <span>Subtotal Processing</span>
                                <span className="text-slate-300">Rp {totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] italic">
                                <span>Tax Load Engine (0%)</span>
                                <span className="text-slate-300">Rp 0</span>
                            </div>
                            <div className="flex justify-between items-end border-t border-white/5 pt-6 text-white group">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 italic mb-1">Final Transaction Total</span>
                                    <span className="text-4xl font-black italic tracking-tighter text-glow-md group-hover:scale-110 transition-transform origin-left duration-500">
                                        Rp <span className="text-white group-hover:text-blue-400 transition-colors uppercase">{totalAmount.toLocaleString()}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Account Selector */}
                        <div className="space-y-4 relative z-10">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 italic flex items-center gap-2">
                                <div className="h-1 w-4 bg-blue-600 rounded-full"></div> Settlement Protocol
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {accounts.map(acc => (
                                    <button 
                                        key={acc.id}
                                        onClick={() => setSelectedAccount(acc.id)}
                                        className={`flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black border transition-all uppercase tracking-widest italic relative overflow-hidden group ${
                                            selectedAccount === acc.id 
                                            ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-500/20' 
                                            : 'bg-slate-900 border-white/5 text-slate-500 hover:border-blue-500/40 hover:text-blue-400'
                                        }`}
                                    >
                                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${selectedAccount === acc.id ? 'bg-white/20' : 'bg-slate-950'}`}>
                                            {acc.type === 'CASH' ? <Wallet className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                                        </div>
                                        {acc.name}
                                        {selectedAccount === acc.id && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-white animate-ping"></div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            disabled={cart.length === 0 || checkoutLoading}
                            onClick={handleCheckout}
                            className={`w-full py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.4em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 relative z-10 italic border-b-8 ${
                                cart.length === 0 || checkoutLoading
                                ? 'bg-slate-800 border-slate-950 text-slate-700 cursor-not-allowed opacity-50'
                                : 'bg-blue-600 border-blue-900 text-white hover:bg-blue-500 hover:-translate-y-1'
                            }`}
                        >
                            {checkoutLoading ? (
                                <div className="h-6 w-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 className="h-6 w-6 stroke-[3px]" />
                                    Commit Sale
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* RECEIPT MODAL */}
            {showReceipt && lastSale && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/95 backdrop-blur-2xl p-4 animate-in fade-in duration-500">
                    <div className="bg-slate-900 w-full max-w-sm rounded-[48px] shadow-[0_0_100px_rgba(59,130,246,0.1)] overflow-hidden animate-in zoom-in-95 duration-500 border border-white/5">
                        <div className="p-10 text-center border-b border-dashed border-white/10 bg-slate-950/30">
                            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-[32px] border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10">
                                <CheckCircle2 className="h-10 w-10 stroke-[3px] animate-bounce" />
                            </div>
                            <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase text-glow-sm">Settle Success</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 italic">AUTH_TRANS_ID: {lastSale.invoiceNumber}</p>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest italic">
                                <span className="text-slate-500">Amount Transferred</span>
                                <span className="text-white text-base tracking-tighter italic">Rp {lastSale.totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest italic">
                                <span className="text-slate-500">Protocol Method</span>
                                <span className="text-blue-400">{accounts.find(a => a.id === selectedAccount)?.name}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest italic pb-6 border-b border-white/5">
                                <span className="text-slate-500">Timestamp</span>
                                <span className="text-slate-400 font-mono text-[9px]">
                                    {new Date(lastSale.createdAt).toLocaleTimeString('id-ID')}
                                </span>
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => window.print()}
                                    className="flex items-center justify-center gap-3 w-full py-5 bg-blue-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-blue-500 shadow-2xl shadow-blue-500/20 transition-all active:scale-95 italic border-b-4 border-blue-900"
                                >
                                    <Printer className="h-4 w-4 stroke-[3px]" />
                                    Generate Receipt
                                </button>
                                <button 
                                    onClick={() => setShowReceipt(false)}
                                    className="w-full py-4 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-all italic underline underline-offset-8 decoration-slate-800"
                                >
                                    Close Terminal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

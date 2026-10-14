'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    Store, 
    CheckCircle2, 
    QrCode, 
    CreditCard, 
    Banknote, 
    Sparkles, 
    Maximize2, 
    Minimize2,
    ShoppingBag,
    Clock,
    Percent,
    Flame
} from 'lucide-react';
import api from '@/lib/api';

interface CartItem {
    id: number;
    cartId: string;
    name: string;
    price: number;
    qty: number;
    modifiers?: any;
    total: number;
}

interface FeaturedProduct {
    id?: number;
    name: string;
    price: number;
    category?: string;
}

interface DisplayState {
    tenantName: string;
    logoUrl?: string | null;
    saleType: string;
    customerName: string;
    items: CartItem[];
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    paymentMethod: string | null;
    isCompleted: boolean;
    lastSale: {
        invoiceNumber?: string;
        queueNumber?: number | string;
        totalAmount?: number;
        paidAmount?: number;
        changeAmount?: number;
        paymentMethod?: string;
    } | null;
    featuredProducts: FeaturedProduct[];
}

const DEFAULT_STATE: DisplayState = {
    tenantName: '',
    logoUrl: null,
    saleType: 'WALK_IN',
    customerName: '',
    items: [],
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 0,
    paymentMethod: null,
    isCompleted: false,
    lastSale: null,
    featuredProducts: []
};

export default function CustomerDisplayPage() {
    const [state, setState] = useState<DisplayState>(DEFAULT_STATE);
    const [currentTime, setCurrentTime] = useState<string>('');
    const [currentDate, setCurrentDate] = useState<string>('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [successDismissTimer, setSuccessDismissTimer] = useState<number>(7);
    const itemsEndRef = useRef<HTMLDivElement>(null);

    // Live Clock
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }));
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    // Initial direct load of company profile and products
    useEffect(() => {
        const fetchInitialProfile = async () => {
            try {
                const [compRes, prodRes] = await Promise.all([
                    api.get('/companies/my'),
                    api.get('/pos/products')
                ]);
                if (compRes.data?.name) {
                    setState(prev => ({
                        ...prev,
                        tenantName: compRes.data.name,
                        logoUrl: compRes.data.logoUrl || null,
                        featuredProducts: (prodRes.data || []).slice(0, 4).map((p: any) => ({
                            id: p.id,
                            name: p.name,
                            price: p.price,
                            category: p.category?.name || 'MENU'
                        }))
                    }));
                }
            } catch (e) {
                console.warn('Could not load company profile directly for display', e);
            }
        };
        fetchInitialProfile();
    }, []);

    // Scroll to bottom when items change
    useEffect(() => {
        if (state.items.length > 0) {
            itemsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [state.items.length]);

    // Dual Sync: BroadcastChannel + LocalStorage
    useEffect(() => {
        const handleNewData = (data: any) => {
            if (!data) return;
            if (data.type === 'CART_UPDATE' || data.type === 'TRANSACTION_SUCCESS') {
                setState(prev => ({
                    ...prev,
                    tenantName: data.tenantName || prev.tenantName || 'OUTLET KAMI',
                    logoUrl: data.logoUrl !== undefined ? data.logoUrl : prev.logoUrl,
                    saleType: data.saleType || 'WALK_IN',
                    customerName: data.customerName || '',
                    items: Array.isArray(data.items) ? data.items : [],
                    subtotal: Number(data.subtotal) || 0,
                    discountAmount: Number(data.discountAmount) || 0,
                    taxAmount: Number(data.taxAmount) || 0,
                    totalAmount: Number(data.totalAmount) || 0,
                    paymentMethod: data.paymentMethod || null,
                    isCompleted: Boolean(data.isCompleted),
                    lastSale: data.lastSale || null,
                    featuredProducts: data.featuredProducts && data.featuredProducts.length > 0 ? data.featuredProducts : prev.featuredProducts
                }));
            } else if (data.type === 'RESET') {
                setState(prev => ({
                    ...DEFAULT_STATE,
                    tenantName: prev.tenantName,
                    logoUrl: prev.logoUrl,
                    featuredProducts: prev.featuredProducts
                }));
            }
        };

        // 1. Initial load from localStorage
        try {
            const cached = localStorage.getItem('aivola_pos_customer_state');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.timestamp && Date.now() - parsed.timestamp < 3600000) {
                    handleNewData(parsed);
                }
            }
        } catch (e) {}

        // 2. BroadcastChannel setup
        let channel: BroadcastChannel | null = null;
        try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                channel = new BroadcastChannel('aivola_customer_display');
                channel.onmessage = (event) => {
                    handleNewData(event.data);
                };
                // Request sync from cashier window
                channel.postMessage({ type: 'REQUEST_SYNC' });
            }
        } catch (e) {}

        // 3. Fallback: storage event listener for cross-window sync
        const onStorage = (e: StorageEvent) => {
            if (e.key === 'aivola_pos_customer_state' && e.newValue) {
                try {
                    handleNewData(JSON.parse(e.newValue));
                } catch (err) {}
            }
        };
        window.addEventListener('storage', onStorage);

        return () => {
            if (channel) channel.close();
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    // Auto-dismiss success screen countdown
    useEffect(() => {
        let interval: any = null;
        if (state.isCompleted && state.lastSale) {
            setSuccessDismissTimer(7);
            interval = setInterval(() => {
                setSuccessDismissTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setState(s => ({
                            ...DEFAULT_STATE,
                            tenantName: s.tenantName,
                            logoUrl: s.logoUrl,
                            featuredProducts: s.featuredProducts
                        }));
                        return 7;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [state.isCompleted, state.lastSale]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
        }
    };

    const hasItems = state.items.length > 0;
    const isQris = (state.paymentMethod || '').toUpperCase().includes('QRIS');
    const isCash = (state.paymentMethod || '').toUpperCase().includes('KAS') || (state.paymentMethod || '').toUpperCase().includes('TUNAI');

    return (
        <div className="min-h-screen h-screen w-screen bg-[#06080F] text-white flex flex-col overflow-hidden select-none font-sans relative">
            {/* Background Ambient Glows */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[160px] pointer-events-none" />

            {/* TOP NAVIGATION BAR */}
            <header className="h-20 px-8 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-2xl flex items-center justify-between z-20 shrink-0">
                {/* Brand / Outlet Logo */}
                <div className="flex items-center gap-4">
                    {state.logoUrl ? (
                        <img 
                            src={state.logoUrl} 
                            alt={state.tenantName} 
                            className="h-12 w-12 rounded-2xl object-contain bg-white/5 border border-white/10 p-1 shadow-lg shadow-blue-500/20" 
                        />
                    ) : (
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/20">
                            <Store className="h-6 w-6 text-white stroke-[2.5]" />
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl font-black italic tracking-tight uppercase text-white">
                                {state.tenantName || 'OUTLET KAMI'}
                            </h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                KASIR AKTIF
                            </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                            Customer Transaction Display
                        </p>
                    </div>
                </div>

                {/* Center Badge: Customer Name / Sale Type */}
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">LAYANAN:</span>
                        <span className="text-xs font-black italic uppercase tracking-wider text-blue-400">
                            {state.saleType === 'DINE_IN' ? '🍽️ Dine-in' : state.saleType === 'TAKE_AWAY' ? '🛍️ Take Away' : '🚶 Walk-in'}
                        </span>
                    </div>

                    {state.customerName && (
                        <div className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center gap-2">
                            <span className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">PELANGGAN:</span>
                            <span className="text-xs font-black italic uppercase tracking-wider text-white">
                                {state.customerName}
                            </span>
                        </div>
                    )}
                </div>

                {/* Right: Real-time Clock & Fullscreen Toggle */}
                <div className="flex items-center gap-5">
                    <div className="text-right">
                        <div className="text-base font-black tracking-wider text-white font-mono flex items-center gap-2 justify-end">
                            <Clock className="h-3.5 w-3.5 text-blue-400" />
                            {currentTime || '00:00:00'}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {currentDate}
                        </p>
                    </div>

                    <button 
                        onClick={toggleFullscreen}
                        title="Toggle Layar Penuh (F11)"
                        className="h-11 w-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95"
                    >
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex min-h-0 relative z-10 p-6 gap-6">
                {/* STATE 1: STANDBY / IDLE (No Items in Cart) */}
                {!hasItems && !state.isCompleted && (
                    <div className="flex-1 flex gap-6 animate-in fade-in duration-500">
                        {/* Welcome Hero Box */}
                        <div className="flex-[3] rounded-[36px] bg-gradient-to-br from-[#0F1424]/90 via-[#0C101C]/80 to-[#07090E]/90 border border-white/10 p-12 flex flex-col justify-between relative overflow-hidden backdrop-blur-xl shadow-2xl">
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
                            <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

                            <div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-[0.2em] mb-6">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    OFFICIAL SERVICE POINT
                                </div>
                                <h2 className="text-5xl font-black italic tracking-tighter uppercase leading-none text-white">
                                    SELAMAT DATANG DI <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
                                        {state.tenantName || 'OUTLET KAMI'}
                                    </span>
                                </h2>
                                <p className="text-base text-slate-400 font-medium tracking-wide mt-6 max-w-xl leading-relaxed">
                                    Silakan pilih produk dan menu favorit Anda langsung di meja kasir. Kami siap melayani pesanan Anda dengan kualitas terbaik dan bahan segar setiap hari.
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/10">
                                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                                    <span className="text-2xl font-black text-blue-400">100%</span>
                                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-300 mt-1">Quality Guaranteed</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Produk pilihan kualitas terbaik</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                                    <span className="text-2xl font-black text-indigo-400">FRESH</span>
                                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-300 mt-1">Fresh & Higienis</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Disajikan segar untuk Anda</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                                    <span className="text-2xl font-black text-purple-400">INSTANT</span>
                                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-300 mt-1">Pembayaran Digital</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">QRIS, Debit, dan Tunai</p>
                                </div>
                            </div>
                        </div>

                        {/* Featured Showcase Box */}
                        <div className="flex-[2] rounded-[36px] bg-[#0C101C]/80 border border-white/10 p-8 flex flex-col justify-between backdrop-blur-xl shadow-2xl">
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest">
                                        <Flame className="h-4 w-4" />
                                        MENU PILIHAN
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">RECOMMENDED</span>
                                </div>

                                <div className="space-y-3">
                                    {state.featuredProducts && state.featuredProducts.length > 0 ? (
                                        state.featuredProducts.map((p, idx) => (
                                            <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between hover:border-blue-500/30 transition-all">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-sm">
                                                        0{idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black uppercase tracking-tight text-white">{p.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{p.category || 'MENU'}</p>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-black text-blue-400 font-mono">Rp {Number(p.price || 0).toLocaleString('id-ID')}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-slate-500 text-xs italic">
                                            Silakan pesan menu pilihan Anda di kasir
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Accepted Payment Icons */}
                            <div className="pt-6 border-t border-white/10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 text-center">
                                    METODE PEMBAYARAN DIDUKUNG
                                </p>
                                <div className="flex items-center justify-center gap-4 text-slate-400">
                                    <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white">
                                        QRIS
                                    </span>
                                    <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white">
                                        BCA / MANDIRI
                                    </span>
                                    <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white">
                                        DEBIT / EDC
                                    </span>
                                    <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white">
                                        TUNAI
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STATE 2: ACTIVE ORDER (Cart has items) */}
                {hasItems && !state.isCompleted && (
                    <div className="flex-1 flex gap-6 animate-in fade-in duration-300">
                        {/* LEFT COLUMN: ITEM LIST (60%) */}
                        <div className="flex-[3] rounded-[36px] bg-[#0C101C]/80 border border-white/10 flex flex-col overflow-hidden backdrop-blur-xl shadow-2xl">
                            {/* Table Header */}
                            <div className="p-6 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ShoppingBag className="h-5 w-5 text-blue-400" />
                                    <h3 className="text-base font-black italic tracking-tight uppercase text-white">
                                        Daftar Pesanan Anda
                                    </h3>
                                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[11px] font-black font-mono">
                                        {state.items.reduce((s, i) => s + i.qty, 0)} Item
                                    </span>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Live Cart Synchronization
                                </span>
                            </div>

                            {/* Scrollable Item Rows */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                                {state.items.map((item, idx) => (
                                    <div 
                                        key={item.cartId || idx}
                                        className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-4 transition-all hover:bg-white/[0.05]"
                                    >
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            {/* Quantity Pill */}
                                            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg shadow-blue-500/20 font-mono">
                                                {item.qty}x
                                            </div>

                                            {/* Name & Modifiers */}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-base font-black uppercase tracking-tight text-white truncate">
                                                    {item.name}
                                                </p>
                                                {item.modifiers && Object.keys(item.modifiers).length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                        {Object.values(item.modifiers).flat().map((m: any, mIdx: number) => (
                                                            <span 
                                                                key={mIdx}
                                                                className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider"
                                                            >
                                                                {typeof m === 'string' ? m : m.name}
                                                                {m.price ? ` (+Rp ${Number(m.price).toLocaleString('id-ID')})` : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Price Info */}
                                        <div className="text-right shrink-0">
                                            <p className="text-base font-black text-white font-mono tracking-tight">
                                                Rp {(item.price * item.qty).toLocaleString('id-ID')}
                                            </p>
                                            {item.qty > 1 && (
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mt-0.5">
                                                    @ Rp {item.price.toLocaleString('id-ID')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={itemsEndRef} />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: TOTALS & PAYMENT (40%) */}
                        <div className="flex-[2] flex flex-col gap-6">
                            {/* Summary Card */}
                            <div className="rounded-[36px] bg-gradient-to-br from-[#0F1424]/90 to-[#0C101C]/90 border border-white/10 p-8 flex flex-col justify-between backdrop-blur-xl shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 pb-3 border-b border-white/10">
                                        Rincian Pembayaran
                                    </h4>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">Subtotal</span>
                                        <span className="font-black text-white font-mono">
                                            Rp {state.subtotal.toLocaleString('id-ID')}
                                        </span>
                                    </div>

                                    {state.discountAmount > 0 && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-bold text-emerald-400 uppercase tracking-wider text-xs flex items-center gap-1.5">
                                                <Percent className="h-3.5 w-3.5" />
                                                Diskon / Voucher
                                            </span>
                                            <span className="font-black text-emerald-400 font-mono">
                                                - Rp {state.discountAmount.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    )}

                                    {state.taxAmount > 0 && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">Pajak (PB1)</span>
                                            <span className="font-black text-white font-mono">
                                                + Rp {state.taxAmount.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* TOTAL BAYAR BIG CARD */}
                                <div className="pt-6 mt-6 border-t-2 border-dashed border-white/10">
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-2">
                                        TOTAL YANG HARUS DIBAYAR
                                    </span>
                                    <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 border border-blue-500/40 shadow-xl shadow-blue-500/10 text-center">
                                        <span className="text-4xl xl:text-5xl font-black italic tracking-tight text-white font-mono text-glow">
                                            Rp {state.totalAmount.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method / QRIS Display Box */}
                            <div className="flex-1 rounded-[36px] bg-[#0C101C]/80 border border-white/10 p-6 flex flex-col justify-center items-center text-center backdrop-blur-xl shadow-2xl relative overflow-hidden">
                                {isQris ? (
                                    <div className="flex flex-col items-center">
                                        <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
                                            <QrCode className="h-8 w-8" />
                                        </div>
                                        <p className="text-sm font-black uppercase tracking-tight text-white">
                                            PEMBAYARAN DENGAN QRIS
                                        </p>
                                        <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-1 max-w-xs">
                                            Silakan buka BCA, GoPay, OVO, Dana, atau ShopeePay dan scan kode QR
                                        </p>
                                    </div>
                                ) : isCash ? (
                                    <div className="flex flex-col items-center">
                                        <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                                            <Banknote className="h-8 w-8" />
                                        </div>
                                        <p className="text-sm font-black uppercase tracking-tight text-white">
                                            PEMBAYARAN TUNAI (CASH)
                                        </p>
                                        <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-1">
                                            Silakan serahkan uang tunai kepada kasir
                                        </p>
                                    </div>
                                ) : state.paymentMethod ? (
                                    <div className="flex flex-col items-center">
                                        <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                                            <CreditCard className="h-8 w-8" />
                                        </div>
                                        <p className="text-sm font-black uppercase tracking-tight text-white">
                                            {state.paymentMethod.toUpperCase()}
                                        </p>
                                        <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-1">
                                            Silakan ikuti instruksi pembayaran di mesin kasir
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-3">
                                            <ShoppingBag className="h-6 w-6" />
                                        </div>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                                            MENUNGGU PEMILIHAN PEMBAYARAN
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            Kasir sedang menyiapkan transaksi Anda
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* STATE 3: TRANSACTION SUCCESS OVERLAY */}
                {state.isCompleted && state.lastSale && (
                    <div className="absolute inset-0 bg-[#06080F]/95 backdrop-blur-3xl z-50 flex items-center justify-center p-8 animate-in zoom-in-95 duration-500">
                        <div className="max-w-2xl w-full rounded-[48px] bg-gradient-to-b from-[#0F1424] to-[#0A0D16] border border-white/15 p-12 text-center shadow-[0_0_100px_rgba(59,130,246,0.2)] relative overflow-hidden">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />

                            {/* Checkmark Icon */}
                            <div className="h-20 w-20 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto shadow-2xl shadow-emerald-500/30 animate-bounce">
                                <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
                            </div>

                            <h3 className="text-4xl font-black italic tracking-tighter uppercase text-white mt-6">
                                PEMBAYARAN BERHASIL!
                            </h3>
                            <p className="text-sm text-slate-400 font-medium mt-2">
                                Terima kasih atas kunjungan Anda di <span className="text-white font-bold">{state.tenantName || 'Outlet Kami'}</span>
                            </p>

                            {/* Queue Number Badge */}
                            {state.lastSale.queueNumber ? (
                                <div className="my-8 p-6 rounded-3xl bg-white/[0.04] border border-white/10 max-w-xs mx-auto">
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 block mb-1">
                                        NOMOR ANTREAN PESANAN
                                    </span>
                                    <span className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 font-mono">
                                        #{state.lastSale.queueNumber}
                                    </span>
                                    <span className="text-[10px] text-slate-500 block mt-2 font-bold uppercase tracking-wider">
                                        Mohon simpan struk Anda
                                    </span>
                                </div>
                            ) : (
                                <div className="my-8" />
                            )}

                            {/* Transaction Summary Chips */}
                            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Metode Pembayaran</span>
                                    <span className="text-sm font-black text-white uppercase mt-0.5 block">{state.lastSale.paymentMethod || 'Lunas'}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Total Transaksi</span>
                                    <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 block">Rp {Number(state.lastSale.totalAmount || 0).toLocaleString('id-ID')}</span>
                                </div>
                            </div>

                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-8">
                                Layar akan kembali ke menu utama dalam {successDismissTimer} detik...
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

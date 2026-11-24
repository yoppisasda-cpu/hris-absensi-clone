'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { UtensilsCrossed, CheckCircle2, Volume2, VolumeX, RotateCw, Maximize2, Minimize2, Clock } from 'lucide-react';

function cleanDisplayLabel(label: string | undefined | null, customerName?: string | null): string {
    if (customerName && customerName.trim()) {
        let name = customerName.trim().replace(/\s*\((POS|INV)[^)]*\)/gi, '').trim();
        if (!/^(POS|INV)-/i.test(name)) {
            return name.length > 24 ? name.substring(0, 24).trim() + '...' : name;
        }
    }
    if (!label) return '';
    // 1. Strip invoice numbers like (POS-1795498733473-904) or (INV-...)
    let cleaned = label.replace(/\s*\((POS|INV)[^)]*\)/gi, '').trim();
    
    // 2. If the label itself is an invoice number, hide it so only the big #number displays
    if (/^(POS|INV)-/i.test(cleaned)) {
        return '';
    }

    // 3. Truncate if still overly long so cards stay neat and aligned
    if (cleaned.length > 24) {
        cleaned = cleaned.substring(0, 24).trim() + '...';
    }

    return cleaned;
}

export default function QueueDisplay() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [realtimeConnected, setRealtimeConnected] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState<string>('');

    const soundEnabledRef = useRef(false);
    const announcedOrdersRef = useRef<Set<string>>(new Set());
    const isFirstLoad = useRef(true);

    // Live Clock
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    // Fullscreen Listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('jwt_token');
            const tenantId = localStorage.getItem('currentTenantId');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kitchen/orders`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    ...(tenantId ? { 'x-tenant-id': tenantId } : {})
                }
            });
            const newOrders = res.data;
            setOrders(newOrders);

            // Audio Announcement Logic
            const readyOrders = newOrders.filter((o: any) => o.status === 'READY');
            
            if (isFirstLoad.current) {
                readyOrders.forEach((order: any) => {
                    announcedOrdersRef.current.add(`${order.type}-${order.id}`);
                });
                isFirstLoad.current = false;
            } else {
                if (soundEnabledRef.current) {
                    readyOrders.forEach((order: any) => {
                        const uniqueId = `${order.type}-${order.id}`;
                        if (!announcedOrdersRef.current.has(uniqueId)) {
                            announcedOrdersRef.current.add(uniqueId);
                            
                            setTimeout(() => {
                                const text = `Nomor antrean, ${order.queueNumber || order.id}, silakan mengambil pesanan Anda di kasir`;
                                const utterance = new SpeechSynthesisUtterance(text);
                                utterance.lang = 'id-ID';
                                utterance.rate = 0.85;
                                utterance.pitch = 1;
                                window.speechSynthesis.speak(utterance);
                            }, 500);
                        }
                    });
                } else {
                    readyOrders.forEach((order: any) => {
                        announcedOrdersRef.current.add(`${order.type}-${order.id}`);
                    });
                }
            }
        } catch (error: any) {
            console.error('Error fetching queue orders', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();

        // 1. Setup Server-Sent Events (SSE) Realtime Stream
        let eventSource: EventSource | null = null;
        try {
            const token = localStorage.getItem('jwt_token');
            const tenantId = localStorage.getItem('currentTenantId');
            const streamUrl = `${process.env.NEXT_PUBLIC_API_URL}/kitchen/stream?tenantId=${tenantId || ''}&token=${token || ''}`;

            eventSource = new EventSource(streamUrl);

            eventSource.onopen = () => {
                setRealtimeConnected(true);
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type !== 'CONNECTED') {
                        fetchOrders();
                    }
                } catch (e) {}
            };

            eventSource.onerror = () => {
                setRealtimeConnected(false);
            };
        } catch (err) {
            console.warn('Queue Realtime SSE error:', err);
        }

        // 2. Fallback polling
        let interval: any;
        if (isPolling && !realtimeConnected) {
            interval = setInterval(fetchOrders, 60000);
        }

        // 3. Deteksi otomatis saat pergantian hari (00:00) agar display antrean reset fresh
        let lastDateStr = new Date().toDateString();
        const midnightChecker = setInterval(() => {
            const currentDateStr = new Date().toDateString();
            if (currentDateStr !== lastDateStr) {
                lastDateStr = currentDateStr;
                announcedOrdersRef.current.clear();
                fetchOrders();
            }
        }, 30000);

        return () => {
            if (eventSource) eventSource.close();
            if (interval) clearInterval(interval);
            clearInterval(midnightChecker);
        };
    }, [isPolling, realtimeConnected]);

    const preparingOrders = orders.filter(o => o.status === 'PREPARING').sort((a, b) => b.id - a.id);
    const readyOrders = orders.filter(o => o.status === 'READY').sort((a, b) => b.id - a.id);

    return (
        <div className="fixed inset-0 z-50 h-screen w-screen flex flex-col bg-slate-950 text-white select-none overflow-hidden font-sans">
            {/* TOP HEADER */}
            <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0 shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="w-3 h-10 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-black tracking-widest text-emerald-400 drop-shadow-sm">
                            ORDER STATUS
                        </h1>
                        <p className="text-slate-400 text-xs lg:text-sm font-medium mt-0.5">
                            Silakan perhatikan nomor antrean Anda di bawah
                        </p>
                    </div>
                </div>

                {/* CENTER: LIVE DIGITAL CLOCK */}
                {currentTime && (
                    <div className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-inner">
                        <Clock size={18} className="text-slate-400" />
                        <span className="text-lg lg:text-xl font-bold tracking-widest text-slate-100 tabular-nums">
                            {currentTime}
                        </span>
                    </div>
                )}

                {/* RIGHT: COMPACT CONTROLS */}
                <div className="flex items-center gap-2.5">
                    {/* Realtime Dot */}
                    <div 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            realtimeConnected 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                        title={realtimeConnected ? 'Sinkronisasi Realtime Terhubung' : 'Sedang menghubungkan ke server...'}
                    >
                        <span className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                        <span className="hidden sm:inline">{realtimeConnected ? 'Live' : 'Syncing'}</span>
                    </div>

                    {/* Sound Toggle Button */}
                    <button
                        onClick={() => {
                            const nextState = !soundEnabled;
                            setSoundEnabled(nextState);
                            soundEnabledRef.current = nextState;
                            if (nextState) {
                                window.speechSynthesis.cancel();
                                const u = new SpeechSynthesisUtterance("Sistem suara antrean diaktifkan");
                                u.lang = 'id-ID';
                                u.rate = 1;
                                window.speechSynthesis.speak(u);
                            } else {
                                window.speechSynthesis.cancel();
                            }
                        }}
                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold ${
                            soundEnabled 
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30' 
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                        }`}
                        title={soundEnabled ? 'Suara Antrean: Aktif' : 'Suara Antrean: Senyap (Klik untuk mengaktifkan)'}
                    >
                        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        <span className="hidden lg:inline">{soundEnabled ? 'Suara On' : 'Muted'}</span>
                    </button>

                    {/* Refresh Button */}
                    <button
                        onClick={fetchOrders}
                        className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-all active:scale-95"
                        title="Segarkan Antrean"
                    >
                        <RotateCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>

                    {/* Fullscreen Button */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-all active:scale-95"
                        title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Fullscreen)'}
                    >
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT: 2 SPLIT COLUMNS */}
            <main className="flex-1 grid grid-cols-2 divide-x divide-slate-800 overflow-hidden">
                {/* LEFT: SEDANG DISIAPKAN (PREPARING) */}
                <section className="flex flex-col min-h-0 bg-slate-950/60">
                    <div className="bg-amber-950/30 border-b border-amber-500/20 px-6 py-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <UtensilsCrossed size={28} className="text-amber-400" />
                            <h2 className="text-xl lg:text-2xl font-black text-amber-400 tracking-wider">
                                SEDANG DISIAPKAN
                            </h2>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs lg:text-sm font-bold">
                            {preparingOrders.length} Antrean
                        </span>
                    </div>

                    <div className="flex-1 p-5 lg:p-6 overflow-y-auto">
                        {preparingOrders.length === 0 ? (
                            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-600 gap-3">
                                <Clock size={48} className="text-slate-700" />
                                <p className="text-base font-semibold text-slate-500">Semua pesanan telah selesai disiapkan</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 auto-rows-fr">
                                {preparingOrders.slice(0, 8).map(order => {
                                    const cleanLabel = cleanDisplayLabel(order.label, order.customerName);
                                    return (
                                        <div 
                                            key={`${order.type}-${order.id}`}
                                            className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden transition-all duration-300"
                                        >
                                            <div className="h-1 w-full bg-amber-500/40 absolute top-0 left-0" />
                                            <span className="text-4xl xl:text-5xl font-black text-amber-400 tracking-tight drop-shadow-sm">
                                                #{order.queueNumber || order.id}
                                            </span>
                                            
                                            {cleanLabel && (
                                                <span className="text-slate-200 font-bold text-xs xl:text-sm mt-1.5 truncate max-w-full px-2">
                                                    {cleanLabel}
                                                </span>
                                            )}

                                            {order.saleType && (
                                                <span className={`mt-2 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                    order.saleType === 'TAKE_AWAY'
                                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                        : order.saleType === 'DINE_IN'
                                                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                }`}>
                                                    {order.saleType.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {preparingOrders.length > 8 && (
                            <div className="text-center text-amber-400/60 font-bold text-xs lg:text-sm mt-4 italic">
                                + {preparingOrders.length - 8} pesanan lainnya sedang disiapkan
                            </div>
                        )}
                    </div>
                </section>

                {/* RIGHT: SILAKAN AMBIL (READY) */}
                <section className="flex flex-col min-h-0 bg-emerald-950/15">
                    <div className="bg-emerald-950/40 border-b border-emerald-500/30 px-6 py-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 size={28} className="text-emerald-400" />
                            <h2 className="text-xl lg:text-2xl font-black text-emerald-400 tracking-wider">
                                SILAKAN AMBIL
                            </h2>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs lg:text-sm font-bold animate-pulse">
                            {readyOrders.length} Siap
                        </span>
                    </div>

                    <div className="flex-1 p-5 lg:p-6 overflow-y-auto">
                        {readyOrders.length === 0 ? (
                            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-600 gap-3">
                                <CheckCircle2 size={48} className="text-slate-700" />
                                <p className="text-base font-semibold text-slate-500">Belum ada pesanan yang siap diambil</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 auto-rows-fr">
                                {readyOrders.slice(0, 8).map(order => {
                                    const cleanLabel = cleanDisplayLabel(order.label, order.customerName);
                                    return (
                                        <div 
                                            key={`${order.type}-${order.id}`}
                                            className="bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 border-2 border-emerald-300/80 shadow-[0_0_35px_rgba(16,185,129,0.35)] rounded-2xl p-4 flex flex-col items-center justify-center text-center text-white relative overflow-hidden transition-all duration-300 animate-in zoom-in-95"
                                        >
                                            <div className="h-1 w-full bg-white/40 absolute top-0 left-0" />
                                            <span className="text-5xl xl:text-6xl font-black text-white tracking-tight drop-shadow-md">
                                                #{order.queueNumber || order.id}
                                            </span>

                                            {cleanLabel && (
                                                <span className="text-emerald-50 font-black text-xs xl:text-sm mt-1.5 truncate max-w-full px-2 drop-shadow-sm">
                                                    {cleanLabel}
                                                </span>
                                            )}

                                            {order.saleType && (
                                                <span className={`mt-2 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                    order.saleType === 'TAKE_AWAY'
                                                        ? 'bg-rose-950/60 text-rose-100 border border-rose-300/40'
                                                        : order.saleType === 'DINE_IN'
                                                        ? 'bg-sky-950/60 text-sky-100 border border-sky-300/40'
                                                        : 'bg-emerald-950/60 text-emerald-100 border border-emerald-300/40'
                                                }`}>
                                                    {order.saleType.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {readyOrders.length > 8 && (
                            <div className="text-center text-emerald-400/70 font-bold text-xs lg:text-sm mt-4 italic">
                                + {readyOrders.length - 8} pesanan siap diambil
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* BOTTOM FOOTER */}
            <footer className="bg-slate-900/90 border-t border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs text-slate-500 shrink-0">
                <span>Harap tunjukkan struk atau nomor antrean Anda saat mengambil pesanan</span>
                <span className="hidden sm:inline font-medium text-slate-600">Aivola Display System</span>
            </footer>
        </div>
    );
}

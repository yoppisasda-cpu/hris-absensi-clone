'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Utensils, CheckCircle, Volume2, VolumeX, RotateCw } from 'lucide-react';

export default function QueueDisplay() {
    const [orders, setOrders] = useState<any[]>([]);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [isPolling, setIsPolling] = useState(false); // Default to false to save railway usage
    const [realtimeConnected, setRealtimeConnected] = useState(false);
    const soundEnabledRef = useRef(false);
    const announcedOrdersRef = useRef<Set<string>>(new Set());
    const isFirstLoad = useRef(true);

    const fetchOrders = async () => {
        try {
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
                // Jangan panggil suara saat pertama kali muat, tapi catat semua order yang sudah ada
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
                            
                            // Gunakan delay sedikit agar browser tidak menumpuk antrean suara
                            setTimeout(() => {
                                const text = `Nomor antrean, ${order.queueNumber || order.id}, silakan mengambil pesanan Anda di kasir`;
                                const utterance = new SpeechSynthesisUtterance(text);
                                utterance.lang = 'id-ID';
                                utterance.rate = 0.85; // Agak lambat agar jelas
                                utterance.pitch = 1;
                                window.speechSynthesis.speak(utterance);
                            }, 500);
                        }
                    });
                } else {
                    // Jika suara mati, tetap catat agar tidak dipanggil ulang saat suara dinyalakan nanti
                    readyOrders.forEach((order: any) => {
                        announcedOrdersRef.current.add(`${order.type}-${order.id}`);
                    });
                }
            }
        } catch (error: any) {
            console.error('Error fetching queue orders', error);
        }
    };

    useEffect(() => {
        fetchOrders();

        // 1. Setup Server-Sent Events (SSE) Realtime Stream (0 Load DB saat diam)
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

        // 2. Fallback polling HANYA jika realtime disconnect
        let interval: any;
        if (isPolling && !realtimeConnected) {
            interval = setInterval(fetchOrders, 60000);
        }

        return () => {
            if (eventSource) eventSource.close();
            if (interval) clearInterval(interval);
        };
    }, [isPolling, realtimeConnected]);

    const preparingOrders = orders.filter(o => o.status === 'PREPARING').sort((a, b) => b.id - a.id);
    const readyOrders = orders.filter(o => o.status === 'READY').sort((a, b) => b.id - a.id);

    return (
        <div className="min-h-[85vh] flex flex-col bg-slate-950 text-white rounded-3xl overflow-hidden shadow-2xl">
            {/* HEADER */}
            <div className="bg-slate-900 border-b border-white/10 p-6 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-widest text-emerald-400">ORDER STATUS</h1>
                    <p className="text-white/50 text-lg tracking-wider mt-2">Silakan tunggu nomor pesanan Anda dipanggil</p>
                </div>
                <div className="flex gap-4 items-center">
                    {realtimeConnected ? (
                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-5 py-3 rounded-2xl font-bold text-sm shadow-sm">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            LIVE SYNC AKTIF (0% LOAD)
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-5 py-3 rounded-2xl font-bold text-sm shadow-sm">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                            MENGHUBUNGKAN...
                        </div>
                    )}
                    <button
                        onClick={fetchOrders}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-all active:scale-95 text-sm shadow-sm"
                        title="Muat Ulang Antrean Manual"
                    >
                        <RotateCw size={18} />
                        REFRESH
                    </button>
                    <button
                        onClick={() => {
                            const nextState = !soundEnabled;
                            setSoundEnabled(nextState);
                            soundEnabledRef.current = nextState;
                            
                            if (nextState) {
                                // Mainkan suara tes agar user yakin suaranya nyala
                                window.speechSynthesis.cancel(); // Hentikan suara lain
                                const u = new SpeechSynthesisUtterance("Sistem suara antrean diaktifkan");
                                u.lang = 'id-ID';
                                u.rate = 1;
                                window.speechSynthesis.speak(u);
                            } else {
                                window.speechSynthesis.cancel(); // Matikan suara kalau lagi ngomong
                            }
                        }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
                            soundEnabled 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                    >
                        {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                        {soundEnabled ? 'SUARA AKTIF' : 'SUARA MATI'}
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 grid grid-cols-2 divide-x divide-white/10">
                {/* PREPARING */}
                <div className="p-8 space-y-6">
                    <h2 className="text-3xl font-bold text-amber-400 flex items-center justify-center gap-4 mb-8">
                        <Utensils size={36} />
                        SEDANG DISIAPKAN
                    </h2>
                    
                    <div className="grid grid-cols-1 gap-6">
                        {preparingOrders.slice(0, 3).map(order => (
                            <div key={`${order.type}-${order.id}`} className="bg-slate-900/80 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
                                <span className="text-4xl font-black text-white">#{order.queueNumber || order.id}</span>
                                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap max-w-full">
                                    <span className="text-white/80 font-medium truncate">{order.label}</span>
                                    {order.saleType && (
                                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider ${
                                            order.saleType === 'TAKE_AWAY'
                                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                                : order.saleType === 'DINE_IN'
                                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                        }`}>
                                            {order.saleType.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {preparingOrders.length > 3 && (
                            <div className="text-center text-amber-500/50 font-bold italic mt-4">
                                + {preparingOrders.length - 3} pesanan lainnya antre
                            </div>
                        )}
                    </div>
                </div>

                {/* READY */}
                <div className="p-8 space-y-6 bg-emerald-950/20">
                    <h2 className="text-3xl font-bold text-emerald-400 flex items-center justify-center gap-4 mb-8">
                        <CheckCircle size={36} />
                        SILAKAN AMBIL
                    </h2>
                    
                    <div className="grid grid-cols-1 gap-6">
                        {readyOrders.slice(0, 3).map(order => (
                            <div key={`${order.type}-${order.id}`} className="bg-emerald-600 border border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] rounded-2xl p-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
                                <span className="text-5xl font-black text-white">#{order.queueNumber || order.id}</span>
                                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap max-w-full">
                                    <span className="text-white font-bold truncate">{order.label}</span>
                                    {order.saleType && (
                                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider ${
                                            order.saleType === 'TAKE_AWAY'
                                                ? 'bg-rose-950/60 text-rose-200 border border-rose-300/40'
                                                : order.saleType === 'DINE_IN'
                                                ? 'bg-sky-950/60 text-sky-200 border border-sky-300/40'
                                                : 'bg-amber-950/60 text-amber-200 border border-amber-300/40'
                                        }`}>
                                            {order.saleType.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {readyOrders.length > 3 && (
                            <div className="text-center text-emerald-500/50 font-bold italic mt-4">
                                + {readyOrders.length - 3} pesanan siap diambil
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* FOOTER */}
            <div className="bg-slate-900 border-t border-white/10 p-4 text-center">
                <p className="text-white/40 font-medium">Terima kasih atas kunjungan Anda!</p>
            </div>
        </div>
    );
}

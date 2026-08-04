'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Utensils, CheckCircle, Volume2, VolumeX } from 'lucide-react';

export default function QueueDisplay() {
    const [orders, setOrders] = useState<any[]>([]);
    const [soundEnabled, setSoundEnabled] = useState(false);
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
        const interval = setInterval(fetchOrders, 5000); // Polling faster for TV (every 5 seconds)
        return () => clearInterval(interval);
    }, []);

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
                                <span className="text-white/60 font-medium mt-2 truncate w-full">{order.label}</span>
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
                                <span className="text-emerald-100 font-bold mt-2 truncate w-full">{order.label}</span>
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

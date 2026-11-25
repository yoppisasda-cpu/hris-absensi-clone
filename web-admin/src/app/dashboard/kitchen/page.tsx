'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ChefHat, Check, Clock, UtensilsCrossed, AlertCircle, BarChart3, RotateCw } from 'lucide-react';
import Link from 'next/link';

export default function KitchenDisplay() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [staffs, setStaffs] = useState<any[]>([]);
    const [selectedStaffs, setSelectedStaffs] = useState<Record<string, string>>({});
    const [kdsFilter, setKdsFilter] = useState<'ALL' | 'FOOD' | 'BEVERAGE'>('ALL');
    const [isPolling, setIsPolling] = useState(false);
    const [realtimeConnected, setRealtimeConnected] = useState(false);

    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('jwt_token');
            const tenantId = localStorage.getItem('currentTenantId');
            const headers = { 
                Authorization: `Bearer ${token}`,
                ...(tenantId ? { 'x-tenant-id': tenantId } : {})
            };
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/kitchen/orders`, { headers });
            setOrders(res.data);
        } catch (error: any) {
            console.error('Error fetching kitchen orders', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaffs = async () => {
        try {
            const token = localStorage.getItem('jwt_token');
            const tenantId = localStorage.getItem('currentTenantId');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    ...(tenantId ? { 'x-tenant-id': tenantId } : {})
                }
            });
            setStaffs(res.data);
        } catch (error: any) {
            console.error('Error fetching staffs', error);
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchStaffs();

        // 1. Setup Server-Sent Events (SSE) Realtime Stream (0 Database Load saat idle)
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
                        // Event masuk dari kasir/POS, update data instan
                        fetchOrders();
                    }
                } catch (e) {}
            };

            eventSource.onerror = () => {
                setRealtimeConnected(false);
            };
        } catch (err) {
            console.warn('Kitchen Realtime SSE error:', err);
        }

        // 2. Fallback polling HANYA jika realtime terputus dan user mengaktifkan polling manual
        let interval: any;
        if (isPolling && !realtimeConnected) {
            interval = setInterval(fetchOrders, 60000);
        }

        // 3. Deteksi otomatis saat berganti hari (00:00) agar layar bersih & fresh untuk hari baru
        let lastDateStr = new Date().toDateString();
        const midnightChecker = setInterval(() => {
            const currentDateStr = new Date().toDateString();
            if (currentDateStr !== lastDateStr) {
                lastDateStr = currentDateStr;
                fetchOrders();
            }
        }, 30000);

        return () => {
            if (eventSource) eventSource.close();
            if (interval) clearInterval(interval);
            clearInterval(midnightChecker);
        };
    }, [isPolling, realtimeConnected]);

    const markAsReady = async (type: string, id: number) => {
        try {
            const token = localStorage.getItem('jwt_token');
            const tenantId = localStorage.getItem('currentTenantId');
            const orderKey = `${type}-${id}`;
            const staffId = selectedStaffs[orderKey];

            const staffName = staffId ? (staffs.find(s => s.id.toString() === staffId)?.name || '') : null;

            await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/kitchen/orders/${type}/${id}/ready`, 
            { staffId: staffId ? Number(staffId) : null, staffName }, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    ...(tenantId ? { 'x-tenant-id': tenantId } : {})
                }
            });
            toast.success('Pesanan telah selesai!');
            fetchOrders();
        } catch (error: any) {
            toast.error('Gagal menyelesaikan pesanan');
        }
    };

    const markAsServed = async (type: string, id: number) => {
        try {
            const token = localStorage.getItem('jwt_token');
            const tenantId = localStorage.getItem('currentTenantId');
            await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/kitchen/orders/${type}/${id}/serve`, {}, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    ...(tenantId ? { 'x-tenant-id': tenantId } : {})
                }
            });
            toast.success('Pesanan telah disajikan!');
            fetchOrders();
        } catch (error: any) {
            toast.error('Gagal update status pesanan');
        }
    };

    const filteredOrders = orders.map(order => {
        const filteredItems = order.items?.filter((item: any) => {
            if (kdsFilter === 'ALL') return true;
            return item.fnbType === kdsFilter;
        }) || [];
        return { ...order, items: filteredItems };
    }).filter(order => order.items.length > 0);

    const preparingOrders = filteredOrders.filter(o => o.status === 'PREPARING');

    const formatTime = (isoString: string) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const calculateLeadTime = (start: string) => {
        if (!start) return 0;
        const diffInMinutes = Math.floor((new Date().getTime() - new Date(start).getTime()) / 60000);
        return diffInMinutes;
    };

    if (loading) return <div className="p-8 text-center text-white/50 animate-pulse">Memuat pesanan...</div>;

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ChefHat className="text-emerald-400" size={32} />
                        Kitchen Display System (KDS)
                    </h1>
                    <p className="text-white/60 mt-1">Kelola antrean pesanan dapur yang perlu dimasak secara real-time</p>
                </div>
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex bg-slate-800/50 p-1 rounded-xl">
                        <button 
                            onClick={() => setKdsFilter('ALL')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${kdsFilter === 'ALL' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Semua Pesanan
                        </button>
                        <button 
                            onClick={() => setKdsFilter('FOOD')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${kdsFilter === 'FOOD' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Dapur (Makanan)
                        </button>
                        <button 
                            onClick={() => setKdsFilter('BEVERAGE')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${kdsFilter === 'BEVERAGE' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Bar (Minuman)
                        </button>
                    </div>
                    <Link href="/dashboard/kitchen/reports" className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl transition-colors font-bold h-full">
                        <BarChart3 size={18} />
                        Laporan Produksi
                    </Link>
                    {realtimeConnected ? (
                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-xl text-xs font-bold shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Live Sync (0 Load DB)
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-2 rounded-xl text-xs font-bold shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            Menghubungkan...
                        </div>
                    )}
                    <button
                        onClick={fetchOrders}
                        className="flex items-center justify-center w-10 h-10 rounded-xl font-bold bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-all active:scale-95 shadow-sm"
                        title="Muat Ulang Pesanan Manual"
                    >
                        <RotateCw size={18} />
                    </button>
                </div>
            </div>

            {/* ANTREAN MASAK (PREPARING) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-amber-500/20">
                    <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                        <UtensilsCrossed size={20} />
                        Antrean Pesanan Sedang Disiapkan
                    </h2>
                    <span className="bg-amber-500/20 text-amber-400 px-3.5 py-1 rounded-full text-sm font-black">
                        {preparingOrders.length} Pesanan Aktif
                    </span>
                </div>

                {preparingOrders.length === 0 ? (
                    <div className="text-center py-24 text-white/40 border border-white/5 border-dashed rounded-3xl bg-slate-900/20 flex flex-col items-center justify-center gap-3">
                        <UtensilsCrossed size={52} className="text-slate-600" />
                        <p className="text-xl font-bold text-slate-300">Semua Pesanan Selesai</p>
                        <p className="text-sm text-slate-500 max-w-md">Tidak ada antrean pesanan yang perlu dimasak saat ini. Pesanan baru dari kasir/POS akan otomatis muncul di sini.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {preparingOrders.map((order) => {
                            const leadTime = calculateLeadTime(order.createdAt);
                            const isDelayed = leadTime > 15;
                            return (
                                <div key={`${order.type}-${order.id}`} className={`bg-slate-900 border ${isDelayed ? 'border-red-500/50 shadow-red-500/10' : 'border-white/10'} rounded-2xl overflow-hidden flex flex-col shadow-xl transition-all`}>
                                    <div className={`p-4 ${isDelayed ? 'bg-red-500/10' : 'bg-white/5'} flex justify-between items-center border-b border-white/10`}>
                                        <div className="flex items-center gap-3">
                                            <div className="bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg font-bold">
                                                #{order.queueNumber || order.id}
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-base text-white">{order.label}</h3>
                                                {order.saleType && (
                                                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
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
                                        <div className={`flex items-center gap-1.5 text-xs font-bold ${isDelayed ? 'text-red-400' : 'text-white/60'}`}>
                                            {isDelayed ? <AlertCircle size={15} /> : <Clock size={15} />}
                                            {leadTime} mnt
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1">
                                        <ul className="space-y-3">
                                            {order.items?.map((item: any, idx: number) => (
                                                <li key={idx} className="flex justify-between items-start text-white/80">
                                                    <div>
                                                        <div className="font-bold text-base text-slate-100">
                                                            <span className="text-emerald-400 font-black mr-2">{item.quantity}x</span>
                                                            {item.name}
                                                        </div>
                                                        {item.modifiers && Object.keys(item.modifiers).length > 0 && (
                                                            <div className="text-xs text-slate-400 mt-1 pl-6">
                                                                {Object.entries(item.modifiers).map(([k, v]: [string, any]) => `${k}: ${v.name || v}`).join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                        {order.notes && (
                                            <div className="mt-4 pt-3 border-t border-white/10 text-amber-400 font-semibold bg-amber-500/10 p-2.5 rounded-xl flex items-start gap-2 text-xs">
                                                <span className="mt-0.5">📝</span>
                                                <span>{order.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 border-t border-white/10 mt-auto space-y-3 bg-slate-950/30">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white/60 text-xs font-semibold whitespace-nowrap">Dikerjakan:</span>
                                            <select
                                                value={selectedStaffs[`${order.type}-${order.id}`] || ''}
                                                onChange={(e) => setSelectedStaffs({...selectedStaffs, [`${order.type}-${order.id}`]: e.target.value})}
                                                className="w-full bg-slate-800 text-white text-xs font-bold border border-slate-700 rounded-lg p-2 outline-none focus:border-amber-500 cursor-pointer"
                                            >
                                                <option value="">-- Pilih Staf (Opsional) --</option>
                                                {staffs.map(staff => (
                                                    <option key={staff.id} value={staff.id.toString()}>{staff.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button 
                                            onClick={() => markAsReady(order.type, order.id)}
                                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-lg shadow-emerald-500/20 text-sm">
                                            <Check size={18} /> Selesai Masak
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

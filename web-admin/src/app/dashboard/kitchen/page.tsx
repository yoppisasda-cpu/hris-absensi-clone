'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ChefHat, Check, Clock, UtensilsCrossed, AlertCircle, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function KitchenDisplay() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
            setOrders(res.data);
        } catch (error: any) {
            console.error('Error fetching kitchen orders', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000); // Polling every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const markAsReady = async (type: string, id: number) => {
        try {
            const token = localStorage.getItem('jwt_token');
            const tenantId = localStorage.getItem('currentTenantId');
            await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/kitchen/orders/${type}/${id}/ready`, {}, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    ...(tenantId ? { 'x-tenant-id': tenantId } : {})
                }
            });
            toast.success('Pesanan selesai dimasak!');
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

    const preparingOrders = orders.filter(o => o.status === 'PREPARING');
    const readyOrders = orders.filter(o => o.status === 'READY');

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
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ChefHat className="text-emerald-400" size={32} />
                        Kitchen Display System (KDS)
                    </h1>
                    <p className="text-white/60 mt-1">Kelola antrean pesanan yang masuk secara real-time</p>
                </div>
                <Link href="/dashboard/kitchen/reports" className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl transition-colors font-medium">
                    <BarChart3 size={18} />
                    Laporan Produksi
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* PREPARING COLUMN */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-amber-500/20">
                        <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                            <UtensilsCrossed size={20} />
                            Sedang Disiapkan
                        </h2>
                        <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-semibold">{preparingOrders.length}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {preparingOrders.length === 0 ? (
                            <div className="text-center p-8 text-white/40 border border-white/5 border-dashed rounded-xl">Tidak ada antrean pesanan</div>
                        ) : (
                            preparingOrders.map((order) => {
                                const leadTime = calculateLeadTime(order.createdAt);
                                const isDelayed = leadTime > 15;
                                return (
                                    <div key={`${order.type}-${order.id}`} className={`bg-slate-900 border ${isDelayed ? 'border-red-500/50' : 'border-white/10'} rounded-2xl overflow-hidden flex flex-col shadow-lg`}>
                                        <div className={`p-4 ${isDelayed ? 'bg-red-500/10' : 'bg-white/5'} flex justify-between items-center border-b border-white/10`}>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg font-bold">
                                                    #{order.queueNumber || order.id}
                                                </div>
                                                <h3 className="font-bold text-lg text-white">{order.label}</h3>
                                            </div>
                                            <div className={`flex items-center gap-2 text-sm font-medium ${isDelayed ? 'text-red-400' : 'text-white/60'}`}>
                                                {isDelayed ? <AlertCircle size={16} /> : <Clock size={16} />}
                                                {leadTime} mnt
                                            </div>
                                        </div>
                                        <div className="p-4 flex-1">
                                            <ul className="space-y-3">
                                                {order.items?.map((item: any, idx: number) => (
                                                    <li key={idx} className="flex justify-between items-start text-white/80">
                                                        <div>
                                                            <div className="font-medium text-lg">
                                                                <span className="text-emerald-400 font-bold mr-2">{item.quantity}x</span>
                                                                {item.name}
                                                            </div>
                                                            {item.modifiers && Object.keys(item.modifiers).length > 0 && (
                                                                <div className="text-sm text-white/40 mt-1 pl-6">
                                                                    {Object.entries(item.modifiers).map(([k, v]: [string, any]) => `${k}: ${v.name || v}`).join(', ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="p-4 border-t border-white/10 mt-auto">
                                            <button 
                                                onClick={() => markAsReady(order.type, order.id)}
                                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                                                <Check size={20} /> Selesai Dimasak
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* READY COLUMN */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-emerald-500/20">
                        <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                            <Check size={20} />
                            Siap Diambil / Disajikan
                        </h2>
                        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-semibold">{readyOrders.length}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {readyOrders.length === 0 ? (
                            <div className="text-center p-8 text-white/40 border border-white/5 border-dashed rounded-xl">Tidak ada makanan siap saji</div>
                        ) : (
                            readyOrders.map((order) => (
                                <div key={`${order.type}-${order.id}`} className="bg-slate-900/50 border border-emerald-500/30 rounded-2xl p-4 flex justify-between items-center shadow-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl font-bold text-xl">
                                            #{order.queueNumber || order.id}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl text-white">{order.label}</h3>
                                            <p className="text-sm text-emerald-400/80 mt-1">Selesai: {formatTime(order.preparedAt)}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => markAsServed(order.type, order.id)}
                                        className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl border border-white/10 transition-colors font-medium">
                                        Sudah Diambil
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

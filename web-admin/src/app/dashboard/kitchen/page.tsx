'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ChefHat, Check, Clock, UtensilsCrossed, AlertCircle, BarChart3, Play, Pause } from 'lucide-react';
import Link from 'next/link';

export default function KitchenDisplay() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [staffs, setStaffs] = useState<any[]>([]);
    const [selectedStaffs, setSelectedStaffs] = useState<Record<string, string>>({});
    const [kdsFilter, setKdsFilter] = useState<'ALL' | 'FOOD' | 'BEVERAGE'>('ALL');
    const [isPolling, setIsPolling] = useState(false);

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
        let interval: any;
        if (isPolling) {
            interval = setInterval(fetchOrders, 10000); // Polling every 10 seconds
        }
        return () => clearInterval(interval);
    }, [isPolling]);

    const markAsReady = async (type: string, id: number) => {
        try {
            const token = localStorage.getItem('jwt_token');
            const tenantId = localStorage.getItem('currentTenantId');
            const orderKey = `${type}-${id}`;
            const staffId = selectedStaffs[orderKey];

            if (!staffId) {
                toast.error('Mohon pilih staf yang mengerjakan terlebih dahulu!');
                return;
            }

            const staffName = staffs.find(s => s.id.toString() === staffId)?.name || '';

            await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/kitchen/orders/${type}/${id}/ready`, 
            { staffId: Number(staffId), staffName }, {
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

    const filteredOrders = orders.map(order => {
        const filteredItems = order.items?.filter((item: any) => {
            if (kdsFilter === 'ALL') return true;
            return item.fnbType === kdsFilter;
        }) || [];
        return { ...order, items: filteredItems };
    }).filter(order => order.items.length > 0);

    const preparingOrders = filteredOrders.filter(o => o.status === 'PREPARING');
    const readyOrders = filteredOrders.filter(o => o.status === 'READY');

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
                    <button
                        onClick={() => setIsPolling(!isPolling)}
                        className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold transition-all ${
                            isPolling 
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                        title={isPolling ? "Auto-Refresh Aktif" : "Auto-Refresh Mati"}
                    >
                        {isPolling ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                </div>
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
                                            {order.notes && (
                                                <div className="mt-4 pt-3 border-t border-white/10 text-amber-400 font-semibold bg-amber-500/10 p-2 rounded flex items-start gap-2">
                                                    <span className="mt-0.5">📝</span>
                                                    <span>{order.notes}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 border-t border-white/10 mt-auto space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/60 text-sm font-semibold whitespace-nowrap">Dikerjakan Oleh:</span>
                                                <select
                                                    value={selectedStaffs[`${order.type}-${order.id}`] || ''}
                                                    onChange={(e) => setSelectedStaffs({...selectedStaffs, [`${order.type}-${order.id}`]: e.target.value})}
                                                    className="w-full bg-slate-800 text-white text-sm font-bold border border-slate-700 rounded-lg p-2 outline-none focus:border-amber-500"
                                                >
                                                    <option value="" disabled>-- Pilih Staf --</option>
                                                    {staffs.map(staff => (
                                                        <option key={staff.id} value={staff.id.toString()}>{staff.name}</option>
                                                    ))}
                                                </select>
                                            </div>
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
                                            {order.notes && (
                                                <p className="text-sm font-semibold text-amber-400 mt-1 bg-amber-500/10 px-2 py-0.5 rounded inline-block">📝 {order.notes}</p>
                                            )}
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

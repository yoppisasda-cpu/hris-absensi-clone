'use client';

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search, Filter, History, ArrowUpRight, ArrowDownRight, RefreshCcw, Package, Calendar } from "lucide-react";
import api from "@/lib/api";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function AdjustmentsPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventory/transactions');
            setTransactions(res.data);
        } catch (error) {
            console.error("Gagal mengambil histori stok", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const filteredTransactions = transactions.filter(t => 
        t.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.reference?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTypeDetails = (type: string) => {
        switch (type) {
            case 'IN':
                return { label: 'Stok Masuk', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: ArrowUpRight };
            case 'OUT':
                return { label: 'Stok Keluar', color: 'text-red-600', bg: 'bg-red-50', icon: ArrowDownRight };
            case 'ADJUST':
                return { label: 'Koreksi', color: 'text-orange-600', bg: 'bg-orange-50', icon: RefreshCcw };
            default:
                return { label: type, color: 'text-slate-600', bg: 'bg-slate-50', icon: History };
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    Histori Penyesuaian Stok
                </h1>
                <p className="mt-1 text-sm text-slate-500 font-medium">Lacak setiap log pergerakan barang untuk audit dan monitoring ketersediaan.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-12">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 p-6">
                    <div className="relative w-full sm:w-96 group">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari produk, SKU, atau referensi..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr className="border-b border-slate-100">
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Waktu & Tanggal</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Nama Produk</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Tipe</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-center">Jumlah</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Referensi / Catatan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4"><div className="h-10 w-full rounded bg-slate-50"></div></td>
                                    </tr>
                                ))
                            ) : filteredTransactions.length > 0 ? (
                                filteredTransactions.map((t) => {
                                    const details = getTypeDetails(t.type);
                                    const Icon = details.icon;
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-slate-600 font-medium">
                                                    <Calendar className="h-3.5 w-3.5 opacity-50" />
                                                    {format(new Date(t.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center">
                                                        <Package className="h-4 w-4 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 leading-tight">{t.product_name}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono font-bold uppercase">{t.product_sku || '-'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${details.bg} ${details.color}`}>
                                                    <Icon className="h-3 w-3" />
                                                    {details.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-lg font-black italic ${t.type === 'OUT' ? 'text-red-600' : t.type === 'IN' ? 'text-emerald-600' : 'text-orange-600'}`}>
                                                    {t.type === 'OUT' ? '-' : t.type === 'IN' ? '+' : ''}{t.quantity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-slate-500 font-medium italic text-xs">"{t.reference || '-'}"</p>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="rounded-full bg-slate-50 p-6"><History className="h-10 w-10 text-slate-200" /></div>
                                            <p className="text-sm font-bold text-slate-400 italic">Belum ada histori penyesuaian stok.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 border-t border-slate-200 italic">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <p>© 2026 aivola.id - Smart Inventory Audit</p>
                    <span className="h-4 w-[1px] bg-slate-200"></span>
                    <p>Stock Movement Integrity Secured</p>
                </div>
                <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                    <div className="h-3 w-3 rounded-full bg-slate-200"></div>
                </div>
            </div>
        </DashboardLayout>
    );
}

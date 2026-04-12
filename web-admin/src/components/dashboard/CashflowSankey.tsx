
'use client';

import React, { useEffect, useState } from 'react';
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts';
import { ArrowRightLeft, Info, PieChart } from 'lucide-react';
import api from '@/lib/api';

interface FlowData {
    nodes: { name: string }[];
    links: { source: number; target: number; value: number }[];
}

export default function CashflowSankey() {
    const [data, setData] = useState<FlowData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFlow = async () => {
            try {
                const res = await api.get('/stats/financial-flow');
                setData(res.data);
            } catch (err) {
                console.error("Failed to load financial flow", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFlow();
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
    };

    if (loading) return (
        <div className="w-full h-96 bg-[#050505]/40 border border-white/10 rounded-[2.5rem] flex items-center justify-center animate-pulse">
            <div className="text-center">
                <ArrowRightLeft className="h-8 w-8 text-indigo-400 animate-spin mx-auto mb-4" />
                <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">Memetakan aliran dana bapak...</p>
            </div>
        </div>
    );

    if (!data || data.links.length === 0) return null;

    return (
        <div className="w-full mb-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="rounded-[2.5rem] border border-white/10 bg-[#050505]/40 backdrop-blur-xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                                <PieChart className="h-4 w-4 text-emerald-400" />
                            </span>
                            <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] italic">Visual Arus Kas Aivola</h3>
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tighter italic">Peta Aliran Keuangan</h2>
                    </div>
                    <div className="hidden lg:flex flex-col items-end">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">30 Hari Terakhir</span>
                        <p className="text-white/50 text-[10px] font-bold italic mt-1 max-w-xs text-right leading-relaxed">
                            Melihat kemana setiap Rupiah bapak mengalir dari sumber pemasukan ke pos pengeluaran.
                        </p>
                    </div>
                </div>

                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <Sankey
                            data={data}
                            node={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                            nodePadding={50}
                            margin={{ top: 20, left: 20, right: 20, bottom: 20 }}
                            link={{ stroke: 'rgba(99, 102, 241, 0.2)' }}
                        >
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#0f172a', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    borderRadius: '16px',
                                    fontSize: '12px',
                                    fontWeight: '900',
                                    color: '#fff'
                                }}
                                formatter={(value: any) => formatCurrency(Number(value || 0))}
                            />
                        </Sankey>
                    </ResponsiveContainer>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap gap-8 items-center justify-center">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Sumber Pendapatan</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Pusat Kas (Wallet)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Pos Pengeluaran</span>
                    </div>
                </div>
            </div>
        </div>
    );
}


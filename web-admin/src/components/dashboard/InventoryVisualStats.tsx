'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Package, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function InventoryVisualStats({ data }: { data: any }) {
    if (!data) return null;

    const { health, topProducts } = data;

    return (
        <div className="space-y-6">
            {/* Stock Health Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
                    <span>Kesehatan Stok</span>
                    <span>Total Produk: {health.reduce((a: any, b: any) => a + b.value, 0)}</span>
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
                    {health.map((item: any, i: number) => (
                        <div 
                            key={i}
                            className="h-full transition-all duration-1000 ease-out first:rounded-l-full last:rounded-r-full"
                            style={{ 
                                width: `${(item.value / health.reduce((a: any, b: any) => a + b.value, 0)) * 100}%`,
                                backgroundColor: item.color
                            }}
                            title={`${item.name}: ${item.value}`}
                        />
                    ))}
                </div>
                <div className="flex gap-4 px-1">
                    {health.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{item.name} ({item.value})</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Products Bar Chart */}
            <div className="h-44 w-full">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 px-1">Top-5 Produk Terlaris</p>
                {topProducts.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topProducts} layout="vertical" margin={{ left: -20, right: 20 }}>
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                axisLine={false} 
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                width={100}
                            />
                            <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar 
                                dataKey="sold" 
                                fill="#8b5cf6" 
                                radius={[0, 4, 4, 0]} 
                                barSize={12}
                                name="Terjual"
                            >
                                {topProducts.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#8b5cf6' : '#a78bfa'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-32 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-slate-400 text-[10px] italic">Belum ada data penjualan...</p>
                    </div>
                )}
            </div>
        </div>
    );
}

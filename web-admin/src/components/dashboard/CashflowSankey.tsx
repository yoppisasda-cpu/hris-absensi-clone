
'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, PieChart, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import api from '@/lib/api';

interface FlowData {
    nodes: { name: string }[];
    links: { source: number; target: number; value: number }[];
}

function formatCurrency(val: number) {
    if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}Jt`;
    if (val >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}K`;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function formatFull(val: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
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

    if (loading) return (
        <div className="w-full h-96 bg-[#050505]/40 border border-white/10 rounded-[2.5rem] flex items-center justify-center animate-pulse">
            <div className="text-center">
                <ArrowRightLeft className="h-8 w-8 text-indigo-400 animate-spin mx-auto mb-4" />
                <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">Memetakan aliran dana bapak...</p>
            </div>
        </div>
    );

    if (!data || data.links.length === 0) return null;

    const nodes = data.nodes;
    const links = data.links;

    // Find center index (Kas Aivola) — it's the node that both receives and sends links
    const receiverSet = new Set(links.map(l => l.target));
    const senderSet   = new Set(links.map(l => l.source));
    const centerIndex = nodes.findIndex((_, i) => receiverSet.has(i) && senderSet.has(i));

    // Left nodes: those that only send (sources)
    const leftIndexes = nodes
        .map((_, i) => i)
        .filter(i => i !== centerIndex && senderSet.has(i) && !receiverSet.has(i));

    // Right nodes: those that only receive (sinks)
    const rightIndexes = nodes
        .map((_, i) => i)
        .filter(i => i !== centerIndex && receiverSet.has(i) && !senderSet.has(i));

    // Calculate totals
    const totalIn  = links.filter(l => l.target === centerIndex).reduce((s, l) => s + l.value, 0);
    const totalOut = links.filter(l => l.source === centerIndex).reduce((s, l) => s + l.value, 0);

    // ---- SVG Layout Constants (Dynamic Height) ----
    const SVG_W = 900;
    const COL_LEFT_X  = 20;
    const COL_RIGHT_X = 680;
    const COL_CTR_X   = 380;
    const COL_CTR_W   = 140;
    const NODE_W      = 14;
    const TOP_OFFSET  = 30;
    const BOTTOM_PAD  = 80;

    // Build left bar positions
    type BarItem = { nodeIdx: number; label: string; value: number; y: number; barH: number; color: string };

    function buildBars(indexes: number[], totalRef: number, colX: number, side: 'left'|'right', chartH: number): BarItem[] {
        const items = indexes.map(i => ({
            nodeIdx: i,
            label: nodes[i].name,
            value: links.find(l => side === 'left' ? l.source === i : l.target === i)?.value || 0,
        }));

        // Reduce padding when many items to avoid overflow
        const PADDING = items.length > 8 ? 6 : 10;
        const MIN_BAR_H = items.length > 10 ? 16 : 20;
        const availableH = chartH - PADDING * (items.length - 1);
        let usedH = 0;
        const bars: BarItem[] = items.map((item, idx) => {
            const frac = totalRef > 0 ? item.value / totalRef : 1 / items.length;
            const barH = Math.max(Math.round(frac * availableH), MIN_BAR_H);
            usedH += barH + (idx > 0 ? PADDING : 0);
            return { ...item, y: 0, barH, color: '' };
        });

        // Distribute Y positions
        let curY = TOP_OFFSET;
        bars.forEach(b => {
            b.y = curY;
            curY += b.barH + PADDING;
        });

        // Assign colors
        bars.forEach(b => {
            const isProfit = b.label === 'Laba Bersih';
            const isModal  = b.label.includes('Modal');
            b.color = side === 'left'
                ? (isModal ? '#a78bfa' : '#10b981')
                : (isProfit ? '#06b6d4' : '#f43f5e');
        });

        return bars;
    }


    const leftBars  = buildBars(leftIndexes, totalIn, COL_LEFT_X, 'left', 0); // placeholder, recalc below
    const rightBars = buildBars(rightIndexes, totalOut, COL_RIGHT_X, 'right', 0);

    // Dynamically compute required height: each right node needs at least 46px (bar + padding + label)
    const MIN_NODE_SLOT = 46;
    const rightNodeCount = rightIndexes.length;
    const leftNodeCount  = leftIndexes.length;
    const minChartH = Math.max(
        rightNodeCount * MIN_NODE_SLOT,
        leftNodeCount  * MIN_NODE_SLOT,
        300
    );
    const CHART_H = minChartH;
    const SVG_H   = CHART_H + TOP_OFFSET + BOTTOM_PAD;

    // Rebuild bars with correct chartH
    const leftBarsFinal  = buildBars(leftIndexes, totalIn, COL_LEFT_X, 'left', CHART_H);
    const rightBarsFinal = buildBars(rightIndexes, totalOut, COL_RIGHT_X, 'right', CHART_H);

    // Center bar (full height)
    const ctrH = Math.min(CHART_H, CHART_H - 20);
    const ctrY = TOP_OFFSET;

    // Draw flow ribbons
    function ribbons() {
        const elems: React.ReactNode[] = [];

        leftBarsFinal.forEach((lb, idx) => {
            const frac    = totalIn > 0 ? lb.value / totalIn : 0;
            const tgtH    = frac * ctrH;
            const tgtY    = ctrY +
                leftBarsFinal.slice(0, idx).reduce((s, b) => s + (b.value / totalIn) * ctrH, 0);

            const x1 = COL_LEFT_X + NODE_W;
            const x2 = COL_CTR_X;
            const mx = (x1 + x2) / 2;

            const d = `M${x1},${lb.y} C${mx},${lb.y} ${mx},${tgtY} ${x2},${tgtY}
                       L${x2},${tgtY + tgtH} C${mx},${tgtY + tgtH} ${mx},${lb.y + lb.barH} ${x1},${lb.y + lb.barH} Z`;

            elems.push(
                <path key={`l-ribbon-${idx}`} d={d}
                    fill={lb.color} fillOpacity={0.25}
                    stroke={lb.color} strokeOpacity={0.5} strokeWidth={0.5} />
            );
        });

        let ctrRightOffset = 0;
        rightBarsFinal.forEach((rb, idx) => {
            const frac  = totalOut > 0 ? rb.value / totalOut : 0;
            const srcH  = frac * ctrH;
            const srcY  = ctrY + ctrRightOffset;
            ctrRightOffset += srcH;

            const x1 = COL_CTR_X + COL_CTR_W;
            const x2 = COL_RIGHT_X;
            const mx = (x1 + x2) / 2;

            const d = `M${x1},${srcY} C${mx},${srcY} ${mx},${rb.y} ${x2},${rb.y}
                       L${x2},${rb.y + rb.barH} C${mx},${rb.y + rb.barH} ${mx},${srcY + srcH} ${x1},${srcY + srcH} Z`;

            elems.push(
                <path key={`r-ribbon-${idx}`} d={d}
                    fill={rb.color} fillOpacity={0.2}
                    stroke={rb.color} strokeOpacity={0.4} strokeWidth={0.5} />
            );
        });

        return elems;
    }

    return (
        <div className="w-full mb-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="rounded-[2.5rem] border border-white/10 bg-[#050505]/40 backdrop-blur-xl p-8 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
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

                {/* Summary KPI row */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                        <div>
                            <p className="text-[9px] font-black text-emerald-400/70 uppercase tracking-widest">Total Pemasukan</p>
                            <p className="text-sm font-black text-emerald-300">{formatFull(totalIn)}</p>
                        </div>
                    </div>
                    <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-4 flex items-center gap-3">
                        <Wallet className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                        <div>
                            <p className="text-[9px] font-black text-indigo-400/70 uppercase tracking-widest">Kas Aivola</p>
                            <p className="text-sm font-black text-indigo-300">{formatFull(totalIn)}</p>
                        </div>
                    </div>
                    <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-center gap-3">
                        <TrendingDown className="h-5 w-5 text-rose-400 flex-shrink-0" />
                        <div>
                            <p className="text-[9px] font-black text-rose-400/70 uppercase tracking-widest">Total Pengeluaran</p>
                            <p className="text-sm font-black text-rose-300">{formatFull(totalOut)}</p>
                        </div>
                    </div>
                </div>

                {/* Custom SVG Sankey */}
                <div className="w-full overflow-x-auto">
                    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ minHeight: Math.min(SVG_H, 600) }}>
                        {/* Ribbons (drawn behind nodes) */}
                        {ribbons()}

                        {/* Left Nodes */}
                        {leftBarsFinal.map((lb) => (
                            <g key={`left-${lb.nodeIdx}`}>
                                <rect x={COL_LEFT_X} y={lb.y} width={NODE_W} height={lb.barH}
                                    fill={lb.color} rx={3} opacity={0.9} />
                                {/* Label */}
                                <text x={COL_LEFT_X + NODE_W + 8} y={lb.y + lb.barH / 2 - 5}
                                    fontSize={10} fontWeight={800} fill="#f8fafc" textAnchor="start">
                                    {lb.label.toUpperCase()}
                                </text>
                                <text x={COL_LEFT_X + NODE_W + 8} y={lb.y + lb.barH / 2 + 9}
                                    fontSize={9} fontWeight={600} fill="#94a3b8" textAnchor="start">
                                    {formatCurrency(lb.value)}
                                </text>
                            </g>
                        ))}

                        {/* Center Node — Kas Aivola */}
                        <g>
                            <rect x={COL_CTR_X} y={ctrY} width={COL_CTR_W} height={ctrH}
                                fill="url(#walletGrad)" rx={6} opacity={0.95} />
                            {/* Glow border */}
                            <rect x={COL_CTR_X} y={ctrY} width={COL_CTR_W} height={ctrH}
                                fill="none" stroke="#818cf8" strokeWidth={1.5} rx={6} opacity={0.6} />
                            <text x={COL_CTR_X + COL_CTR_W / 2} y={ctrY + ctrH / 2 - 12}
                                fontSize={11} fontWeight={900} fill="#e0e7ff" textAnchor="middle">
                                🏦 KAS AIVOLA
                            </text>
                            <text x={COL_CTR_X + COL_CTR_W / 2} y={ctrY + ctrH / 2 + 6}
                                fontSize={9} fontWeight={700} fill="#a5b4fc" textAnchor="middle">
                                {formatCurrency(totalIn)}
                            </text>
                        </g>

                        {/* Right Nodes */}
                        {rightBarsFinal.map((rb) => (
                            <g key={`right-${rb.nodeIdx}`}>
                                <rect x={COL_RIGHT_X} y={rb.y} width={NODE_W} height={rb.barH}
                                    fill={rb.color} rx={3} opacity={0.9} />
                                {/* Label to the left of the bar */}
                                <text x={COL_RIGHT_X - 8} y={rb.y + rb.barH / 2 - 5}
                                    fontSize={10} fontWeight={800} fill="#f8fafc" textAnchor="end">
                                    {rb.label.toUpperCase()}
                                </text>
                                <text x={COL_RIGHT_X - 8} y={rb.y + rb.barH / 2 + 9}
                                    fontSize={9} fontWeight={600} fill="#94a3b8" textAnchor="end">
                                    {formatCurrency(rb.value)}
                                </text>
                            </g>
                        ))}

                        {/* Gradient definitions */}
                        <defs>
                            <linearGradient id="walletGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.9} />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                {/* Legend */}
                <div className="mt-6 pt-5 border-t border-white/5 flex flex-wrap gap-8 items-center justify-center">
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
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.5)]" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Modal Usaha</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Laba Bersih</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

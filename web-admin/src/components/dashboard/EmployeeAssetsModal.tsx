'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Laptop, X, Loader2, AlertCircle, Calendar, ShieldCheck } from 'lucide-react';

interface Asset {
    id: number;
    name: string;
    serialNumber: string;
    condition: string;
    imageUrl: string | null;
    purchaseDate: string | null;
}

interface Props {
    userId: number;
    userName: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function EmployeeAssetsModal({ userId, userName, isOpen, onClose }: Props) {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchAssets = async () => {
        if (!userId) return;
        try {
            setIsLoading(true);
            const response = await api.get(`/assets?userId=${userId}`);
            setAssets(response.data);
        } catch (error) {
            console.error('Gagal mengambil data aset:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && userId) {
            fetchAssets();
        }
    }, [isOpen, userId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
            <div className="glass w-full max-w-lg rounded-[3rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-slate-950/50 border-b border-indigo-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <Laptop className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Asset Inventory</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic truncate max-w-[200px]">{userName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-10 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Hardware Allocation Protocol</label>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                <Loader2 className="h-10 w-10 animate-spin mb-4 text-indigo-500/30" />
                                <p className="text-[10px] font-black uppercase tracking-widest italic animate-pulse">Scanning Bio-Links...</p>
                            </div>
                        ) : assets.length === 0 ? (
                            <div className="text-center py-20 bg-slate-950 rounded-[2.5rem] border border-dashed border-white/5">
                                <ShieldCheck className="h-12 w-12 text-slate-800 mx-auto mb-4 opacity-5" />
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] italic">No active hardware anchors detected</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {assets.map(asset => (
                                    <div key={asset.id} className="p-6 bg-slate-950 border border-white/5 rounded-[2rem] hover:border-indigo-500/30 hover:bg-slate-900/50 transition-all group shadow-inner">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className="h-14 w-14 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 overflow-hidden flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                                                    {asset.imageUrl ? (
                                                        <img src={asset.imageUrl} alt={asset.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Laptop className="h-7 w-7 text-indigo-500/50 group-hover:text-indigo-500 transition-colors" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black text-white leading-none mb-2 uppercase tracking-widest italic">{asset.name}</h4>
                                                    <p className="text-[9px] text-slate-600 font-mono font-bold tracking-[0.2em] uppercase">{asset.serialNumber}</p>
                                                </div>
                                            </div>
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase italic border ${
                                                asset.condition === 'GOOD' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                asset.condition === 'FAIR' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                            }`}>
                                                {asset.condition}
                                            </span>
                                        </div>
                                        <div className="mt-5 pt-5 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest italic">
                                                <Calendar className="h-3 w-3 text-indigo-500/50" />
                                                Registry: {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('id-ID') : 'N/A'}
                                            </div>
                                            <div className="text-[9px] font-black text-indigo-500/40 uppercase tracking-[0.3em] italic">Corporate Asset Hub</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center pt-4">
                        <button
                            onClick={onClose}
                            className="w-full py-5 bg-white/5 text-slate-500 border border-white/5 rounded-[1.5rem] hover:text-white hover:bg-white/10 transition-all font-black text-[10px] uppercase italic tracking-[0.2em]"
                        >
                            Close Overlay
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

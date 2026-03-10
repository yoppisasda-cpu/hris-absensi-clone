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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 transition-all scale-100">
                {/* Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Laptop className="h-5 w-5 text-blue-600" /> Aset Karyawan
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">{userName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                <p className="text-sm font-medium">Memeriksa inventaris...</p>
                            </div>
                        ) : assets.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <ShieldCheck className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm text-slate-500 font-medium">Tidak ada aset perusahaan yang<br />sedang dipinjam oleh karyawan ini.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {assets.map(asset => (
                                    <div key={asset.id} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all group">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100/50 overflow-hidden flex items-center justify-center shrink-0">
                                                    {asset.imageUrl ? (
                                                        <img src={`http://localhost:5000${asset.imageUrl}`} alt={asset.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Laptop className="h-5 w-5 text-blue-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900 mb-0.5">{asset.name}</h4>
                                                    <p className="text-[11px] text-slate-400 font-mono tracking-wider">{asset.serialNumber}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${asset.condition === 'GOOD' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                asset.condition === 'FAIR' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                    'bg-red-50 text-red-600 border border-red-100'
                                                }`}>
                                                {asset.condition === 'GOOD' ? 'GOOD' : asset.condition === 'FAIR' ? 'FAIR' : 'BROKEN'}
                                            </span>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] font-medium text-slate-400">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('id-ID') : 'N/A'}
                                            </div>
                                            <div className="text-blue-500">Aset Inventaris</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-5 border-t border-slate-100 flex justify-center">
                        <button
                            onClick={onClose}
                            className="px-8 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors uppercase tracking-widest"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

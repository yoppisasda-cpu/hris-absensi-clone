'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, X, Check, Search } from 'lucide-react';

// Dynamically import the map to avoid SSR issues
const LeafletMap = dynamic(() => import('./LeafletMap'), { 
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400">Memuat Peta...</div>
});

interface MapPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (lat: number, lng: number) => void;
    initialLat?: number;
    initialLng?: number;
}

export default function MapPicker({ isOpen, onClose, onSelect, initialLat, initialLng }: MapPickerProps) {
    const [tempCoords, setTempCoords] = useState<{ lat: number; lng: number } | null>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
    );

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (tempCoords) {
            onSelect(tempCoords.lat, tempCoords.lng);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Pilih Lokasi</h3>
                            <p className="text-xs text-slate-500">Klik pada peta untuk menaruh pin lokasi</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Map Body */}
                <div className="p-6">
                    <div className="relative mb-4 h-[400px] overflow-hidden rounded-xl border border-slate-200">
                        <LeafletMap 
                            initialLat={initialLat} 
                            initialLng={initialLng} 
                            onLocationSelect={(lat, lng) => setTempCoords({ lat, lng })} 
                        />
                    </div>

                    {/* Coordinates Display */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-4">
                            <div className="rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Latitude</span>
                                <code className="text-sm font-semibold text-slate-700">{tempCoords?.lat.toFixed(6) || '-'}</code>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Longitude</span>
                                <code className="text-sm font-semibold text-slate-700">{tempCoords?.lng.toFixed(6) || '-'}</code>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-all"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleConfirm}
                                disabled={!tempCoords}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                <Check className="h-5 w-5" /> Gunakan Lokasi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

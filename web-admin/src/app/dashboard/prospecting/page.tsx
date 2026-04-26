'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Map as MapIcon, Database, ExternalLink, MessageCircle, Phone, Globe, Trash2, CheckCircle2, ChevronDown, ListTodo, StickyNote, MapPin, Sparkles, Info, Target, Radar, ArrowRight, Download, Save, Navigation, X, Zap, Rocket, ShieldCheck, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useFeatures } from '@/lib/FeatureContext';
import { UpgradeModal } from '@/components/dashboard/UpgradeModal';

// Load Google Maps Script Helper
const loadGoogleMaps = (apiKey: string) => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') return;
        if ((window as any).google) {
            resolve((window as any).google);
            return;
        }
        
        const existingScript = document.getElementById('google-maps-script');
        if (existingScript) {
            const checkExist = setInterval(() => {
                if ((window as any).google) {
                    clearInterval(checkExist);
                    resolve((window as any).google);
                }
            }, 100);
            return;
        }

        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve((window as any).google);
        script.onerror = (e) => reject(e);
        document.head.appendChild(script);
    });
};

export default function ProspectingPage() {
    const { hasFeature, openUpgradeModal } = useFeatures();
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState<any[]>([]);
    const [savedProspects, setSavedProspects] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'SCAN' | 'SAVED'>('SCAN');
    const [radius, setRadius] = useState(1000);
    const [category, setCategory] = useState('Restoran');
    
    // AI Analysis States
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    
    // Map States
    const [lat, setLat] = useState(-6.2146);
    const [lng, setLng] = useState(106.8213);
    const [locationName, setLocationName] = useState('Sudirman, Jakarta');
    
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMap = useRef<any>(null);
    const marker = useRef<any>(null);
    const circle = useRef<any>(null);

    // Fetch saved prospects on mount
    useEffect(() => {
        fetchSavedProspects();
    }, []);

    // Init map when tab is SCAN
    useEffect(() => {
        if (activeTab === 'SCAN' && hasFeature('PROSPECTING_AI')) {
            const timer = setTimeout(() => {
                initMap();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [activeTab, hasFeature]);

    const fetchSavedProspects = async () => {
        try {
            const res = await api.get('/prospects');
            setSavedProspects(res.data);
        } catch (err) {
            console.error("Failed to fetch prospects", err);
        }
    };

    const initMap = async () => {
        try {
            const apiKey = "AIzaSyAkMmbte2xwKP24XEwGufYD99ORW_jNJiA"; 
            const google = await loadGoogleMaps(apiKey) as any;
            
            if (!mapRef.current) return;
            if (googleMap.current) return;

            const center = { lat, lng };
            googleMap.current = new google.maps.Map(mapRef.current, {
                center,
                zoom: 14,
                styles: [
                    { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
                    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
                    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
                    { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
                    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
                    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
                    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2c6675" }] },
                    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
                    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
                    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
                    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
                    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
                ],
                disableDefaultUI: true,
                zoomControl: true,
            });

            marker.current = new google.maps.Marker({
                position: center,
                map: googleMap.current,
                draggable: true,
                animation: google.maps.Animation.DROP,
                icon: {
                    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    scale: 7,
                    fillColor: "#f59e0b",
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: "#ffffff",
                }
            });

            circle.current = new google.maps.Circle({
                strokeColor: "#f59e0b",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: "#f59e0b",
                fillOpacity: 0.1,
                map: googleMap.current,
                center: center,
                radius: radius,
            });

            googleMap.current.addListener("click", (e: any) => {
                const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                updatePosition(newPos.lat, newPos.lng);
            });

            marker.current.addListener("dragend", (e: any) => {
                updatePosition(e.latLng.lat(), e.latLng.lng());
            });

        } catch (err) {
            console.error("Map initialization failed", err);
        }
    };

    const updatePosition = (newLat: number, newLng: number) => {
        setLat(newLat);
        setLng(newLng);
        marker.current?.setPosition({ lat: newLat, lng: newLng });
        circle.current?.setCenter({ lat: newLat, lng: newLng });
        setLocationName(`Dropped Pin (${newLat.toFixed(4)}, ${newLng.toFixed(4)})`);
    };

    useEffect(() => {
        if (circle.current) {
            circle.current.setRadius(radius);
        }
    }, [radius]);

    const useCurrentLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((pos) => {
            const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            updatePosition(newPos.lat, newPos.lng);
            googleMap.current?.setCenter(newPos);
        });
    };

    const handleScan = async () => {
        setIsScanning(true);
        setScanResults([]);
        
        try {
            const res = await api.post('/prospects/scan', {
                latitude: lat,
                longitude: lng,
                radius: radius,
                category: category
            });
            setScanResults(res.data);
            
            res.data.forEach((item: any) => {
                new (window as any).google.maps.Marker({
                    position: { lat: item.latitude, lng: item.longitude },
                    map: googleMap.current,
                    title: item.name,
                    icon: {
                        path: (window as any).google.maps.SymbolPath.CIRCLE,
                        scale: 4,
                        fillColor: "#10b981",
                        fillOpacity: 1,
                        strokeWeight: 1,
                        strokeColor: "#ffffff",
                    }
                });
            });
        } catch (err: any) {
            alert("Gagal melakukan scan: " + (err.response?.data?.error || err.message));
        } finally {
            setIsScanning(false);
        }
    };

    const saveProspect = async (item: any) => {
        try {
            await api.post('/prospects', {
                name: item.name,
                phone: item.phone,
                address: item.address,
                category: item.type || category,
                website: item.website,
                instagram: item.ig,
                latitude: item.latitude,
                longitude: item.longitude,
                aiScore: item.aiScore
            });
            alert(`✅ ${item.name} disimpan!`);
            fetchSavedProspects();
        } catch (err: any) {
            alert("Gagal menyimpan: " + (err.response?.data?.error || err.message));
        }
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await api.patch(`/prospects/${id}/status`, { status });
            setSavedProspects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
        } catch (error) {
            console.error('Gagal update status:', error);
        }
    };

    const handleUpdateNotes = async (id: number, notes: string) => {
        try {
            await api.patch(`/prospects/${id}/status`, { notes });
            setSavedProspects(prev => prev.map(p => p.id === id ? { ...p, notes } : p));
        } catch (error) {
            console.error('Gagal update catatan:', error);
        }
    };

    const handleDeleteProspect = async (id: number) => {
        if (!confirm("Hapus prospek ini?")) return;
        try {
            await api.delete(`/prospects/${id}`);
            fetchSavedProspects();
        } catch (err) {
            alert("Gagal menghapus");
        }
    };

    const handleConvertToCustomer = async (id: number) => {
        try {
            await api.post(`/prospects/${id}/convert`);
            alert("Berhasil dikonversi ke pelanggan!");
            fetchSavedProspects();
        } catch (err) {
            alert("Gagal konversi");
        }
    };
 
    const [isBroadcasting, setIsBroadcasting] = useState<number | null>(null);
 
    const handleBroadcast = async (id: number, name: string) => {
        setIsBroadcasting(id);
        try {
            await api.post(`/prospects/${id}/broadcast`);
            alert(`🚀 Penawaran otomatis telah dikirim ke ${name}!`);
            fetchSavedProspects();
        } catch (err: any) {
            alert("Gagal mengirim broadcast: " + (err.response?.data?.error || err.message));
        } finally {
            setIsBroadcasting(null);
        }
    };
 
    const handleAnalyzeMarket = async () => {
        if (savedProspects.length === 0) {
            alert("Database kosong. Silakan lakukan scan radar terlebih dahulu untuk mendapatkan data yang bisa dianalisa.");
            return;
        }
        setIsAnalyzing(true);
        setAnalysisResult(null);
        setShowAnalysisModal(true);
        try {
            const res = await api.post('/prospects/analyze');
            setAnalysisResult(res.data.analysis);
        } catch (err: any) {
            alert("Gagal melakukan analisa: " + (err.response?.data?.error || err.message));
            setShowAnalysisModal(false);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'NEW': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
            case 'CONTACTED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'RESPONDED': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'NO_RESPONSE': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'INTERESTED': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
            case 'DEAL': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
            case 'REJECTED': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const statusOptions = [
        { value: 'NEW', label: '🆕 NEW' },
        { value: 'CONTACTED', label: '📞 CONTACTED' },
        { value: 'RESPONDED', label: '💬 RESPONDED' },
        { value: 'NO_RESPONSE', label: '🔇 NO RESPONSE' },
        { value: 'INTERESTED', label: '🔥 INTERESTED' },
        { value: 'DEAL', label: '🏆 DEAL' },
        { value: 'REJECTED', label: '🚫 REJECTED' }
    ];

    if (!hasFeature('PROSPECTING_AI')) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex items-center justify-center p-6">
                    <div className="max-w-2xl w-full bg-slate-900/80 rounded-[40px] border border-white/10 p-12 text-center backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600"></div>
                        <div className="absolute -top-24 -right-24 h-64 w-64 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-700"></div>
                        
                        <div className="relative">
                            <div className="h-24 w-24 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-8 border border-amber-500/30">
                                <Target className="h-12 w-12 text-amber-500 animate-pulse" />
                            </div>
                            
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-4">Modul Intelijen Terkunci</h2>
                            <p className="text-slate-400 text-lg font-medium mb-10 leading-relaxed">
                                "Prospecting AI" adalah fitur premium yang tersedia sebagai <span className="text-amber-500 font-bold italic underline">Modul Add-on</span> khusus.
                                Temukan ribuan prospek bisnis di sekitar Anda dengan satu klik.
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-10 text-left">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mb-2" />
                                    <p className="text-xs font-bold text-white uppercase tracking-widest">Deep Search</p>
                                    <p className="text-[10px] text-slate-500 mt-1">Cari ribuan bisnis dengan akurasi Google Maps.</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mb-2" />
                                    <p className="text-xs font-bold text-white uppercase tracking-widest">Contact Extract</p>
                                    <p className="text-[10px] text-slate-500 mt-1">Dapatkan Nomor HP & Website secara otomatis.</p>
                                </div>
                            </div>

                            <button 
                                onClick={openUpgradeModal}
                                className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                AKTIFKAN ADD-ON SEKARANG
                            </button>
                            
                            <p className="mt-6 text-[10px] text-slate-600 font-bold uppercase tracking-widest">Mulai ekspansi bisnis Anda hari ini.</p>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700 pb-20">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-xl shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Target className="text-white h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Prospecting AI</h1>
                            <p className="text-slate-400 text-sm font-medium italic">"Interactive scout map integrated with Google Intelligence"</p>
                        </div>
                    </div>
                    <div className="flex bg-slate-800 p-1 rounded-2xl border border-white/5">
                        <button onClick={() => setActiveTab('SCAN')} className={`px-6 py-2 rounded-xl text-[11px] font-black transition-all ${activeTab === 'SCAN' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}>RADAR SCAN</button>
                        <button onClick={() => setActiveTab('SAVED')} className={`px-6 py-2 rounded-xl text-[11px] font-black transition-all ${activeTab === 'SAVED' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white'}`}>DATABASE ({savedProspects.length})</button>
                    </div>
                </div>

                {activeTab === 'SCAN' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                        {/* FORM SIDE */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-slate-900/80 p-6 rounded-3xl border border-white/5 shadow-xl">
                                <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.3em] mb-6">Filter Intelijen</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Pusat Lokasi (Drop Pin Aktif)</label>
                                        <div className="relative group">
                                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-amber-500" />
                                            <input 
                                                type="text" 
                                                value={locationName}
                                                readOnly
                                                className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white/50 cursor-not-allowed outline-none" 
                                            />
                                            <button 
                                                onClick={useCurrentLocation}
                                                className="absolute right-2 top-2 p-1.5 bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"
                                                title="Gunakan Lokasi Saat Ini"
                                            >
                                                <Navigation className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Radius: {radius}m</label>
                                        <input type="range" min="500" max="5000" step="500" value={radius} onChange={(e) => setRadius(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Kategori Bisnis</label>
                                        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500">
                                            <option>Restoran</option>
                                            <option>Coffee Shop & Cafe</option>
                                            <option>Retail & Toko</option>
                                            <option>Apotek & Klinik</option>
                                            <option>Bengkel & Otomotif</option>
                                            <option>Barber & Salon</option>
                                        </select>
                                    </div>
                                    <button onClick={handleScan} disabled={isScanning} className={`w-full py-4 rounded-2xl font-black text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${isScanning ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xl shadow-amber-500/10 hover:scale-[1.01]'}`}>
                                        {isScanning ? <Radar className="h-5 w-5 animate-spin" /> : <Radar className="h-5 w-5" />}
                                        {isScanning ? 'MENGAMBIL DATA GOOGLE...' : 'MULAI SCAN REAL-TIME'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* MAP SIDE */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="relative h-[600px] w-full bg-slate-900 rounded-[40px] border border-white/10 overflow-hidden shadow-2xl group">
                                <div ref={mapRef} className="absolute inset-0 grayscale-[0.2] brightness-[0.8] contrast-[1.2]"></div>
                                
                                <div className="absolute top-6 left-6 flex flex-col gap-3">
                                    <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl shadow-2xl">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Radar Center</p>
                                        <p className="text-xs font-bold text-white">{lat.toFixed(4)}, {lng.toFixed(4)}</p>
                                    </div>
                                    <div className="bg-emerald-500/90 backdrop-blur-xl px-4 py-2 rounded-2xl shadow-2xl">
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Coverage Area</p>
                                        <p className="text-xs font-bold text-white italic">{radius} Meter</p>
                                    </div>
                                </div>
                                
                                {isScanning && (
                                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="relative h-32 w-32">
                                                <div className="absolute inset-0 border-4 border-amber-500/30 rounded-full animate-ping"></div>
                                                <div className="absolute inset-4 border-2 border-amber-500/50 rounded-full animate-pulse"></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Radar className="h-12 w-12 text-amber-500 animate-spin" />
                                                </div>
                                            </div>
                                            <p className="text-sm font-black text-white tracking-[0.3em] uppercase italic animate-pulse">Scanning Google Nodes...</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                                    <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Ditemukan ({scanResults.length})</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-white/2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                            <tr>
                                                <th className="px-6 py-4">Bisnis</th>
                                                <th className="px-6 py-4">Kontak</th>
                                                <th className="px-6 py-4 text-center">Score</th>
                                                <th className="px-6 py-4 text-center">Simpan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {scanResults.length === 0 ? (
                                                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-600 text-xs font-bold uppercase tracking-widest">Silakan jalankan scan.</td></tr>
                                            ) : (
                                                scanResults.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{item.name}</span>
                                                                <span className="text-[10px] text-slate-500">{item.address}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-1">
                                                                {item.phone && <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> {item.phone}</span>}
                                                                {item.website && <span className="text-[10px] text-indigo-400 flex items-center gap-1"><Globe className="h-2.5 w-2.5" /> Website Available</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`text-[10px] font-black ${item.aiScore > 90 ? 'text-emerald-400' : 'text-amber-400'}`}>{item.aiScore}%</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button onClick={() => saveProspect(item)} className="p-2 bg-amber-500/10 text-amber-500 rounded-xl hover:bg-amber-500 hover:text-white transition-all"><Save className="h-4 w-4" /></button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-900/80 rounded-[40px] border border-white/5 overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
                        <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/2">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Lead Database</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Smart Worksheet CRM Mode</p>
                            </div>
                            <button 
                                onClick={handleAnalyzeMarket}
                                className="group relative flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.05] active:scale-95 transition-all overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <Sparkles className="h-4 w-4 animate-pulse" />
                                GENERATE MARKET INSIGHT (AI)
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                                    <tr>
                                        <th className="px-10 py-6">Merchant / Location</th>
                                        <th className="px-6 py-6">Quick Connect</th>
                                        <th className="px-6 py-6">Intelligence Score</th>
                                        <th className="px-6 py-6 w-64">Status / Worksheet</th>
                                        <th className="px-10 py-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {savedProspects.length === 0 ? (<tr><td colSpan={5} className="px-10 py-24 text-center text-slate-600 font-black uppercase tracking-[0.4em] italic">Database Empty. Start Scouting.</td></tr>) : (
                                        savedProspects.map(p => (
                                            <tr key={p.id} className="hover:bg-white/2 transition-colors group">
                                                <td className="px-10 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors uppercase italic">{p.name}</span>
                                                        <span className="text-[10px] text-slate-500 font-bold mt-1 uppercase italic tracking-tighter">{p.category} | {p.address?.substring(0, 40)}...</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex items-center gap-2">
                                                        {p.phone && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleBroadcast(p.id, p.name)}
                                                                    disabled={isBroadcasting === p.id}
                                                                    title="Kirim Penawaran Otomatis (Wablas Pusat)"
                                                                    className="p-2.5 bg-amber-500/20 text-amber-500 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50"
                                                                >
                                                                    {isBroadcasting === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        const cleanPhone = p.phone.replace(/\D/g, '').replace(/^0/, '62');
                                                                        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Halo ${p.name}, kami dari Aivola ingin menawarkan solusi manajemen untuk bisnis Anda.`)}`;
                                                                        window.open(waUrl, '_blank');
                                                                        if (p.status === 'NEW') handleUpdateStatus(p.id, 'CONTACTED');
                                                                    }}
                                                                    title="Hubungi via WA Manual"
                                                                    className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10"
                                                                >
                                                                    <MessageCircle className="h-4 w-4" />
                                                                </button>
                                                                <button onClick={() => window.open(`tel:${p.phone}`, '_self')} className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"><Phone className="h-4 w-4" /></button>
                                                            </>
                                                        )}
                                                        {p.website && <button onClick={() => window.open(p.website, '_blank')} className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all"><Globe className="h-4 w-4" /></button>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                                            <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${p.aiScore}%` }}></div>
                                                        </div>
                                                        <span className="text-[11px] font-black text-white italic">{p.aiScore}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="relative">
                                                            <select 
                                                                value={p.status}
                                                                onChange={(e) => handleUpdateStatus(p.id, e.target.value)}
                                                                className={`appearance-none w-full px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest cursor-pointer outline-none transition-all ${getStatusColor(p.status)}`}
                                                            >
                                                                {statusOptions.map(opt => <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">{opt.label}</option>)}
                                                            </select>
                                                            <ChevronDown className="absolute right-3 top-2.5 h-3 w-3 opacity-50 pointer-events-none" />
                                                        </div>
                                                        <div className="flex items-center gap-2 group/notes">
                                                            <StickyNote className={`h-3 w-3 shrink-0 ${p.notes ? 'text-amber-400' : 'text-slate-700'}`} />
                                                            <input 
                                                                type="text"
                                                                placeholder="Tambahkan catatan..."
                                                                value={p.notes || ''}
                                                                onChange={(e) => handleUpdateNotes(p.id, e.target.value)}
                                                                className="bg-transparent border-none p-0 text-[9px] font-bold text-slate-500 focus:text-slate-300 outline-none w-full placeholder:text-slate-800 transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button 
                                                            onClick={() => handleConvertToCustomer(p.id)}
                                                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic shadow-lg flex items-center gap-2 ${
                                                                p.status === 'DEAL' 
                                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:scale-105 active:scale-95 shadow-indigo-600/20'
                                                            }`}
                                                        >
                                                            {p.status === 'DEAL' ? <><CheckCircle2 className="h-3 w-3" /> REGISTERED</> : 'REGISTER AS CLIENT'}
                                                        </button>
                                                        <button onClick={() => handleDeleteProspect(p.id)} className="p-2.5 bg-white/5 border border-white/10 text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 rounded-xl transition-all"><Trash2 className="h-4 w-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <UpgradeModal />

            {/* AI MARKET ANALYSIS MODAL */}
            {showAnalysisModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-slate-900 w-full max-w-3xl max-h-[80vh] rounded-[40px] border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 border-b border-white/5 bg-gradient-to-r from-indigo-600/10 to-transparent flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                                    <Sparkles className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white tracking-tight uppercase">Market Strategic Insight</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Powered by Gemini 1.5 Pro Intelligence</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAnalysisModal(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-grow">
                            {isAnalyzing ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-6">
                                    <div className="relative">
                                        <div className="h-20 w-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="h-10 w-10 bg-indigo-500/10 rounded-full animate-pulse"></div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-white font-black text-sm uppercase tracking-[0.3em] animate-pulse">AI Sedang Menganalisa Radar...</p>
                                        <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase">Menghitung kepadatan kompetitor & peluang pasar</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="prose prose-invert max-w-none">
                                    <div className="bg-white/2 rounded-3xl p-8 border border-white/5 leading-relaxed text-slate-300 whitespace-pre-wrap text-sm font-medium">
                                        {analysisResult?.split('\n').map((line, i) => {
                                            // Basic markdown rendering simulation
                                            if (line.startsWith('###')) return <h3 key={i} className="text-white font-black text-xl mt-6 mb-3 uppercase tracking-tight">{line.replace('###', '').trim()}</h3>;
                                            if (line.startsWith('##')) return <h2 key={i} className="text-white font-black text-2xl mt-8 mb-4 border-b border-white/10 pb-2">{line.replace('##', '').trim()}</h2>;
                                            if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-indigo-400 font-black uppercase tracking-widest text-xs mt-4">{line.replace(/\*\*/g, '').trim()}</p>;
                                            
                                            // Handle bold parts inside lines
                                            const parts = line.split(/(\*\*.*?\*\*)/g);
                                            return (
                                                <p key={i} className="mb-2">
                                                    {parts.map((part, j) => {
                                                        if (part.startsWith('**') && part.endsWith('**')) {
                                                            return <strong key={j} className="text-white font-bold">{part.replace(/\*\*/g, '')}</strong>;
                                                        }
                                                        return part;
                                                    })}
                                                </p>
                                            );
                                        })}
                                    </div>
                                    
                                    <div className="mt-8 p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4">
                                        <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1">Catatan Strategis</p>
                                            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                                Analisa ini bersifat prediktif berdasarkan data publik Google Maps. Gunakan sebagai referensi tambahan dalam pengambilan keputusan bisnis Anda.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="px-8 py-6 border-t border-white/5 bg-white/2 flex justify-end">
                            <button 
                                onClick={() => setShowAnalysisModal(false)}
                                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Tutup Analisa
                            </button>
                        </div>
                    </div>
                </div>
            )}

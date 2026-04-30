'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
  Target, 
  Map as MapIcon, 
  Radar, 
  Search, 
  Plus, 
  TrendingUp, 
  AlertCircle, 
  BrainCircuit, 
  Activity,
  Layers,
  ChevronRight,
  Sparkles,
  Bot,
  X
} from 'lucide-react';
import api from '@/lib/api';

const LeafletMap = dynamic(() => import('@/components/maps/LeafletMap'), { 
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse rounded-3xl flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest italic">Initializing Satellite Matrix...</div>
});

export default function ProspectingPage() {
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [clusterName, setClusterName] = useState("Jabodetabek Cluster");
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newComp, setNewComp] = useState({ name: '', brand: '', lat: -6.2088, lng: 106.8456, strength: 5 });

  const fetchCompetitors = async () => {
    try {
      const res = await api.get('/prospecting/competitors');
      setCompetitors(res.data);
    } catch (err) {
      console.error("Failed to fetch competitors", err);
    }
  };

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const handleScan = async () => {
    if (competitors.length === 0) {
        alert("Tambahkan data kompetitor terlebih dahulu untuk dianalisis.");
        return;
    }
    setIsScanning(true);
    setLoading(true);
    try {
      const res = await api.post('/prospecting/advice', { clusterName });
      setAdvice(res.data.advice);
    } catch (err) {
      console.error("Scan failed", err);
      setAdvice("Gagal menghubungkan ke Aivola Intelligence. Pastikan API Key Gemini terkonfigurasi dengan benar.");
    } finally {
      setIsScanning(false);
      setLoading(false);
    }
  };

  const handleAddCompetitor = async () => {
    try {
        await api.post('/prospecting/competitors', {
            name: newComp.name,
            brand: newComp.brand,
            latitude: newComp.lat,
            longitude: newComp.lng,
            strength: newComp.strength
        });
        setIsModalOpen(false);
        fetchCompetitors();
        setNewComp({ name: '', brand: '', lat: -6.2088, lng: 106.8456, strength: 5 });
    } catch (err) {
        console.error("Failed to add competitor", err);
    }
  };

  const handleDeleteCompetitor = async (id: number) => {
    if (!confirm("Hapus data kompetitor ini?")) return;
    try {
        await api.delete(`/prospecting/competitors/${id}`);
        fetchCompetitors();
    } catch (err) {
        console.error("Failed to delete", err);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-[1600px] mx-auto min-h-screen relative overflow-hidden">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500">
                <Target className="h-8 w-8" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest mb-2 inline-block">Expansion Prospecting</span>
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">Aivola <span className="text-emerald-600">Scout</span></h1>
              </div>
            </div>
            <p className="text-sm text-slate-500 font-medium max-w-xl italic tracking-tight">
              Kecerdasan buatan untuk pemetaan kompetitor dan pencarian "White Space" strategis untuk ekspansi bisnis Anda.
            </p>
          </div>
          
          <div className="flex items-center gap-4 p-2 bg-white border border-slate-200 rounded-[2rem] shadow-sm">
            <button className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg">Intelligence</button>
            <button className="px-6 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">Competitor Map</button>
            <button className="px-6 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">Heatmap</button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Map Column */}
          <div className="xl:col-span-8 space-y-8">
            <div className="bg-white border border-slate-200 rounded-[3rem] p-8 shadow-xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                      <MapIcon className="h-6 w-6" />
                   </div>
                   <div>
                      <h3 className="font-black text-slate-900 uppercase italic">Interactive Scout Map</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{clusterName} • Active Nodes</p>
                   </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase italic tracking-widest text-[10px] hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
                    <Plus className="h-4 w-4" />
                    Tambah Kompetitor
                  </button>
                </div>
              </div>

              <div className="relative rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-inner h-[600px] bg-slate-50">
                {/* RADAR SCAN OVERLAY */}
                {isScanning && (
                   <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                      <div className="h-[400px] w-[400px] border-[20px] border-emerald-500/20 rounded-full animate-ping opacity-30" />
                      <div className="absolute h-[300px] w-[300px] border-[10px] border-emerald-500/30 rounded-full animate-pulse opacity-50" />
                      <div className="absolute h-[600px] w-0.5 bg-emerald-500/40 origin-center animate-[spin_4s_linear_infinite]" />
                   </div>
                )}
                
                <LeafletMap 
                  markers={competitors.map(c => ({
                    lat: c.latitude,
                    lng: c.longitude,
                    title: c.name,
                    type: 'competitor'
                  }))}
                  onLocationSelect={(lat, lng) => setNewComp(prev => ({ ...prev, lat, lng }))}
                />
              </div>

              <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex gap-8">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Competitors Found</span>
                    <span className="text-2xl font-black text-slate-900 italic tracking-tighter">{competitors.length}</span>
                  </div>
                  <div className="h-10 w-px bg-slate-100 hidden md:block" />
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Market Saturation</span>
                    <span className="text-2xl font-black text-emerald-600 italic tracking-tighter">{competitors.length > 5 ? 'High' : 'Low'}</span>
                  </div>
                </div>
                
                <button 
                  onClick={handleScan}
                  disabled={isScanning}
                  className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-slate-950 text-white rounded-[2rem] font-black uppercase italic tracking-widest text-xs hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 group"
                >
                  <Radar className={`h-5 w-5 ${isScanning ? 'animate-spin' : 'group-hover:animate-pulse'}`} />
                  {isScanning ? 'Scanning Geo-Vectors...' : 'Mulai Scan Radar'}
                </button>
              </div>
            </div>

            {/* Competitor List Card */}
            <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-xl">
               <h3 className="font-black text-slate-900 mb-8 uppercase italic flex items-center gap-4">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  Competitor Intelligence Log
               </h3>
               <div className="space-y-4">
                  {competitors.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest border-2 border-dashed border-slate-100 rounded-[2rem]">
                       No Data Matrix Found In This Sector. <br/> Add competitors manually or import data.
                    </div>
                  ) : (
                    competitors.map((c, i) => (
                      <div key={i} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between group hover:border-emerald-500/30 hover:bg-white transition-all duration-500 shadow-sm hover:shadow-xl">
                         <div className="flex items-center gap-6">
                            <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-black italic shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-all">
                               {c.name.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                               <h4 className="font-black text-slate-900 uppercase italic tracking-tight">{c.name}</h4>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{c.brand || 'Local Player'} • {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-6">
                            <div className="text-right hidden sm:block">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Market Strength</span>
                               <div className="flex gap-1 justify-end">
                                  {[...Array(10)].map((_, idx) => (
                                    <div key={idx} className={`h-3 w-1 rounded-full ${idx < (c.strength || 5) ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                  ))}
                               </div>
                            </div>
                            <button onClick={() => handleDeleteCompetitor(c.id)} className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>

          {/* AI Sidebar Column */}
          <div className="xl:col-span-4 space-y-8">
             <div className="bg-slate-950 rounded-[3.5rem] p-10 text-white relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                    <BrainCircuit className="h-48 w-48 text-emerald-500" />
                </div>
                
                <div className="relative z-10">
                   <div className="flex items-center gap-4 mb-8">
                      <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-emerald-400">
                         <Bot className="h-8 w-8" />
                      </div>
                      <div>
                         <h4 className="font-black uppercase italic text-sm tracking-tighter">Aivola Scout Intelligence</h4>
                         <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest animate-pulse">Geo-Vector Analysis Engine</p>
                      </div>
                   </div>

                   {loading ? (
                     <div className="space-y-6 py-10">
                        <div className="flex items-center gap-3">
                           <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 animate-[loading_2s_infinite]" />
                           </div>
                        </div>
                        <p className="text-[10px] font-black text-center text-white/40 uppercase tracking-widest animate-pulse">Aivola Mind is analyzing competitive density...</p>
                     </div>
                   ) : advice ? (
                     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-md relative">
                           <div className="absolute -top-3 -left-3 p-2 bg-emerald-600 rounded-xl shadow-lg">
                              <Sparkles className="h-4 w-4 text-white" />
                           </div>
                           <p className="text-sm font-medium leading-relaxed italic text-slate-200 whitespace-pre-wrap">
                              {advice}
                           </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem]">
                              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-2">Expansion Index</span>
                              <span className="text-3xl font-black italic tracking-tighter">78.5</span>
                           </div>
                           <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-[2rem]">
                              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2">Risk Vector</span>
                              <span className="text-3xl font-black italic tracking-tighter uppercase text-sm">Minimal</span>
                           </div>
                        </div>

                        <button className="w-full py-5 bg-white text-slate-950 rounded-[2rem] font-black uppercase italic tracking-widest text-xs hover:bg-emerald-600 hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95">
                           Generate Strategy PDF
                        </button>
                     </div>
                   ) : (
                     <div className="py-20 flex flex-col items-center justify-center text-center">
                        <Sparkles className="h-16 w-16 text-white/10 mb-8 animate-bounce" />
                        <p className="text-sm font-black text-white/30 uppercase tracking-[0.2em] italic max-w-[200px] leading-relaxed">Aktifkan pemindaian untuk mendapatkan saran ekspansi AI.</p>
                     </div>
                   )}
                </div>
             </div>

             <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-xl group hover:border-indigo-500/20 transition-all">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-3">
                   <Layers className="h-4 w-4 text-indigo-500" />
                   Market Saturation
                </h4>
                <div className="space-y-8">
                   <div>
                      <div className="flex justify-between items-end mb-3">
                         <span className="text-xs font-black text-slate-900 uppercase italic">{clusterName}</span>
                         <span className="text-xl font-black text-emerald-500 italic">{Math.min(100, competitors.length * 15)}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                         <div 
                           className="h-full bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-1000" 
                           style={{ width: `${Math.min(100, competitors.length * 15)}%` }}
                         />
                      </div>
                   </div>
                   <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 italic">
                      <div className="flex items-center gap-3 text-amber-600 mb-2">
                         <AlertCircle className="h-4 w-4" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Expansion Tip</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        {competitors.length > 5 
                          ? "Kepadatan tinggi terdeteksi. Disarankan mencari area perumahan di pinggiran cluster ini."
                          : "Pasar masih cukup terbuka. Fokus pada branding di titik-titik pusat keramaian."
                        }
                      </p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* ADD COMPETITOR MODAL */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
                <div className="relative bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Tambah Node Kompetitor</h3>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nama Outlet / Bisnis</label>
                            <input 
                                type="text" 
                                value={newComp.name}
                                onChange={e => setNewComp(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Contoh: Kopi Kenangan Cab. A"
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Brand / Franchise</label>
                            <input 
                                type="text" 
                                value={newComp.brand}
                                onChange={e => setNewComp(prev => ({ ...prev, brand: e.target.value }))}
                                placeholder="Contoh: Kopi Kenangan"
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Latitude</label>
                                <input 
                                    type="number" 
                                    step="any"
                                    value={newComp.lat}
                                    onChange={e => setNewComp(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Longitude</label>
                                <input 
                                    type="number" 
                                    step="any"
                                    value={newComp.lng}
                                    onChange={e => setNewComp(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold"
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 italic px-1">* Tips: Klik pada peta untuk mengambil koordinat secara otomatis.</p>
                        
                        <div className="pt-4">
                            <button 
                                onClick={handleAddCompetitor}
                                disabled={!newComp.name}
                                className="w-full py-5 bg-slate-950 text-white rounded-[2rem] font-black uppercase italic tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                            >
                                Simpan Data Kompetitor
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>

      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .tracking-tighter { letter-spacing: -0.05em; }
        .italic { font-style: italic; }
        .font-black { font-weight: 900; }
      `}</style>
    </DashboardLayout>
  );
}

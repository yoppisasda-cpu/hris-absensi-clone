'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { Heart, MessageSquare, TrendingUp, AlertCircle, Smile, Meh, Frown, Clock, User, ShieldCheck, Quote } from 'lucide-react';

interface Vent {
    id: number;
    content: string;
    isAnonymous: boolean;
    sentiment: string;
    mood: string;
    score: number;
    createdAt: string;
    user: {
        name: string;
        email: string;
    } | null;
}

export default function VentsPage() {
    const [vents, setVents] = useState<Vent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchVents = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/vents');
            setVents(response.data);
        } catch (err) {
            setError('Gagal mengambil data aspirasi.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVents();
    }, []);

    const getMoodIcon = (mood: string) => {
        switch (mood) {
            case 'Senang': return <Smile className="h-5 w-5 text-green-500" />;
            case 'Netral': return <Meh className="h-5 w-5 text-blue-500" />;
            case 'Lelah': return <Frown className="h-5 w-5 text-orange-500" />;
            case 'Stres': return <AlertCircle className="h-5 w-5 text-red-500" />;
            case 'Kecewa': return <Frown className="h-5 w-5 text-red-400" />;
            default: return <Smile className="h-5 w-5 text-slate-400" />;
        }
    };

    const stats = {
        total: vents.length,
        positive: vents.filter(v => v.sentiment === 'Positive').length,
        negative: vents.filter(v => v.sentiment === 'Negative').length,
        neutral: vents.filter(v => v.sentiment === 'Neutral').length,
        anonymous: vents.filter(v => v.isAnonymous).length,
    };

    const pulseScore = vents.length > 0 
        ? Math.round((vents.reduce((acc, v) => acc + (v.score || 0.5), 0) / vents.length) * 100)
        : 0;

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Heart className="h-6 w-6 text-pink-600" /> Pulse of Company
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Dengarkan suara hati karyawan dan pahami kondisi tim melalui analisis AI.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${pulseScore > 60 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {pulseScore > 60 ? 'SEHAT' : 'BUTUH PERHATIAN'}
                        </span>
                    </div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Happiness Score</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{pulseScore}%</p>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4">
                        <div className={`h-full rounded-full transition-all duration-1000 ${pulseScore > 60 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${pulseScore}%` }}></div>
                    </div>
                </div>

                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="h-10 w-10 rounded-xl bg-pink-50 flex items-center justify-center">
                            <MessageSquare className="h-5 w-5 text-pink-600" />
                        </div>
                    </div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Aspirasi</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
                    <p className="text-xs text-slate-400 mt-2">{stats.anonymous} pesan anonim diterima</p>
                </div>

                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                            <Smile className="h-5 w-5 text-green-600" />
                        </div>
                    </div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Sentimen Positif</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.positive}</p>
                    <p className="text-xs text-green-600 mt-2 font-medium">{stats.total > 0 ? Math.round((stats.positive/stats.total)*100) : 0}% dari total</p>
                </div>

                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                        </div>
                    </div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Sentimen Negatif</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.negative}</p>
                    <p className="text-xs text-red-600 mt-2 font-medium">{stats.total > 0 ? Math.round((stats.negative/stats.total)*100) : 0}% terpantau</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-slate-400" /> Curhatan Terbaru
                    </h2>
                    
                    {isLoading ? (
                        <div className="flex h-32 items-center justify-center bg-white rounded-2xl border border-slate-100">
                             <div className="h-6 w-6 animate-spin rounded-full border-2 border-pink-500 border-t-transparent"></div>
                        </div>
                    ) : vents.length === 0 ? (
                        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                            <MessageSquare className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Belum ada aspirasi masuk.</p>
                        </div>
                    ) : vents.map((vent) => (
                        <div key={vent.id} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-pink-200 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${vent.isAnonymous ? 'bg-slate-100' : 'bg-blue-50'}`}>
                                        {vent.isAnonymous ? <ShieldCheck className="h-4 w-4 text-slate-500" /> : <User className="h-4 w-4 text-blue-500" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{vent.user?.name || 'Anonim'}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">{new Date(vent.createdAt).toLocaleString('id-ID')}</p>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                    vent.sentiment === 'Positive' ? 'bg-green-100 text-green-700' : 
                                    vent.sentiment === 'Negative' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {getMoodIcon(vent.mood)}
                                    {vent.mood}
                                </div>
                            </div>
                            <div className="relative">
                                <Quote className="absolute -left-2 -top-2 h-8 w-8 text-slate-50 opacity-10 rotate-180" />
                                <p className="text-slate-700 text-sm leading-relaxed italic">
                                    "{vent.content}"
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-600 to-rose-700 text-white shadow-lg">
                        <h3 className="font-bold flex items-center gap-2 mb-2">
                            <AlertCircle className="h-5 w-5" /> Area Perhatian AI
                        </h3>
                        <p className="text-xs text-pink-100 leading-relaxed">
                            AI mendeteksi beberapa karyawan merasa **"{vents.filter(v => v.mood === 'Lelah').length > 0 ? 'Lelah' : 'Beban Kerja'}"**. Pertimbangkan untuk mengadakan sesi bonding atau review beban kerja tim minggu ini.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 text-sm">Distribusi Mood</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Senang', color: 'bg-green-500', count: vents.filter(v => v.mood === 'Senang').length },
                                { label: 'Netral', color: 'bg-blue-500', count: vents.filter(v => v.mood === 'Netral').length },
                                { label: 'Lelah', color: 'bg-orange-500', count: vents.filter(v => v.mood === 'Lelah').length },
                                { label: 'Stres', color: 'bg-red-500', count: vents.filter(v => v.mood === 'Stres').length },
                            ].map((m, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-500 font-medium">{m.label}</span>
                                        <span className="text-slate-900 font-bold">{m.count}</span>
                                    </div>
                                    <div className="w-full bg-slate-50 h-1.5 rounded-full">
                                        <div className={`h-full rounded-full ${m.color}`} style={{ width: `${vents.length > 0 ? (m.count/vents.length)*100 : 0}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

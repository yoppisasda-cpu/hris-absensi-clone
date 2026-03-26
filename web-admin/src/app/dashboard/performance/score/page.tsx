'use client';

import { useEffect, useState, use, Suspense } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { TrendingUp, Save, ChevronLeft, Calendar, User, Target, MessageSquare, Award } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Indicator {
    id: number;
    name: string;
    description: string | null;
    target: number;
    weight: number;
    isSystem?: boolean;
    systemType?: string | null;
}

interface LearningObjective {
    id: number;
    title: string;
    progress: number;
}

interface ScoreRecord {
    indicatorId: number;
    score: number;
    comment: string;
    learningObjectiveId?: number | null;
}

interface Employee {
    id: number;
    name: string;
    jobTitle: string;
    division: string;
}

function ScoreContent() {
    const searchParams = useSearchParams();
    const userId = searchParams.get('userId');
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    const [indicators, setIndicators] = useState<Indicator[]>([]);
    const [scores, setScores] = useState<Record<number, ScoreRecord>>({});
    const [objectives, setObjectives] = useState<LearningObjective[]>([]);
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (userId) {
            fetchData();
        }
    }, [userId, month, year]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [indRes, scoreRes, empRes, autoRes] = await Promise.all([
                api.get('/kpi/indicators'),
                api.get(`/kpi/scores/${userId}?month=${month}&year=${year}`),
                api.get(`/users`),
                api.get(`/kpi/auto-score/${userId}?month=${month}&year=${year}`)
            ]);

            setIndicators(indRes.data);

            const scoreMap: Record<number, ScoreRecord> = {};
            scoreRes.data.forEach((s: any) => {
                scoreMap[s.indicatorId] = {
                    indicatorId: s.indicatorId,
                    score: s.score,
                    comment: s.comment || '',
                    learningObjectiveId: s.learningObjectiveId
                };
            });

            setObjectives(autoRes.data.objectives || []);

            autoRes.data.scores.forEach((as: any) => {
                const existing = scoreMap[as.indicatorId];
                if (!existing) {
                    scoreMap[as.indicatorId] = {
                        indicatorId: as.indicatorId,
                        score: as.score,
                        comment: 'Skor dihitung otomatis oleh sistem'
                    };
                } else if (indRes.data.find((i: any) => i.id === as.indicatorId)?.isSystem) {
                    scoreMap[as.indicatorId].score = as.score;
                    if (!scoreMap[as.indicatorId].comment) {
                        scoreMap[as.indicatorId].comment = 'Skor dihitung otomatis oleh sistem';
                    }
                }
            });

            setScores(scoreMap);

            const emp = empRes.data.find((u: any) => u.id === parseInt(userId!));
            if (emp) setEmployee(emp);

        } catch (err) {
            console.error('Gagal mengambil data penilaian', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleScoreChange = (indicatorId: number, value: number) => {
        setScores(prev => ({
            ...prev,
            [indicatorId]: {
                ...(prev[indicatorId] || { indicatorId, comment: '' }),
                score: value
            }
        }));
    };

    const handleCommentChange = (indicatorId: number, value: string) => {
        setScores(prev => ({
            ...prev,
            [indicatorId]: {
                ...(prev[indicatorId] || { indicatorId, score: 0 }),
                comment: value
            }
        }));
    };

    const handleLinkObjective = (indicatorId: number, objectiveId: number | null) => {
        const obj = objectives.find(o => o.id === objectiveId);
        setScores(prev => ({
            ...prev,
            [indicatorId]: {
                ...(prev[indicatorId] || { indicatorId, comment: '', score: 0 }),
                learningObjectiveId: objectiveId,
                score: obj ? obj.progress : (prev[indicatorId]?.score || 0)
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const promises = Object.values(scores).map(s =>
                api.post('/kpi/scores', {
                    userId,
                    indicatorId: s.indicatorId,
                    score: s.score,
                    comment: s.comment,
                    learningObjectiveId: s.learningObjectiveId,
                    month,
                    year
                })
            );
            await Promise.all(promises);
            alert('Penilaian berhasil disimpan');
        } catch (err) {
            alert('Gagal menyimpan penilaian');
        } finally {
            setIsSaving(false);
        }
    };

    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const calculateTotalScore = () => {
        let totalWeight = 0;
        let weightedScore = 0;

        indicators.forEach(ind => {
            const s = scores[ind.id];
            if (s) {
                weightedScore += (s.score * ind.weight);
                totalWeight += ind.weight;
            }
        });

        return totalWeight > 0 ? (weightedScore / totalWeight).toFixed(2) : "0.00";
    };

    if (isLoading) return <DashboardLayout><div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div></div></DashboardLayout>;

    if (!userId) {
        return <DashboardLayout><div className="p-8 text-center text-slate-500">ID Karyawan tidak ditemukan.</div></DashboardLayout>;
    }

    return (
        <DashboardLayout>
            <div className="mb-8">
                <Link href="/dashboard/performance" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mb-4 transition-colors">
                    <ChevronLeft className="h-4 w-4" /> Kembali ke Manajemen Performa
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-200 uppercase">
                            {employee?.name?.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{employee?.name}</h1>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                                <span className="flex items-center gap-1"><User className="h-3 w-3" /> {employee?.jobTitle || 'Karyawan'}</span>
                                <span className="flex items-center gap-1 font-medium text-blue-600"><Calendar className="h-3 w-3" /> {months[month - 1]} {year}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Skor Akhir KPI</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-blue-600 tracking-tight">{calculateTotalScore()}</span>
                            <span className="text-slate-300 font-bold">/ 100</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <Award className="h-5 w-5 text-amber-500" />
                        <h2 className="text-lg font-bold text-slate-800">Penilaian Indikator</h2>
                    </div>

                    {indicators.map((ind, i) => (
                        <div key={ind.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-blue-200 transition-colors">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 leading-tight">{ind.name}</h3>
                                            <p className="text-xs text-slate-400 mt-1">{ind.description || 'Target yang ditetapkan harus dicapai secara konsisten.'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 px-2 py-1 rounded text-[10px] font-bold text-blue-600 uppercase">
                                        Weight: {ind.weight}x
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                    <div className="md:col-span-5">
                                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-tight">
                                            <span>Skor Kinerja</span>
                                            <span className="text-blue-600">{scores[ind.id]?.score || 0} / 100</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="150"
                                            step="1"
                                            disabled={ind.isSystem || !!scores[ind.id]?.learningObjectiveId}
                                            value={scores[ind.id]?.score || 0}
                                            onChange={e => handleScoreChange(ind.id, parseInt(e.target.value))}
                                            className={`w-full h-2 bg-slate-100 rounded-lg appearance-none ${ind.isSystem || !!scores[ind.id]?.learningObjectiveId ? 'cursor-not-allowed grayscale opacity-50' : 'cursor-pointer accent-blue-600'}`}
                                        />
                                        <div className="flex justify-between text-[10px] text-slate-300 mt-1 px-1">
                                            <span>Mulai</span>
                                            {ind.systemType === 'ATTENDANCE' || ind.systemType === 'PUNCTUALITY' || (ind.systemType === 'LEARNING' && !!scores[ind.id]?.learningObjectiveId) ? (
                                                <span className="text-blue-500 font-bold uppercase">
                                                    Automasi {ind.systemType === 'LEARNING' ? 'Objektif' : 'Sistem'}
                                                </span>
                                            ) : (
                                                <span>Target ({ind.target})</span>
                                            )}
                                            <span>Over</span>
                                        </div>
                                        
                                        {ind.systemType === 'LEARNING' && (
                                            <div className="mt-4 pt-4 border-t border-slate-50">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Automasi Target Belajar</label>
                                                <select 
                                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                                                    value={scores[ind.id]?.learningObjectiveId || ''}
                                                    onChange={(e) => handleLinkObjective(ind.id, e.target.value ? parseInt(e.target.value) : null)}
                                                >
                                                    <option value="">-- Pilih Target Belajar Karyawan --</option>
                                                    {objectives.map(obj => (
                                                        <option key={obj.id} value={obj.id}>{obj.title} ({obj.progress}%)</option>
                                                    ))}
                                                </select>
                                                {scores[ind.id]?.learningObjectiveId && (
                                                    <p className="text-[9px] text-blue-500 font-medium mt-1 italic">
                                                        *Skor disinkronkan otomatis dari progress target belajar.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="md:col-span-7">
                                        <div className="relative">
                                            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                                            <textarea
                                                placeholder="Berikan komentar atau catatan feedback..."
                                                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-100 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                                rows={2}
                                                value={scores[ind.id]?.comment || ''}
                                                onChange={e => handleCommentChange(ind.id, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="lg:col-span-4 space-y-6 sticky top-8">
                    <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-2xl overflow-hidden relative group">
                        <TrendingUp className="absolute -right-4 -top-4 h-32 w-32 text-white/5 rotate-12 transition-transform duration-700 group-hover:scale-110" />
                        <div className="relative">
                            <h3 className="text-lg font-bold mb-2">Simpan Hasil Penilaian</h3>
                            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                                Pastikan semua kriteria sudah dinilai secara objektif sebelum menyimpan ke sistem secara permanen.
                            </p>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between text-sm py-2 border-b border-white/10">
                                    <span className="text-slate-400 italic">Bulan</span>
                                    <span className="font-bold underline decoration-blue-500 underline-offset-4">{months[month - 1]}</span>
                                </div>
                                <div className="flex justify-between text-sm py-2 border-b border-white/10">
                                    <span className="text-slate-400 italic">Total Indikator</span>
                                    <span className="font-bold">{indicators.length} Item</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={isSaving || indicators.length === 0}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                            >
                                {isSaving ? (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                ) : (
                                    <>
                                        <Save className="h-5 w-5" /> Konfirmasi & Simpan
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                                <Target className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-amber-900 text-sm">Info Skor</h4>
                                <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">
                                    Skor akhir dihitung secara otomatis menggunakan rata-rata tertimbang berdasarkan bobot (weight) setiap indikator.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

export default function ScoreUserPage() {
    return (
        <Suspense fallback={<DashboardLayout><div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div></div></DashboardLayout>}>
            <ScoreContent />
        </Suspense>
    );
}

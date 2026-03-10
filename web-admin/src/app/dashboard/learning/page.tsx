'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { School, TrendingUp, Users, Award, BookOpen, CheckCircle2, Clock, AlertTriangle, Search, Filter } from 'lucide-react';

interface Objective {
    id: number;
    title: string;
    description: string;
    category: string;
    status: string;
    progress: number;
    deadline: string | null;
    user: {
        name: string;
        jobTitle: string;
    };
}

interface ExamResult {
    id: number;
    score: number;
    createdAt: string;
    user: {
        name: string;
        jobTitle: string;
    };
    exam: {
        title: string;
    };
}

export default function LearningDashboard() {
    const [objectives, setObjectives] = useState<Objective[]>([]);
    const [examResults, setExamResults] = useState<ExamResult[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'objectives' | 'exams' | 'upload' | 'assign'>('objectives');
    
    // Form state
    const [sopTitle, setSopTitle] = useState('');
    const [sopContent, setSopContent] = useState('');
    const [sopCategory, setSopCategory] = useState('SOP');
    const [sopTargetDivision, setSopTargetDivision] = useState('');
    const [sopTargetJobTitle, setSopTargetJobTitle] = useState('');
    
    // Assign Target Form state
    const [assignUserId, setAssignUserId] = useState('');
    const [assignTitle, setAssignTitle] = useState('');
    const [assignCategory, setAssignCategory] = useState('Technical');
    const [assignDescription, setAssignDescription] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [objRes, examRes, userRes] = await Future.wait([
                api.get('/admin/learning/all'),
                api.get('/admin/learning/exams/results'),
                api.get('/users')
            ]);
            setObjectives(objRes.data);
            setExamResults(examRes.data);
            setUsers(userRes.data);
        } catch (err) {
            console.error('Failed to fetch L&D data', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to simulate Future.wait in JS
    const Future = {
        wait: (promises: Promise<any>[]) => Promise.all(promises)
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUploadSOP = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await api.post('/learning/materials', {
                title: sopTitle,
                content: sopContent,
                category: sopCategory,
                targetDivision: sopTargetDivision || null,
                targetJobTitle: sopTargetJobTitle || null
            });
            alert('SOP berhasil diupload dan Ujian AI telah digenerate!');
            setSopTitle('');
            setSopContent('');
            setSopTargetDivision('');
            setSopTargetJobTitle('');
            setActiveTab('exams');
            fetchData();
        } catch (err) {
            alert('Gagal mengupload SOP.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssignObjective = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignUserId) return alert('Pilih karyawan terlebih dahulu.');
        
        try {
            setIsSubmitting(true);
            await api.post('/learning/objectives', {
                title: assignTitle,
                description: assignDescription,
                category: assignCategory,
                targetUserId: parseInt(assignUserId)
            });
            alert('Target belajar berhasil ditugaskan!');
            setAssignTitle('');
            setAssignDescription('');
            setAssignUserId('');
            setActiveTab('objectives');
            fetchData();
        } catch (err) {
            alert('Gagal menugaskan target.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filtered = objectives.filter(o => 
        o.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredExamResults = examResults.filter(r => 
        r.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.exam.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: objectives.length,
        completed: objectives.filter(o => o.status === 'COMPLETED').length,
        inProgress: objectives.filter(o => o.status === 'IN_PROGRESS').length,
        avgProgress: objectives.length > 0 
            ? Math.round(objectives.reduce((acc, o) => acc + o.progress, 0) / objectives.length)
            : 0,
        avgExamScore: examResults.length > 0
            ? Math.round(examResults.reduce((acc, r) => acc + r.score, 0) / examResults.length)
            : 0
    };

    const categories = Array.from(new Set(objectives.map(o => o.category))).filter(Boolean);

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <School className="h-6 w-6 text-indigo-600" /> Learning & Development
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Pantau perkembangan skill dan verifikasi pemahaman SOP seluruh tim.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTab('upload')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                            activeTab === 'upload' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        + Upload SOP (AI Exam)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                        <BookOpen className="h-5 w-5 text-indigo-600" />
                    </div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Objectives</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
                </div>
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Completed</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.completed}</p>
                </div>
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                        <Award className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Avg. Exam Score</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.avgExamScore}%</p>
                </div>
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center mb-4">
                        <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">In Progress</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.inProgress}</p>
                </div>
            </div>

            <div className="mb-6 flex gap-4 border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('objectives')}
                    className={`pb-4 text-sm font-bold transition-all px-2 ${activeTab === 'objectives' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}
                >
                    User Objectives
                </button>
                <button 
                    onClick={() => setActiveTab('exams')}
                    className={`pb-4 text-sm font-bold transition-all px-2 ${activeTab === 'exams' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}
                >
                    AI Exam Results
                </button>
                <button 
                    onClick={() => setActiveTab('assign')}
                    className={`pb-4 text-sm font-bold transition-all px-2 ${activeTab === 'assign' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}
                >
                    Assign Target
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    {activeTab === 'objectives' && (
                        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                <h2 className="text-lg font-bold text-slate-900">Tracking Objectives</h2>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Cari karyawan atau target..." 
                                            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 italic text-slate-400 text-xs uppercase tracking-widest font-bold">
                                            <td className="py-4">Karyawan</td>
                                            <td className="py-4">Objective</td>
                                            <td className="py-4">Category</td>
                                            <td className="py-4">Progress</td>
                                            <td className="py-4 text-right">Status</td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr><td colSpan={5} className="py-8 text-center text-slate-400">Loading data...</td></tr>
                                        ) : filtered.length === 0 ? (
                                            <tr><td colSpan={5} className="py-8 text-center text-slate-400">Tidak ada data ditemukan.</td></tr>
                                        ) : filtered.map((obj) => (
                                            <tr key={obj.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900">{obj.user.name}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold">{obj.user.jobTitle}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-slate-700">{obj.title}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                                                        {obj.category || 'General'}
                                                    </span>
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${obj.status === 'COMPLETED' ? 'bg-green-500' : 'bg-indigo-500'}`} 
                                                                style={{ width: `${obj.progress}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{obj.progress}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-right">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                                                        obj.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                                                        obj.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {obj.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'exams' && (
                        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 mb-6">Exam Results</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 italic text-slate-400 text-xs uppercase tracking-widest font-bold">
                                            <td className="py-4">Karyawan</td>
                                            <td className="py-4">Ujian SOP</td>
                                            <td className="py-4 text-center">Skor</td>
                                            <td className="py-4 text-right">Tanggal</td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr><td colSpan={4} className="py-8 text-center text-slate-400">Loading data...</td></tr>
                                        ) : filteredExamResults.length === 0 ? (
                                            <tr><td colSpan={4} className="py-8 text-center text-slate-400">Belum ada karyawan yang menjalan ujian.</td></tr>
                                        ) : filteredExamResults.map((res) => (
                                            <tr key={res.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900">{res.user.name}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold">{res.user.jobTitle}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-sm font-medium">{res.exam.title}</td>
                                                <td className="py-4 text-center">
                                                    <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                                                        res.score >= 70 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                        {res.score.toFixed(0)}%
                                                    </span>
                                                </td>
                                                <td className="py-4 text-right text-xs text-slate-500">
                                                    {new Date(res.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'upload' && (
                        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                             <h2 className="text-lg font-bold text-slate-900 mb-6">Upload SOP Baru</h2>
                             <form onSubmit={handleUploadSOP} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Judul SOP / Materi</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Contoh: Barista Training - Standard Calibration"
                                        value={sopTitle}
                                        onChange={(e) => setSopTitle(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Kategori</label>
                                    <select 
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                        value={sopCategory}
                                        onChange={(e) => setSopCategory(e.target.value)}
                                    >
                                        <option value="SOP">SOP (Standard Operating Procedure)</option>
                                        <option value="Policy">Policy / Peraturan</option>
                                        <option value="Technical">Technical Guide</option>
                                        <option value="Other">Lainnya</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Isi Materi (Teks)</label>
                                    <textarea 
                                        required
                                        rows={8}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Tempelkan isi SOP di sini. AI akan membuatkan pertanyaan dari teks ini secara otomatis."
                                        value={sopContent}
                                        onChange={(e) => setSopContent(e.target.value)}
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Divisi (Opsional)</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Contoh: Barista"
                                            value={sopTargetDivision}
                                            onChange={(e) => setSopTargetDivision(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Jabatan (Opsional)</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Contoh: Senior Barista"
                                            value={sopTargetJobTitle}
                                            onChange={(e) => setSopTargetJobTitle(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Memproses AI...' : 'Generate AI Exam'}
                                </button>
                             </form>
                        </div>
                    )}

                    {activeTab === 'assign' && (
                        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                             <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-indigo-600" /> Tugaskan Target Belajar
                             </h2>
                             <form onSubmit={handleAssignObjective} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Karyawan Penerima</label>
                                    <select 
                                        required
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                        value={assignUserId}
                                        onChange={(e) => setAssignUserId(e.target.value)}
                                    >
                                        <option value="">Pilih Karyawan...</option>
                                        {users.map((u: any) => (
                                            <option key={u.id} value={u.id}>{u.name} - {u.jobTitle || 'No Title'}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nama Target / Skill</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                        placeholder="Contoh: Menguasai Teknik Latte Artist 3D"
                                        value={assignTitle}
                                        onChange={(e) => setAssignTitle(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Kategori</label>
                                    <select 
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                        value={assignCategory}
                                        onChange={(e) => setAssignCategory(e.target.value)}
                                    >
                                        <option value="Technical">Technical Skill</option>
                                        <option value="Soft Skill">Soft Skill</option>
                                        <option value="Compliance">Compliance / Aturan</option>
                                        <option value="Service">Customer Service</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Deskripsi Tambahan</label>
                                    <textarea 
                                        rows={4}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                        placeholder="Berikan detail apa yang diharapkan dari target ini..."
                                        value={assignDescription}
                                        onChange={(e) => setAssignDescription(e.target.value)}
                                    ></textarea>
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 mt-4"
                                >
                                    {isSubmitting ? 'Mengirim...' : 'Tugaskan Sekarang'}
                                </button>
                             </form>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-indigo-900 text-white shadow-xl relative overflow-hidden">
                        <TrendingUp className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10 rotate-12" />
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                            <Award className="h-5 w-5 text-yellow-400" /> AI Skill Mentor
                        </h3>
                        <p className="text-sm text-indigo-100 leading-relaxed mb-4">
                            Sistem AI secara otomatis memantau skor ujian karyawan. Karyawan latte artist baru mencapai skor rata-rata **92%** pada SOP Kebersihan.
                        </p>
                        <div className="p-3 bg-white/10 rounded-xl border border-white/20">
                            <p className="text-xs font-bold text-yellow-300 flex items-center gap-1 mb-1">
                                <AlertTriangle className="h-3 w-3" /> Exam Monitoring
                            </p>
                            <p className="text-[10px] text-indigo-50 leading-tight">
                                Terdapat 5 karyawan yang belum menyelesaikan ujian SOP mingguan. Segera berikan reminder.
                            </p>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 text-sm">Distribusi Kategori</h3>
                        <div className="space-y-4">
                            {categories.slice(0, 4).map((cat, i) => {
                                const count = objectives.filter(o => o.category === cat).length;
                                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                return (
                                    <div key={i}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-500 font-medium">{cat}</span>
                                            <span className="text-slate-900 font-bold">{count}</span>
                                        </div>
                                        <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-indigo-500 rounded-full" 
                                                style={{ width: `${pct}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

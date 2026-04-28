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
    material?: {
        title: string;
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
        minScore: number;
    };
}

interface Material {
    id: number;
    title: string;
    content: string;
    imageUrl?: string;
    category: string;
    createdAt: string;
    exams: {
        id: number;
        title: string;
        minScore: number;
        questions: {
            id: number;
            question: string;
            options: string[];
            correctAnswer: string;
        }[];
    }[];
    targetDivision?: string;
    targetJobTitle?: string;
}

export default function LearningDashboard() {
    const [objectives, setObjectives] = useState<Objective[]>([]);
    const [examResults, setExamResults] = useState<ExamResult[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'objectives' | 'exams' | 'library' | 'upload' | 'assign'>('objectives');
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{id: number, type: 'material' | 'result'} | null>(null);
    
    // Form state
    const [sopTitle, setSopTitle] = useState('');
    const [sopContent, setSopContent] = useState('');
    const [sopCategory, setSopCategory] = useState('SOP');
    const [sopTargetDivision, setSopTargetDivision] = useState('');
    const [sopTargetJobTitle, setSopTargetJobTitle] = useState('');
    const [sopQuestionCount, setSopQuestionCount] = useState(5);
    const [sopMinScore, setSopMinScore] = useState(70);
    const [sopImage, setSopImage] = useState<File | null>(null);
    const [regenQuestions, setRegenQuestions] = useState(false);
    
    // Assign Target Form state
    const [assignUserId, setAssignUserId] = useState('');
    const [assignMaterialId, setAssignMaterialId] = useState('');
    const [assignTitle, setAssignTitle] = useState('');
    const [assignCategory, setAssignCategory] = useState('Technical');
    const [assignDescription, setAssignDescription] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [objRes, examRes, userRes, materialRes] = await Future.wait([
                api.get('/admin/learning/all'),
                api.get('/admin/learning/exams/results'),
                api.get('/users'),
                api.get('/admin/learning/materials')
            ]);
            setObjectives(objRes.data);
            setExamResults(examRes.data);
            setUsers(userRes.data);
            setMaterials(materialRes.data);
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
            const formData = new FormData();
            formData.append('title', sopTitle);
            formData.append('content', sopContent);
            formData.append('category', sopCategory);
            formData.append('targetDivision', sopTargetDivision || '');
            formData.append('targetJobTitle', sopTargetJobTitle || '');
            formData.append('questionCount', sopQuestionCount.toString());
            formData.append('minScore', sopMinScore.toString());
            if (sopImage) {
                formData.append('image', sopImage);
            }

            await api.post('/learning/materials', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            alert(`SOP berhasil diupload. AI telah men-generate ${sopQuestionCount} soal ujian.`);
            setSopTitle('');
            setSopContent('');
            setSopTargetDivision('');
            setSopTargetJobTitle('');
            setSopImage(null);
            setSopQuestionCount(5); // Reset question count
            setSopMinScore(70); // Reset min score
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
                targetUserId: parseInt(assignUserId),
                materialId: assignMaterialId || null
            });
            alert('Target belajar berhasil ditugaskan!');
            setAssignTitle('');
            setAssignDescription('');
            setAssignUserId('');
            setAssignMaterialId('');
            setActiveTab('objectives');
            fetchData();
        } catch (err) {
            alert('Gagal menugaskan target.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteMaterial = async (id: number) => {
        console.log('[DEBUG] handleDeleteMaterial triggered for ID:', id);
        setItemToDelete({ id, type: 'material' });
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        const { id, type } = itemToDelete;
        
        try {
            setIsSubmitting(true);
            if (type === 'material') {
                await api.delete(`/admin/learning/materials/${id}`);
                alert('SOP berhasil dihapus.');
                setSelectedMaterial(null);
            } else {
                await api.delete(`/admin/learning/exams/results/${id}`);
                alert('Hasil ujian berhasil dihapus.');
            }
            setIsDeleteConfirmOpen(false);
            setItemToDelete(null);
            fetchData();
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Gagal menghapus data.';
            alert(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteExamResult = async (id: number) => {
        console.log('[DEBUG] handleDeleteExamResult triggered for ID:', id);
        setItemToDelete({ id, type: 'result' });
        setIsDeleteConfirmOpen(true);
    };

    const handleUpdateMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMaterial) return;

        try {
            setIsSubmitting(true);
            const regenerate = regenQuestions;
            
            const formData = new FormData();
            formData.append('title', sopTitle);
            formData.append('content', sopContent);
            formData.append('category', sopCategory);
            formData.append('targetDivision', sopTargetDivision || '');
            formData.append('targetJobTitle', sopTargetJobTitle || '');
            formData.append('regenerateQuestions', regenerate.toString());
            formData.append('questionCount', sopQuestionCount.toString());
            formData.append('minScore', sopMinScore.toString());
            if (sopImage) {
                formData.append('image', sopImage);
            }

            await api.put(`/admin/learning/materials/${selectedMaterial.id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            alert('SOP berhasil diperbarui.');
            setIsEditModalOpen(false);
            setSelectedMaterial(null);
            setSopImage(null);
            fetchData();
        } catch (err) {
            alert('Gagal memperbarui SOP.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (m: Material) => {
        setSopTitle(m.title);
        setSopContent(m.content);
        setSopCategory(m.category);
        setSopTargetDivision(m.targetDivision || '');
        setSopTargetJobTitle(m.targetJobTitle || '');
        setSopQuestionCount(m.exams?.[0]?.questions.length || 5);
        setSopMinScore(m.exams?.[0]?.minScore || 70);
        setRegenQuestions(false);
        setIsEditModalOpen(true);
    };

    const filtered = objectives.filter(o => 
        (o.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredExamResults = examResults.filter(r => 
        (r.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.exam?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
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
                    onClick={() => setActiveTab('library')}
                    className={`pb-4 text-sm font-bold transition-all px-2 ${activeTab === 'library' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}
                >
                    SOP Library
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
                                            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none !text-slate-900 dark:!text-slate-900 placeholder:text-slate-400 bg-white"
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
                                                        <span className="text-sm font-bold text-slate-900">{obj.user?.name || 'Unknown User'}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold">{obj.user?.jobTitle || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-slate-700">{obj.title}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className="text-[10px] items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                                            {obj.category}
                                                        </span>
                                                        {obj.material && (
                                                            <span className="text-[10px] items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold border border-indigo-100 flex gap-1">
                                                                <BookOpen size={10} /> SOP Linked
                                                            </span>
                                                        )}
                                                    </div>
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
                                             <td className="py-4 text-center">Tanggal</td>
                                             <td className="py-4 text-right">Aksi</td>
                                         </tr>
                                     </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr><td colSpan={5} className="py-8 text-center text-slate-400">Loading data...</td></tr>
                                        ) : filteredExamResults.length === 0 ? (
                                            <tr><td colSpan={5} className="py-8 text-center text-slate-400">Belum ada karyawan yang menjalan ujian.</td></tr>
                                        ) : filteredExamResults.map((res) => (
                                            <tr key={res.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900">{res.user?.name || 'Unknown User'}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold">{res.user?.jobTitle || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-sm font-medium">{res.exam?.title || 'Unknown Exam'}</td>
                                                <td className="py-4 text-center">
                                                    <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                                                        res.score >= (res.exam?.minScore ?? 70) ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                        {res.score.toFixed(0)}%
                                                    </span>
                                                </td>
                                                 <td className="py-4 text-center text-xs text-slate-500">
                                                     {new Date(res.createdAt).toLocaleDateString()}
                                                 </td>
                                                 <td className="py-4 text-right">
                                                    <button 
                                                        onClick={() => handleDeleteExamResult(res.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Hapus Hasil Ujian"
                                                    >
                                                        <AlertTriangle className="h-4 w-4" />
                                                    </button>
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
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 !text-slate-900 dark:!text-slate-900 placeholder:text-slate-400 bg-white"
                                        placeholder="Contoh: Barista Training - Standard Calibration"
                                        value={sopTitle}
                                        onChange={(e) => setSopTitle(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Kategori</label>
                                    <select 
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white !text-slate-900 dark:!text-slate-900"
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
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 !text-slate-900 dark:!text-slate-900 placeholder:text-slate-400 bg-white"
                                        placeholder="Tempelkan isi SOP di sini. AI akan membuatkan pertanyaan dari teks ini secara otomatis."
                                        value={sopContent}
                                        onChange={(e) => setSopContent(e.target.value)}
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gambar Lampiran (Opsional)</label>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white !text-slate-900"
                                        onChange={(e) => setSopImage(e.target.files?.[0] || null)}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Gunakan gambar untuk membantu visualisasi SOP.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Divisi (Opsional)</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 !text-slate-900 dark:!text-slate-900 placeholder:text-slate-400 bg-white"
                                            placeholder="Contoh: Barista"
                                            value={sopTargetDivision}
                                            onChange={(e) => setSopTargetDivision(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Jabatan (Opsional)</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 !text-slate-900 dark:!text-slate-900 placeholder:text-slate-400 bg-white"
                                            placeholder="Contoh: Senior Barista"
                                            value={sopTargetJobTitle}
                                            onChange={(e) => setSopTargetJobTitle(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Jumlah Soal Ujian (AI)</label>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="range" 
                                            min="1" 
                                            max="15" 
                                            className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            value={sopQuestionCount}
                                            onChange={(e) => setSopQuestionCount(parseInt(e.target.value))}
                                        />
                                        <span className="w-12 h-10 flex items-center justify-center bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 font-bold text-sm">
                                            {sopQuestionCount}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 font-medium italic">*AI akan men-generate soal berdasarkan jumlah ini dari isi materi.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Minimal Skor Lulus (%)</label>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            step="5"
                                            className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-green-600"
                                            value={sopMinScore}
                                            onChange={(e) => setSopMinScore(parseInt(e.target.value))}
                                        />
                                        <span className="w-12 h-10 flex items-center justify-center bg-green-50 border border-green-100 rounded-xl text-green-700 font-bold text-sm">
                                            {sopMinScore}%
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 font-medium italic">*Jika skor ujian &gt;= {sopMinScore}%, progress target belajar otomatis menjadi 100%.</p>
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 mt-4"
                                >
                                    {isSubmitting ? 'Memproses AI...' : 'Generate AI Exam'}
                                </button>
                             </form>
                        </div>
                    )}

                    {activeTab === 'library' && (
                        <div className="space-y-6">
                            {selectedMaterial ? (
                                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                                    <button 
                                        onClick={() => setSelectedMaterial(null)}
                                        className="mb-4 text-sm text-indigo-600 font-bold flex items-center gap-1 hover:underline"
                                    >
                                        ← Kembali ke Daftar
                                    </button>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 mb-2">{selectedMaterial.title}</h2>
                                            <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600 uppercase mb-2 inline-block">
                                                {selectedMaterial.category}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => openEditModal(selectedMaterial)}
                                                className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-1"
                                            >
                                                Edit SOP
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteMaterial(selectedMaterial.id)}
                                                disabled={isSubmitting}
                                                className="px-3 py-1.5 text-xs font-bold bg-white border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition-all flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {isSubmitting ? '...' : 'Hapus'}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2">Isi SOP</h3>
                                            {selectedMaterial.imageUrl && (
                                                <div className="mb-4 rounded-xl overflow-hidden border border-slate-200">
                                                    <img 
                                                        src={selectedMaterial.imageUrl.startsWith('/uploads') ? `http://localhost:5000${selectedMaterial.imageUrl}` : selectedMaterial.imageUrl} 
                                                        alt={selectedMaterial.title}
                                                        className="w-full object-contain max-h-[300px] bg-slate-100"
                                                    />
                                                </div>
                                            )}
                                            <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 leading-relaxed max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                                                {selectedMaterial.content}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2">AI-Generated Questions</h3>
                                            <div className="space-y-4">
                                                {selectedMaterial.exams?.[0]?.questions.map((q, idx) => (
                                                    <div key={q.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                                                        <p className="text-sm font-bold text-slate-800 mb-3">{idx + 1}. {q.question}</p>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {q.options.map((opt, oIdx) => (
                                                                <div key={oIdx} className={`px-3 py-2 rounded-lg text-xs border ${opt === q.correctAnswer ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                                                    {opt} {opt === q.correctAnswer && '✓'}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                                    <h2 className="text-lg font-bold text-slate-900 mb-6 font-display">SOP & Exam Library</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {materials.length === 0 ? (
                                            <div className="col-span-2 py-12 text-center text-slate-400">Belum ada SOP yang diupload.</div>
                                        ) : materials.map((m) => (
                                            <div 
                                                key={m.id} 
                                                onClick={() => setSelectedMaterial(m)}
                                                className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                        <BookOpen className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 capitalize">{new Date(m.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <h3 className="font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{m.title}</h3>
                                                <p className="text-xs text-slate-500 mb-4 line-clamp-2">{m.content}</p>
                                                <div className="flex items-center justify-between">
                                                    <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase">{m.category}</span>
                                                    <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                                                        {m.exams?.[0]?.questions.length || 0} Questions <AlertTriangle className="h-3 w-3 text-orange-400" />
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}


                    {activeTab === 'assign' && (
                        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 mb-6 font-display">Assign Learning Target</h2>
                            <form onSubmit={handleAssignObjective} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 font-display tracking-wider">Pilih Karyawan</label>
                                        <select 
                                            required
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white !text-slate-900 dark:!text-slate-900"
                                            value={assignUserId}
                                            onChange={(e) => setAssignUserId(e.target.value)}
                                        >
                                            <option value="">-- Pilih Karyawan --</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name} - {u.jobTitle}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 font-display tracking-wider">Pilih Materi SOP (Opsional)</label>
                                        <select 
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white !text-slate-900 dark:!text-slate-900"
                                            value={assignMaterialId}
                                            onChange={(e) => {
                                                const mid = e.target.value;
                                                setAssignMaterialId(mid);
                                                if (mid) {
                                                    const mat = materials.find(m => m.id === parseInt(mid));
                                                    if (mat) {
                                                        setAssignTitle(mat.title);
                                                        setAssignDescription(`Pelajari SOP "${mat.title}" dan lulus ujiannya.`);
                                                    }
                                                }
                                            }}
                                        >
                                            <option value="">-- Manual (Tanpa SOP) --</option>
                                            {materials.map(m => (
                                                <option key={m.id} value={m.id}>{m.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 font-display tracking-wider">Judul Target</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 !text-slate-900 dark:!text-slate-900 placeholder:text-slate-400 bg-white"
                                            placeholder="Contoh: Mastering Latte Art"
                                            value={assignTitle}
                                            onChange={(e) => setAssignTitle(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 font-display tracking-wider">Kategori</label>
                                        <select 
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white !text-slate-900 dark:!text-slate-900"
                                            value={assignCategory}
                                            onChange={(e) => setAssignCategory(e.target.value)}
                                        >
                                            <option value="Technical">Technical</option>
                                            <option value="Behavioral">Behavioral</option>
                                            <option value="Compliance">Compliance</option>
                                            <option value="Other">Lainnya</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 font-display tracking-wider">Deskripsi / Detail Target</label>
                                    <textarea 
                                        required
                                        rows={4}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 !text-slate-900 dark:!text-slate-900 placeholder:text-slate-400 bg-white"
                                        placeholder="Jelaskan apa yang harus dipelajari..."
                                        value={assignDescription}
                                        onChange={(e) => setAssignDescription(e.target.value)}
                                    ></textarea>
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200"
                                >
                                    {isSubmitting ? 'Mengirim...' : 'Tugaskan Target'}
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

                {/* Edit Material Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900">Edit Material SOP</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <form onSubmit={handleUpdateMaterial} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Judul SOP / Materi</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 !text-slate-900 dark:!text-slate-900 bg-white"
                                    value={sopTitle}
                                    onChange={(e) => setSopTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Kategori</label>
                                <select 
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white !text-slate-900 dark:!text-slate-900"
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
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 !text-slate-900 dark:!text-slate-900 bg-white"
                                    value={sopContent}
                                    onChange={(e) => setSopContent(e.target.value)}
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gambar Lampiran (Opsional)</label>
                                {selectedMaterial?.imageUrl && !sopImage && (
                                    <div className="mb-2 relative w-32 h-20 rounded-lg overflow-hidden border border-slate-200">
                                        <img 
                                            src={selectedMaterial.imageUrl.startsWith('/uploads') ? `http://localhost:5000${selectedMaterial.imageUrl}` : selectedMaterial.imageUrl} 
                                            alt="Current SOP" 
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <span className="text-[8px] text-white font-bold">Current Image</span>
                                        </div>
                                    </div>
                                )}
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white !text-slate-900"
                                    onChange={(e) => setSopImage(e.target.files?.[0] || null)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Divisi</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 !text-slate-900 dark:!text-slate-900 bg-white"
                                        value={sopTargetDivision}
                                        onChange={(e) => setSopTargetDivision(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Jabatan</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 !text-slate-900 dark:!text-slate-900 bg-white"
                                        value={sopTargetJobTitle}
                                        onChange={(e) => setSopTargetJobTitle(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Jumlah Soal Ujian (AI)</label>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="range" 
                                            min="1" 
                                            max="15" 
                                            className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            value={sopQuestionCount}
                                            onChange={(e) => setSopQuestionCount(parseInt(e.target.value))}
                                        />
                                        <span className="w-12 h-10 flex items-center justify-center bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 font-bold text-sm">
                                            {sopQuestionCount}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Minimal Skor Lulus (%)</label>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            step="5"
                                            className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-green-600"
                                            value={sopMinScore}
                                            onChange={(e) => setSopMinScore(parseInt(e.target.value))}
                                        />
                                        <span className="w-12 h-10 flex items-center justify-center bg-green-50 border border-green-100 rounded-xl text-green-700 font-bold text-sm">
                                            {sopMinScore}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                <input 
                                    type="checkbox" 
                                    id="regenQuestions"
                                    className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                                    checked={regenQuestions}
                                    onChange={(e) => setRegenQuestions(e.target.checked)}
                                />
                                <label htmlFor="regenQuestions" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                                    Generate ulang soal AI berdasarkan isi materi baru
                                </label>
                            </div>
                            
                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold">Konfirmasi Hapus</h3>
                        </div>
                        <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                            {itemToDelete?.type === 'material' 
                                ? 'Apakah Anda yakin ingin menghapus SOP ini? Semua ujian dan hasil terkait juga akan ikut terhapus secara permanen.' 
                                : 'Apakah Anda yakin ingin menghapus hasil ujian ini?'}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setIsDeleteConfirmOpen(false)}
                                className="py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={confirmDelete}
                                disabled={isSubmitting}
                                className="py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

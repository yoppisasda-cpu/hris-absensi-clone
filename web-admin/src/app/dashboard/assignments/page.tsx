'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { 
    Briefcase, Plus, Search, Calendar, User, Clock, CheckCircle2, 
    AlertCircle, Image as ImageIcon, X, ChevronRight, Filter, 
    MoreVertical, ArrowUpRight, Check, Ban, Sparkles
} from 'lucide-react';

interface Assignment {
    id: number;
    title: string;
    description: string | null;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
    priority: string;
    dueDate: string | null;
    resultNote: string | null;
    resultImageUrl: string | null;
    createdAt: string;
    user: {
        id: number;
        name: string;
        jobTitle: string | null;
        division: string | null;
    };
    assignedBy: {
        id: number;
        name: string;
    };
}

interface Employee {
    id: number;
    name: string;
    jobTitle: string | null;
    division: string | null;
}

export default function AssignmentsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

    const [form, setForm] = useState({
        userId: '',
        title: '',
        description: '',
        priority: 'MEDIUM',
        dueDate: ''
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [assignRes, empRes] = await Promise.all([
                api.get('/assignments'),
                api.get('/users')
            ]);
            setAssignments(assignRes.data);
            setEmployees(empRes.data.filter((u: any) => u.isActive));
        } catch (err) {
            console.error('Gagal mengambil data penugasan', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/assignments', form);
            setIsModalOpen(false);
            setForm({ userId: '', title: '', description: '', priority: 'MEDIUM', dueDate: '' });
            fetchData();
        } catch (err) {
            alert('Gagal membuat penugasan');
        }
    };

    const handleApprove = async (id: number, action: 'APPROVE' | 'REJECT' | 'VERIFY') => {
        try {
            await api.patch(`/assignments/${id}/approve`, { action });
            fetchData();
            if (selectedAssignment?.id === id) setSelectedAssignment(null);
        } catch (err) {
            alert('Gagal memproses persetujuan');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'PENDING': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'REJECTED': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const filteredAssignments = assignments.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             a.user.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'ALL' || a.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const getFullImageUrl = (path: string | null) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        let backendBase = api.defaults.baseURL || 'https://api.aivola.id/api';
        if (backendBase.endsWith('/api')) backendBase = backendBase.substring(0, backendBase.length - 4);
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${backendBase}${cleanPath}`;
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Briefcase className="h-6 w-6 text-indigo-500" /> Penugasan Karyawan
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Delegasikan tugas khusus (RnD, Project) dan pantau hasilnya secara real-time.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20"
                >
                    <Plus className="h-4 w-4" /> Beri Tugas Baru
                </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-5 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all border ${
                            activeTab === tab 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' 
                            : 'bg-[#050505]/40 border-white/5 text-slate-500 hover:text-white hover:border-white/10'
                        }`}
                    >
                        {tab === 'ALL' ? 'Semua' : 
                         tab === 'PENDING' ? 'Butuh Approval' :
                         tab === 'IN_PROGRESS' ? 'Berjalan' : 'Selesai'}
                    </button>
                ))}
                
                <div className="flex-grow"></div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Cari tugas atau nama..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 text-sm bg-[#050505]/40 border border-white/5 text-white rounded-xl focus:outline-none focus:border-indigo-500 transition-all w-64"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {isLoading ? (
                        <div className="flex h-64 items-center justify-center bg-[#050505]/40 rounded-[32px] border border-white/5">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                        </div>
                    ) : filteredAssignments.length === 0 ? (
                        <div className="flex h-64 flex-col items-center justify-center p-6 text-center bg-[#050505]/40 rounded-[32px] border border-white/5">
                            <Briefcase className="h-12 w-12 text-slate-800 mb-4" />
                            <p className="text-xl font-black italic tracking-tighter text-slate-300 uppercase">Belum ada penugasan</p>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Silakan klik tombol &quot;Beri Tugas Baru&quot; untuk memulai.</p>
                        </div>
                    ) : filteredAssignments.map((task) => (
                        <div 
                            key={task.id}
                            onClick={() => setSelectedAssignment(task)}
                            className={`p-6 rounded-[32px] border transition-all cursor-pointer group relative overflow-hidden ${
                                selectedAssignment?.id === task.id 
                                ? 'bg-indigo-600/10 border-indigo-500 shadow-2xl shadow-indigo-500/10' 
                                : 'bg-[#050505]/40 border-white/5 hover:border-white/10 hover:bg-[#050505]/60'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-black italic tracking-tighter text-white uppercase group-hover:text-indigo-400 transition">
                                            {task.title}
                                        </h3>
                                        {task.priority === 'HIGH' && (
                                            <span className="flex items-center gap-1 text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                                <AlertCircle className="h-3 w-3" /> Priority
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                        <User className="h-3 w-3" /> {task.user.name} 
                                        <span className="text-white/10">|</span> 
                                        {task.user.division || 'Umum'}
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase border ${getStatusColor(task.status)}`}>
                                    {task.status === 'PENDING' ? 'Menunggu' : 
                                     task.status === 'IN_PROGRESS' ? 'Sedang Jalan' :
                                     task.status === 'COMPLETED' ? 'Selesai' : task.status}
                                </span>
                            </div>

                            <p className="text-xs text-slate-400 line-clamp-2 mb-6 leading-relaxed">
                                {task.description || 'Tidak ada deskripsi detail.'}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest italic">Deadline</span>
                                        <span className="text-xs text-slate-300 font-bold">
                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest italic">Pemberi</span>
                                        <span className="text-xs text-slate-300 font-bold">{task.assignedBy.name}</span>
                                    </div>
                                </div>
                                <div className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-white" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Detail Panel */}
                <div className="lg:col-span-1">
                    {selectedAssignment ? (
                        <div className="bg-[#050505]/60 border border-white/10 rounded-[32px] p-8 sticky top-24 backdrop-blur-2xl animate-in slide-in-from-right-4 duration-500">
                            <div className="flex justify-between items-start mb-8">
                                <div className={`h-16 w-16 rounded-[2rem] flex items-center justify-center border shadow-xl ${getStatusColor(selectedAssignment.status)}`}>
                                    {selectedAssignment.status === 'COMPLETED' ? <CheckCircle2 className="h-8 w-8" /> : <Briefcase className="h-8 w-8" />}
                                </div>
                                <button onClick={() => setSelectedAssignment(null)} className="text-slate-500 hover:text-white">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none mb-2">
                                        {selectedAssignment.title}
                                    </h2>
                                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase border ${getStatusColor(selectedAssignment.status)}`}>
                                        {selectedAssignment.status}
                                    </span>
                                </div>

                                <div className="bg-white/5 rounded-2xl p-4">
                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-2">Deskripsi Tugas</span>
                                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                        {selectedAssignment.description || 'Tidak ada uraian tugas tambahan.'}
                                    </p>
                                </div>

                                {selectedAssignment.status === 'PENDING' && (
                                    <div className="flex gap-3 pt-4">
                                        <button 
                                            onClick={() => handleApprove(selectedAssignment.id, 'APPROVE')}
                                            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition"
                                        >
                                            <Check className="h-4 w-4" /> Approve
                                        </button>
                                        <button 
                                            onClick={() => handleApprove(selectedAssignment.id, 'REJECT')}
                                            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-red-600/20 border border-red-500/20 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-600/30 transition"
                                        >
                                            <Ban className="h-4 w-4" /> Reject
                                        </button>
                                    </div>
                                )}

                                {selectedAssignment.status === 'COMPLETED' && (
                                    <div className="space-y-4 pt-4 border-t border-white/5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                                <ArrowUpRight className="h-4 w-4" /> Hasil Penugasan
                                            </span>
                                            <button 
                                                onClick={() => handleApprove(selectedAssignment.id, 'VERIFY')}
                                                className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-[10px] font-black text-amber-400 hover:bg-amber-500/20 transition"
                                            >
                                                <Sparkles className="h-3 w-3" /> Verify & Award KPI
                                            </button>
                                        </div>
                                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
                                            <p className="text-sm text-slate-300 italic mb-4">
                                                &quot;{selectedAssignment.resultNote || 'Karyawan telah menyelesaikan tugas tanpa catatan tambahan.'}&quot;
                                            </p>
                                            {selectedAssignment.resultImageUrl && (
                                                <div className="rounded-xl overflow-hidden border border-white/10 relative group cursor-zoom-in">
                                                    <img 
                                                        src={getFullImageUrl(selectedAssignment.resultImageUrl)} 
                                                        className="w-full object-cover aspect-video"
                                                        alt="Evidence"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                        <ImageIcon className="h-8 w-8 text-white" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[#050505]/40 border border-white/5 rounded-[32px] p-12 text-center sticky top-24">
                            <div className="h-16 w-16 rounded-[2rem] bg-white/5 flex items-center justify-center mx-auto mb-6">
                                <ArrowUpRight className="h-8 w-8 text-slate-700" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Pilih tugas di daftar untuk melihat detail monitoring.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Task Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/90 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="bg-slate-900 w-full max-w-2xl rounded-[40px] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="p-8 bg-slate-950/50 border-b border-white/5 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black italic tracking-tighter text-white uppercase">Delegasi Tugas Baru</h2>
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Pilih pelaksana dan tentukan deadline target.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-10 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Siapa Pelaksananya?</label>
                                    <select
                                        required
                                        value={form.userId}
                                        onChange={e => setForm({...form, userId: e.target.value})}
                                        className="w-full bg-[#050505]/40 border border-white/10 text-white rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 focus:outline-none transition appearance-none"
                                    >
                                        <option value="">Pilih Karyawan...</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.jobTitle})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Judul Tugas / RnD</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Tuliskan nama pekerjaan..."
                                        value={form.title}
                                        onChange={e => setForm({...form, title: e.target.value})}
                                        className="w-full bg-[#050505]/40 border border-white/10 text-white rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 focus:outline-none placeholder:text-slate-700"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Prioritas</label>
                                    <select
                                        value={form.priority}
                                        onChange={e => setForm({...form, priority: e.target.value})}
                                        className="w-full bg-[#050505]/40 border border-white/10 text-white rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 focus:outline-none transition"
                                    >
                                        <option value="LOW">LOW</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="HIGH">HIGH</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Target Selesai (Deadline)</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.dueDate}
                                        onChange={e => setForm({...form, dueDate: e.target.value})}
                                        className="w-full bg-[#050505]/40 border border-white/10 text-white rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Detail Instruksi (Optional)</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Berikan instruksi detail jika diperlukan..."
                                        value={form.description}
                                        onChange={e => setForm({...form, description: e.target.value})}
                                        className="w-full bg-[#050505]/40 border border-white/10 text-white rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 focus:outline-none placeholder:text-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-4 rounded-2xl text-sm font-bold text-slate-500 hover:text-white transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] bg-indigo-600 px-4 py-4 rounded-2xl text-sm font-bold text-white hover:bg-indigo-700 transition shadow-xl shadow-indigo-600/20"
                                >
                                    Assign Tugas Sekarang
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

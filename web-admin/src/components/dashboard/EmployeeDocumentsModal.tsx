'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FileText, Plus, Trash2, X, Download, FileBox, Loader2 } from 'lucide-react';

interface EmployeeDocument {
    id: number;
    title: string;
    fileUrl: string;
    createdAt: string;
}

interface Props {
    userId: number;
    userName: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function EmployeeDocumentsModal({ userId, userName, isOpen, onClose }: Props) {
    const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [docTitle, setDocTitle] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fetchDocuments = async () => {
        if (!userId) return;
        try {
            setIsLoading(true);
            const response = await api.get(`/employees/${userId}/documents`);
            setDocuments(response.data);
        } catch (error) {
            console.error('Gagal mengambil dokumen:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && userId) {
            fetchDocuments();
        }
    }, [isOpen, userId]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !docTitle) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('title', docTitle);
            formData.append('file', selectedFile);

            await api.post(`/employees/${userId}/documents`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setDocTitle('');
            setSelectedFile(null);
            fetchDocuments();
        } catch (error) {
            alert('Gagal mengunggah dokumen.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus dokumen ini?')) return;
        try {
            await api.delete(`/documents/${id}`);
            setDocuments(prev => prev.filter(d => d.id !== id));
        } catch (error) {
            alert('Gagal menghapus dokumen.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
            <div className="glass w-full max-w-2xl rounded-[3rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-slate-950/50 border-b border-blue-500/20 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-lg shadow-blue-500/10">
                            <FileBox className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Document Vault</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic truncate max-w-[250px]">{userName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-10 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
                    {/* Form Upload */}
                    <form onSubmit={handleUpload} className="p-8 bg-slate-950 border border-white/5 rounded-[2.5rem] relative overflow-hidden group shadow-inner">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                            <Plus className="h-20 w-20 text-blue-500" />
                        </div>
                        <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-6 italic ml-1">Ingress New Payload</h3>
                        <div className="flex flex-col gap-5">
                            <input
                                type="text"
                                placeholder="DOCUMENT DESCRIPTOR (E.G. KTP, NPWP)"
                                value={docTitle}
                                onChange={e => setDocTitle(e.target.value)}
                                className="w-full rounded-2xl bg-slate-900 border border-slate-800 px-6 py-4 text-xs font-black text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all italic tracking-widest uppercase placeholder:text-slate-800"
                            />
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <input
                                        type="file"
                                        onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                        className="w-full text-[10px] text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-blue-600/10 file:text-blue-500 hover:file:bg-blue-600/20 border border-slate-800 rounded-2xl p-2 bg-slate-900 italic uppercase tracking-widest"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isUploading || !selectedFile || !docTitle}
                                    className="bg-blue-600 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 italic border border-white/10 shadow-lg shadow-blue-900/20"
                                >
                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 stroke-[3px]" />}
                                    Commit
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* List Dokumen */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Asset Repository Map</label>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-500/30" />
                                <p className="text-[10px] font-black uppercase tracking-widest italic animate-pulse">Synchronizing Data...</p>
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="text-center py-20 bg-slate-950 rounded-[2.5rem] border border-dashed border-white/5">
                                <FileText className="h-12 w-12 text-slate-800 mx-auto mb-4 opacity-5" />
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] italic">No active data payloads found</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {documents.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-6 bg-slate-950 border border-white/5 rounded-[2rem] hover:border-blue-500/30 hover:bg-slate-900/50 transition-all group shadow-inner">
                                        <div className="flex items-center gap-5">
                                            <div className="h-14 w-14 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-center text-blue-500/50 group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-all shrink-0 shadow-lg">
                                                <FileText className="h-7 w-7 stroke-[1.5px]" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-white leading-none mb-2 uppercase tracking-widest italic">{doc.title}</h4>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic">Commit Date: {new Date(doc.createdAt).toLocaleDateString('id-ID')}</p>
                                                    <div className="h-1 w-1 rounded-full bg-slate-800" />
                                                    <p className="text-[9px] text-blue-500/50 font-black uppercase tracking-widest italic">Encrypted Secure Store</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <a
                                                href={doc.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="h-11 w-11 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all group/btn"
                                                title="Open Artifact"
                                            >
                                                <Download className="h-5 w-5 transform group-hover/btn:-translate-y-0.5 transition-transform" />
                                            </a>
                                            <button
                                                onClick={() => handleDelete(doc.id)}
                                                className="h-11 w-11 flex items-center justify-center text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl border border-white/5 hover:border-rose-500/20 transition-all group/btn"
                                                title="Purge Script"
                                            >
                                                <Trash2 className="h-5 w-5 transform group-hover/btn:rotate-6 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

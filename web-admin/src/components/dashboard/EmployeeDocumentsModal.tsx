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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <FileBox className="h-5 w-5 text-blue-600" /> Dokumen Karyawan
                        </h2>
                        <p className="text-sm text-slate-500">{userName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Form Upload */}
                    <form onSubmit={handleUpload} className="mb-8 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                        <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-4">Unggah Dokumen Baru</h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Nama Dokumen (misal: KTP, NPWP)"
                                    value={docTitle}
                                    onChange={e => setDocTitle(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex-1">
                                <input
                                    type="file"
                                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white file:text-blue-700 hover:file:bg-blue-50 border border-slate-200 rounded-lg p-1"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isUploading || !selectedFile || !docTitle}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                            >
                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                Unggah
                            </button>
                        </div>
                    </form>

                    {/* List Dokumen */}
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                <p>Memuat dokumen...</p>
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">Belum ada dokumen yang diunggah.</p>
                            </div>
                        ) : (
                            documents.map(doc => (
                                <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/20 transition group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 leading-none mb-1">{doc.title}</h4>
                                            <p className="text-[10px] text-slate-400">Diunggah pd: {new Date(doc.createdAt).toLocaleDateString('id-ID')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`http://localhost:5000${doc.fileUrl}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="Buka Dokumen"
                                        >
                                            <Download className="h-5 w-5" />
                                        </a>
                                        <button
                                            onClick={() => handleDelete(doc.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                            title="Hapus"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

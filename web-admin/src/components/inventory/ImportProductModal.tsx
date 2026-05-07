'use client';

import { useState, useEffect } from "react";
import { X, Copy, Check, Building2, Package, Search, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

interface ImportProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ImportProductModal({ isOpen, onClose, onSuccess }: ImportProductModalProps) {
    const [companies, setCompanies] = useState<any[]>([]);
    const [sourceCompanyId, setSourceCompanyId] = useState<string>("");
    const [sourceProducts, setSourceProducts] = useState<any[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingProducts, setFetchingProducts] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (isOpen) {
            fetchCompanies();
        }
    }, [isOpen]);

    const fetchCompanies = async () => {
        try {
            const res = await api.get('/companies');
            setCompanies(res.data);
        } catch (error) {
            console.error("Gagal mengambil data perusahaan", error);
        }
    };

    const fetchSourceProducts = async (companyId: string) => {
        setFetchingProducts(true);
        try {
            const res = await api.get('/inventory/products', { params: { companyId } });
            setSourceProducts(res.data);
            setSelectedProductIds([]); // Reset selection
        } catch (error) {
            console.error("Gagal mengambil data produk sumber", error);
            toast.error("Gagal mengambil data produk dari perusahaan terpilih");
        } finally {
            setFetchingProducts(false);
        }
    };

    const handleImport = async () => {
        if (!sourceCompanyId) return;
        setLoading(true);
        try {
            const res = await api.post('/products/import', {
                sourceCompanyId,
                productIds: selectedProductIds.length > 0 ? selectedProductIds : null
            });
            toast.success(res.data.message);
            if (res.data.skipped > 0) {
                toast(`${res.data.skipped} produk dilewati karena SKU sudah ada.`, { icon: '⚠️' });
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Gagal import produk", error);
            toast.error(error.response?.data?.error || "Gagal melakukan import produk");
        } finally {
            setLoading(false);
        }
    };

    const toggleProductSelection = (id: number) => {
        setSelectedProductIds(prev => 
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    const filteredProducts = sourceProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#0A0A0B] border border-white/10 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-8 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <Copy className="h-6 w-6 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic tracking-tight text-white uppercase">Import Data Produk</h2>
                            <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mt-1 italic">Kloning Produk Antar Perusahaan</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block italic">1. Pilih Perusahaan Sumber</label>
                        <div className="relative group">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-indigo-500 transition-colors" />
                            <select 
                                className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-4 pl-12 pr-4 text-sm text-white focus:border-indigo-500/50 outline-none transition-all appearance-none italic font-bold uppercase tracking-wider"
                                value={sourceCompanyId}
                                onChange={(e) => {
                                    setSourceCompanyId(e.target.value);
                                    fetchSourceProducts(e.target.value);
                                }}
                            >
                                <option value="">--- PILIH PERUSAHAAN ASAL ---</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {sourceCompanyId && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block italic">2. Pilih Produk (Opsional)</label>
                                <p className="text-[9px] text-slate-500 italic font-bold uppercase tracking-widest">* Kosongkan untuk menyalin SEMUA produk</p>
                            </div>
                            
                            <div className="relative mb-4">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                <input 
                                    type="text" 
                                    placeholder="Cari produk..."
                                    className="w-full rounded-xl border border-slate-800 bg-slate-950/50 py-3 pl-11 pr-4 text-xs text-white focus:border-indigo-500/50 outline-none italic font-bold"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="max-h-[250px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/50 divide-y divide-white/5">
                                {fetchingProducts ? (
                                    <div className="p-8 text-center"><div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div></div>
                                ) : filteredProducts.length === 0 ? (
                                    <div className="p-8 text-center text-[10px] font-bold text-slate-700 uppercase italic tracking-widest">Tidak ada produk ditemukan</div>
                                ) : (
                                    filteredProducts.map(p => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => toggleProductSelection(p.id)}
                                            className={`p-4 flex items-center justify-between cursor-pointer transition-all hover:bg-white/5 ${selectedProductIds.includes(p.id) ? 'bg-indigo-500/5' : ''}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${selectedProductIds.includes(p.id) ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                                                    {selectedProductIds.includes(p.id) ? <Check className="h-4 w-4 stroke-[3px]" /> : <Package className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-white uppercase italic tracking-tight">{p.name}</p>
                                                    <p className="text-[9px] text-slate-600 font-bold tracking-widest uppercase italic">{p.sku || 'NO SKU'}</p>
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-black text-slate-500 italic">Rp {p.price.toLocaleString('id-ID')}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl flex gap-4">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                        <p className="text-[10px] text-amber-500/80 font-bold uppercase italic leading-relaxed tracking-wide">
                            Perhatian: Produk dengan SKU yang sudah ada di database akan dilewati secara otomatis untuk menghindari duplikasi data.
                        </p>
                    </div>
                </div>

                <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
                    <button 
                        onClick={onClose}
                        className="flex-1 px-8 py-4 rounded-2xl border border-slate-800 text-[10px] font-black text-slate-500 hover:text-white hover:bg-slate-800 transition-all uppercase tracking-widest italic"
                    >
                        Batalkan
                    </button>
                    <button 
                        onClick={handleImport}
                        disabled={loading || !sourceCompanyId}
                        className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/20 active:scale-95 transition-all border border-indigo-400/20 italic flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Copy className="h-4 w-4" /> 
                                {selectedProductIds.length > 0 ? `Import ${selectedProductIds.length} Produk` : 'Import Semua Produk'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

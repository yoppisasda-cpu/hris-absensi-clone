'use client';

import { useState, useEffect } from "react";
import { X, History, FileText, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

interface CustomerHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer?: any;
}

export default function CustomerHistoryModal({ isOpen, onClose, customer }: CustomerHistoryModalProps) {
    const [loading, setLoading] = useState(false);
    const [sales, setSales] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && customer?.id) {
            fetchHistory();
        } else {
            setSales([]);
        }
    }, [isOpen, customer]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/customers/${customer.id}/sales`);
            setSales(response.data);
        } catch (error) {
            console.error("Gagal mengambil riwayat", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !customer) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
            <div className="glass w-full max-w-2xl rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                <div className="bg-slate-950/50 border-b border-indigo-500/20 px-10 py-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <History className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">
                                Riwayat Belanja
                            </h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">
                                {customer.name}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : sales.length === 0 ? (
                        <div className="text-center py-16 space-y-4">
                            <div className="h-16 w-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800">
                                <History className="h-8 w-8 text-slate-500" />
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Belum ada riwayat transaksi</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sales.map((sale) => (
                                <div key={sale.id} className="p-5 rounded-3xl bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white">{sale.invoiceNumber}</p>
                                            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">
                                                {new Date(sale.date).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <p className="text-sm font-black text-emerald-400">Rp {(sale.totalAmount || 0).toLocaleString('id-ID')}</p>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                            <CheckCircle2 className="h-3 w-3" />
                                            {sale.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

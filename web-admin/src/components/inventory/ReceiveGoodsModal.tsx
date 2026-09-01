'use client';

import { useState, useEffect } from "react";
import { X, PackagePlus, Save, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    po: any;
    onSuccess: () => void;
}

export default function ReceiveGoodsModal({ isOpen, onClose, po, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (isOpen && po) {
            setItems(po.items.map((item: any) => ({
                ...item,
                newReceivedQty: 0
            })));
            setReceivedDate(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen, po]);

    if (!isOpen || !po) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const receivedItems = items
            .filter(item => Number(item.newReceivedQty) > 0)
            .map(item => ({
                id: item.id,
                receivedQty: Number(item.newReceivedQty)
            }));

        if (receivedItems.length === 0) {
            toast.error("Tidak ada barang yang diisi jumlah terimanya!");
            return;
        }

        try {
            setLoading(true);
            await api.post(`/inventory/purchase-orders/${po.id}/receive`, {
                receivedDate,
                receivedItems
            });
            toast.success("Barang berhasil diterima!");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "Gagal menerima barang");
        } finally {
            setLoading(false);
        }
    };

    const handleMaxAll = () => {
        setItems(prev => prev.map(item => ({
            ...item,
            newReceivedQty: Math.max(0, item.quantity - item.receivedQty)
        })));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl rounded-[32px] bg-slate-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-900/80 backdrop-blur-xl z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                            <PackagePlus className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Terima Barang</h2>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">PO #{po.orderNumber} - {po.supplier?.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
                    <form id="receiveForm" onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Tanggal Penerimaan</label>
                            <input
                                type="date"
                                required
                                value={receivedDate}
                                onChange={(e) => setReceivedDate(e.target.value)}
                                className="w-full sm:w-64 rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white focus:border-indigo-500/50 outline-none transition-all"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-white italic uppercase tracking-widest">Daftar Barang</h3>
                            <button
                                type="button"
                                onClick={handleMaxAll}
                                className="text-[10px] font-black bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 uppercase tracking-widest italic transition-colors"
                            >
                                Terima Semua Sisa
                            </button>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/50">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/5">
                                        <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-slate-400 italic">Nama Barang</th>
                                        <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-slate-400 italic text-center">Dipesan</th>
                                        <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-emerald-400 italic text-center">Sudah Diterima</th>
                                        <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-amber-400 italic text-center">Sisa</th>
                                        <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-indigo-400 italic text-center w-40">Terima Sekarang</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {items.map((item, idx) => {
                                        const remaining = Math.max(0, item.quantity - (item.receivedQty || 0));
                                        const isDone = remaining <= 0;
                                        return (
                                            <tr key={item.id} className={isDone ? 'opacity-50' : ''}>
                                                <td className="px-4 py-3 text-white">
                                                    {item.product?.name}
                                                    <span className="ml-2 text-xs text-slate-500">({item.product?.unit})</span>
                                                </td>
                                                <td className="px-4 py-3 text-center text-slate-300 font-bold">{item.quantity}</td>
                                                <td className="px-4 py-3 text-center text-emerald-400 font-bold">{item.receivedQty || 0}</td>
                                                <td className="px-4 py-3 text-center text-amber-400 font-bold">{remaining}</td>
                                                <td className="px-4 py-3">
                                                    {isDone ? (
                                                        <div className="flex items-center justify-center gap-1 text-emerald-500 text-xs font-bold">
                                                            <CheckCircle2 className="h-4 w-4" /> LENGKAP
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={remaining}
                                                            step="any"
                                                            value={item.newReceivedQty}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                const newItems = [...items];
                                                                newItems[idx].newReceivedQty = val === '' ? '' : Number(val);
                                                                setItems(newItems);
                                                            }}
                                                            className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-3 py-2 text-center text-white focus:border-indigo-500 outline-none"
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-white/5 bg-slate-900/80 backdrop-blur-xl flex justify-end gap-3 sticky bottom-0 z-10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-black text-[11px] uppercase tracking-widest italic hover:bg-slate-700 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="receiveForm"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest italic hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Menyimpan...' : <><Save className="h-4 w-4" /> Simpan Penerimaan</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

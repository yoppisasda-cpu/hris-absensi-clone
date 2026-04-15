'use client';

import { X, Truck, Package, Clock, User, CheckCircle2, XCircle, FileText, ShoppingBag, Printer } from "lucide-react";

export default function PODetailModal({ isOpen, onClose, po }: any) {
    if (!isOpen || !po) return null;

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5';
            case 'REJECTED': return 'bg-red-500/10 text-red-500 border-red-500/20 shadow-lg shadow-red-500/5';
            default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-lg shadow-amber-500/5';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'AUTH_APPROVED';
            case 'REJECTED': return 'AUTH_REJECTED';
            default: return 'PENDING_AUTHORIZATION';
        }
    };

    return (
        <div id="po-printable-area" className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/95 backdrop-blur-2xl p-4 print:p-0 print:bg-white print:static animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-slate-900 rounded-[40px] shadow-[0_0_100px_rgba(79,70,229,0.1)] overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-700/50 flex flex-col max-h-[95vh] print:shadow-none print:border-none print:max-w-none print:rounded-none">
                {/* Header detail dengan gaya modern */}
                <div className="bg-slate-950/50 border-b border-white/5 px-8 py-6 flex justify-between items-center shrink-0 print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <FileText className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">PO Manifest Analysis</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">PO UNIT: #{po.orderNumber?.toUpperCase()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => window.print()}
                            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 active:scale-95 italic"
                        >
                            <Printer className="h-4 w-4" /> Hard Copy
                        </button>
                        <button onClick={onClose} className="h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="p-10 space-y-10 overflow-y-auto flex-1 custom-scrollbar bg-slate-950/20 printable-content relative print:p-0 print:max-h-none print:overflow-visible">
                    {/* Watermark Branding */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-30deg] pointer-events-none hidden print:block">
                         <h1 className="text-[140px] font-black tracking-tighter uppercase whitespace-nowrap">SEVEN BILLION CORE</h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8 relative z-10">
                        {/* Info Supplier */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <Truck className="h-4 w-4 text-indigo-400 stroke-[2.5px]" />
                                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Origin Partner</h3>
                            </div>
                            <div className="bg-slate-900 rounded-[32px] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <ShoppingBag className="h-16 w-16 text-indigo-500" />
                                </div>
                                <p className="text-2xl font-black text-white italic tracking-tighter uppercase">{po.supplier?.name}</p>
                                <div className="flex items-center gap-3 mt-4 text-[10px] text-slate-500 font-black uppercase tracking-widest italic">
                                    <Clock className="h-3.5 w-3.5 text-indigo-500" /> Emission: {new Date(po.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
                                </div>
                            </div>
                        </div>

                        {/* Status Approval */}
                        <div className="space-y-4 text-right md:text-left">
                            <div className="flex items-center gap-3 mb-2 justify-end md:justify-start">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 stroke-[2.5px]" />
                                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Validation Status</h3>
                            </div>
                            <div className={`rounded-[32px] p-8 border flex flex-col justify-center relative overflow-hidden ${getStatusStyle(po.status)}`}>
                                <div className="flex items-center gap-3 justify-center md:justify-start">
                                    {po.status === 'APPROVED' ? <CheckCircle2 className="h-6 w-6 stroke-[2.5px]" /> : po.status === 'REJECTED' ? <XCircle className="h-6 w-6 stroke-[2.5px]" /> : <Clock className="h-6 w-6 stroke-[2.5px]" />}
                                    <p className="text-2xl font-black italic uppercase tracking-tighter text-glow-sm">{getStatusLabel(po.status)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Daftar Item */}
                    <div className="space-y-6 mb-8 relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <Package className="h-4 w-4 text-indigo-400 stroke-[2.5px]" />
                            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Itemization Breakdown</h3>
                        </div>
                        <div className="overflow-hidden rounded-[32px] border border-white/5 bg-slate-900/50 shadow-2xl backdrop-blur-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-950/80 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-white/5 italic">
                                    <tr>
                                        <th className="px-8 py-4">SKU Descriptor</th>
                                        <th className="px-8 py-4 text-center">Qty</th>
                                        <th className="px-8 py-4 text-right">Unit Rate</th>
                                        <th className="px-8 py-4 text-right">Amnt (IDR)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 italic">
                                    {po.items?.map((item: any) => (
                                        <tr key={item.id} className="group hover:bg-white/5 transition-colors">
                                            <td className="px-8 py-5 font-black text-white text-[11px] uppercase tracking-tighter">{item.product?.name}</td>
                                            <td className="px-8 py-5 text-center font-black text-slate-400 text-[11px]">{item.quantity} {item.product?.unit?.toUpperCase() || 'PCS'}</td>
                                            <td className="px-8 py-5 text-right font-black text-slate-500 text-[11px] tracking-widest">{item.price.toLocaleString('id-ID')}</td>
                                            <td className="px-8 py-5 text-right font-black text-white text-[11px] tracking-widest text-glow-sm">{(item.quantity * item.price).toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-950/80 border-t border-indigo-500/30">
                                    <tr>
                                        <td colSpan={3} className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Net Manifest total</td>
                                        <td className="px-8 py-6 text-right text-2xl font-black italic text-glow-lg text-white tracking-tighter">Rp {po.totalAmount.toLocaleString('id-ID')}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Audit Trail */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div className="bg-slate-900/80 p-6 rounded-[28px] border border-white/5 shadow-xl">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-5 w-5 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <User className="h-3 w-3 stroke-[2.5px]" />
                                </div>
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Originator</span>
                            </div>
                            <p className="text-[11px] font-black text-white uppercase italic tracking-widest">{po.createdBy?.name || 'SYSTEM_AUTO'}</p>
                        </div>
                        {po.approvedBy && (
                            <div className="bg-slate-900/80 p-6 rounded-[28px] border border-white/5 shadow-xl animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-5 w-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                        <CheckCircle2 className="h-3 w-3 stroke-[2.5px]" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Authority Verification</span>
                                </div>
                                <p className="text-[11px] font-black text-emerald-400 uppercase italic tracking-widest">{po.approvedBy?.name}</p>
                            </div>
                        )}
                    </div>

                    {po.notes && (
                        <div className="mt-8 p-6 bg-slate-900 border border-dashed border-white/5 rounded-[28px] relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                                <FileText className="h-3.5 w-3.5 text-slate-600" />
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Logistics Directive</span>
                            </div>
                            <p className="text-[11px] text-slate-400 italic font-black uppercase tracking-widest leading-relaxed">"{po.notes}"</p>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-slate-950/80 border-t border-white/5 flex justify-end print:hidden">
                    <button
                        onClick={onClose}
                        className="px-10 py-4 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase italic tracking-[0.2em] shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 border border-white/10"
                    >
                        Deactivate Analytics
                    </button>
                </div>

            </div>
        </div>
    );
}

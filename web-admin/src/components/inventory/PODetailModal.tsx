'use client';

import { X, Truck, Package, Clock, User, CheckCircle2, XCircle, FileText, ShoppingBag, Printer } from "lucide-react";

export default function PODetailModal({ isOpen, onClose, po, onApprove, onReject }: any) {
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
        <div id="po-printable-area" className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/95 backdrop-blur-2xl p-4 print:p-0 print:bg-white print:static animate-in fade-in duration-300">
            <div className="glass w-full max-w-4xl rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] print:shadow-none print:border-none print:max-w-none print:rounded-none">
                {/* Header detail dengan gaya modern premium */}
                <div className="bg-slate-950/50 border-b border-indigo-500/20 px-10 py-8 flex justify-between items-center shrink-0 print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <FileText className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">PO Manifest Analysis</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">MANIFEST_ID: #{po.orderNumber?.toUpperCase()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => window.print()}
                            className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-500/20 active:scale-95 italic"
                        >
                            <Printer className="h-4 w-4 stroke-[2.5px]" /> Generate_Print
                        </button>
                        <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="p-10 lg:p-14 space-y-12 overflow-y-auto flex-1 no-scrollbar bg-slate-950/20 printable-content relative print:p-0 print:max-h-none print:overflow-visible">
                    {/* Watermark Branding Premium */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-30deg] pointer-events-none hidden print:block">
                         <h1 className="text-[140px] font-black tracking-[0.5em] uppercase whitespace-nowrap">AIVOLA PREMIUM CORE</h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-8 relative z-10">
                        {/* Info Supplier Premium */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <Truck className="h-4 w-4 text-indigo-400 stroke-[2.5px]" />
                                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Origin Partner Node</h3>
                            </div>
                            <div className="bg-slate-950 border border-white/5 rounded-[2.5rem] p-10 shadow-inner relative overflow-hidden group">
                                <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/5 blur-3xl -mr-20 -mt-20 rounded-full group-hover:bg-indigo-500/10 transition-colors"></div>
                                <p className="text-3xl font-black text-white italic tracking-tighter uppercase relative z-10">{po.supplier?.name}</p>
                                <div className="flex items-center gap-3 mt-6 text-[10px] text-slate-500 font-black uppercase tracking-widest italic relative z-10">
                                    <Clock className="h-4 w-4 text-indigo-500" /> EMISSION: {new Date(po.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
                                </div>
                            </div>
                        </div>

                        {/* Status Approval Premium */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 stroke-[2.5px]" />
                                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Validation State</h3>
                            </div>
                            <div className={`rounded-[2.5rem] p-10 border border-white/5 flex flex-col justify-center relative overflow-hidden shadow-inner ${getStatusStyle(po.status)}`}>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                                        {po.status === 'APPROVED' ? <CheckCircle2 className="h-6 w-6 stroke-[3px]" /> : po.status === 'REJECTED' ? <XCircle className="h-6 w-6 stroke-[3px]" /> : <Clock className="h-6 w-6 stroke-[3px]" />}
                                    </div>
                                    <p className="text-3xl font-black italic uppercase tracking-tighter text-glow-sm">{getStatusLabel(po.status)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Item Breakdown Premium */}
                    <div className="space-y-6 mb-8 relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <Package className="h-4 w-4 text-indigo-400 stroke-[2.5px]" />
                            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Itemization Breakdown</h3>
                        </div>
                        <div className="overflow-hidden rounded-[2.5rem] border border-white/5 bg-slate-950 shadow-inner">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900/50 text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] border-b border-white/5 italic">
                                    <tr>
                                        <th className="px-10 py-6">Descriptor</th>
                                        <th className="px-10 py-6 text-center">Vol</th>
                                        <th className="px-10 py-6 text-right">Rate (IDR)</th>
                                        <th className="px-10 py-6 text-right">Summation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 italic">
                                    {po.items?.map((item: any) => (
                                        <tr key={item.id} className="group hover:bg-white/5 transition-colors">
                                            <td className="px-10 py-6 font-black text-white text-[12px] uppercase tracking-tighter">{item.product?.name}</td>
                                            <td className="px-10 py-6 text-center font-black text-slate-400 text-[12px] uppercase">{item.quantity} <span className="text-[10px] text-slate-800">{item.product?.unit?.toUpperCase() || 'PCS'}</span></td>
                                            <td className="px-10 py-6 text-right font-black text-slate-500 text-[12px] tracking-widest">{item.price.toLocaleString('id-ID')}</td>
                                            <td className="px-10 py-6 text-right font-black text-white text-[12px] tracking-widest text-glow-sm">{(item.quantity * item.price).toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-900 border-t border-indigo-500/20 shadow-2xl">
                                    <tr>
                                        <td colSpan={3} className="px-10 py-8 text-right text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Net Manifest total</td>
                                        <td className="px-10 py-8 text-right text-3xl font-black italic text-glow-lg text-white tracking-tighter uppercase">Rp {po.totalAmount.toLocaleString('id-ID')}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Meta Data Premium */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div className="bg-slate-950 p-8 rounded-[2rem] border border-white/5 shadow-inner group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-6 w-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <User className="h-3 w-3 stroke-[2.5px]" />
                                </div>
                                <span className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] italic">Originator</span>
                            </div>
                            <p className="text-[12px] font-black text-white uppercase italic tracking-[0.2em]">{po.createdBy?.name || 'SYSTEM_AUTO'}</p>
                        </div>
                        {po.approvedBy && (
                            <div className="bg-slate-950 p-8 rounded-[2rem] border border-white/5 shadow-inner animate-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                        <CheckCircle2 className="h-3 w-3 stroke-[2.5px]" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] italic">Verification Authority</span>
                                </div>
                                <p className="text-[12px] font-black text-emerald-400 uppercase italic tracking-[0.2em]">{po.approvedBy?.name}</p>
                            </div>
                        )}
                    </div>

                    {po.notes && (
                        <div className="mt-10 p-10 bg-slate-900/50 border border-dashed border-white/10 rounded-[2.5rem] relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <FileText className="h-4 w-4 text-slate-600" />
                                <span className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] italic">Logistics Directive</span>
                            </div>
                            <p className="text-[12px] text-slate-400 italic font-black uppercase tracking-[0.2em] leading-relaxed">"{po.notes}"</p>
                        </div>
                    )}
                </div>

                <div className="p-10 bg-slate-950 border-t border-white/10 flex justify-end gap-4 print:hidden">
                    {po.status === 'PENDING' && onApprove && onReject ? (
                        <>
                            <button
                                onClick={() => onReject(po.id, 'REJECTED')}
                                className="px-10 py-5 rounded-2xl bg-red-600/10 text-red-500 text-[10px] font-black uppercase italic tracking-[0.3em] hover:bg-red-600 hover:text-white transition-all active:scale-95 border border-red-500/20"
                            >
                                Tolak_Requisition
                            </button>
                            <button
                                onClick={() => onApprove(po.id, 'APPROVED')}
                                className="px-10 py-5 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase italic tracking-[0.3em] shadow-2xl shadow-emerald-900/40 hover:bg-emerald-700 transition-all active:scale-95 border border-white/10"
                            >
                                Approve_Manifest
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-12 py-5 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase italic tracking-[0.3em] shadow-2xl shadow-indigo-900/40 hover:bg-indigo-700 transition-all active:scale-95 border border-white/10"
                        >
                            Abort_Analysis
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

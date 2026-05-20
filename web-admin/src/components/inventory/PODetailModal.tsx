'use client';

import { X, Truck, Package, Clock, User, CheckCircle2, XCircle, FileText, ShoppingBag, Printer } from "lucide-react";

export default function PODetailModal({ isOpen, onClose, po, onApprove, onReject }: any) {
    if (!isOpen || !po) return null;

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'border-slate-950 text-slate-950 bg-slate-50';
            case 'REJECTED': return 'border-slate-300 text-slate-400 bg-slate-50';
            default: return 'border-slate-900 text-slate-900 bg-slate-50';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'DISETUJUI';
            case 'REJECTED': return 'DITOLAK';
            default: return 'MENUNGGU PERSETUJUAN';
        }
    };

    return (
        <div id="po-printable-area" className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/95 backdrop-blur-2xl p-4 print:p-0 print:bg-white print:static animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-3xl rounded-[2.5rem] border border-slate-200 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] print:shadow-none print:border-none print:max-w-none print:rounded-none print:max-h-none print:h-auto">
                
                {/* Header detail dengan gaya modern premium */}
                <div className="bg-slate-50 border-b border-slate-200 px-8 py-5 flex justify-between items-center shrink-0 print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-950 shadow-sm">
                            <FileText className="h-5 w-5 text-slate-950 stroke-[2px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-slate-950 uppercase leading-none">Analisis Manifest PO</h3>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1.5 italic">ID MANIFES: #{po.orderNumber?.toUpperCase()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => window.print()}
                            className="flex items-center gap-2 bg-slate-950 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-slate-950 active:scale-95 shadow-sm italic"
                        >
                            <Printer className="h-3.5 w-3.5 stroke-[2px]" /> Cetak PO
                        </button>
                        <button 
                            onClick={onClose} 
                            className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center border border-slate-200 text-slate-600 hover:text-slate-900 transition-all active:scale-95"
                        >
                            <X className="h-4.5 w-4.5" />
                        </button>
                    </div>
                </div>

                <div className="p-8 lg:p-10 space-y-8 overflow-y-auto flex-1 no-scrollbar bg-white relative print:p-0 print:max-h-none print:overflow-visible">
                    {/* Watermark Branding Premium */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-30deg] pointer-events-none hidden print:block">
                         <h1 className="text-[140px] font-black tracking-[0.5em] uppercase whitespace-nowrap">AIVOLA PREMIUM CORE</h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4 relative z-10">
                        {/* Info Supplier Premium */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 mb-1">
                                <Truck className="h-4 w-4 text-slate-950 stroke-[2px]" />
                                <h3 className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Informasi Pemasok</h3>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                                <p className="text-xl font-black text-slate-950 italic tracking-tighter uppercase relative z-10">{po.supplier?.name}</p>
                                <div className="flex items-center gap-2 mt-4 text-[8px] text-slate-500 font-black uppercase tracking-widest italic relative z-10">
                                    <Clock className="h-3.5 w-3.5 text-slate-950" /> TANGGAL TERBIT: {new Date(po.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
                                </div>
                            </div>
                        </div>

                        {/* Status Approval Premium */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 mb-1">
                                <CheckCircle2 className="h-4 w-4 text-slate-950 stroke-[2px]" />
                                <h3 className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Status Validasi</h3>
                            </div>
                            <div className={`rounded-2xl p-6 border flex flex-col justify-center relative overflow-hidden shadow-sm ${getStatusStyle(po.status)}`}>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="h-8 w-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-950 shadow-sm">
                                        {po.status === 'APPROVED' ? <CheckCircle2 className="h-5 w-5 text-slate-950 stroke-[2.5px]" /> : po.status === 'REJECTED' ? <XCircle className="h-5 w-5 text-slate-950 stroke-[2.5px]" /> : <Clock className="h-5 w-5 text-slate-950 stroke-[2.5px]" />}
                                    </div>
                                    <p className="text-xl font-black italic uppercase tracking-tighter">{getStatusLabel(po.status)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Item Breakdown Premium */}
                    <div className="space-y-4 mb-4 relative z-10">
                        <div className="flex items-center gap-3 mb-1">
                            <Package className="h-4 w-4 text-slate-950 stroke-[2px]" />
                            <h3 className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Rincian Barang</h3>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:border-black print:rounded-none">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-950 tracking-[0.15em] border-b border-slate-200 italic print:bg-white print:text-black">
                                    <tr>
                                        <th className="px-6 py-4 text-slate-950 font-black">Nama Barang</th>
                                        <th className="px-6 py-4 text-center text-slate-950 font-black">Jumlah</th>
                                        <th className="px-6 py-4 text-right text-slate-950 font-black">Harga Satuan (IDR)</th>
                                        <th className="px-6 py-4 text-right text-slate-950 font-black">Total (IDR)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-950 italic">
                                    {po.items?.map((item: any) => (
                                        <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-black text-slate-950 text-[11px] uppercase tracking-tighter">{item.product?.name}</td>
                                            <td className="px-6 py-4 text-center font-black text-slate-950 text-[11px] uppercase">{item.quantity} <span className="text-[9px] text-slate-500">{item.product?.unit?.toUpperCase() || 'PCS'}</span></td>
                                            <td className="px-6 py-4 text-right font-black text-slate-500 text-[11px] tracking-widest">{item.price.toLocaleString('id-ID')}</td>
                                            <td className="px-6 py-4 text-right font-black text-slate-950 text-[11px] tracking-widest">{(item.quantity * item.price).toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t-2 border-slate-950 print:bg-white print:border-t-2">
                                    <tr>
                                        <td colSpan={3} className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Total Bersih PO</td>
                                        <td className="px-6 py-5 text-right text-xl font-black italic text-slate-950 tracking-tighter uppercase">Rp {po.totalAmount.toLocaleString('id-ID')}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Meta Data Premium */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-6 w-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-950 shadow-sm">
                                    <User className="h-3.5 w-3.5 text-slate-950 stroke-[2px]" />
                                </div>
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Dibuat Oleh</span>
                            </div>
                            <p className="text-[11px] font-black text-slate-950 uppercase italic tracking-[0.15em]">{po.createdBy?.name || 'SYSTEM_AUTO'}</p>
                        </div>
                        {po.approvedBy && (
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-6 w-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-950 shadow-sm">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-slate-950 stroke-[2px]" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Disetujui Oleh</span>
                                </div>
                                <p className="text-[11px] font-black text-slate-950 uppercase italic tracking-[0.15em]">{po.approvedBy?.name}</p>
                            </div>
                        )}
                    </div>

                    {po.notes && (
                        <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                                <FileText className="h-4 w-4 text-slate-500" />
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Catatan Logistik</span>
                            </div>
                            <p className="text-[11px] text-slate-700 italic font-black uppercase tracking-[0.15em] leading-relaxed">"{po.notes}"</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 print:hidden shrink-0">
                    {po.status === 'PENDING' && onApprove && onReject ? (
                        <>
                            <button
                                onClick={() => onReject(po.id, 'REJECTED')}
                                className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-[10px] font-black uppercase italic tracking-[0.2em] transition-all active:scale-95 border border-slate-200"
                            >
                                Tolak Pengajuan
                            </button>
                            <button
                                onClick={() => onApprove(po.id, 'APPROVED')}
                                className="px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-[10px] font-black uppercase italic tracking-[0.2em] transition-all active:scale-95 border border-slate-950"
                            >
                                Setujui PO
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-8 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-[10px] font-black uppercase italic tracking-[0.2em] transition-all active:scale-95 border border-slate-950"
                        >
                            Tutup
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
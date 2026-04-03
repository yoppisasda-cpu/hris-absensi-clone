'use client';

import { X, Truck, Package, Clock, User, CheckCircle2, XCircle, FileText, ShoppingBag, Printer } from "lucide-react";

export default function PODetailModal({ isOpen, onClose, po }: any) {
    if (!isOpen || !po) return null;

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'REJECTED': return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-yellow-50 text-yellow-600 border-yellow-100';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'Disetujui';
            case 'REJECTED': return 'Ditolak';
            default: return 'Menunggu Approval';
        }
    };

    return (
        <div id="po-printable-area" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static">
            <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                {/* Header detail dengan gaya modern */}
                <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white border-b border-white/10 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic tracking-tight uppercase leading-tight">Detail Purchase Order</h2>
                            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">PO Number: #{po.orderNumber}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 print:hidden">
                        <button 
                            onClick={() => window.print()}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                        >
                            <Printer className="h-4 w-4" /> Cetak PO
                        </button>
                        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="p-8 max-h-[80vh] overflow-y-auto printable-content relative print:max-h-none print:overflow-visible">
                    {/* Watermark Branding */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-30deg] pointer-events-none hidden print:block">
                         <h1 className="text-[120px] font-black tracking-tighter uppercase whitespace-nowrap">AIVOLA PO</h1>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Info Supplier */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Truck className="h-4 w-4 text-blue-600" />
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Supplier</h3>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                <p className="text-lg font-black text-slate-900 italic">{po.supplier?.name}</p>
                                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-bold">
                                    <Clock className="h-3 w-3" /> Tanggal Pesanan: {new Date(po.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                        </div>

                        {/* Status Approval */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Status Terakhir</h3>
                            </div>
                            <div className={`rounded-2xl p-5 border flex flex-col justify-center ${getStatusStyle(po.status)}`}>
                                <div className="flex items-center gap-2">
                                    {po.status === 'APPROVED' ? <CheckCircle2 className="h-5 w-5" /> : po.status === 'REJECTED' ? <XCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                                    <p className="text-lg font-black italic uppercase tracking-tighter">{getStatusLabel(po.status)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Daftar Item */}
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-2 mb-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Daftar Barang Dipesan</h3>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-slate-100">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-5 py-3">Nama Produk</th>
                                        <th className="px-5 py-3 text-center">Jumlah</th>
                                        <th className="px-5 py-3 text-right">Harga Satuan</th>
                                        <th className="px-5 py-3 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 italic">
                                    {po.items?.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="px-5 py-4 font-bold text-slate-900">{item.product?.name}</td>
                                            <td className="px-5 py-4 text-center font-bold text-slate-600">{item.quantity} {item.product?.unit || 'pcs'}</td>
                                            <td className="px-5 py-4 text-right font-bold text-slate-500">Rp {item.price.toLocaleString('id-ID')}</td>
                                            <td className="px-5 py-4 text-right font-black text-slate-900">Rp {(item.quantity * item.price).toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-900 text-white">
                                    <tr>
                                        <td colSpan={3} className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-widest opacity-60">Total Keseluruhan PO</td>
                                        <td className="px-5 py-4 text-right text-lg font-black italic">Rp {po.totalAmount.toLocaleString('id-ID')}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Audit Trail */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-blue-600" />
                                <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Diajukan Oleh</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900 italic">{po.createdBy?.name || '-'}</p>
                        </div>
                        {po.approvedBy && (
                            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="h-4 w-4 text-emerald-600" />
                                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Disetujui Oleh</span>
                                </div>
                                <p className="text-sm font-bold text-slate-900 italic">{po.approvedBy?.name}</p>
                            </div>
                        )}
                    </div>

                    {po.notes && (
                        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-3 w-3 text-slate-400" />
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Catatan Tambahan</span>
                            </div>
                            <p className="text-xs text-slate-600 italic font-medium">{po.notes}</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end print:hidden">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 rounded-xl bg-slate-900 text-white text-sm font-black uppercase italic shadow-lg hover:shadow-slate-200 transition-all active:scale-95"
                    >
                        Tutup Detail
                    </button>
                </div>

            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from "react";
import { X, Printer, Download, Mail, Phone, MapPin, Package, CreditCard, CheckCircle, Clock } from "lucide-react";
import api from "@/lib/api";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function InvoiceModal({ isOpen, onClose, saleId }: { isOpen: boolean, onClose: () => void, saleId: number }) {
    const [sale, setSale] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && saleId) {
            fetchSaleDetail();
        }
    }, [isOpen, saleId]);

    const fetchSaleDetail = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/sales/${saleId}`);
            setSale(res.data);
        } catch (error) {
            console.error("Gagal mengambil detail invoice", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (!isOpen) return null;

    return (
        <div id="printable-invoice" className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl print:hidden" onClick={onClose} />
            <div className="glass w-full max-w-4xl rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:rounded-none print:border-none print:bg-white">
                
                {/* Modal Header - Hidden on Print */}
                <div className="bg-slate-950/50 border-b border-orange-500/20 px-10 py-8 flex items-center justify-between shrink-0 print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-lg shadow-orange-500/10">
                            <CreditCard className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">Fiscal Manifest Analysis</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Commercial Transaction ID: {sale?.invoiceNumber}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic active:scale-95 shadow-lg shadow-emerald-500/5 group"
                        >
                            <Printer className="h-4 w-4 group-hover:scale-110 transition-transform" /> Print Payload
                        </button>
                        <button onClick={onClose} className="h-12 w-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto p-12 print:overflow-visible print:p-0 no-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <div className="h-16 w-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-6"></div>
                            <p className="text-slate-500 font-black italic uppercase tracking-widest text-[10px]">Resolving Fiscal Data...</p>
                        </div>
                    ) : sale ? (
                        <div className="flex flex-col gap-12 print:text-black">
                            
                            {/* Branding Section */}
                            <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-5">
                                        <div className="h-16 w-16 bg-slate-900 border border-white/5 rounded-[24px] flex items-center justify-center shadow-2xl print:bg-black print:text-white">
                                            <Package className="h-8 w-8 text-orange-500 print:text-white" />
                                        </div>
                                        <div>
                                            <h1 className="text-3xl font-black italic text-white leading-none tracking-tighter uppercase print:text-black">
                                                {sale.company?.name || 'Aivola Merchant'}
                                            </h1>
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mt-2 italic">Smart Business Solutions</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 pt-2 border-l-2 border-white/5 pl-6 print:border-black/10">
                                        <div className="flex items-center gap-3 text-slate-500 text-[10px] font-black uppercase tracking-wider italic print:text-black/60">
                                            <MapPin className="h-3.5 w-3.5" />
                                            <span>{sale.company?.address || 'Jl. Raya Digital No. 123, Indonesia'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-500 text-[10px] font-black uppercase tracking-wider italic print:text-black/60">
                                            <Phone className="h-3.5 w-3.5" />
                                            <span>{sale.company?.picPhone || '+62 812 3456 789'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="bg-slate-950/80 p-8 rounded-[32px] border border-white/5 shadow-inner print:bg-white print:border-black print:border-2">
                                        <p className="text-[9px] font-black uppercase text-slate-600 tracking-[0.3em] mb-2 italic print:text-black">Fiscal ID Protocol</p>
                                        <p className="text-3xl font-black text-white italic tracking-tighter uppercase print:text-black">#{sale.invoiceNumber}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                                <div className="bg-slate-950/40 p-6 rounded-[24px] border border-white/5 print:border-black print:bg-white">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 italic print:text-black">Emission Cycle</p>
                                    <p className="text-xs font-black text-white uppercase tracking-tighter print:text-black">
                                        {format(new Date(sale.date), 'dd MMMM yyyy', { locale: id })}
                                    </p>
                                </div>
                                <div className="bg-slate-950/40 p-6 rounded-[24px] border border-white/5 print:border-black print:bg-white">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 italic print:text-black">Validation Status</p>
                                    <span className={`inline-flex items-center gap-2 text-xs font-black italic tracking-tighter ${sale.status === 'PAID' ? 'text-emerald-400' : 'text-orange-400'} print:text-black`}>
                                        {sale.status === 'PAID' ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                        {sale.status === 'PAID' ? 'AUTH_SETTLED' : 'AUTH_PENDING'}
                                    </span>
                                </div>
                                <div className="bg-slate-950/40 p-6 rounded-[24px] border border-white/5 print:border-black print:bg-white">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 italic print:text-black">Recipient Entity</p>
                                    <p className="text-xs font-black text-white uppercase tracking-tighter print:text-black">
                                        {sale.customerName?.toUpperCase() || 'GENERAL_GUEST'}
                                    </p>
                                </div>
                                <div className="bg-slate-950/40 p-6 rounded-[24px] border border-white/5 print:border-black print:bg-white">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 italic print:text-black">Funding Vector</p>
                                    <p className="text-xs font-black text-white uppercase tracking-tighter print:text-black">
                                        {sale.accountId ? 'VAULT_DIRECT' : 'CASH_PHYSICAL'}
                                    </p>
                                </div>
                            </div>

                            {/* Manifest Table */}
                            <div className="overflow-hidden rounded-[32px] border border-white/5 bg-slate-950/40 shadow-2xl backdrop-blur-sm relative z-10 print:border-black print:bg-white print:rounded-none">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-950 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-white/5 italic print:bg-black print:text-white">
                                        <tr>
                                            <th className="px-8 py-5">SKU Nomenclature</th>
                                            <th className="px-8 py-5 text-center">Vol</th>
                                            <th className="px-8 py-5 text-right">Unit Rate</th>
                                            <th className="px-8 py-5 text-right text-orange-500 print:text-white">Amnt (IDR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 italic print:divide-black">
                                        {sale.items.map((item: any, idx: number) => (
                                            <tr key={idx} className="group hover:bg-white/5 transition-colors print:text-black">
                                                <td className="px-8 py-5">
                                                    <p className="font-black text-white text-[11px] uppercase tracking-tighter print:text-black">{item.product_name}</p>
                                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1 print:text-black/60">{item.product_sku || 'NON_SPECIFIED'}</p>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className="font-black text-white text-[11px] print:text-black">{item.quantity}</span>
                                                    <span className="ml-2 text-[9px] text-slate-600 font-black uppercase tracking-widest print:text-black/60">{item.product_unit}</span>
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-slate-500 text-[11px] tracking-widest print:text-black">
                                                    {parseFloat(item.price).toLocaleString()}
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-white text-[11px] tracking-widest print:text-black">
                                                    {parseFloat(item.total).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary Totals */}
                            <div className="flex flex-col md:flex-row justify-between items-start gap-12 relative z-10">
                                <div className="flex-1 max-w-sm">
                                    <div className="p-8 bg-slate-950/60 rounded-[32px] border border-dashed border-white/10 print:bg-white print:border-black">
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-3 italic print:text-black">Contractual Memo</p>
                                        <p className="text-[10px] text-slate-500 italic font-black uppercase tracking-widest leading-relaxed print:text-black">
                                            {sale.notes || 'THANK YOU FOR TRUSTING OUR ECOSYSTEM. RETAIN THIS MANIFEST AS A LEGITIMATE FISCAL ANCHOR FOR YOUR RECORDS.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full md:w-80 space-y-4">
                                    <div className="flex justify-between items-center text-slate-600 text-[10px] font-black uppercase tracking-widest italic print:text-black">
                                        <span>Subtotal Accumulation</span>
                                        <span className="text-white print:text-black">{parseFloat(sale.totalAmount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-600 text-[10px] font-black uppercase tracking-widest italic print:text-black">
                                        <span>Fiscal Duty (0%)</span>
                                        <span className="text-white print:text-black">0</span>
                                    </div>
                                    <div className="h-[1px] bg-white/5 my-4 print:bg-black"></div>
                                    <div className="p-8 bg-gradient-to-br from-orange-600 to-orange-700 rounded-[32px] text-white shadow-2xl shadow-orange-900/40 border border-white/10 print:bg-white print:text-black print:border-black print:border-2 print:shadow-none">
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-2 italic print:text-black">Net Manifest Total</p>
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-black opacity-50 print:text-black">IDR</span>
                                            <span className="text-3xl font-black italic tracking-tighter print:text-black">{parseFloat(sale.totalAmount).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Professional Footer */}
                            <div className="flex flex-col sm:flex-row justify-between items-end pt-12 mt-8 border-t border-white/5 relative z-10 print:border-black">
                                <div className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] italic print:text-black">
                                    <p>SYSTEM_ID: AIVOLA_CORE_V1</p>
                                    <p>TIMESTAMP: {new Date().toLocaleDateString()} // {new Date().toLocaleTimeString()}</p>
                                </div>
                                <div className="text-center w-48 mt-8 sm:mt-0">
                                    <p className="text-[9px] font-black uppercase text-slate-600 tracking-[0.3em] mb-16 italic print:text-black">Authorized Validation</p>
                                    <div className="h-[1px] bg-white/10 w-full mb-3 print:bg-black"></div>
                                    <p className="text-[10px] font-black text-white uppercase italic tracking-[0.2em] print:text-black">{sale.company?.name || 'STORE_OPERATOR'}</p>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="text-center py-24 group">
                            <p className="text-rose-500 font-black italic uppercase tracking-[0.5em] text-sm animate-pulse">NULL_DATA_EXCEPTION</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

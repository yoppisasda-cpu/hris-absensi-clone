import React, { useEffect, useState } from 'react';
import { X, Printer } from 'lucide-react';
import api from '@/lib/api';

interface SubscriptionInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any | null;
}

export default function SubscriptionInvoiceModal({ isOpen, onClose, invoice }: SubscriptionInvoiceModalProps) {
    if (!isOpen || !invoice) return null;

    const handlePrint = () => {
        const printContent = document.getElementById('printable-saas-invoice');
        if (!printContent) return;

        const printWindow = window.open('', '_blank', 'width=1000,height=800');
        if (!printWindow) return;
        
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(style => style.outerHTML)
            .join('\n');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice - ${invoice.invoiceNumber}</title>
                    ${styles}
                    <style>
                        body {
                            background: white !important;
                            color: black !important;
                            padding: 2cm !important;
                            margin: 0 !important;
                            height: auto !important;
                            overflow: visible !important;
                            visibility: visible !important;
                        }
                        body * {
                            visibility: visible !important;
                        }
                        #printable-saas-invoice {
                            display: block !important;
                            width: 100% !important;
                            max-width: none !important;
                            box-shadow: none !important;
                            border: none !important;
                            max-height: none !important;
                            overflow: visible !important;
                            position: static !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        .print-hidden, .print\\:hidden {
                            display: none !important;
                            visibility: hidden !important;
                        }
                    </style>
                </head>
                <body>
                    <div id="printable-saas-invoice">
                        ${printContent.innerHTML}
                    </div>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:static print:p-0 print:block print:w-full print:h-auto print:overflow-visible">
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl print:hidden" onClick={onClose} />

            <div className="absolute top-8 right-8 flex items-center gap-3 z-[200] print:hidden">
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 border border-white/10"
                >
                    <Printer className="h-4 w-4 stroke-[2.5px]" /> Cetak Invoice
                </button>
                <button
                    onClick={onClose}
                    className="flex items-center justify-center p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all shadow-lg active:scale-95 border border-white/10"
                >
                    <X className="h-5 w-5 stroke-[2.5px]" />
                </button>
            </div>

            <div className="relative w-[800px] bg-slate-100 rounded-3xl shadow-2xl overflow-hidden print:w-full print:shadow-none print:rounded-none flex flex-col max-h-[90vh] print:max-h-none border border-slate-200">
                <div className="flex-1 overflow-y-auto print:overflow-visible custom-scrollbar p-12 print:p-0" id="printable-saas-invoice">
                    
                    <div className="bg-white p-12 shadow-sm border border-slate-200 print:border-none print:shadow-none relative">
                        {invoice.status === 'PAID' && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none rotate-[-30deg] z-0 print:opacity-10">
                                <span className="text-[150px] font-black tracking-tighter text-slate-900">LUNAS</span>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-start border-b-2 border-slate-950 pb-8 mb-8 relative z-10">
                            <div>
                                <h1 className="text-4xl font-black text-slate-950 tracking-tighter uppercase mb-1">AIVOLA.ID</h1>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">SaaS Subscription Invoice</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-black text-slate-950 tracking-tight">{invoice.invoiceNumber}</h2>
                                <div className="flex items-center justify-end gap-2 mt-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${invoice.status === 'PAID' ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                        {invoice.status === 'PAID' ? 'PAID' : 'UNPAID'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-12 mb-12 relative z-10">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">BILL TO</h3>
                                    <p className="font-bold text-slate-950 text-base">{invoice.company?.name || 'Client'}</p>
                                </div>
                            </div>
                            <div className="space-y-4 text-right">
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">PERIODE</h3>
                                    <p className="font-bold text-slate-950">{invoice.month} / {invoice.year}</p>
                                </div>
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">JATUH TEMPO</h3>
                                    <p className="font-bold text-slate-950">{new Date(invoice.dueDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b-2 border-slate-950">
                                        <th className="py-3 text-[10px] font-black text-slate-950 uppercase tracking-widest">DESKRIPSI</th>
                                        <th className="py-3 text-[10px] font-black text-slate-950 uppercase tracking-widest text-center">TIPE</th>
                                        <th className="py-3 text-[10px] font-black text-slate-950 uppercase tracking-widest text-right">HARGA</th>
                                        <th className="py-3 text-[10px] font-black text-slate-950 uppercase tracking-widest text-right">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm border-b-2 border-slate-950">
                                    <tr>
                                        <td className="py-4 border-b border-slate-100 last:border-0 font-medium text-slate-800">
                                            Langganan Aivola HRIS & POS
                                            <div className="text-xs text-slate-500 mt-1">
                                                {invoice.contractType === 'BULANAN' ? 'Paket Bulanan' : 'Paket Tahunan'} 
                                                ({invoice.employeeLimit} Karyawan)
                                            </div>
                                        </td>
                                        <td className="py-4 border-b border-slate-100 last:border-0 text-slate-600 text-center">
                                            {invoice.contractType}
                                        </td>
                                        <td className="py-4 border-b border-slate-100 last:border-0 text-slate-600 font-mono text-right">
                                            {formatCurrency(invoice.contractValue)}
                                        </td>
                                        <td className="py-4 border-b border-slate-100 last:border-0 font-bold text-slate-900 font-mono text-right">
                                            {formatCurrency(invoice.amount)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="flex justify-end mt-6">
                                <div className="w-64">
                                    <div className="flex justify-between items-center py-2 border-b-2 border-slate-950">
                                        <span className="text-[10px] font-black text-slate-950 uppercase tracking-widest">TOTAL</span>
                                        <span className="text-lg font-black text-slate-950 font-mono">{formatCurrency(invoice.amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-end pt-8 mt-8 border-t border-slate-200 relative z-10 print:border-black">
                            <div className="text-[6.5px] font-bold text-slate-400 uppercase tracking-[0.15em] print:text-black/50 space-y-0.5">
                                <p>ID SISTEM: AIVOLA_SAAS_V1</p>
                                <p>WAKTU: {new Date().toLocaleDateString('id-ID')} // {new Date().toLocaleTimeString('id-ID')}</p>
                            </div>
                            
                            {/* Bank Transfer Instructions */}
                            <div className="flex flex-col gap-2 mt-4 sm:mt-0">
                                <div className="p-3 px-4 bg-white rounded-xl border border-slate-200 flex flex-col shadow-sm print:border-black print:bg-white print:border w-[280px]">
                                    <div>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] print:text-black">BANK BCA</span>
                                        <p className="text-[14px] font-extrabold text-slate-950 tracking-widest print:text-black mt-1 leading-none">661-125-0000</p>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mt-2.5 print:text-black">a.n. PT PERMATA GEMPITA SEJAHTERA</p>
                                </div>
                            </div>

                            <div className="text-center w-48 mt-8 sm:mt-0">
                                <div className="h-12"></div>
                                <div className="h-[1px] bg-slate-200 w-full mb-3 print:bg-black"></div>
                                <p className="text-[10px] font-black text-slate-950 uppercase tracking-[0.2em] print:text-black">BILLING DEPT.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

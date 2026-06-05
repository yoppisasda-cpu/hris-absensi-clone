'use client';
// Surat Jalan (Delivery Note) Protocol

import { useState, useEffect } from "react";
import { X, Printer, MapPin, Package, Phone } from "lucide-react";
import api from "@/lib/api";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function DeliveryNoteModal({ isOpen, onClose, orderId }: { isOpen: boolean, onClose: () => void, orderId: number }) {
    const [sale, setSale] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && orderId) {
            fetchSaleDetail();
        }
    }, [isOpen, orderId]);

    const fetchSaleDetail = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/sales/orders/${orderId}`);
            // Map items for consistency with original format if needed
            const orderData = res.data;
            if (orderData.items) {
                orderData.items = orderData.items.map((item: any) => ({
                    ...item,
                    product_name: item.product?.name,
                    product_sku: item.product?.sku,
                    product_unit: item.product?.unit
                }));
            }
            setSale(orderData);
        } catch (error) {
            console.error("Gagal mengambil detail pesanan", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const controls = document.getElementById('do-controls');
        if (controls) controls.style.display = 'none';
        
        const afterPrint = () => {
            if (controls) controls.style.display = '';
            window.removeEventListener('afterprint', afterPrint);
        };
        window.addEventListener('afterprint', afterPrint);
        
        window.print();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop - never printed */}
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl print:hidden" onClick={onClose} />

            {/* Control Buttons - OUTSIDE printable area */}
            <div id="do-controls" className="absolute top-8 right-8 flex items-center gap-3 z-[200] print:hidden">
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 border border-white/10"
                >
                    <Printer className="h-4 w-4 stroke-[2.5px]" /> Cetak Surat Jalan
                </button>
                <button
                    onClick={onClose}
                    className="h-10 w-10 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200/60 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                    title="Tutup"
                >
                    <X className="h-4 w-4 stroke-[2.5px]" />
                </button>
            </div>

            {/* Printable DO Card */}
            <div className="printable-content bg-white w-full max-w-4xl rounded-[2.5rem] border border-slate-200 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:rounded-none print:border-none">
                <div className="overflow-y-auto p-12 print:overflow-visible print:p-0 no-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <div className="h-16 w-16 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-6"></div>
                            <p className="text-slate-500 font-black italic uppercase tracking-widest text-[10px]">Memuat Surat Jalan...</p>
                        </div>
                    ) : sale ? (
                        <div className="flex flex-col gap-6 text-slate-950">
                            
                            {/* Branding & Title */}
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden bg-white print:border-black/20">
                                        {sale.company?.logoUrl ? (
                                            <img src={sale.company.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                                        ) : (
                                            <Package className="h-6 w-6 text-slate-900 print:text-black" />
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-black text-slate-950 uppercase print:text-black">{sale.company?.name || 'Aivola Merchant'}</h1>
                                        <div className="flex items-center gap-2 text-slate-500 text-[9px] font-bold uppercase mt-1 print:text-black/70">
                                            <MapPin className="h-3 w-3" /> {sale.company?.address || 'Alamat tidak tersedia'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-3xl font-black text-slate-950 tracking-tighter uppercase print:text-black">Surat Jalan</h2>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1 print:text-black/50">Delivery Order</p>
                                </div>
                            </div>

                            {/* Header Section */}
                            <div className="border-t border-b border-slate-200 py-4 grid grid-cols-2 gap-8 print:border-black print:py-4 mt-2">
                                {/* Penerima Info */}
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 bg-slate-50 p-2 rounded-lg print:bg-transparent print:p-0 print:text-black/50">Dikirim Kepada (Penerima):</h3>
                                    <div className="pl-2">
                                        <div className="font-extrabold text-lg text-slate-950 uppercase print:text-black">{sale.customer?.name || sale.customerName || 'UMUM / GUEST'}</div>
                                        <div className="text-[11px] text-slate-600 mt-1 leading-relaxed print:text-black">
                                            {sale.customer?.address || 'Alamat Outlet / Pelanggan tidak terdaftar'}
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-700 mt-2 flex items-center gap-1.5 print:text-black">
                                            <Phone className="h-3 w-3" /> {sale.customer?.phone || sale.customerPhone || '-'}
                                        </div>
                                    </div>
                                </div>

                                {/* DO Meta Info */}
                                <div className="space-y-3 border-l border-slate-100 pl-8 print:border-black/20">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 bg-slate-50 p-2 rounded-lg print:bg-transparent print:p-0 print:text-black/50">Informasi Pengiriman:</h3>
                                    <div className="pl-2 space-y-2">
                                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                                            <span className="font-black text-slate-500 uppercase print:text-black/60">No. Surat:</span>
                                            <span className="font-black text-slate-950 col-span-2 print:text-black">DO-{sale.orderNumber || sale.invoiceNumber}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                                            <span className="font-black text-slate-500 uppercase print:text-black/60">Tgl Kirim:</span>
                                            <span className="font-bold text-slate-950 col-span-2 print:text-black">
                                                {sale.shippedAt ? format(new Date(sale.shippedAt), 'dd MMMM yyyy', {locale: id}) : format(new Date(sale.date), 'dd MMMM yyyy', {locale: id})}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                                            <span className="font-black text-slate-500 uppercase print:text-black/60">No. Polisi:</span>
                                            <span className="border-b border-dashed border-slate-300 col-span-2 print:border-black/30 text-slate-400">.......................</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Manifest Table - NO PRICES */}
                            <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-black print:rounded-none mt-2">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-950 tracking-wider border-b border-slate-200 print:bg-white print:text-black print:border-black">
                                        <tr>
                                            <th className="px-6 py-4 w-12 text-center">No</th>
                                            <th className="px-6 py-4">Nama Produk / Barang</th>
                                            <th className="px-6 py-4 text-center">Jumlah</th>
                                            <th className="px-6 py-4 text-center">Satuan</th>
                                            <th className="px-6 py-4 text-center w-32">Production Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 print:divide-black/20 text-slate-950">
                                        {sale.items.map((item: any, idx: number) => (
                                            <tr key={idx} className="print:text-black">
                                                <td className="px-6 py-4 text-center font-bold text-[11px]">{idx + 1}</td>
                                                <td className="px-6 py-4">
                                                    <p className="font-black text-slate-950 text-[12px] uppercase print:text-black">{item.product_name}</p>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 print:text-black/60">SKU: {item.product_sku || '-'}</p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="font-black text-slate-950 text-[14px] print:text-black">{item.quantity}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest print:text-black">{item.product_unit}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="border-b border-dashed border-slate-300 w-full h-4 mt-1 print:border-black/40"></div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Terms and Conditions (Note) */}
                            <div className="mt-4">
                                {sale.company?.deliveryNoteTerms ? (
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl print:bg-white print:border-black/20 print:rounded-none">
                                        <h4 className="text-[10px] font-black text-slate-950 uppercase tracking-widest mb-2 print:text-black">Catatan & Ketentuan:</h4>
                                        <p className="text-[10px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap print:text-black">
                                            {sale.company.deliveryNoteTerms}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl print:bg-white print:border-black/20 print:rounded-none">
                                        <h4 className="text-[10px] font-black text-slate-950 uppercase tracking-widest mb-1 print:text-black">Catatan:</h4>
                                        <p className="text-[10px] font-medium text-slate-500 italic print:text-black">Barang sudah diperiksa dan diterima dalam kondisi baik.</p>
                                    </div>
                                )}
                            </div>

                            {/* Vehicle Checklist */}
                            <div className="mt-4 p-4 border border-slate-200 rounded-xl print:border-black/20 print:rounded-none">
                                <h4 className="text-[10px] font-black text-slate-950 uppercase tracking-widest mb-3 print:text-black">Checklist Kendaraan (Wajib Diisi oleh Staff Gudang):</h4>
                                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                    {[
                                        "Kabin & Box dalam keadaan bersih / tidak berbau",
                                        "Box kendaraan dalam kondisi terkunci aman",
                                        "Suhu pendingin kendaraan sesuai standar",
                                        "Kendaraan bebas dari hama / serangga",
                                        "Tidak membawa produk/barang pihak lain",
                                        "Palet / alas barang dalam kondisi baik"
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="w-4 h-4 border border-slate-400 mt-0.5 rounded-[2px] print:border-black shrink-0"></div>
                                            <span className="text-[10px] font-bold text-slate-700 print:text-black leading-tight">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Signatures */}
                            <div className="grid grid-cols-3 gap-4 pt-8 mt-4 print:pt-4">
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest print:text-black">Disiapkan Oleh (Logistik)</p>
                                    <div className="h-20"></div>
                                    <div className="w-3/4 h-[1px] bg-slate-300 mx-auto print:bg-black"></div>
                                    <p className="text-[9px] mt-1 text-slate-400 print:text-black">Nama Terang & Tanda Tangan</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest print:text-black">Dibawa Oleh (Driver)</p>
                                    <div className="h-20"></div>
                                    <div className="w-3/4 h-[1px] bg-slate-300 mx-auto print:bg-black"></div>
                                    <p className="text-[9px] mt-1 text-slate-400 print:text-black">Nama Terang & Tanda Tangan</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest print:text-black">Diterima Oleh (Outlet)</p>
                                    <div className="h-20"></div>
                                    <div className="w-3/4 h-[1px] bg-slate-300 mx-auto print:bg-black"></div>
                                    <p className="text-[9px] mt-1 text-slate-400 print:text-black">Stempel, Nama Terang & Tanda Tangan</p>
                                </div>
                            </div>
                            
                        </div>
                    ) : (
                        <div className="text-center py-24">
                            <p className="text-rose-500 font-black italic uppercase tracking-[0.5em] text-sm">DATA_KOSONG_EXCEPTION</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
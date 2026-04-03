'use client';

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
    ShoppingBag, Search, Filter, MoreVertical, CheckCircle2, XCircle, 
    Clock, FileText, Plus, ArrowUpRight, ArrowDownRight, Package, Truck, User, Download, MessageCircle, Mail, Printer 
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import PurchaseOrderModal from "@/components/inventory/PurchaseOrderModal";
import PODetailModal from "@/components/inventory/PODetailModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function PurchaseOrdersPage() {
    const [pos, setPos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedPo, setSelectedPo] = useState<any>(null);
    const [role, setRole] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [company, setCompany] = useState<any>(null);

    const fetchPos = async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventory/purchase-orders');
            setPos(res.data);
        } catch (error) {
            console.error("Gagal mengambil data PO", error);
            toast.error("Gagal mengambil data PO");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchRole = async () => {
            const userRoleStr = localStorage.getItem("userRole") || "";
            setRole(userRoleStr);
        };
        const fetchCompany = async () => {
            try {
                const res = await api.get("/companies/my");
                setCompany(res.data);
            } catch (error) {
                console.error("Gagal ambil data perusahaan", error);
            }
        };
        fetchRole();
        fetchPos();
        fetchCompany();
    }, []);

    const handleUpdateStatus = async (id: number, status: 'APPROVED' | 'REJECTED') => {
        if (!window.confirm(`Apakah Anda yakin ingin ${status === 'APPROVED' ? 'MENYETUJUI' : 'MENOLAK'} pesanan ini?`)) return;

        try {
            await api.patch(`/inventory/purchase-orders/${id}/status`, { status });
            toast.success(`Berhasil ${status === 'APPROVED' ? 'menyetujui' : 'menolak'} PO.`);
            fetchPos();
        } catch (error: any) {
            console.error("Gagal update status PO", error);
            toast.error("Gagal update status: " + (error.response?.data?.error || error.message));
        }
    };

    const handleDownloadPDF = async (po: any) => {
        try {
            if (!po) throw new Error("Data PO tidak ditemukan");
            
            // Initialize jsPDF
            const doc = new jsPDF() as any;
            
            // --- HEADER SECTION ---
            // Draw Logo if available
            let headerY = 15;
            if (company?.logo) {
                try {
                    // Cek jika logo adalah URL atau dataURI
                    doc.addImage(company.logo, 'PNG', 15, 10, 25, 25);
                    headerY = 40;
                } catch (e) {
                    console.error("Gagal render logo", e);
                }
            }

            // Company Name & Info
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text(company?.name || "AIVOLA SYSTEM", company?.logo ? 45 : 15, 20);
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 116, 139);
            doc.text(company?.address || "Jl. Raya Digital No. 123", company?.logo ? 45 : 15, 26);
            doc.text(`Telp: ${company?.phone || "-"} | Email: ${company?.email || "-"}`, company?.logo ? 45 : 15, 31);

            // Separator Line
            doc.setDrawColor(226, 232, 240);
            doc.line(15, 38, 195, 38);

            // PO Title Bar
            doc.setFillColor(30, 41, 59); // Slate-800
            doc.rect(15, 45, 180, 15, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("PURCHASE ORDER", 25, 55);
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`NO: #${po.orderNumber || po.id}`, 130, 52);
            doc.text(`TANGGAL: ${new Date(po.date).toLocaleDateString('id-ID')}`, 130, 57);

            // --- CONTENT SECTION ---
            // Supplier Info
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("KEPADA (SUPPLIER):", 15, 75);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(po.supplier?.name || "N/A", 15, 81);
            doc.text(po.supplier?.phone || po.supplier?.email || "-", 15, 86);
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            doc.text("Mohon sediakan barang-barang berikut sesuai pesanan kami.", 15, 92);

            // Table Body Preparation
            const items = po.items || [];
            const tableBody = items.map((item: any, index: number) => [
                index + 1,
                item.product?.name || "N/A",
                `${item.quantity || 0} ${item.product?.unit || 'Pcs'}`,
                `Rp ${(item.price || 0).toLocaleString('id-ID')}`,
                `Rp ${((item.quantity || 0) * (item.price || 0)).toLocaleString('id-ID')}`
            ]);

            // Generate Table using standalone function
            autoTable(doc, {
                startY: 100,
                head: [['NO', 'NAMA BARANG', 'JUMLAH', 'HARGA SATUAN', 'TOTAL']],
                body: tableBody,
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
                foot: [['', '', '', 'TOTAL KESELURUHAN', `Rp ${(po.totalAmount || 0).toLocaleString('id-ID')}`]],
                footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 11 },
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' }
            });

            // Footer / Signatures
            const finalY = (doc as any).lastAutoTable?.finalY || 150;
            const signatureY = finalY + 20;

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Dibuat Oleh:", 20, signatureY);
            doc.text("Disetujui Oleh:", 140, signatureY);
            
            doc.setFont("helvetica", "normal");
            doc.text(po.createdBy?.name || "-", 20, signatureY + 15);
            doc.text(po.approvedBy?.name || "..........................", 140, signatureY + 15);

            // Safe FileName: Very Simple String
            const poNum = (po.orderNumber || po.id || "Order").toString().replace(/[^a-zA-Z0-9]/g, "");
            const fileName = `PO_${poNum}.pdf`;

            // Standard Method (Optimized for extension detection)
            doc.save(fileName);

            toast.success("PDF berhasil diunduh.");
        } catch (error: any) {
            console.error("PDF GENERATION ERROR:", error);
            toast.error(`Gagal membuat PDF: ${error.message}`);
        }
    };

    const handleSendWhatsApp = (po: any) => {
        const phone = po.supplier?.phone;
        if (!phone) return toast.error("Nomor WhatsApp supplier tidak tersedia.");
        
        // 1. Download PDF first
        handleDownloadPDF(po);
        
        // 2. Prepare message with helpful instruction
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
        
        const message = `Halo ${po.supplier?.name || 'Pemasok'},\n\nKami ingin mengirimkan Pesanan Pembelian kami (Purchase Order) dengan nomor *#${po.orderNumber}*.\n\n*Detail Pesanan:*\n${po.items.map((it: any) => `- ${it.product?.name}: ${it.quantity} ${it.product?.unit}`).join('\n')}\n\n*Total Estimasi:* Rp ${po.totalAmount.toLocaleString('id-ID')}\n\n_File PDF Purchase Order sudah otomatis terunduh di perangkat kami. Mohon ditunggu, akan segera kami lampirkan filenya ke chat ini._\n\nMohon konfirmasinya. Terima kasih.`;
        
        const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        toast.success("Membuka WhatsApp... silakan lampirkan file PDF yang baru saja terunduh.");
    };

    const handleSendEmail = (po: any) => {
        const email = po.supplier?.email;
        if (!email) return toast.error("Email supplier tidak tersedia.");
        
        // 1. Download PDF first
        handleDownloadPDF(po);
        
        // 2. Prepare Email
        const subject = `Purchase Order #${po.orderNumber} - [Pesanan Baru]`;
        const body = `Yth. ${po.supplier.name},\n\nTerlampir rincian pesanan kami:\n\nNomor PO: #${po.orderNumber}\nTanggal: ${new Date(po.date).toLocaleDateString()}\nTotal: Rp ${po.totalAmount.toLocaleString('id-ID')}\n\nMohon dicek file PDF Purchase Order yang telah kami lampirkan bersama email ini.\n\nMohon konfirmasi ketersediaan stok barang tersebut.\n\nTerima kasih.`;
        
        const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = url;
        toast.success("Membuka Draft Email... silakan lampirkan file PDF yang baru saja terunduh.");
    };

    const filteredPos = pos.filter(po => {
        const matchesSearch = po.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            po.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = selectedStatus === "all" || po.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    const userRole = role.toUpperCase();
    const isPurchasingOrAdmin = ['PURCHASING', 'ADMIN', 'SUPERADMIN', 'OWNER', 'MANAGER'].includes(userRole);
    const canCreatePO = ['OPERATIONAL', 'ADMIN', 'SUPERADMIN', 'OWNER', 'PURCHASING', 'MANAGER'].includes(userRole);

    return (
        <DashboardLayout>
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 italic">
                        Purchase Orders (PO)
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 font-medium italic">Kelola pemesanan barang ke supplier dan approvals dari tim operasional.</p>
                </div>
                {canCreatePO && (
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-xl hover:bg-slate-800 transition-all active:scale-95"
                    >
                        <Plus className="h-4 w-4" /> Order Barang Baru
                    </button>
                )}

            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><ShoppingBag className="h-6 w-6" /></div>
                        <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest bg-blue-50 px-2 py-1 rounded">Total PO</span>
                    </div>
                    <p className="text-2xl font-black italic text-slate-900">{pos.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm border-l-4 border-l-yellow-400">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-yellow-50 rounded-xl text-yellow-600"><Clock className="h-6 w-6" /></div>
                        <span className="text-[10px] font-black uppercase text-yellow-500 tracking-widest bg-yellow-50 px-2 py-1 rounded">Pending</span>
                    </div>
                    <p className="text-2xl font-black italic text-slate-900">{pos.filter(p => p.status === 'PENDING').length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm border-l-4 border-l-emerald-400">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><CheckCircle2 className="h-6 w-6" /></div>
                        <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-50 px-2 py-1 rounded">Approved</span>
                    </div>
                    <p className="text-2xl font-black italic text-slate-900">{pos.filter(p => p.status === 'APPROVED').length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm border-l-4 border-l-red-400">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-50 rounded-xl text-red-600"><XCircle className="h-6 w-6" /></div>
                        <span className="text-[10px] font-black uppercase text-red-500 tracking-widest bg-red-50 px-2 py-1 rounded">Rejected</span>
                    </div>
                    <p className="text-2xl font-black italic text-slate-900">{pos.filter(p => p.status === 'REJECTED').length}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-12">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 p-6">
                    <div className="relative w-full sm:w-96 group">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari nomor PO atau supplier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:bg-white focus:outline-none transition-all font-medium"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select 
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all outline-none"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="all">Semua Status</option>
                            <option value="PENDING">Pending Approval</option>
                            <option value="APPROVED">Disetujui</option>
                            <option value="REJECTED">Ditolak</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr className="border-b border-slate-100">
                                <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest">Detail PO</th>
                                <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest">Supplier</th>
                                <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-right">Total Tagihan</th>
                                <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest">Pembuat</th>
                                <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 italic">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4"><div className="h-10 w-full rounded bg-slate-50"></div></td>
                                    </tr>
                                ))
                            ) : filteredPos.length > 0 ? (
                                filteredPos.map((po) => (
                                    <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <p className="font-black text-slate-900 italic text-base">#{po.orderNumber}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> {new Date(po.date).toLocaleDateString()}
                                                    </span>
                                                    <span className="h-1 w-1 bg-slate-200 rounded-full"></span>
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1 rounded">
                                                        {po.items?.length || 0} Barang
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                                    <Truck className="h-4 w-4 text-slate-400" />
                                                </div>
                                                <p className="font-bold text-slate-700">{po.supplier?.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="font-black text-slate-900 text-base">Rp {po.totalAmount.toLocaleString()}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {po.status === 'PENDING' && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-3 py-1 text-[10px] font-black text-yellow-600 border border-yellow-100 uppercase tracking-tighter">
                                                    Approval Diperlukan
                                                </span>
                                            )}
                                            {po.status === 'APPROVED' && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-600 border border-emerald-100 uppercase tracking-tighter">
                                                    Disetujui
                                                </span>
                                            )}
                                            {po.status === 'REJECTED' && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-[10px] font-black text-red-600 border border-red-100 uppercase tracking-tighter">
                                                    Ditolak
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <p className="font-bold text-slate-700 flex items-center gap-1">
                                                    <User className="h-3 w-3" /> {po.createdBy?.name}
                                                </p>
                                                {po.approvedBy && (
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">APRV: {po.approvedBy.name}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {po.status === 'PENDING' && isPurchasingOrAdmin ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(po.id, 'APPROVED')}
                                                            title="Setujui PO"
                                                            className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(po.id, 'REJECTED')}
                                                            title="Tolak PO"
                                                            className="p-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all shadow-md active:scale-95"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        {po.status !== 'REJECTED' && (
                                                            <>
                                                                <button 
                                                                    className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all shadow-sm"
                                                                    title="Kirim ke WhatsApp"
                                                                    onClick={() => handleSendWhatsApp(po)}
                                                                >
                                                                    <MessageCircle className="h-4 w-4" />
                                                                </button>
                                                                <button 
                                                                    className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all shadow-sm"
                                                                    title="Kirim ke Email"
                                                                    onClick={() => handleSendEmail(po)}
                                                                >
                                                                    <Mail className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                         <button 
                                                             className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all shadow-sm"
                                                             title="Cetak Purchase Order"
                                                             onClick={() => {
                                                                 setSelectedPo(po);
                                                                 setIsDetailModalOpen(true);
                                                             }}
                                                         >
                                                             <Printer className="h-4 w-4" />
                                                         </button>
                                                        <button 
                                                            className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600 transition-all"
                                                            title="Lihat Detail"
                                                            onClick={() => {
                                                                setSelectedPo(po);
                                                                setIsDetailModalOpen(true);
                                                            }}
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="rounded-full bg-slate-50 p-6"><ShoppingBag className="h-10 w-10 text-slate-200" /></div>
                                            <p className="text-sm font-bold text-slate-400 italic">Belum ada Purchase Order (PO) yang tercatat.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <PurchaseOrderModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchPos}
            />
            <PODetailModal 
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                po={selectedPo}
            />
        </DashboardLayout>
    );
}

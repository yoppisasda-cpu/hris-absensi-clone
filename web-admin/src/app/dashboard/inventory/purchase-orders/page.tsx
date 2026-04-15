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
            <div className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                            <ShoppingBag className="h-6 w-6 stroke-[2.5px]" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase text-glow-sm">
                            Procurement <span className="text-indigo-500">Pipeline</span>
                        </h1>
                    </div>
                    <p className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase italic max-w-2xl leading-relaxed">
                        End-to-end supply chain orchestration. Manage vendor requisitions, authorization workflows, and distribution logistics with surgical precision.
                    </p>
                </div>
                {canCreatePO && (
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="group flex items-center gap-4 rounded-2xl bg-indigo-600 px-8 py-4 text-[11px] font-black text-white shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-[0.2em] italic border border-white/10"
                    >
                        <Plus className="h-4 w-4 stroke-[3px] group-hover:rotate-90 transition-transform duration-300" /> Initiate Requisition
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="relative group overflow-hidden rounded-[32px] border border-white/5 bg-slate-900 p-8 transition-all hover:bg-slate-800 shadow-2xl">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ShoppingBag className="h-20 w-20 text-indigo-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                <ShoppingBag className="h-5 w-5 stroke-[2.5px]" />
                            </div>
                            <span className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] bg-indigo-500/5 px-3 py-1.5 rounded-full border border-indigo-500/10 italic">Total Manifests</span>
                        </div>
                        <p className="text-4xl font-black italic text-white tracking-tighter mb-1">{pos.length}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Global Procurement Record</p>
                    </div>
                </div>

                <div className="relative group overflow-hidden rounded-[32px] border border-white/5 bg-slate-900 p-8 transition-all hover:bg-slate-800 shadow-2xl border-l-4 border-l-amber-500/50">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock className="h-20 w-20 text-amber-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                                <Clock className="h-5 w-5 stroke-[2.5px]" />
                            </div>
                            <span className="text-[9px] font-black uppercase text-amber-500 tracking-[0.2em] bg-amber-500/5 px-3 py-1.5 rounded-full border border-amber-500/10 italic">Auth Pending</span>
                        </div>
                        <p className="text-4xl font-black italic text-white tracking-tighter mb-1">{pos.filter(p => p.status === 'PENDING').length}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Awaiting Hierarchy Approval</p>
                    </div>
                </div>

                <div className="relative group overflow-hidden rounded-[32px] border border-white/5 bg-slate-900 p-8 transition-all hover:bg-slate-800 shadow-2xl border-l-4 border-l-emerald-500/50">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <CheckCircle2 className="h-20 w-20 text-emerald-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                <CheckCircle2 className="h-5 w-5 stroke-[2.5px]" />
                            </div>
                            <span className="text-[9px] font-black uppercase text-emerald-400 tracking-[0.2em] bg-emerald-500/5 px-3 py-1.5 rounded-full border border-emerald-500/10 italic">Validated</span>
                        </div>
                        <p className="text-4xl font-black italic text-white tracking-tighter mb-1">{pos.filter(p => p.status === 'APPROVED').length}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Orders Transmitted to Vendors</p>
                    </div>
                </div>

                <div className="relative group overflow-hidden rounded-[32px] border border-white/5 bg-slate-900 p-8 transition-all hover:bg-slate-800 shadow-2xl border-l-4 border-l-red-500/50">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <XCircle className="h-20 w-20 text-red-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="h-10 w-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                <XCircle className="h-5 w-5 stroke-[2.5px]" />
                            </div>
                            <span className="text-[9px] font-black uppercase text-red-500 tracking-[0.2em] bg-red-500/5 px-3 py-1.5 rounded-full border border-red-500/10 italic">Red-Flagged</span>
                        </div>
                        <p className="text-4xl font-black italic text-white tracking-tighter mb-1">{pos.filter(p => p.status === 'REJECTED').length}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Requisition Refused</p>
                    </div>
                </div>
            </div>

            <div className="rounded-[40px] border border-white/5 bg-slate-900/50 shadow-2xl overflow-hidden mb-20 backdrop-blur-xl">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 border-b border-white/5 p-8 bg-slate-950/30">
                    <div className="relative w-full lg:w-[450px] group">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors z-10" />
                        <input
                            type="text"
                            placeholder="SEARCH MANIFEST # OR VENDOR..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3.5 pl-12 pr-6 text-[10px] font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase placeholder:text-slate-800 shadow-inner"
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 group focus-within:border-indigo-500/50 transition-all">
                            <Filter className="h-3.5 w-3.5 text-slate-600" />
                            <select 
                                className="bg-transparent text-[10px] font-black text-slate-400 focus:text-white outline-none uppercase tracking-widest italic cursor-pointer py-1"
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                            >
                                <option value="all">ALL STATUS PROTOCOLS</option>
                                <option value="PENDING">PENDING AUTHORIZATION</option>
                                <option value="APPROVED">VEND_APPROVED</option>
                                <option value="REJECTED">VEND_REJECTED</option>
                            </select>
                        </div>
                        <button className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-600 hover:text-white hover:bg-slate-800 transition-all">
                            <Download className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead>
                            <tr className="bg-slate-950/50">
                                <th className="px-8 py-5 font-black uppercase text-[9px] tracking-[0.2em] text-slate-500 italic border-b border-white/5">Manifest Identity</th>
                                <th className="px-8 py-5 font-black uppercase text-[9px] tracking-[0.2em] text-slate-500 italic border-b border-white/5">Supply Node</th>
                                <th className="px-8 py-5 font-black uppercase text-[9px] tracking-[0.2em] text-slate-500 italic border-b border-white/5 text-right">Procurement Value</th>
                                <th className="px-8 py-5 font-black uppercase text-[9px] tracking-[0.2em] text-slate-500 italic border-b border-white/5 text-center">Protocol State</th>
                                <th className="px-8 py-5 font-black uppercase text-[9px] tracking-[0.2em] text-slate-500 italic border-b border-white/5">Originator Node</th>
                                <th className="px-8 py-5 font-black uppercase text-[9px] tracking-[0.2em] text-slate-500 italic border-b border-white/5 text-right">Data Directives</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 italic">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-8 py-6"><div className="h-12 w-full rounded-2xl bg-white/5"></div></td>
                                    </tr>
                                ))
                            ) : filteredPos.length > 0 ? (
                                filteredPos.map((po) => (
                                    <tr key={po.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <p className="font-black text-white italic text-base tracking-tighter uppercase group-hover:text-indigo-400 transition-colors">#{po.orderNumber}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-[9px] font-black text-slate-500 flex items-center gap-1.5 uppercase tracking-widest italic">
                                                        <Clock className="h-3 w-3 text-indigo-500" /> {new Date(po.date).toLocaleDateString()}
                                                    </span>
                                                    <span className="h-1 w-1 bg-slate-800 rounded-full"></span>
                                                    <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg uppercase tracking-widest italic border border-indigo-500/20">
                                                        {po.items?.length || 0} UNITS
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all shadow-inner">
                                                    <Truck className="h-5 w-5 stroke-[1.5px]" />
                                                </div>
                                                <p className="font-black text-slate-400 uppercase tracking-tight text-xs italic group-hover:text-white transition-colors">{po.supplier?.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <p className="font-black text-white text-base tracking-tighter text-glow-sm italic">Rp {po.totalAmount.toLocaleString()}</p>
                                        </td>
                                         <td className="px-8 py-6 text-center">
                                            {po.status === 'PENDING' && (
                                                <span className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-1.5 text-[9px] font-black text-amber-500 border border-amber-500/20 uppercase tracking-[0.2em] italic">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></div> REQ_REVIEW
                                                </span>
                                            )}
                                            {po.status === 'APPROVED' && (
                                                <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-1.5 text-[9px] font-black text-emerald-400 border border-emerald-500/20 uppercase tracking-[0.2em] italic">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400"></div> AUTH_VALID
                                                </span>
                                            )}
                                            {po.status === 'REJECTED' && (
                                                <span className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-1.5 text-[9px] font-black text-red-500 border border-red-500/20 uppercase tracking-[0.2em] italic">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-red-500"></div> AUTH_DENIED
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <p className="text-[11px] font-black text-slate-400 uppercase italic tracking-widest flex items-center gap-2">
                                                    <User className="h-3 w-3 text-indigo-400" /> {po.createdBy?.name || 'ROOT'}
                                                </p>
                                                {po.approvedBy && (
                                                    <p className="text-[8px] text-slate-600 font-black uppercase mt-1.5 tracking-widest italic border-l border-indigo-500/30 pl-2">AUTH: {po.approvedBy.name}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3 translate-x-4 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                {po.status === 'PENDING' && isPurchasingOrAdmin ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(po.id, 'APPROVED')}
                                                            title="AUTHORIZE REQUISITION"
                                                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 border border-white/10"
                                                        >
                                                            <CheckCircle2 className="h-5 w-5 stroke-[2.5px]" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(po.id, 'REJECTED')}
                                                            title="DENY REQUISITION"
                                                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95 border border-white/10"
                                                        >
                                                            <XCircle className="h-5 w-5 stroke-[2.5px]" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        {po.status !== 'REJECTED' && (
                                                            <>
                                                                <button 
                                                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
                                                                    title="TRANSMIT VIA WHATSAPP"
                                                                    onClick={() => handleSendWhatsApp(po)}
                                                                >
                                                                    <MessageCircle className="h-5 w-5" />
                                                                </button>
                                                                <button 
                                                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                                                                    title="TRANSMIT VIA EMAIL"
                                                                    onClick={() => handleSendEmail(po)}
                                                                >
                                                                    <Mail className="h-5 w-5" />
                                                                </button>
                                                            </>
                                                        )}
                                                         <button 
                                                             className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-slate-500 hover:text-white hover:border-white/20 transition-all"
                                                             title="GENERATE ANALYTICS PDF"
                                                             onClick={() => {
                                                                 setSelectedPo(po);
                                                                 setIsDetailModalOpen(true);
                                                             }}
                                                         >
                                                             <Printer className="h-5 w-5" />
                                                         </button>
                                                        <button 
                                                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 border border-white/10"
                                                            title="INSPECT MANIFEST"
                                                            onClick={() => {
                                                                setSelectedPo(po);
                                                                setIsDetailModalOpen(true);
                                                            }}
                                                        >
                                                            <FileText className="h-5 w-5 stroke-[2.5px]" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-8 py-32 text-center text-slate-600 uppercase tracking-[0.2em] font-black italic text-xs">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="h-20 w-20 rounded-[32px] bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-800">
                                                <ShoppingBag className="h-10 w-10" />
                                            </div>
                                            NO PROCUREMENT MANIFESTS DETECTED IN STORAGE
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

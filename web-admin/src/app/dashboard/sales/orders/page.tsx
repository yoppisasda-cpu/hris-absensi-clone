"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Plus, Search, ChevronRight, CheckCircle, Package, Truck, FileText, ArrowRight, Pencil, Trash2, Printer } from "lucide-react";
import { useFeatures } from "@/lib/FeatureContext";
import api from "@/lib/api";
import CreateSalesOrderModal from "@/components/sales/CreateSalesOrderModal";
import InvoiceModal from "@/components/sales/InvoiceModal";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(amount);
};
import toast from "react-hot-toast";

export default function SalesOrdersPage() {
  const { hasFeature } = useFeatures();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/sales/orders");
      setOrders(res.data);
    } catch (error) {
      console.error("Failed to fetch sales orders:", error);
      toast.error("Gagal memuat data pesanan B2B");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await api.patch(`/sales/orders/${id}/status`, { status: newStatus });
      toast.success(`Status diubah menjadi ${newStatus}`);
      fetchOrders();
    } catch (error) {
      toast.error("Gagal mengubah status pesanan");
    }
  };

  const handleConvertToInvoice = async (id: number) => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    const defaultDateStr = defaultDate.toISOString().split('T')[0];

    const inputDate = prompt(
      "Apakah Anda yakin ingin menagihkan pesanan ini? Stok akan terpotong secara otomatis.\n\n" +
      "Silakan tentukan TANGGAL JATUH TEMPO untuk invoice ini (Format: YYYY-MM-DD):",
      defaultDateStr
    );
    
    if (inputDate === null) return; // Batal konversi

    try {
      const res = await api.post(`/sales/orders/${id}/convert`, { dueDate: inputDate });
      toast.success(res.data.message || "Berhasil dikonversi ke Invoice");
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal mengonversi pesanan");
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pesanan (PO) ini? Tindakan ini tidak dapat dibatalkan.")) return;
    try {
      await api.delete(`/sales/orders/${id}`);
      toast.success("Pesanan berhasil dihapus");
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal menghapus pesanan");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 rounded-xl border border-amber-400/20">Menunggu Approval</span>;
      case "APPROVED":
        return <span className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-400/10 rounded-xl border border-indigo-400/20">Disetujui</span>;
      case "PREPARING":
        return <span className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-orange-400 bg-orange-400/10 rounded-xl border border-orange-400/20">Dikemas</span>;
      case "SHIPPED":
        return <span className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-purple-400 bg-purple-400/10 rounded-xl border border-purple-400/20">Dalam Pengiriman</span>;
      case "INVOICED":
        return <span className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 rounded-xl border border-emerald-400/20">Ditagihkan (Invoice)</span>;
      case "CANCELLED":
        return <span className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-rose-400 bg-rose-400/10 rounded-xl border border-rose-400/20">Dibatalkan</span>;
      default:
        return <span className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 bg-slate-400/10 rounded-xl border border-slate-400/20">{status}</span>;
    }
  };

  if (!hasFeature("CRM") && !hasFeature("INVENTORY")) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Package className="h-16 w-16 text-slate-755 mb-4 animate-pulse" />
        <h2 className="text-xl font-black italic uppercase tracking-widest text-white">Akses Ditolak</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] mt-2 max-w-sm">Anda membutuhkan modul Penjualan & Inventaris untuk mengakses B2B Sales Orders.</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-8 rounded-[2.5rem] shadow-2xl border border-slate-800 backdrop-blur-xl">
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-widest text-white leading-none">B2B Sales Orders (PO)</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-3 italic">B2B Procurement Tracking & Fulfillment Vector</p>
          </div>
          <button
            onClick={() => {
              setSelectedOrderId(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest italic transition-all shadow-lg shadow-indigo-600/20 border border-white/10 active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[3px]" />
            <span>Buat Pesanan (PO)</span>
          </button>
        </div>

        {/* Orders List */}
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden backdrop-blur-2xl">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950/30">
            <h2 className="font-black italic tracking-widest text-white uppercase text-[10px]">Daftar Pesanan</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px] italic">Memuat data...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="bg-slate-950 p-4 rounded-3xl border border-white/5 mb-4 text-slate-600 shadow-inner">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="text-xs font-black italic tracking-widest text-white uppercase">Belum Ada Pesanan</h3>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest max-w-sm mt-2">Pesanan (PO) baru dari pelanggan B2B akan muncul di sini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-950 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-white/5 italic">
                  <tr>
                    <th className="px-8 py-5">Nomor PO / Tanggal</th>
                    <th className="px-8 py-5">Pelanggan</th>
                    <th className="px-8 py-5 text-right">Total Tagihan</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 italic">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-8 py-5">
                        <div className="font-black text-white text-[11px] uppercase tracking-tighter">{order.orderNumber}</div>
                        <div className="text-[10px] font-bold text-slate-500 mt-1.5">{new Date(order.date).toLocaleDateString('id-ID')}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-black text-slate-300 text-[11px] uppercase">{order.customer?.name}</div>
                        <div className="text-[10px] font-bold text-slate-500 mt-1.5">{order.items?.length || 0} item dipesan</div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="font-black text-white text-[11px] tracking-widest">{formatCurrency(order.totalAmount)}</div>
                        {order.taxRate > 0 && (
                          <div className="text-[10px] text-amber-500 font-bold mt-1.5">
                            PPN {order.taxRate}% (+{formatCurrency(order.taxAmount)})
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2.5">
                          {order.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(order.id, 'APPROVED')}
                                className="p-2.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl transition-all border border-indigo-500/20 active:scale-90"
                                title="Setujui Pesanan"
                              >
                                <CheckCircle className="w-4 h-4 stroke-[2.5px]" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedOrderId(order.id);
                                  setIsModalOpen(true);
                                }}
                                className="p-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all border border-blue-500/20 active:scale-90"
                                title="Edit Pesanan"
                              >
                                <Pencil className="w-4 h-4 stroke-[2.5px]" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all border border-rose-500/20 active:scale-90"
                                title="Hapus Pesanan"
                              >
                                <Trash2 className="w-4 h-4 stroke-[2.5px]" />
                              </button>
                            </>
                          )}
                          {order.status === 'APPROVED' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                                className="p-2.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-xl transition-all border border-amber-500/20 active:scale-90"
                                title="Bungkus / Kemas"
                              >
                                <Package className="w-4 h-4 stroke-[2.5px]" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedOrderId(order.id);
                                  setIsModalOpen(true);
                                }}
                                className="p-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all border border-blue-500/20 active:scale-90"
                                title="Edit Pesanan"
                              >
                                <Pencil className="w-4 h-4 stroke-[2.5px]" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all border border-rose-500/20 active:scale-90"
                                title="Hapus Pesanan"
                              >
                                <Trash2 className="w-4 h-4 stroke-[2.5px]" />
                              </button>
                            </>
                          )}
                          {order.status === 'PREPARING' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
                                className="p-2.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-xl transition-all border border-purple-500/20 active:scale-90"
                                title="Kirim Pesanan"
                              >
                                <Truck className="w-4 h-4 stroke-[2.5px]" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all border border-rose-500/20 active:scale-90"
                                title="Hapus Pesanan"
                              >
                                <Trash2 className="w-4 h-4 stroke-[2.5px]" />
                              </button>
                            </>
                          )}
                          {order.status === 'SHIPPED' && (
                            <>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all border border-rose-500/20 active:scale-90"
                                title="Hapus Pesanan"
                              >
                                <Trash2 className="w-4 h-4 stroke-[2.5px]" />
                              </button>
                            </>
                          )}
                          {(order.status === 'SHIPPED' || order.status === 'APPROVED' || order.status === 'PREPARING') && (
                            <button
                              onClick={() => handleConvertToInvoice(order.id)}
                              className="px-3.5 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-black rounded-xl text-[9px] uppercase tracking-widest flex items-center gap-1.5 transition-all border border-emerald-500/20 active:scale-95"
                              title="Konversi ke Invoice & Potong Stok"
                            >
                              <span>Tagih</span>
                              <ArrowRight className="w-3.5 h-3.5 stroke-[3px]" />
                            </button>
                          )}
                          {order.status === 'INVOICED' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedSaleId(order.saleId);
                                  setIsInvoiceModalOpen(true);
                                }}
                                className="px-3.5 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-black rounded-xl text-[9px] uppercase tracking-widest flex items-center gap-1.5 transition-all border border-emerald-500/20 active:scale-95"
                                title="Cetak/Lihat Invoice"
                              >
                                <Printer className="w-3.5 h-3.5 stroke-[3.5px]" />
                                <span>Invoice</span>
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all border border-rose-500/20 active:scale-90"
                                title="Hapus Pesanan"
                              >
                                <Trash2 className="w-4 h-4 stroke-[2.5px]" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <CreateSalesOrderModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrderId(null);
          }}
          onSuccess={fetchOrders}
          orderId={selectedOrderId}
        />

        {selectedSaleId && (
          <InvoiceModal
            isOpen={isInvoiceModalOpen}
            onClose={() => {
              setIsInvoiceModalOpen(false);
              setSelectedSaleId(null);
            }}
            saleId={selectedSaleId}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

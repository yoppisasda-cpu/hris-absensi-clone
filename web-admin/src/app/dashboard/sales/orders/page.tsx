"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Plus, Search, ChevronRight, CheckCircle, Package, Truck, FileText, ArrowRight } from "lucide-react";
import { useFeatures } from "@/lib/FeatureContext";
import api from "@/lib/api";
import CreateSalesOrderModal from "@/components/sales/CreateSalesOrderModal";

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
    if (!confirm("Apakah Anda yakin ingin menagihkan pesanan ini? Stok akan terpotong secara otomatis.")) return;
    
    try {
      const res = await api.post(`/sales/orders/${id}/convert`);
      toast.success(res.data.message || "Berhasil dikonversi ke Invoice");
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal mengonversi pesanan");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded-lg">Menunggu Approval</span>;
      case "APPROVED":
        return <span className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-lg">Disetujui</span>;
      case "PREPARING":
        return <span className="px-2 py-1 text-xs font-semibold text-orange-700 bg-orange-100 rounded-lg">Dikemas</span>;
      case "SHIPPED":
        return <span className="px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded-lg">Dalam Pengiriman</span>;
      case "INVOICED":
        return <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-lg">Ditagihkan (Invoice)</span>;
      case "CANCELLED":
        return <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-lg">Dibatalkan</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg">{status}</span>;
    }
  };

  if (!hasFeature("CRM") && !hasFeature("INVENTORY")) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Package className="h-16 w-16 text-slate-700 mb-4" />
        <h2 className="text-xl font-bold text-white">Akses Ditolak</h2>
        <p className="text-slate-400 mt-2 max-w-sm">Anda membutuhkan modul Penjualan & Inventaris untuk mengakses B2B Sales Orders.</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl shadow-sm border border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-white">B2B Sales Orders (PO)</h1>
          <p className="text-slate-400 mt-1">Kelola pesanan dari pelanggan bisnis secara efisien.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg active:scale-95"
        >
          <Plus className="h-5 w-5" />
          <span>Buat Pesanan (PO)</span>
        </button>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="p-5 border-b border-gray-100 flex justify-between items-center">
             <h2 className="font-semibold text-gray-800">Daftar Pesanan</h2>
         </div>
         {loading ? (
             <div className="p-10 text-center text-gray-500">Memuat data...</div>
         ) : orders.length === 0 ? (
             <div className="p-10 text-center flex flex-col items-center">
                 <div className="bg-gray-50 p-4 rounded-full mb-3">
                     <FileText className="h-8 w-8 text-gray-400" />
                 </div>
                 <h3 className="text-lg font-medium text-gray-800">Belum Ada Pesanan</h3>
                 <p className="text-gray-500 max-w-sm mt-1">Pesanan (PO) baru dari pelanggan B2B akan muncul di sini.</p>
             </div>
         ) : (
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50/50 text-gray-600 text-xs uppercase">
                         <tr>
                             <th className="px-6 py-4 font-semibold">Nomor PO / Tanggal</th>
                             <th className="px-6 py-4 font-semibold">Pelanggan</th>
                             <th className="px-6 py-4 font-semibold text-right">Total Tagihan</th>
                             <th className="px-6 py-4 font-semibold">Status</th>
                             <th className="px-6 py-4 font-semibold text-center">Aksi</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {orders.map((order) => (
                             <tr key={order.id} className="hover:bg-gray-50/30 transition-colors">
                                 <td className="px-6 py-4">
                                     <div className="font-semibold text-gray-900">{order.orderNumber}</div>
                                     <div className="text-xs text-gray-500 mt-1">{new Date(order.date).toLocaleDateString('id-ID')}</div>
                                 </td>
                                 <td className="px-6 py-4">
                                     <div className="font-medium text-gray-800">{order.customer?.name}</div>
                                     <div className="text-xs text-gray-500">{order.items?.length || 0} item dipesan</div>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <div className="font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</div>
                                 </td>
                                 <td className="px-6 py-4">
                                     {getStatusBadge(order.status)}
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                     <div className="flex items-center justify-center gap-2">
                                         {order.status === 'PENDING' && (
                                            <button onClick={() => handleUpdateStatus(order.id, 'APPROVED')} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Setujui Pesanan">
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                         )}
                                         {order.status === 'APPROVED' && (
                                            <button onClick={() => handleUpdateStatus(order.id, 'PREPARING')} className="p-2 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors" title="Bungkus / Kemas">
                                                <Package className="w-4 h-4" />
                                            </button>
                                         )}
                                         {order.status === 'PREPARING' && (
                                            <button onClick={() => handleUpdateStatus(order.id, 'SHIPPED')} className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors" title="Kirim Pesanan">
                                                <Truck className="w-4 h-4" />
                                            </button>
                                         )}
                                         {(order.status === 'SHIPPED' || order.status === 'APPROVED' || order.status === 'PREPARING') && (
                                            <button onClick={() => handleConvertToInvoice(order.id)} className="p-2 bg-green-50 text-green-700 hover:bg-green-100 font-medium rounded-lg text-xs flex items-center gap-1 transition-colors" title="Konversi ke Invoice & Potong Stok">
                                                <span>Tagih</span>
                                                <ArrowRight className="w-3 h-3" />
                                            </button>
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
         onClose={() => setIsModalOpen(false)}
         onSuccess={fetchOrders}
      />
      </div>
    </DashboardLayout>
  );
}

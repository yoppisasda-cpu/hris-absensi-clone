import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Package, Clock, ShoppingBag } from 'lucide-react';

interface PreOrderRecapProps {
  branchId: string;
}

export default function PreOrderRecap({ branchId }: PreOrderRecapProps) {
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreOrders();
  }, [branchId]);

  const fetchPreOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/pos/pending?saleType=PRE_ORDER&branchId=${branchId}`);
      setPendingBills(res.data);
    } catch (err: any) {
      toast.error('Gagal memuat data Pre Order');
    } finally {
      setLoading(false);
    }
  };

  // Kalkulasi total produk untuk dikirim ke rumah produksi
  const productSummary = useMemo(() => {
    const summary: Record<string, { name: string, qty: number, subtotal: number }> = {};
    
    pendingBills.forEach(bill => {
      if (Array.isArray(bill.items)) {
        bill.items.forEach((item: any) => {
          const productId = item.productId || item.id || 'unknown';
          if (!summary[productId]) {
            summary[productId] = { name: item.name || 'Unknown', qty: 0, subtotal: 0 };
          }
          summary[productId].qty += Number(item.qty || item.quantity || 1);
          summary[productId].subtotal += Number(item.subtotal || (item.price * (item.qty || 1)));
        });
      }
    });

    return Object.values(summary).sort((a, b) => b.qty - a.qty);
  }, [pendingBills]);

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-slate-400">Memuat data Pre-Order...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-200">Total PO Menunggu</h3>
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
              <ShoppingBag size={24} />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{pendingBills.length} <span className="text-sm font-medium text-slate-400">Pesanan</span></p>
        </div>
        
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-200">Total Item Diproduksi</h3>
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
              <Package size={24} />
            </div>
          </div>
          <p className="text-3xl font-black text-white">
            {productSummary.reduce((sum, p) => sum + p.qty, 0)} <span className="text-sm font-medium text-slate-400">Pcs Roti</span>
          </p>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-sm">
        <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-500" />
          Rekap Kebutuhan Produksi
        </h3>
        
        {productSummary.length === 0 ? (
          <div className="text-center py-10 text-slate-400">Belum ada pesanan Pre-Order yang menunggu.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-sm text-slate-400">
                  <th className="py-4 font-semibold">Nama Produk</th>
                  <th className="py-4 font-semibold text-right">Total Dipesan</th>
                  <th className="py-4 font-semibold text-right">Estimasi Nilai</th>
                </tr>
              </thead>
              <tbody>
                {productSummary.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 font-medium text-slate-200">{item.name}</td>
                    <td className="py-4 text-right font-bold text-emerald-400">{item.qty} pcs</td>
                    <td className="py-4 text-right text-slate-400">
                      Rp {item.subtotal.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-sm mt-6">
        <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-500" />
          Daftar Antrean PO
        </h3>
        
        {pendingBills.length === 0 ? (
          <div className="text-center py-10 text-slate-400">Tidak ada daftar antrean PO.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingBills.map((bill, idx) => (
              <div key={idx} className="border border-slate-700/50 rounded-2xl p-4 bg-slate-800/30">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-200">{bill.label}</span>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full font-medium">
                    {format(new Date(bill.createdAt), 'dd MMM, HH:mm', { locale: id })}
                  </span>
                </div>
                <div className="text-sm text-slate-400 mt-3 space-y-1">
                  {Array.isArray(bill.items) && bill.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span>{item.qty || item.quantity}x {item.name}</span>
                      <span>Rp {(item.subtotal || ((item.qty || item.quantity || 1) * item.price)).toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

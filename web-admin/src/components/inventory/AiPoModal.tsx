'use client';

import { useState, useEffect } from "react";
import { X, Sparkles, ShoppingBag, AlertTriangle, CheckCircle, RefreshCw, Layers, TrendingUp } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

interface AiPoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGeneratePo: (items: Array<{ productId: string; quantity: number; price: number }>) => void;
}

export default function AiPoModal({ isOpen, onClose, onGeneratePo }: AiPoModalProps) {
  const [days, setDays] = useState(7);
  const [bufferDays, setBufferDays] = useState(3);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({});
  const [customQuantities, setCustomQuantities] = useState<Record<number, number>>({});

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const branchId = localStorage.getItem('userBranchId') || '';
      const branchParam = branchId ? `&branchId=${branchId}` : '';
      const res = await api.get(`/inventory/ai-po-recommendations?days=${days}&bufferDays=${bufferDays}${branchParam}`);
      const list = res.data.recommendations || [];
      setRecommendations(list);
      setAiSummary(res.data.aiSummary || "");

      // Auto select all recommended items
      const initialSelected: Record<number, boolean> = {};
      const initialQty: Record<number, number> = {};
      list.forEach((item: any) => {
        initialSelected[item.productId] = true;
        initialQty[item.productId] = item.suggestedQty;
      });
      setSelectedItems(initialSelected);
      setCustomQuantities(initialQty);
    } catch (error: any) {
      console.error("Gagal mengambil rekomendasi AI PO", error);
      toast.error("Gagal mengambil rekomendasi PO: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecommendations();
    }
  }, [isOpen, days, bufferDays]);

  if (!isOpen) return null;

  const toggleSelectAll = (checked: boolean) => {
    const next: Record<number, boolean> = {};
    recommendations.forEach(item => {
      next[item.productId] = checked;
    });
    setSelectedItems(next);
  };

  const toggleItem = (productId: number) => {
    setSelectedItems(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const handleQtyChange = (productId: number, val: number) => {
    setCustomQuantities(prev => ({ ...prev, [productId]: Math.max(0.1, val) }));
  };

  const handleCreatePoClick = () => {
    const selectedList = recommendations.filter(item => selectedItems[item.productId]);
    if (selectedList.length === 0) {
      return toast.error("Pilih minimal 1 barang untuk membuat Purchase Order.");
    }

    const poItems = selectedList.map(item => ({
      productId: item.productId.toString(),
      quantity: customQuantities[item.productId] || item.suggestedQty,
      price: item.costPrice || 0
    }));

    onGeneratePo(poItems);
    onClose();
  };

  const totalSelectedCount = recommendations.filter(item => selectedItems[item.productId]).length;
  const totalEstimatedCost = recommendations
    .filter(item => selectedItems[item.productId])
    .reduce((sum, item) => sum + ((customQuantities[item.productId] || item.suggestedQty) * item.costPrice), 0);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
      <div className="glass w-full max-w-5xl max-h-[92vh] rounded-[3rem] border border-indigo-500/20 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col bg-slate-950/90">
        
        {/* Header */}
        <div className="bg-slate-950/70 border-b border-indigo-500/20 px-10 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black italic tracking-widest text-white uppercase leading-none">Rekomendasi PO Otomatis</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-[9px] font-black text-indigo-400 uppercase tracking-widest italic">
                  AI Smart Reorder
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5 italic">
                Analisis Penjualan & Perhitungan Otomatis Kebutuhan Stok
              </p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-400 hover:text-white transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-900/60 px-10 py-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider italic">Periode Penjualan:</span>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-[10px] font-black text-indigo-400 outline-none uppercase italic tracking-wider cursor-pointer"
              >
                <option value={7}>7 Hari Terakhir</option>
                <option value={14}>14 Hari Terakhir</option>
                <option value={30}>30 Hari Terakhir</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider italic">Buffer Stok Target:</span>
              <select
                value={bufferDays}
                onChange={(e) => setBufferDays(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-[10px] font-black text-indigo-400 outline-none uppercase italic tracking-wider cursor-pointer"
              >
                <option value={1}>1 Hari</option>
                <option value={2}>2 Hari</option>
                <option value={3}>3 Hari (Standard)</option>
                <option value={5}>5 Hari</option>
                <option value={7}>7 Hari (1 Minggu)</option>
              </select>
            </div>
          </div>

          <button
            onClick={fetchRecommendations}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 text-[10px] font-black uppercase rounded-xl transition-all tracking-wider italic"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Hitung Ulang
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6">

          {/* AI Insights Card */}
          {aiSummary && (
            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/50 via-slate-900/80 to-purple-950/50 p-5 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 italic">Ringkasan Analisis AI</p>
                  <div className="text-[11px] font-medium text-slate-200 leading-relaxed whitespace-pre-line">
                    {aiSummary}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 overflow-hidden shadow-inner">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-white/5">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer"
                      checked={recommendations.length > 0 && recommendations.every(i => selectedItems[i.productId])}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="p-4 font-black uppercase text-[9px] tracking-widest text-slate-400 italic">Status / Barang</th>
                  <th className="p-4 font-black uppercase text-[9px] tracking-widest text-slate-400 italic text-center">Stok Saat Ini</th>
                  <th className="p-4 font-black uppercase text-[9px] tracking-widest text-slate-400 italic text-center">Min. Stok</th>
                  <th className="p-4 font-black uppercase text-[9px] tracking-widest text-slate-400 italic text-center">Rata-rata/Hari</th>
                  <th className="p-4 font-black uppercase text-[9px] tracking-widest text-indigo-400 italic text-center">Saran PO Qty</th>
                  <th className="p-4 font-black uppercase text-[9px] tracking-widest text-slate-400 italic text-right">Estimasi Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="p-4"><div className="h-10 w-full rounded-xl bg-white/5"></div></td>
                    </tr>
                  ))
                ) : recommendations.length > 0 ? (
                  recommendations.map((item) => {
                    const isSelected = !!selectedItems[item.productId];
                    const currentQty = customQuantities[item.productId] ?? item.suggestedQty;
                    const subtotal = Math.round(currentQty * item.costPrice);

                    return (
                      <tr key={item.productId} className={`hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-indigo-500/[0.03]' : 'opacity-60'}`}>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer"
                            checked={isSelected}
                            onChange={() => toggleItem(item.productId)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              {item.urgency === 'CRITICAL' && (
                                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-wider flex items-center gap-1 border border-red-500/30">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Kritis
                                </span>
                              )}
                              {item.urgency === 'WARNING' && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase tracking-wider flex items-center gap-1 border border-amber-500/30">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Menipis
                                </span>
                              )}
                              {item.urgency === 'LOW' && (
                                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-wider border border-indigo-500/30">
                                  Reorder
                                </span>
                              )}
                              <span className="font-bold text-white text-xs">{item.productName}</span>
                            </div>
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider italic mt-0.5">
                              {item.categoryName} • SKU: {item.sku}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-300">
                          {item.currentStock} <span className="text-[9px] text-slate-500 font-normal">{item.unit}</span>
                        </td>
                        <td className="p-4 text-center font-medium text-slate-400">
                          {item.minStock} <span className="text-[9px] text-slate-500 font-normal">{item.unit}</span>
                        </td>
                        <td className="p-4 text-center font-semibold text-slate-300">
                          {item.avgDailySales} <span className="text-[9px] text-slate-500 font-normal">{item.unit}/hr</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step="any"
                              value={currentQty}
                              disabled={!isSelected}
                              onChange={(e) => handleQtyChange(item.productId, parseFloat(e.target.value) || 0)}
                              className="w-20 rounded-xl bg-slate-900 border border-indigo-500/40 px-2 py-1 text-center font-black text-indigo-300 text-xs focus:border-indigo-400 outline-none transition-all shadow-inner disabled:opacity-50"
                            />
                            <span className="text-[9px] font-bold text-slate-400">{item.unit}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right font-black text-white italic">
                          Rp {subtotal.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500 uppercase tracking-widest font-black italic text-xs">
                      Stok saat ini terpantau cukup. Tidak ada rekomendasi PO yang mendesak.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 border-t border-indigo-500/20 px-10 py-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider italic">Item Dipilih: </span>
            <span className="text-xs font-black text-indigo-400">{totalSelectedCount} Barang</span>
            <span className="mx-3 text-slate-700">|</span>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider italic">Estimasi Total PO: </span>
            <span className="text-base font-black text-white italic tracking-tight">Rp {totalEstimatedCost.toLocaleString('id-ID')}</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 text-[10px] font-black text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition-all uppercase tracking-widest italic"
            >
              Tutup
            </button>
            <button
              onClick={handleCreatePoClick}
              disabled={totalSelectedCount === 0}
              className="px-8 py-3.5 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-2xl transition-all shadow-2xl shadow-indigo-500/20 uppercase tracking-widest border border-white/10 italic flex items-center gap-2"
            >
              <ShoppingBag className="h-4 w-4 stroke-[3px]" /> Buat Purchase Order ({totalSelectedCount})
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

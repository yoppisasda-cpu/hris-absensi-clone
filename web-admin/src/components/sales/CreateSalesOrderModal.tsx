import React, { useState, useEffect } from "react";
import { X, Search, Plus, Trash2, Save } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(amount);
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateSalesOrderModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [customerId, setCustomerId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  
  const [items, setItems] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");

  const fetchData = async () => {
    try {
      console.log("[B2B] Fetching customers and products...");
      const [cusRes, prodRes] = await Promise.all([
        api.get("/customers"),
        api.get("/inventory/products")
      ]);
      
      console.log("[B2B] Customers fetched:", cusRes.data.length);
      console.log("[B2B] Products fetched:", prodRes.data.length);

      setCustomers(cusRes.data);
      // Only B2B / Finished products
      const finishedGoods = prodRes.data.filter((p: any) => p.type === "FINISHED_GOOD");
      console.log("[B2B] Finished Goods (B2B) found:", finishedGoods.length);
      setProducts(finishedGoods);
    } catch (error: any) {
      console.error("[B2B] Fetch Error:", error.response || error);
      toast.error("Gagal memuat data pelanggan / produk");
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setOrderNumber(`PO-${Date.now().toString().slice(-6)}`);
      setCustomerId("");
      setNotes("");
      setItems([]);
    }
  }, [isOpen]);



  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setSelectedProduct(pId);
    const prod = products.find(p => p.id.toString() === pId);
    if (prod) {
      setPrice(prod.price.toString()); // Default to standard price initially
    } else {
      setPrice("");
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || !quantity || !price) return toast.error("Lengkapi data item");
    
    const prod = products.find(p => p.id.toString() === selectedProduct);
    if (!prod) return;

    const newItem = {
      productId: prod.id,
      productName: prod.name,
      quantity: Number(quantity),
      price: Number(price),
      total: Number(quantity) * Number(price)
    };

    setItems([...items, newItem]);
    setSelectedProduct("");
    setQuantity("1");
    setPrice("");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || items.length === 0) return toast.error("Pilih pelanggan dan minimal masukan 1 item");

    try {
      setLoading(true);
      await api.post("/sales/orders", {
        customerId,
        orderNumber,
        date,
        notes,
        items
      });
      toast.success("Pesanan B2B berhasil dibuat!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal menyimpan pesanan");
    } finally {
      setLoading(false);
    }
  };

  const totalOrder = items.reduce((sum, item) => sum + item.total, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl" onClick={onClose} />
      <div className="glass w-full max-w-4xl rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="bg-slate-950/50 border-b border-indigo-500/20 px-10 py-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
              <Plus className="h-6 w-6 stroke-[2.5px]" />
            </div>
            <div>
              <h3 className="text-sm font-black italic tracking-widest text-white uppercase leading-none">B2B Procurement Matrix</h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">PO Customer Initialization Protocol</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-slate-500 hover:text-white transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-10 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
          <form id="salesOrderForm" onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-950/40 p-8 rounded-[2.5rem] border border-white/5 shadow-inner">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Corporate Identity (PT/CV)</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase appearance-none cursor-pointer"
                >
                  <option value="">-- RESOLVE CLIENT --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900">{c.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">PO Tracking Vector</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-indigo-400 opacity-80 focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Issuance Cycle</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Logistics Directives</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="EX: EXPEDITION LALAMOVE..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black text-white focus:border-indigo-500/50 outline-none transition-all italic tracking-widest uppercase placeholder:text-slate-900 shadow-inner"
                />
              </div>
            </div>

            {/* Tambah Item Premium */}
            <div className="space-y-6">
              <div className="flex items-center justify-between ml-1">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Manifest Breakdown</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end bg-slate-950 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                <div className="md:col-span-6 space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic ml-1">Module Mapping</label>
                  <select
                    value={selectedProduct}
                    onChange={handleProductSelect}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-black italic text-white outline-none focus:border-indigo-500/50 uppercase appearance-none cursor-pointer"
                  >
                    <option value="">-- UNIT RESOLUTION --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name.toUpperCase()} (AVL: {p.stock})</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic ml-1">Vol</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-black italic text-white outline-none focus:border-indigo-500/50 shadow-inner"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic ml-1">Rate</label>
                  <input
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-black italic text-indigo-400 outline-none focus:border-indigo-500/50 shadow-inner"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedProduct}
                    className="w-full py-3.5 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-30 shadow-lg shadow-indigo-600/10 border border-white/10"
                  >
                    <Plus className="w-4 h-4 stroke-[3px]" /> PUSH
                  </button>
                </div>
              </div>

              {/* Tabel Item Premium Glass */}
              {items.length > 0 ? (
                <div className="overflow-hidden rounded-[2.5rem] border border-white/5 bg-slate-950/40 shadow-2xl backdrop-blur-sm animate-in fade-in duration-500">
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-white/5 italic">
                      <tr>
                        <th className="px-8 py-5">Nomenclature</th>
                        <th className="px-8 py-5 text-center">Vol</th>
                        <th className="px-8 py-5 text-right">Unit Rate</th>
                        <th className="px-8 py-5 text-right">Total (IDR)</th>
                        <th className="px-8 py-5 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 italic">
                      {items.map((item, idx) => (
                        <tr key={idx} className="group hover:bg-white/5 transition-colors">
                          <td className="px-8 py-5 font-black text-white text-[11px] uppercase tracking-tighter">{item.productName}</td>
                          <td className="px-8 py-5 text-center font-black text-slate-400 text-[11px]">{item.quantity}</td>
                          <td className="px-8 py-5 text-right font-black text-slate-500 text-[11px] tracking-widest">{formatCurrency(item.price).replace("Rp","")}</td>
                          <td className="px-8 py-5 text-right font-black text-white text-[11px] tracking-widest">{formatCurrency(item.total).replace("Rp","")}</td>
                          <td className="px-8 py-5 text-center">
                            <button type="button" onClick={() => removeItem(idx)} className="h-8 w-8 rounded-lg bg-rose-600/10 text-rose-500 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all border border-rose-500/20 active:scale-90">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-950 border-t border-indigo-500/30">
                      <tr>
                        <td colSpan={3} className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Order Aggregation total</td>
                        <td className="px-8 py-6 text-right text-2xl font-black italic text-indigo-400 tracking-tighter">{formatCurrency(totalOrder)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-950/40 rounded-[2.5rem] border border-dashed border-white/10 group">
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] italic group-hover:text-slate-600 transition-colors">MANIFEST_EMPTY // NO DATA DETECTED</p>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="p-10 border-t border-white/5 bg-slate-950/50 flex justify-end gap-5">
          <button
            type="button"
            onClick={onClose}
            className="px-10 py-4 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.2em] italic transition-all"
          >
            DEACTIVATE
          </button>
          <button
            type="submit"
            form="salesOrderForm"
            disabled={loading || items.length === 0}
            className="flex items-center gap-3 px-12 py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-indigo-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xl shadow-indigo-600/20 italic border border-white/10"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
            ) : (
              <><Save className="w-4 h-4 stroke-[3px]" /> COMMIT_PURCHASE</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

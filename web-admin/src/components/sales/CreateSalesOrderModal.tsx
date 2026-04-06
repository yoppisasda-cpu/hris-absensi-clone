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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Buat Pesanan B2B (PO Customer)</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1 bg-gray-50/50">
          <form id="salesOrderForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pelanggan B2B (PT/CV)</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Pilih Pelanggan --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor PO</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pesanan</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Misal: Dikirim tanggal 15, via Lalamove"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Tambah Item */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-semibold text-gray-800">Daftar Produk Pesanan</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Pilih Produk</label>
                  <select
                    value={selectedProduct}
                    onChange={handleProductSelect}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Pilih Produk --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kuantitas</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Harga Satuan (Bisa Diubah)</label>
                  <input
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedProduct}
                    className="w-full h-[38px] flex items-center justify-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" /> Tambah
                  </button>
                </div>
              </div>

              {/* Tabel Item */}
              {items.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden mt-4">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium">Produk</th>
                        <th className="px-4 py-3 font-medium text-center">Qty</th>
                        <th className="px-4 py-3 font-medium text-right">Harga Satuan</th>
                        <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                        <th className="px-4 py-3 font-medium text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-medium">{item.productName}</td>
                          <td className="px-4 py-3 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                          <td className="px-4 py-3 text-center">
                            <button type="button" onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50/80">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-700">Total Keseluruhan:</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">{formatCurrency(totalOrder)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg mt-4">
                  Belum ada produk yang ditambahkan
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="salesOrderForm"
            disabled={loading || items.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Save className="w-4 h-4" />
            {loading ? "Menyimpan..." : "Simpan Pesanan"}
          </button>
        </div>
      </div>
    </div>
  );
}

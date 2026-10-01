'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Edit2, Trash2, FileText, X, AlertCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function B2BContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [contractItems, setContractItems] = useState<{ productId: string, contractPrice: string }[]>([]);
  
  const [formData, setFormData] = useState({
    customerId: '',
    contractNumber: '',
    title: '',
    startDate: '',
    endDate: '',
    creditLimit: '0',
    reminderDays: '30',
    picName: '',
    picContact: '',
    notes: ''
  });

  const resetForm = () => {
    setEditId(null);
    setFormData({
      customerId: '',
      contractNumber: '',
      title: '',
      startDate: '',
      endDate: '',
      creditLimit: '0',
      reminderDays: '30',
      picName: '',
      picContact: '',
      notes: ''
    });
    setSelectedFile(null);
    setContractItems([]);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [contractRes, custRes, prodRes] = await Promise.all([
        api.get('/b2b-contracts'),
        api.get('/customers'),
        api.get('/inventory/products')
      ]);
      setContracts(contractRes.data);
      setCustomers(custRes.data);
      setProducts(prodRes.data);
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value);
      });
      if (selectedFile) {
        payload.append('file', selectedFile);
      }
      payload.append('items', JSON.stringify(contractItems));
      
      if (editId) {
        const res = await api.put(`/b2b-contracts/${editId}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('[CONTRACT] PUT response:', res.data);
      } else {
        const res = await api.post('/b2b-contracts', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('[CONTRACT] POST response:', res.data);
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('[CONTRACT] Save error:', error?.response?.data || error?.message || error);
      alert('Gagal menyimpan kontrak: ' + (error?.response?.data?.error || error?.message || 'Unknown error'));
    }
  };

  const openEditModal = (contract: any) => {
    setEditId(contract.id);
    setFormData({
      customerId: contract.customerId.toString(),
      contractNumber: contract.contractNumber,
      title: contract.title,
      startDate: contract.startDate ? format(new Date(contract.startDate), 'yyyy-MM-dd') : '',
      endDate: contract.endDate ? format(new Date(contract.endDate), 'yyyy-MM-dd') : '',
      creditLimit: contract.creditLimit.toString(),
      reminderDays: contract.reminderDays.toString(),
      picName: contract.picName || '',
      picContact: contract.picContact || '',
      notes: contract.notes || ''
    });
    setContractItems(contract.items ? contract.items.map((i: any) => ({
      productId: i.productId.toString(),
      contractPrice: i.contractPrice.toString()
    })) : []);
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus kontrak ini?')) return;
    try {
      await api.delete(`/b2b-contracts/${id}`);
      fetchData();
    } catch (error) {
      alert('Gagal menghapus');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 bg-[#0B0E14] min-h-screen text-slate-200">
        <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">MANAJEMEN KONTRAK B2B</h1>
          <p className="text-sm text-slate-400">Pantau dan kelola kontrak kerjasama B2B beserta limit kreditnya</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Kontrak Baru
        </button>
      </div>

      <div className="bg-[#151921] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1A1F29] border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="p-4">No. Kontrak & Judul</th>
              <th className="p-4">Pelanggan (B2B)</th>
              <th className="p-4">Periode</th>
              <th className="p-4">Limit Kredit</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">Memuat data...</td></tr>
            ) : contracts.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">Belum ada kontrak B2B terdaftar</td></tr>
            ) : (
              contracts.map(contract => {
                const daysRemaining = differenceInDays(new Date(contract.endDate), new Date());
                const isExpiringSoon = daysRemaining <= contract.reminderDays && daysRemaining >= 0;
                const isExpired = daysRemaining < 0;

                return (
                <tr key={contract.id} className="hover:bg-[#1A1F29]/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-slate-200">{contract.contractNumber}</div>
                    <div className="text-sm text-slate-400">{contract.title}</div>
                    {contract.items && contract.items.length > 0 && (
                      <div className="mt-1 text-[10px] text-indigo-400 font-medium">
                        {contract.items.length} Produk Khusus
                      </div>
                    )}
                    {isExpiringSoon && (
                      <div className="flex items-center gap-1 mt-2 text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-1 rounded w-fit">
                        <AlertCircle className="w-3 h-3" /> H-{(daysRemaining)} Kedaluwarsa
                      </div>
                    )}
                    {isExpired && (
                      <div className="flex items-center gap-1 mt-2 text-xs font-medium text-rose-400 bg-rose-400/10 px-2 py-1 rounded w-fit">
                        <AlertCircle className="w-3 h-3" /> Telah Kedaluwarsa
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-medium">{contract.customer?.name}</div>
                    <div className="text-xs text-slate-500">{contract.picName}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">{format(new Date(contract.startDate), 'dd MMM yyyy')} -</div>
                    <div className="text-sm">{format(new Date(contract.endDate), 'dd MMM yyyy')}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-emerald-400">Rp {contract.creditLimit.toLocaleString('id-ID')}</div>
                    <div className="text-xs text-slate-500">Terpakai: Rp {contract.usedCredit.toLocaleString('id-ID')}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${contract.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {contract.status}
                    </span>
                    {contract.fileUrl && (
                      <a href={contract.fileUrl} target="_blank" rel="noreferrer" className="block mt-2 text-xs text-indigo-400 hover:underline">Lihat Lampiran</a>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEditModal(contract)} className="p-2 text-slate-400 hover:text-indigo-400 transition-colors bg-slate-800/50 hover:bg-slate-800 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(contract.id)} className="p-2 text-slate-400 hover:text-rose-400 transition-colors bg-slate-800/50 hover:bg-slate-800 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#151921] border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">{editId ? 'Edit Kontrak B2B' : 'Buat Kontrak B2B'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Pilih Klien B2B</label>
                  <select value={formData.customerId}  required className="w-full bg-[#0B0E14] border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" onChange={e => setFormData({...formData, customerId: e.target.value})}>
                    <option value="">-- Pilih Customer --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Nomor Kontrak</label>
                  <input type="text" readOnly={!!editId} value={formData.contractNumber} required={!editId} placeholder="KTR-2026/01/B2B" className={`w-full bg-[#0B0E14] border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none ${editId ? 'opacity-50 cursor-not-allowed' : ''}`} onChange={e => !editId && setFormData({...formData, contractNumber: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Judul / Deskripsi Singkat Kontrak</label>
                <input type="text" value={formData.title}  required placeholder="Kontrak Suplai Katering Karyawan" className="w-full bg-[#0B0E14] border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Tanggal Mulai</label>
                  <input type="date" value={formData.startDate}  required className="w-full bg-[#0B0E14] border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Tanggal Berakhir</label>
                  <input type="date" value={formData.endDate}  required className="w-full bg-[#0B0E14] border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" onChange={e => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Limit Kredit / Piutang (Rp)</label>
                <input type="number" value={formData.creditLimit}  required placeholder="50000000" className="w-full bg-[#0B0E14] border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" onChange={e => setFormData({...formData, creditLimit: e.target.value})} />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Upload Lampiran Kontrak (PDF/Image)</label>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="w-full bg-[#0B0E14] border border-slate-800 rounded-lg p-2 text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 outline-none" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
              </div>

              <div className="pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white">Daftar Produk & Harga Khusus</h3>
                  <button type="button" onClick={() => setContractItems([...contractItems, { productId: '', contractPrice: '' }])} className="text-xs flex items-center gap-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-2 py-1 rounded transition-colors"><Plus className="w-3 h-3" /> Tambah Produk</button>
                </div>
                {contractItems.length === 0 ? (
                  <div className="text-xs text-slate-500 italic text-center py-2">Belum ada produk khusus. Jika kosong, klien tetap menggunakan harga normal.</div>
                ) : (
                  <div className="space-y-3">
                    {contractItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 bg-[#0B0E14] p-3 rounded-lg border border-slate-800">
                        <div className="flex-1">
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">Pilih Produk</label>
                          <select required value={item.productId} className="w-full bg-transparent text-sm text-white focus:outline-none" onChange={e => {
                            const newItems = [...contractItems];
                            newItems[index].productId = e.target.value;
                            setContractItems(newItems);
                          }}>
                            <option value="" className="bg-[#151921]">-- Produk --</option>
                            {products.map(p => <option key={p.id} value={p.id} className="bg-[#151921]">{p.name}</option>)}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">Harga Kontrak (Rp)</label>
                          <input type="number" required value={item.contractPrice} className="w-full bg-transparent text-sm text-white focus:outline-none" placeholder="25000" onChange={e => {
                            const newItems = [...contractItems];
                            newItems[index].contractPrice = e.target.value;
                            setContractItems(newItems);
                          }} />
                        </div>
                        <button type="button" onClick={() => {
                          const newItems = [...contractItems];
                          newItems.splice(index, 1);
                          setContractItems(newItems);
                        }} className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors self-end"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Nama PIC (Klien)</label>
                  <input type="text" value={formData.picName}  placeholder="Bpk. Andi" className="w-full bg-[#0B0E14] border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" onChange={e => setFormData({...formData, picName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Kontak PIC</label>
                  <input type="text" value={formData.picContact}  placeholder="0812..." className="w-full bg-[#0B0E14] border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" onChange={e => setFormData({...formData, picContact: e.target.value})} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">Batal</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">Simpan Kontrak</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}

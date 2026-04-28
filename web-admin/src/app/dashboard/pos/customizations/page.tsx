"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, Edit2, Trash2, X } from "lucide-react";

interface Option {
  id?: number;
  name: string;
  price: number;
}

interface CustomizationGroup {
  id: number;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  options: Option[];
}

export default function CustomizationsPage() {
  const [groups, setGroups] = useState<CustomizationGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomizationGroup | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [minSelections, setMinSelections] = useState(0);
  const [maxSelections, setMaxSelections] = useState(1);
  const [options, setOptions] = useState<Option[]>([{ name: "", price: 0 }]);

  const fetchGroups = async () => {
    try {
      const { data } = await api.get("/pos/customizations");
      setGroups(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const openModal = (group?: CustomizationGroup) => {
    if (group) {
      setEditingGroup(group);
      setName(group.name);
      setIsRequired(group.isRequired);
      setMinSelections(group.minSelections);
      setMaxSelections(group.maxSelections);
      setOptions(group.options.length > 0 ? [...group.options] : [{ name: "", price: 0 }]);
    } else {
      setEditingGroup(null);
      setName("");
      setIsRequired(false);
      setMinSelections(0);
      setMaxSelections(1);
      setOptions([{ name: "", price: 0 }]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const addOption = () => setOptions([...options, { name: "", price: 0 }]);
  
  const removeOption = (index: number) => {
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, field: "name" | "price", value: string | number) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const saveGroup = async () => {
    if (!name.trim() || options.some((o) => !o.name.trim())) {
      alert("Nama Kustomisasi dan semua Pilihan Opsi harus diisi.");
      return;
    }

    try {
      const payload = {
        name,
        isRequired,
        minSelections,
        maxSelections,
        options: options.map(o => ({
          name: o.name.trim(),
          price: Number(o.price) || 0
        }))
      };

      if (editingGroup) {
        await api.put(`/pos/customizations/${editingGroup.id}`, payload);
      } else {
        await api.post("/pos/customizations", payload);
      }
      closeModal();
      fetchGroups();
    } catch (e: any) {
      alert("Gagal menyimpan kustomisasi: " + (e.response?.data?.error || e.message));
    }
  };

  const deleteGroup = async (id: number) => {
    if (!confirm("Hapus kustomisasi ini?")) return;
    await api.delete(`/pos/customizations/${id}`);
    fetchGroups();
  };

  if (isLoading) return <div className="p-8"><center>Memuat Kustomisasi...</center></div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Kustomisasi (Add-ons)</h1>
        <button onClick={() => openModal()} className="flex border-2 border-emerald-600 text-emerald-700 px-4 py-2 rounded-lg gap-2 items-center hover:bg-emerald-50 font-semibold">
          <Plus size={18} /> Tambah Baru
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.id} className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl flex justify-between items-center hover:shadow-sm">
            <div>
              <h3 className="font-semibold text-gray-800 flex flex-row items-center gap-2">
                {group.name}
                {group.isRequired && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded">Wajib Isi</span>}
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded">Max: {group.maxSelections}</span>
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {group.options.map((o) => `${o.name} (+Rp${o.price})`).join(" • ")}
              </p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => openModal(group)} className="text-gray-500 hover:text-blue-600">
                <Edit2 size={18} />
              </button>
              <button onClick={() => deleteGroup(group.id)} className="text-gray-500 hover:text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            Belum ada data kustomisasi
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-slate-800">{editingGroup ? "Edit" : "Tambah"} Kustomisasi</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Add-on (Contoh: Level Sugar)</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Nama Group Kustomisasi" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wajib Diisi Kasir?</label>
                    <select value={isRequired ? "true" : "false"} onChange={(e) => { setIsRequired(e.target.value === "true"); if(e.target.value === "true") setMinSelections(1); }} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none">
                      <option value="false">Tidak (Opsional)</option>
                      <option value="true">Ya (Wajib)</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Pilihan (Bisa pilih berapa?)</label>
                    <input type="number" min="1" value={maxSelections} onChange={(e) => setMaxSelections(parseInt(e.target.value) || 1)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                 </div>
              </div>

              <div className="mt-8 border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-700">Pilihan Opsi</h3>
                </div>
                
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2 mb-3 items-start">
                    <input type="text" value={opt.name} onChange={(e) => updateOption(i, "name", e.target.value)} placeholder="Misal: Less Sugar" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    <input type="number" value={opt.price} onChange={(e) => updateOption(i, "price", e.target.value)} placeholder="Harga (0 jika gratis)" className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    <button onClick={() => removeOption(i)} disabled={options.length <= 1} className="p-2 text-red-500 disabled:opacity-30">
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
                
                <button onClick={addOption} className="text-emerald-600 text-sm font-semibold flex items-center gap-1 mt-2">
                  <Plus size={16} /> Tambah Opsi Lainnya
                </button>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 border rounded-lg hover:bg-gray-100">Batal</button>
              <button onClick={saveGroup} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold">Simpan Kustomisasi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

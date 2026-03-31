'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Percent, ArrowUpRight, 
  Search, Filter, Download, Calendar, Package, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface ProductStat {
  productId: number;
  name: string;
  sku: string;
  categoryId?: number;
  categoryName?: string;
  qtySold: number;
  revenue: number;
  cogs: number;
  profit: number;
  marginPercentage: number;
}

interface TrendStat {
  date: string;
  profit: number;
  revenue: number;
}

interface Summary {
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
}

export default function ProfitabilityPage() {
  const [data, setData] = useState<{ products: ProductStat[], trend: TrendStat[], summary: Summary } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reportRes, catRes] = await Promise.all([
        api.get('/reports/profitability', { params: dateRange }),
        api.get('/pos/categories')
      ]);
      setData(reportRes.data);
      setCategories(catRes.data);
      setError(null);
    } catch (err: any) {
      console.error("Fetch profitability error:", err);
      setError("Gagal mengambil data analisis margin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading && !data) return (
    <DashboardLayout>
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    </DashboardLayout>
  );

  const topProducts = data?.products.slice(0, 5) || [];

  const filteredProducts = data?.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.categoryId === Number(selectedCategory);
    return matchesSearch && matchesCategory;
  }) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header & Filter */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-primary tracking-tight">Analisis Margin & Profitabilitas</h1>
            <p className="text-slate-500 text-sm">Pantau performa keuntungan per item dan efisiensi HPP</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input 
                type="date" 
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className="bg-transparent border-none text-sm focus:ring-0 text-slate-700 outline-none"
              />
              <span className="text-slate-400 text-xs font-bold">SD</span>
              <input 
                type="date" 
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className="bg-transparent border-none text-sm focus:ring-0 text-slate-700 outline-none"
              />
            </div>
            <button 
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center gap-2 text-sm font-bold"
            >
              <Filter className="h-4 w-4" /> Filter
            </button>
          </div>
        </div>

        {/* ... (Summary Cards and Charts stay the same) ... */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 transition-all hover:shadow-md cursor-default group">
            <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Omzet</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(data?.summary.totalRevenue || 0)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 transition-all hover:shadow-md cursor-default group">
            <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Profit Kotor</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(data?.summary.totalProfit || 0)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 transition-all hover:shadow-md cursor-default group">
            <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rata-rata Margin</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{(data?.summary.avgMargin || 0).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profit Trend Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Tren Profit vs Omzet
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.trend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 10, fontWeight: 600}}
                    tickFormatter={(val) => format(new Date(val), 'dd MMM', {locale: localeId})} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 10, fontWeight: 600}}
                    tickFormatter={(val) => `${val/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => formatCurrency(val)}
                  />
                  <Area type="monotone" dataKey="revenue" name="Omzet" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              Top 5 Produk Termargin
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    axisLine={false} 
                    tickLine={false}
                    tick={{fill: '#475569', fontSize: 10, fontWeight: 700}}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => formatCurrency(val)}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Bar dataKey="profit" name="Total Profit" radius={[0, 6, 6, 0]} barSize={30}>
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Main Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-slate-900 tracking-tight uppercase text-sm">Rincian Performa Produk</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest font-bold">Data Real-time dari Modul Sales & Inventory</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search Field */}
              <div className="relative w-full sm:w-64 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text"
                  placeholder="Cari Produk / SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Category Filter */}
              <div className="relative w-full sm:w-48">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer transition-all text-slate-600 font-medium"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-lg uppercase tracking-widest whitespace-nowrap">
                <Info className="h-3 w-3" />
                HPP Berdasarkan Resep/BOM
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Nama Produk</th>
                  <th className="px-6 py-4 text-center">Terjual</th>
                  <th className="px-6 py-4 text-right">Omzet</th>
                  <th className="px-6 py-4 text-right">Total HPP</th>
                  <th className="px-6 py-4 text-right">Profit Kotor</th>
                  <th className="px-6 py-4 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.productId} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 text-sm group-hover:text-blue-600 transition-colors uppercase tracking-tight line-clamp-1">{p.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400 font-bold tracking-widest">{p.sku}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">{p.categoryName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5 font-bold text-slate-600">
                        <Package className="h-3 w-3 opacity-50" />
                        {p.qtySold}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900 tracking-tight">{formatCurrency(p.revenue)}</td>
                    <td className="px-6 py-4 text-right text-slate-500 font-medium">{formatCurrency(p.cogs)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-emerald-600 tracking-tight">{formatCurrency(p.profit)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                         <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${
                           p.marginPercentage > 50 ? 'bg-emerald-500 text-white' : 
                           p.marginPercentage > 20 ? 'bg-blue-500 text-white' : 
                           'bg-orange-500 text-white'
                         }`}>
                           {p.marginPercentage.toFixed(1)}%
                         </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-slate-50 rounded-full">
                          <Search className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tidak ada produk yang cocok dengan filter.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

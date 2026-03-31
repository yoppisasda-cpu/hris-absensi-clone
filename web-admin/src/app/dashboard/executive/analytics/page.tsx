'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
  TrendingUp, 
  ArrowLeft,
  Sparkles,
  Zap,
  Target,
  BrainCircuit,
  Users,
  Layers,
  Activity,
  MessageSquare,
  X,
  Send,
  Loader2,
  ChevronRight,
  Bot,
  Package,
  Wallet
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  RadialBarChart,
  RadialBar
} from 'recharts';

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: Date;
}

type TabType = 'finance' | 'hr' | 'stock';

export default function AIAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('finance');
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
        id: '1',
        role: 'ai',
        content: 'Halo Bapak/Ibu! Saya asisten Aivola Mind. Saya sudah menganalisis data bisnis Anda hari ini (Health Score: 87/100). Ada yang bisa saya bantu jelaskan lebih lanjut?',
        timestamp: new Date()
    }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Tab-Specific Data Configurations
  const tabConfigs = {
    finance: {
      title: "Revenue Forecast",
      desc: "Prediksi pertumbuhan 14 hari ke depan berdasarkan korelasi data historis.",
      unit: "jt",
      chartColor: "#3b82f6",
      icon: <Zap className="h-5 w-5 text-amber-500" />,
      radar: [
        { subject: 'Net Profit', A: 120, B: 110 },
        { subject: 'Operating Expense', A: 98, B: 130 },
        { subject: 'Gross Margin', A: 130, B: 120 },
        { subject: 'Cash On Hand', A: 99, B: 100 },
        { subject: 'Revenue Growth', A: 85, B: 90 },
      ],
      aiSug: "Laba bersih diprediksi naik 12% bulan depan.",
      aiSugDesc: "Berdasarkan efisiensi biaya bahan baku yang Mas lakukan minggu lalu, margin keuntungan terkunci di angka aman.",
      checklist: [
        { text: "Optimasi HPP Kategori Kopi", status: "HIGH PRIO" },
        { text: "Potong Biaya Listrik Cabang B", status: "SUGGESTED" },
        { text: "Review Cashback Vendor", status: "DUE SOON" }
      ]
    },
    hr: {
      title: "Employee Performance Score",
      desc: "Analisis produktivitas dan kepatuhan jam kerja seluruh departemen.",
      unit: "skor",
      chartColor: "#ec4899",
      icon: <Users className="h-5 w-5 text-pink-500" />,
      radar: [
        { subject: 'Attendance', A: 140, B: 130 },
        { subject: 'Efficiency', A: 110, B: 125 },
        { subject: 'Customer Rating', A: 120, B: 110 },
        { subject: 'Training', A: 70, B: 100 },
        { subject: 'Retention', A: 130, B: 110 },
      ],
      aiSug: "Efisiensi tim pindah ke angka 92% (Sangat Baik).",
      aiSugDesc: "Namun, 2 Barista senior di Cabang Utama terdeteksi 'High Fatigue'. Disarankan rotasi shift untuk mencegah burnout.",
      checklist: [
        { text: "Review Kontrak 3 Staf", status: "DUE SOON" },
        { text: "Restrukturisasi Shift Malam", status: "SUGGESTED" },
        { text: "Bonus Tahunan Barista Gayo", status: "DUE SOON" }
      ]
    },
    stock: {
      title: "Inventory Burn Rate",
      desc: "Kecepatan penggunaan stok bahan baku dibanding perkiraan penjualan.",
      unit: "kg",
      chartColor: "#10b981",
      icon: <Package className="h-5 w-5 text-emerald-500" />,
      radar: [
        { subject: 'Stock Accuracy', A: 130, B: 110 },
        { subject: 'Supplier Speed', A: 90, B: 120 },
        { subject: 'Waste Level', A: 120, B: 100 },
        { subject: 'Order Cycle', A: 110, B: 110 },
        { subject: 'Fulfillment', A: 140, B: 130 },
      ],
      aiSug: "Waspada: Stok Biji Kopi Signature kritis.",
      aiSugDesc: "Dengan kecepatan penjualan saat ini, stok akan habis dalam 48 jam. Disarankan order ke Supplier Utama pagi ini.",
      checklist: [
        { text: "Reorder Biji Kopi Gayo", status: "URGENT" },
        { text: "Cek Expired Susu Oat", status: "HIGH PRIO" },
        { text: "Audit Stok Gula Aren", status: "SUGGESTED" }
      ]
    }
  };

  const forecastData = [
    { name: 'W1', value: 4500, projected: 4500 },
    { name: 'W2', value: 5200, projected: 5200 },
    { name: 'W3', value: 4800, projected: 4800 },
    { name: 'W4', value: 6100, projected: 6100 },
    { name: 'P1', projected: 6400 },
    { name: 'P2', projected: 6800 },
    { name: 'P3', projected: 7200 },
    { name: 'P4', projected: 7500 },
  ];

  const healthData = [{ name: 'Health', value: activeTab === 'finance' ? 87 : activeTab === 'hr' ? 94 : 72, fill: tabConfigs[activeTab].chartColor }];

  useEffect(() => {
    setTimeout(() => setLoading(false), 1200);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim()) return;

    const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
        // Construct context from current dashboard state
        const context = {
            activeTab,
            metrics: currentConfig.radar,
            healthScore: healthData[0].value,
            suggestions: [currentConfig.aiSug, currentConfig.aiSugDesc]
        };

        const response = await fetch('http://localhost:5000/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: text,
                context
            }),
        });

        if (!response.ok) throw new Error('Failed to reach AI advisor');

        const data = await response.json();
        
        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: data.reply || "Maaf, saya sedang mengalami kendala teknis dalam menganalisis data Anda.",
            timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
        console.error('AI Chat Error:', error);
        const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: "Maaf, koneksi ke AI Advisor terputus. Pastikan backend berjalan dan API Key sudah terkonfigurasi.",
            timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsTyping(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center">
            <div className="text-center">
                <BrainCircuit className="h-16 w-16 text-blue-500 animate-pulse mx-auto mb-6" />
                <p className="text-slate-400 font-black tracking-[0.2em] uppercase text-xs">Aivola Intelligence Engine Initializing...</p>
            </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentConfig = tabConfigs[activeTab];

  return (
    <DashboardLayout>
      <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50 relative overflow-x-hidden">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.back()} 
              className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm group active:scale-95"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">Intelligence Deep Dive</span>
                  <Activity className="h-3 w-3 text-emerald-500 animate-pulse" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900">
                AI Business <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Counselor</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
            {(['finance', 'hr', 'stock'] as TabType[]).map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all uppercase ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {tab === 'stock' ? 'Inventory' : tab === 'hr' ? 'Human Resource' : 'Finance'}
              </button>
            ))}
          </div>
        </div>

        {/* Intelligence Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
          
          {/* Main Forecast Visual */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 pointer-events-none opacity-5 group-hover:scale-110 transition-transform duration-1000">
                    <TrendingUp className="h-48 w-48 text-blue-600" />
                </div>
                
                <div className="flex items-start justify-between mb-10">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2 uppercase tracking-tight">
                            {currentConfig.icon}
                            {currentConfig.title}
                        </h3>
                        <p className="text-sm text-slate-500 font-medium">{currentConfig.desc}</p>
                    </div>
                </div>

                <div className="h-[400px] w-full mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={forecastData}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={currentConfig.chartColor} stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor={currentConfig.chartColor} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} tickFormatter={(v) => `${v}${currentConfig.unit}`} />
                            <Tooltip 
                                cursor={{ stroke: currentConfig.chartColor, strokeWidth: 2 }}
                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                            />
                            <Area type="monotone" dataKey="value" stroke={currentConfig.chartColor} strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                            <Area type="monotone" dataKey="projected" stroke={currentConfig.chartColor} strokeWidth={2} strokeDasharray="10 5" fillOpacity={0} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-500" />
                        Intelligence Radar
                    </h4>
                    <div className="h-[250px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={currentConfig.radar}>
                                <PolarGrid stroke="#f1f5f9" />
                                <PolarAngleAxis dataKey="subject" tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} />
                                <Radar name="Actual" dataKey="A" stroke={currentConfig.chartColor} fill={currentConfig.chartColor} fillOpacity={0.4} />
                                <Radar name="Target" dataKey="B" stroke="#cbd5e1" fill="transparent" fillOpacity={0} strokeDasharray="5 5" />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
                        <Layers className="h-32 w-32" />
                    </div>
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Live AI Suggestion</span>
                            </div>
                            <h4 className="text-xl font-black mb-4 tracking-tight leading-snug">
                                "{currentConfig.aiSug}"
                            </h4>
                        </div>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            {currentConfig.aiSugDesc}
                        </p>
                    </div>
                </div>
            </div>
          </div>

          {/* Sidebar Insights */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl text-center relative overflow-hidden">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Section Health</h4>
                <div className="h-[200px] w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart cx="50%" cy="50%" innerRadius="80%" outerRadius="100%" barSize={15} data={healthData} startAngle={180} endAngle={0}>
                            <RadialBar background dataKey="value" cornerRadius={30} />
                        </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                        <span className="text-5xl font-black text-slate-900 tracking-tighter">{healthData[0].value}%</span>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 italic">Vibrant & Scaling</span>
                    </div>
                </div>
                <p className="mt-8 text-xs text-slate-500 font-bold uppercase tracking-widest px-4 py-2 bg-slate-50 rounded-xl">
                  {activeTab} Health Level
                </p>
            </div>

            <div className="bg-gradient-to-br from-blue-700 to-indigo-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative">
                <div className="absolute top-4 right-8 opacity-30">
                    <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h4 className="font-black text-sm tracking-tight uppercase">AI Business Advisor</h4>
                        <p className="text-blue-300 text-[10px] font-bold">Online & Menganalisis...</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl rounded-tl-none border border-white/10">
                        <p className="text-xs font-medium leading-relaxed italic text-blue-50">
                            "Halo Bapak/Ibu, saya mendeteksi peningkatan tren positif di departemen **{activeTab.toUpperCase()}**. Mau saya bantu buatkan laporan detailnya?"
                        </p>
                    </div>
                    
                    <button 
                        onClick={() => setIsChatOpen(true)}
                        className="w-full py-4 bg-white text-blue-700 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                    >
                        Tanya Analisis Lanjut
                        <ArrowLeft className="h-3 w-3 rotate-180" />
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl">
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">AI Strategy Checklist</h4>
                 <div className="space-y-4">
                    {currentConfig.checklist.map((item, i) => (
                        <button 
                            key={i} 
                            onClick={() => {
                                setIsChatOpen(true);
                                handleSendMessage(`Analisis tugas ini: ${item.text}`);
                            }}
                            className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer group"
                        >
                            <div className="flex items-center gap-3">
                                <Target className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-black text-slate-700 tracking-tight">{item.text}</span>
                            </div>
                            <ChevronRight className="h-3 w-3 text-slate-300" />
                        </button>
                    ))}
                 </div>
            </div>
          </div>
        </div>

        {/* AI Chat Drawer Overlay */}
        <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isChatOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsChatOpen(false)} />
            <div className={`absolute top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl transition-transform duration-500 ease-out transform ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Drawer Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <Bot className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm tracking-tight uppercase">Aivola Mind Advisor</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Active & Analyzing Data</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-black/10 rounded-xl transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="h-[calc(100%-180px)] overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-slate-900 text-white rounded-tr-none' 
                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                            }`}>
                                <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                                <span className={`text-[9px] block mt-2 font-bold uppercase ${msg.role === 'user' ? 'text-slate-400' : 'text-slate-300'}`}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                                <span className="text-xs font-bold text-slate-400 animate-pulse uppercase tracking-widest">Aivola Mind Analisys...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="absolute bottom-0 left-0 w-full p-6 bg-white border-t border-slate-100">
                    <div className="flex gap-2 p-2 mb-4 overflow-x-auto scrollbar-hide">
                        {['Analisis Bisnis', 'Strategi Baru', 'Cek Risiko'].map((suggest) => (
                            <button 
                                key={suggest}
                                onClick={() => handleSendMessage(suggest)}
                                className="whitespace-nowrap px-4 py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-blue-100"
                            >
                                {suggest}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Ask Aivola Mind..."
                            className="w-full pl-6 pr-14 py-4 bg-slate-100 rounded-2xl text-sm font-bold placeholder:text-slate-400 focus:outline-none transition-all border border-transparent focus:bg-white focus:border-blue-100"
                        />
                        <button 
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim()}
                            className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

      </div>

      <style jsx>{`
        .tracking-tighter { letter-spacing: -0.05em; }
        .tracking-tight { letter-spacing: -0.025em; }
        .font-black { font-weight: 900; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </DashboardLayout>
  );
}

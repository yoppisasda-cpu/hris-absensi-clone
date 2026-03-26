'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, User, Bot, History, Search } from 'lucide-react';
import api from '@/lib/api';

interface ChatMessage {
  id: number;
  sender: 'USER' | 'AI' | 'ADMIN';
  content: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  visitorName: string | null;
  email: string | null;
  updatedAt: string;
  messages: ChatMessage[];
}

export default function CRMPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionDetail(selectedSessionId);
    }
  }, [selectedSessionId]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/chat/admin/sessions');
      setSessions(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Fetch sessions error:', err);
    }
  };

  const fetchSessionDetail = async (id: string) => {
    try {
      const res = await api.get(`/chat/admin/sessions/${id}`);
      setSelectedSession(res.data);
    } catch (err) {
      console.error('Fetch session detail error:', err);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 p-4">
      {/* Session List */}
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Riwayat Chat
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Belum ada sesi chat.</div>
          ) : (
            sessions.map(s => (
              <div 
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={`p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 ${selectedSessionId === s.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-slate-800">{s.visitorName || 'Anonim'}</span>
                  <span className="text-[10px] text-slate-400">{new Date(s.updatedAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {s.messages?.[0]?.content || 'Tidak ada pesan'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message View */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        {selectedSession ? (
          <>
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">{selectedSession.visitorName || 'Sesi Chat'}</h3>
                <p className="text-xs text-slate-400">ID: {selectedSession.id}</p>
              </div>
              <div className="flex gap-2">
                 <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded">AI ACTIVE</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
              {selectedSession.messages.map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-lg text-sm shadow-sm ${m.sender === 'USER' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'}`}>
                    <div className="flex items-center gap-2 mb-1 opacity-70 text-[10px] font-bold uppercase">
                       {m.sender === 'USER' ? <User className="w-3 h-3"/> : <Bot className="w-3 h-3"/>}
                       {m.sender}
                    </div>
                    {m.content}
                    <div className="mt-1 text-[9px] text-right opacity-50">
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white italic text-center text-xs text-slate-400">
              Sesi ini sedang ditangani oleh AI.
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p>Pilih sesi chat untuk melihat percakapan</p>
          </div>
        )}
      </div>
    </div>
  );
}

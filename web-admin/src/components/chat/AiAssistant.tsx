"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial greeting
    useEffect(() => {
        if (history.length === 0) {
            setHistory([
                { role: "model", parts: [{ text: "Halo! Saya Aivola Support Assistant 🤖. Ada yang bisa saya bantu terkait penggunaan aplikasi hari ini?" }] }
            ]);
        }
    }, [history.length]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [history, isOpen]);

    const handleSend = async () => {
        if (!message.trim()) return;

        const userMsg = message.trim();
        setMessage("");
        
        // Add user message to UI immediately
        const newHistory = [...history, { role: "user", parts: [{ text: userMsg }] }];
        setHistory(newHistory);
        setIsLoading(true);

        try {
            const response = await api.post('/chat', {
                message: userMsg,
                // Exclude the very first greeting (index 0) and the current message from history sent to API
                history: history.slice(1).map(h => ({
                    role: h.role,
                    parts: h.parts
                }))
            });

            setHistory([...newHistory, { role: "model", parts: [{ text: response.data.reply }] }]);
        } catch (error) {
            console.error("Chat error:", error);
            setHistory([...newHistory, { role: "model", parts: [{ text: "Maaf, sistem AI sedang gangguan atau API Key belum diatur. Silakan hubungi IT Aivola." }] }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[999]">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-[350px] sm:w-[400px] h-[500px] max-h-[80vh] bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    {/* Header */}
                    <div className="p-4 bg-indigo-600 flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                                <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white leading-none">Aivola Assistant</h3>
                                <p className="text-[10px] font-bold text-indigo-200 mt-0.5">Online 24/7</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {history.map((msg, idx) => (
                            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                                    {msg.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                                </div>
                                <div className={`px-4 py-2.5 rounded-2xl max-w-[75%] text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'}`}>
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.parts[0].text}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 flex-row">
                                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                                    <Bot className="h-4 w-4 text-white" />
                                </div>
                                <div className="px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                                    <span className="text-xs italic text-slate-400">Sedang mengetik...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-slate-900 border-t border-slate-800">
                        <div className="flex items-center gap-2 relative">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Tanya Aivola Assistant..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!message.trim() || isLoading}
                                className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg transition-colors"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-transform hover:scale-105 active:scale-95"
                >
                    <MessageCircle className="h-6 w-6" />
                </button>
            )}
        </div>
    );
}

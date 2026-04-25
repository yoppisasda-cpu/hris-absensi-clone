import React, { useState, useEffect, useRef } from 'react';
import './ChatWidget.css';

const API_BASE_URL = 'http://localhost:5000';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{sender: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initChat = () => {
    // Basic welcome message
    if (messages.length === 0) {
      setMessages([
        { sender: 'AI', content: 'Halo! Saya Aivola.id Strategic Assistant. Ada yang bisa saya bantu terkait Absensi, Payroll, atau Manajemen Keuangan Bisnis Anda?' }
      ]);
    }
  };

  const toggleChat = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      initChat();
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    const historyContext = messages.map(m => `${m.sender}: ${m.content}`).join('\n');
    
    setInput('');
    setMessages(prev => [...prev, { sender: 'USER', content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg, 
          context: { history: historyContext } 
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { sender: 'AI', content: data.reply }]);
    } catch (err: any) {
      console.error('Chat send error:', err);
      const errorMsg = err.message || 'Maaf, sepertinya saya sedang tidak bisa terhubung ke server.';
      setMessages(prev => [...prev, { sender: 'AI', content: `[ERROR] ${errorMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`chat-widget-container ${isOpen ? 'open' : ''}`}>
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h4>Live Chat Aivola.id</h4>
            <p>Asisten AI siap membantu Anda</p>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.sender.toLowerCase()}`}>
                <div className="message-bubble">{m.content}</div>
              </div>
            ))}
            {isLoading && (
              <div className="message ai">
                <div className="message-bubble typing">Mengetik...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-input" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Ketik pesan..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={isLoading}>➤</button>
          </form>
        </div>
      )}
      
      <button className="chat-toggle-btn" onClick={toggleChat} title="Tanya AI">
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  );
}

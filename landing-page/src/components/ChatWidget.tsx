import React, { useState, useEffect, useRef } from 'react';
import './ChatWidget.css';

const API_BASE_URL = 'http://localhost:5000';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
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

  const initChat = async () => {
    if (sessionId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorName: 'Visitor' })
      });
      const data = await res.json();
      setSessionId(data.id);
      setMessages(data.messages);
    } catch (err) {
      console.error('Chat init error:', err);
    }
  };

  const toggleChat = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState && !sessionId) {
      initChat();
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { sender: 'USER', content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, content: userMsg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, data.aiResponse]);
    } catch (err) {
      console.error('Chat send error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`chat-widget-container ${isOpen ? 'open' : ''}`}>
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h4>Live Chat Aivola</h4>
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

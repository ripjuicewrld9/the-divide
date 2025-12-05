import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';

export default function MobileChatOverlay({ isOpen, onClose }) {
    const { user } = useAuth();
    const socket = useSocket('chat');
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!socket) return;

        socket.on('chat:message', (message) => {
            setMessages((prev) => [...prev, message]);
        });

        socket.on('chat:history', (history) => {
            setMessages(history || []);
        });

        socket.emit('chat:requestHistory');

        return () => {
            socket.off('chat:message');
            socket.off('chat:history');
        };
    }, [socket]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || !socket || !user) return;

        socket.emit('chat:sendMessage', {
            username: user.username,
            message: inputMessage.trim(),
        });

        setInputMessage('');
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
                style={{ animation: 'fadeIn 0.2s ease' }}
            />

            {/* Chat Panel */}
            <div
                className="fixed inset-y-0 right-0 w-full max-w-sm bg-[#0b0b0b] z-[101] flex flex-col border-l border-white/10 shadow-2xl"
                style={{ animation: 'slideInRight 0.3s ease' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-cyan-900/20 to-blue-900/20">
                    <h3 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-cyan-400"><path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" /></svg>
                        Live Chat
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <span className="text-gray-400 text-xl">×</span>
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-500 text-sm mt-8">
                            No messages yet. Be the first to chat!
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className="p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-cyan-500/5 hover:border-cyan-500/20 transition-colors"
                            >
                                <div className="text-xs font-bold text-cyan-400 mb-1">
                                    {msg.username || 'Anonymous'}
                                </div>
                                <div className="text-sm text-gray-200 break-words">
                                    {msg.message}
                                </div>
                                {msg.timestamp && (
                                    <div className="text-[10px] text-gray-600 mt-1">
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/10 bg-black/30">
                    {user ? (
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:bg-cyan-500/5"
                            />
                            <button
                                type="submit"
                                disabled={!inputMessage.trim()}
                                className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${inputMessage.trim()
                                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:scale-105'
                                        : 'bg-white/10 text-gray-600 cursor-not-allowed'
                                    }`}
                            >
                                Send
                            </button>
                        </form>
                    ) : (
                        <div className="text-center text-gray-500 text-xs py-3">
                            Please log in to chat
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
        </>
    );
}

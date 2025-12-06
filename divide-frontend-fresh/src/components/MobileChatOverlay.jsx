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
                className="fixed inset-y-0 right-0 w-full max-w-sm z-[101] flex flex-col border-l shadow-2xl"
                style={{ 
                    animation: 'slideInRight 0.3s ease',
                    background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(0, 0, 0, 0.95) 100%)',
                    borderColor: 'rgba(229, 57, 53, 0.3)',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(229, 57, 53, 0.15)'
                }}
            >
                {/* Header */}
                <div 
                    className="flex items-center justify-between px-4 py-3"
                    style={{
                        background: 'linear-gradient(135deg, rgba(229, 57, 53, 0.15) 0%, rgba(30, 136, 229, 0.15) 100%)',
                        borderBottom: '1px solid rgba(229, 57, 53, 0.2)'
                    }}
                >
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <div 
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #e53935 0%, #1e88e5 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white"><path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" /></svg>
                        </div>
                        Live Chat
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(229, 57, 53, 0.3)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    >
                        <span className="text-white text-xl">×</span>
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                        <div className="text-center text-sm mt-8" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                            No messages yet. Be the first to chat!
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className="p-3 rounded-lg transition-colors"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(229, 57, 53, 0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(229, 57, 53, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                                }}
                            >
                                <div className="text-xs font-bold mb-1" style={{ color: '#e53935' }}>
                                    {msg.username || 'Anonymous'}
                                </div>
                                <div className="text-sm break-words" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                                    {msg.message}
                                </div>
                                {msg.timestamp && (
                                    <div className="mt-1" style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.3)' }}>
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0, 0, 0, 0.3)' }}>
                    {user ? (
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 px-3 py-2 rounded-lg text-white text-sm focus:outline-none"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(229, 57, 53, 0.5)';
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!inputMessage.trim()}
                                className="px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-all text-white"
                                style={{
                                    background: inputMessage.trim() 
                                        ? 'linear-gradient(135deg, #e53935 0%, #1e88e5 100%)'
                                        : 'rgba(255, 255, 255, 0.1)',
                                    cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                                    color: inputMessage.trim() ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                                    boxShadow: inputMessage.trim() ? '0 4px 12px rgba(229, 57, 53, 0.3)' : 'none'
                                }}
                            >
                                Send
                            </button>
                        </form>
                    ) : (
                        <div className="text-center text-xs py-3" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
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

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import UserAvatar from '../components/UserAvatar';
import SupportLayout from '../components/SupportLayout';
import { encryptMessage, decryptMessage, isEncryptionSupported } from '../utils/encryption';

export default function SupportInbox() {
    const { user } = useAuth();
    const socket = useSocket('moderator-chat');
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [decryptedMessages, setDecryptedMessages] = useState({});
    const messagesEndRef = useRef(null);
    const encryptionSupported = isEncryptionSupported();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Decrypt messages as they come in
    useEffect(() => {
        const decryptAllMessages = async () => {
            const newDecrypted = {};
            for (const msg of messages) {
                if (msg.encrypted && encryptionSupported) {
                    const key = `${msg.timestamp}-${msg.userId}`;
                    if (!decryptedMessages[key]) {
                        try {
                            newDecrypted[key] = await decryptMessage(msg.message);
                        } catch {
                            newDecrypted[key] = '[Decryption failed]';
                        }
                    }
                }
            }
            if (Object.keys(newDecrypted).length > 0) {
                setDecryptedMessages(prev => ({ ...prev, ...newDecrypted }));
            }
        };
        decryptAllMessages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, encryptionSupported]);

    useEffect(() => {
        if (!socket) return;

        socket.on('moderator-chat:message', (message) => {
            setMessages((prev) => [...prev, message]);
        });

        socket.on('moderator-chat:history', (history) => {
            setMessages(history || []);
        });

        socket.emit('moderator-chat:requestHistory');

        return () => {
            socket.off('moderator-chat:message');
            socket.off('moderator-chat:history');
        };
    }, [socket]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || !socket || !user) return;

        const messageText = inputMessage.trim();
        let encryptedText = messageText;
        let isEncrypted = false;

        // Encrypt if supported
        if (encryptionSupported) {
            try {
                encryptedText = await encryptMessage(messageText);
                isEncrypted = true;
            } catch (err) {
                console.error('Encryption failed, sending plaintext:', err);
            }
        }

        socket.emit('moderator-chat:sendMessage', {
            userId: user._id,
            username: user.username,
            message: encryptedText,
            encrypted: isEncrypted,
            role: user.role,
        });

        setInputMessage('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputMessage.trim()) {
                handleSendMessage(e);
            }
        }
    };

    return (
        <SupportLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <span>💬</span>
                        <span>Inbox / Moderator Chat</span>
                    </div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        Team Communication
                        {encryptionSupported && (
                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full font-semibold flex items-center gap-1">
                                🔒 Encrypted
                            </span>
                        )}
                    </h1>
                    <p className="text-gray-400">
                        Private {encryptionSupported ? 'encrypted ' : ''}chat for moderators and administrators
                    </p>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-4xl mx-auto space-y-4">
                        {messages.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="mb-4">
                                    <svg className="w-16 h-16 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
                                <p className="text-gray-400 text-sm">Be the first to start the conversation!</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => {
                                const isMe = msg.userId === user?._id;
                                const showAvatar = idx === 0 || messages[idx - 1].userId !== msg.userId;
                                const messageKey = `${msg.timestamp}-${msg.userId}`;
                                const displayMessage = msg.encrypted && encryptionSupported 
                                    ? (decryptedMessages[messageKey] || '🔒 Decrypting...')
                                    : msg.message;
                                
                                return (
                                    <div
                                        key={idx}
                                        className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                        {/* Avatar */}
                                        <div className="flex-shrink-0">
                                            {showAvatar ? (
                                                <UserAvatar user={{ username: msg.username }} size={40} />
                                            ) : (
                                                <div className="w-10" />
                                            )}
                                        </div>

                                        {/* Message Content */}
                                        <div className={`flex-1 max-w-xl ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                            {showAvatar && (
                                                <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    <span className="text-sm font-semibold">
                                                        {msg.username}
                                                    </span>
                                                    <span className={`
                                                        text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase
                                                        ${msg.role === 'admin' 
                                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                                        }
                                                    `}>
                                                        {msg.role}
                                                    </span>
                                                    {msg.timestamp && (
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            
                                            <div
                                                className={`
                                                    px-4 py-2.5 rounded-2lg text-sm break-words
                                                    ${isMe
                                                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-br-none'
                                                        : 'bg-white/5 border border-white/10 rounded-bl-none'
                                                    }
                                                `}
                                            >
                                                <div className="whitespace-pre-wrap flex items-start gap-2">
                                                    {msg.encrypted && <span className="text-green-400 text-xs">🔒</span>}
                                                    <span className="flex-1">{displayMessage}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Message Input */}
                <div className="p-6 border-t border-white/10 bg-[#0b0b0b]">
                    <div className="max-w-4xl mx-auto">
                        <form onSubmit={handleSendMessage} className="flex gap-3">
                            <div className="flex-1 relative">
                                <textarea
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                                    rows={1}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-cyan-500 outline-none resize-none text-sm"
                                    style={{ minHeight: '48px', maxHeight: '120px' }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!inputMessage.trim()}
                                className={`
                                    px-6 py-3 rounded-lg font-semibold text-sm transition
                                    ${inputMessage.trim()
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white'
                                        : 'bg-white/5 text-gray-500 cursor-not-allowed'
                                    }
                                `}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </form>
                        <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-gray-500">
                                This is a private {encryptionSupported ? 'encrypted ' : ''}channel for moderators and administrators only
                            </span>
                            {encryptionSupported && (
                                <span className="text-green-400 flex items-center gap-1">
                                    🔒 End-to-end encrypted
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </SupportLayout>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import UserAvatar from './UserAvatar';

export default function ChatSidebar({ isOpen, setIsOpen }) {
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
    if (!socket) {
      return;
    }

    socket.on('chat:message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('chat:history', (history) => {
      setMessages(history || []);
    });

    socket.on('connect', () => {
    });

    socket.on('disconnect', () => {
    });

    socket.emit('chat:requestHistory');

    return () => {
      socket.off('chat:message');
      socket.off('chat:history');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [socket]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket || !user) {
      return;
    }

    socket.emit('chat:sendMessage', {
      username: user.username,
      message: inputMessage.trim(),
      userId: user.id,
    });

    setInputMessage('');
  };

  return (
    <>
      {/* Floating Chat Button - only show when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #e53935 0%, #1e88e5 100%)',
            border: 'none',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(229, 57, 53, 0.4)',
            transition: 'all 0.3s ease',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(229, 57, 53, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(229, 57, 53, 0.4)';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '24px', height: '24px' }}><path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5z" clipRule="evenodd" /></svg>
        </button>
      )}

      {/* Chat Sidebar */}
      <div
        style={{
          width: isOpen ? '320px' : '0',
          height: '100%',
          background: '#0b0b0b',
          borderLeft: isOpen ? '2px solid rgba(255, 50, 50, 0.2)' : 'none',
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Chat Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '2px solid rgba(255, 50, 50, 0.2)',
            background: 'linear-gradient(135deg, rgba(255, 50, 50, 0.1), rgba(204, 40, 40, 0.1))',
            minHeight: '64px',
            display: isOpen ? 'block' : 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #ff3232, #cc2828)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px', marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }}><path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" /></svg>
              Live Chat
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ff3232')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
            >
              ×
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: isOpen ? 'flex' : 'none',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#666',
                fontSize: '14px',
                marginTop: '40px',
              }}
            >
              No messages yet. Be the first to chat!
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(229, 57, 53, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(229, 57, 53, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {/* Profile Image */}
                  <UserAvatar 
                    user={{ username: msg.username, profileImage: msg.profileImage }} 
                    size={24} 
                  />
                  {/* Username */}
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#e53935',
                    }}
                  >
                    {msg.username || 'Anonymous'}
                  </span>
                  {/* Level Badge */}
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 600,
                      color: '#1e88e5',
                      background: 'rgba(30, 136, 229, 0.15)',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      border: '1px solid rgba(30, 136, 229, 0.3)',
                    }}
                  >
                    LVL {msg.level || 1}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: '#ddd',
                    wordWrap: 'break-word',
                    lineHeight: '1.4',
                    paddingLeft: '32px',
                  }}
                >
                  {msg.message}
                </div>
                {msg.timestamp && (
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#555',
                      marginTop: '4px',
                      paddingLeft: '32px',
                    }}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div
          style={{
            padding: '16px',
            borderTop: '2px solid rgba(255, 50, 50, 0.2)',
            background: 'rgba(0, 0, 0, 0.3)',
            display: isOpen ? 'block' : 'none',
          }}
        >
          {user ? (
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ff3232';
                  e.target.style.background = 'rgba(255, 50, 50, 0.05)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                style={{
                  padding: '10px 16px',
                  background: inputMessage.trim()
                    ? 'linear-gradient(135deg, #ff3232, #cc2828)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: inputMessage.trim() ? '#fff' : '#666',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
                onMouseEnter={(e) => {
                  if (inputMessage.trim()) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Send
              </button>
            </form>
          ) : (
            <div
              style={{
                textAlign: 'center',
                color: '#666',
                fontSize: '12px',
                padding: '12px',
              }}
            >
              Please log in to chat
            </div>
          )}
        </div>
      </div>
    </>
  );
}

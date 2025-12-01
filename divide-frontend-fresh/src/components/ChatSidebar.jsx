import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';

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
            background: 'linear-gradient(135deg, #00ffff, #00ccff)',
            border: 'none',
            color: '#000',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 255, 255, 0.4)',
            transition: 'all 0.3s ease',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 255, 255, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 255, 255, 0.4)';
          }}
        >
          💬
        </button>
      )}

      {/* Chat Sidebar */}
      <div
        style={{
          width: isOpen ? '320px' : '0',
          height: '100%',
          background: '#0b0b0b',
          borderLeft: isOpen ? '2px solid rgba(0, 255, 255, 0.2)' : 'none',
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
            borderBottom: '2px solid rgba(0, 255, 255, 0.2)',
            background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 204, 255, 0.1))',
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
                background: 'linear-gradient(135deg, #00ffff, #00ccff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              💬 Live Chat
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
              onMouseEnter={(e) => (e.currentTarget.style.color = '#00ffff')}
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
                key={idx}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#00ffff',
                    marginBottom: '4px',
                  }}
                >
                  {msg.username || 'Anonymous'}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: '#ddd',
                    wordWrap: 'break-word',
                    lineHeight: '1.4',
                  }}
                >
                  {msg.message}
                </div>
                {msg.timestamp && (
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#666',
                      marginTop: '4px',
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
            borderTop: '2px solid rgba(0, 255, 255, 0.2)',
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
                  e.target.style.borderColor = '#00ffff';
                  e.target.style.background = 'rgba(0, 255, 255, 0.05)';
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
                    ? 'linear-gradient(135deg, #00ffff, #00ccff)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: inputMessage.trim() ? '#000' : '#666',
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

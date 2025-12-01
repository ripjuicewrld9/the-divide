// src/hooks/useSocket.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

// Use VITE_API_URL if set, otherwise use same domain (production)
const SOCKET_URL = import.meta.env.VITE_API_URL || '';
const socket = io(SOCKET_URL);
const chatSocket = io(SOCKET_URL + '/chat');

export default function useSocket(roomId) {
  const socketRef = useRef(roomId === 'chat' ? chatSocket : socket);

  useEffect(() => {
    // Skip room join/leave for chat namespace
    if (roomId === 'chat') return;
    
    try {
      socketRef.current.emit("joinDivide", roomId);
    } catch (e) { /* ignore if not connected yet */ }
    return () => {
      try { socketRef.current.emit("leaveDivide", roomId); } catch (e) {}
    };
  }, [roomId]);

  return socketRef.current;
}
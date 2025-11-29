// src/hooks/useWheelSocket.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function useWheelSocket(gameId: string): Socket | null {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Create wheel namespace socket if not exists
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL + '/wheel');
    }

    const socket = socketRef.current;

    // Join this specific game room
    if (gameId) {
      socket.emit("wheel:joinGame", gameId);
      console.log(`[Wheel Socket] Joined game ${gameId}`);
    }

    // Cleanup on unmount or gameId change
    return () => {
      if (gameId) {
        socket.emit("wheel:leaveGame", gameId);
        console.log(`[Wheel Socket] Left game ${gameId}`);
      }
    };
  }, [gameId]);

  return socketRef.current;
}

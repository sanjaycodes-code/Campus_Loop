import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Initialize socket connection
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
    });

    setSocket(newSocket);

    // 2. On connection established
    newSocket.on('connect', () => {
      console.log(`%c[Socket.io] Connected to server with ID: ${newSocket.id}`, 'color: #0284c7; font-weight: bold;');
      setIsConnected(true);

      // 3. Emit initial 'ping' test event to backend
      console.log('%c[Socket.io] Emitting test event: ping', 'color: #059669; font-weight: bold;');
      newSocket.emit('ping', {
        clientTime: new Date().toISOString(),
        message: 'ping from client',
      });
    });

    // 4. Listen for 'pong' response from backend
    newSocket.on('pong', (data) => {
      console.log(
        '%c[Socket.io] Received pong response from server:',
        'color: #7c3aed; font-weight: bold; background: #f5f3ff; padding: 2px 6px; border-radius: 4px;',
        data
      );
    });

    // 5. On disconnect
    newSocket.on('disconnect', (reason) => {
      console.log(`%c[Socket.io] Disconnected: ${reason}`, 'color: #dc2626; font-weight: bold;');
      setIsConnected(false);
    });

    // 6. On connection error
    newSocket.on('connect_error', (error) => {
      console.warn('[Socket.io] Connection error:', error.message);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      console.log('[Socket.io] Cleaning up socket connection...');
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

/**
 * Custom hook to access socket instance
 */
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;

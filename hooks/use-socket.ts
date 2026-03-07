'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(() => {
    if (typeof window !== 'undefined' && !socketInstance) {
      socketInstance = io();
    }
    return socketInstance;
  });

  useEffect(() => {
    return () => {
      // We don't necessarily want to disconnect on every unmount if we want to keep the session
      // but for this app, we'll let the server handle disconnects
    };
  }, []);

  return socket;
};

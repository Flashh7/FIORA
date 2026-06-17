"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { getServiceWsUrl } from '@fiora/service-discovery';

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: any | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  lastMessage: null,
});

export const useWebSocket = () => useContext(WebSocketContext);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!token || !user) return;

    let isComponentMounted = true;
    let reconnectAttempts = 0;

    const connect = () => {
      if (eventSourceRef.current?.readyState === EventSource.OPEN) return;

      const coreWs = getServiceWsUrl('core')?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:3001';
      const es = new EventSource(`${coreWs}/api/ws/live?token=${token}`);
      
      es.onopen = () => {
        if (!isComponentMounted) return;
        setIsConnected(true);
        reconnectAttempts = 0;
        console.log('[SSE] Connected securely');
      };

      es.onmessage = (event) => {
        if (!isComponentMounted) return;
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (e) {
          console.error('[SSE] Failed to parse message', e);
        }
      };

      es.onerror = (error) => {
        if (!isComponentMounted) return;
        setIsConnected(false);
        es.close();
        eventSourceRef.current = null;
        console.log('[SSE] Disconnected or error');
        
        // Exponential backoff reconnect
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectAttempts++;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      eventSourceRef.current = es;
    };

    connect();

    return () => {
      isComponentMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [token, user]);

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
}

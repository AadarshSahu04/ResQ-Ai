import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState([]);

  useEffect(() => {
    const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;
    let socketTarget = '/';
    if (rawSocketUrl) {
      socketTarget = rawSocketUrl.replace(/\/$/, '').replace(/\/api$/, '');
    }

    const socketInstance = io(socketTarget, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    socketInstance.on('connect', () => {
      console.log('⚡ [Socket.io Client] Connected to server ID:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('⚡ [Socket.io Client] Disconnected');
      setConnected(false);
    });

    // Central Alert Listener
    const handleAlert = (eventData) => {
      const newAlert = {
        id: Date.now() + Math.random(),
        title: eventData.title || 'Emergency Update',
        message: eventData.message || '',
        payload: eventData.payload,
        timestamp: eventData.timestamp || new Date().toISOString(),
      };

      setLiveAlerts((prev) => [newAlert, ...prev.slice(0, 9)]);

      // Auto dismiss after 8 seconds
      setTimeout(() => {
        setLiveAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
      }, 8000);
    };

    socketInstance.on('alert:push', handleAlert);
    socketInstance.on('incident:created', handleAlert);
    socketInstance.on('incident:updated', handleAlert);
    socketInstance.on('incident:verified', handleAlert);
    socketInstance.on('hazard:created', handleAlert);
    socketInstance.on('hazard:updated', handleAlert);

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const dismissAlert = (id) => {
    setLiveAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <SocketContext.Provider value={{ socket, connected, liveAlerts, dismissAlert }}>
      {children}
      {/* Toast Alert Popups */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {liveAlerts.map((alert) => (
          <div
            key={alert.id}
            className="pointer-events-auto bg-slate-900 border-l-4 border-red-500 shadow-2xl p-4 rounded-r-lg border border-slate-700 backdrop-blur-md flex items-start justify-between gap-3 animate-bounce-once"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <h4 className="text-sm font-bold text-red-400">{alert.title}</h4>
              </div>
              <p className="text-xs text-slate-300 mt-1">{alert.message}</p>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getAccessToken, refreshSession } from '../api/client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const TOAST_DURATION_MS = 5000;
const MAX_NOTIFICATIONS = 20;

const toastStyles = {
  info: 'border-indigo-200 bg-white text-slate-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
};

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  // Shows a short-lived message. `type` is info | success | error.
  const toast = useCallback(
    (message, type = 'info', link) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, message, type, link }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss]
  );

  // Real-time notifications over Socket.io, only while signed in.
  const userId = user?._id;
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnread(0);
      return undefined;
    }

    const socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      // A function, so reconnects always send the current access token.
      auth: (cb) => cb({ token: getAccessToken() }),
    });

    socket.on('notification', (notification) => {
      setNotifications((list) => [notification, ...list].slice(0, MAX_NOTIFICATIONS));
      setUnread((count) => count + 1);
      toast(notification.message, 'info', notification.link);
    });

    // The access token may have expired while disconnected: refresh and retry once.
    let retried = false;
    socket.on('connect_error', async (err) => {
      if (err.message !== 'unauthorized' || retried) return;
      retried = true;
      try {
        await refreshSession();
        socket.connect();
      } catch {
        // Session is gone; the auth context handles signing out.
      }
    });
    socket.on('connect', () => {
      retried = false;
    });

    return () => socket.disconnect();
  }, [userId, toast]);

  const markAllRead = useCallback(() => setUnread(0), []);

  const value = useMemo(
    () => ({ toast, notifications, unread, markAllRead }),
    [toast, notifications, unread, markAllRead]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${toastStyles[t.type]}`}>
            <div className="flex-1">
              {t.link ? (
                <Link to={t.link} className="hover:underline" onClick={() => dismiss(t.id)}>
                  {t.message}
                </Link>
              ) : (
                t.message
              )}
            </div>
            <button type="button" className="cursor-pointer text-slate-400 hover:text-slate-600" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              ✕
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return context;
}

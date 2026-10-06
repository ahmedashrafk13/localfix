import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { api } from '../lib/api.js';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const RealtimeContext = createContext(null);

/**
 * Owns the Socket.IO connection for the signed-in user and the global unread counters
 * (notification bell and messages badge). Pages subscribe to events with `useSocketEvent`.
 */
export function RealtimeProvider({ children }) {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [connected, setConnected] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [latest, setLatest] = useState([]);
  const handlers = useRef(new Map());
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  const refreshCounts = useCallback(async () => {
    if (!user) return;
    try {
      const [n, c] = await Promise.all([api.get('/notifications', { limit: 8 }), api.get('/conversations')]);
      setUnreadNotifications(n.unreadCount);
      setLatest(n.items);
      setUnreadMessages(c.unreadTotal);
    } catch {
      /* counters are best-effort */
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setConnected(false);
      setUnreadNotifications(0);
      setUnreadMessages(0);
      setLatest([]);
      return undefined;
    }
    refreshCounts();
    let cancelled = false;
    let cleanup = () => {};
    connectSocket().then((socket) => {
      if (cancelled) return;
      const dispatch = (event) => (payload) => {
        for (const fn of handlers.current.get(event) || []) fn(payload);
      };
      const events = ['message:new', 'message:removed', 'typing', 'conversation:read', 'offer:new', 'request:new', 'request:updated', 'account:updated'];
      const bound = events.map((e) => [e, dispatch(e)]);
      bound.forEach(([e, fn]) => socket.on(e, fn));

      const onConnect = () => setConnected(true);
      const onDisconnect = (reason) => {
        setConnected(false);
        // The server drops sockets after a password change; reconnect with the refreshed session cookie.
        if (reason === 'io server disconnect') setTimeout(() => socket.connect(), 1500);
      };
      const onConnectError = () => setConnected(false);
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('connect_error', onConnectError);
      if (socket.connected) setConnected(true);

      const onNotification = (n) => {
        setUnreadNotifications((x) => x + 1);
        setLatest((list) => [n, ...list].slice(0, 8));
        // Chat messages already show up live in the inbox; avoid a toast while reading that conversation.
        const inChat = n.type === 'message' && pathRef.current.startsWith('/messages');
        if (!inChat) toast.info(n.body || '', { title: n.title, link: n.link || undefined });
      };
      socket.on('notification:new', onNotification);

      const onMessage = ({ message }) => {
        if (message.sender !== user.id) setUnreadMessages((x) => x + 1);
      };
      socket.on('message:new', onMessage);
      const onAccount = () => refresh();
      socket.on('account:updated', onAccount);

      cleanup = () => {
        bound.forEach(([e, fn]) => socket.off(e, fn));
        socket.off('message:new', onMessage);
        socket.off('account:updated', onAccount);
        socket.off('notification:new', onNotification);
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('connect_error', onConnectError);
      };
    });

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const subscribe = useCallback((event, fn) => {
    const set = handlers.current.get(event) || new Set();
    set.add(fn);
    handlers.current.set(event, set);
    return () => set.delete(fn);
  }, []);

  const emit = useCallback((event, payload, ack) => {
    getSocket()?.emit(event, payload, ack);
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await api.post('/notifications/read-all');
    setUnreadNotifications(0);
    setLatest((list) => list.map((n) => ({ ...n, read: true })));
  }, []);

  const markNotificationRead = useCallback(async (id) => {
    setLatest((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadNotifications((x) => Math.max(0, x - 1));
    await api.post(`/notifications/${id}/read`).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      connected,
      unreadNotifications,
      unreadMessages,
      latest,
      subscribe,
      emit,
      refreshCounts,
      setUnreadMessages,
      markAllNotificationsRead,
      markNotificationRead,
    }),
    [connected, unreadNotifications, unreadMessages, latest, subscribe, emit, refreshCounts, markAllNotificationsRead, markNotificationRead]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

/** Subscribe a component to a socket event for its lifetime. */
export function useSocketEvent(event, handler) {
  const { subscribe } = useRealtime();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => subscribe(event, (payload) => ref.current(payload)), [event, subscribe]);
}

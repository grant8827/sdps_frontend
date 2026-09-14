import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import type { Notice } from '../types';

interface NoticesContextValue {
  notices: Notice[];
  unreadCount: number;
  markRead: (noticeId: string) => void;
}

const NoticesContext = createContext<NoticesContextValue | undefined>(undefined);

const POLL_MS = 4000;

/**
 * Backs the Parent Notices feed + unread badge on the tab icon. Backed
 * by the real notices table now (was in-memory-only mock state that
 * never synced across devices) — polls the same way the queue and
 * attendance screens do, since there's no websocket transport.
 */
export function NoticesProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => api.myNotices(token).then(next => { if (!cancelled) setNotices(next); }).catch(() => {});
    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  const markRead = (noticeId: string) => {
    setNotices(prev => prev.map(n => (n.id === noticeId ? { ...n, read: true } : n)));
    if (token) api.markNoticeRead(token, noticeId).catch(() => {});
  };

  const value = useMemo<NoticesContextValue>(
    () => ({
      notices,
      unreadCount: notices.filter(n => !n.read).length,
      markRead,
    }),
    [notices],
  );

  return <NoticesContext.Provider value={value}>{children}</NoticesContext.Provider>;
}

export function useNotices(): NoticesContextValue {
  const ctx = useContext(NoticesContext);
  if (!ctx) throw new Error('useNotices must be used within a NoticesProvider');
  return ctx;
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface Notification {
  id: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    const { data } = await api.get<Notification[]>('/notifications');
    setNotifications(data);
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await api.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  // SSE s krátkodobým tokenem — hlavní JWT zůstane v HttpOnly cookie, SSE token je krátkodobý
  useEffect(() => {
    let es: EventSource | null = null;

    const connectSse = async () => {
      try {
        const { data } = await api.get<{ token: string }>('/auth/sse-token');
        es = new EventSource(`${API_URL}/notifications/stream?token=${data.token}`);

        es.onmessage = (event: MessageEvent<string>) => {
          const parsed = JSON.parse(event.data) as { unreadCount: number };
          setUnreadCount(parsed.unreadCount);
        };

        es.onerror = () => {
          es?.close();
          // SSE token vyprší za 5 min — obnovíme po 30 s
          setTimeout(connectSse, 30_000);
        };
      } catch {
        // Uživatel není přihlášen — SSE se nespustí
      }
    };

    connectSse();

    return () => es?.close();
  }, []);

  return { unreadCount, notifications, fetchNotifications, markAsRead, markAllAsRead };
}

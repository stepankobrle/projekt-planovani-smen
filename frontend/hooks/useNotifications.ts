'use client';

import { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
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

  // Načte plný seznam notifikací (voláno při otevření dropdownu)
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

  // SSE spojení — token jde jako query param (EventSource nepodporuje hlavičky)
  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) return;

    const es = new EventSource(`${API_URL}/notifications/stream?token=${token}`);

    es.onmessage = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { unreadCount: number };
      setUnreadCount(data.unreadCount);
    };

    return () => es.close();
  }, []);

  return { unreadCount, notifications, fetchNotifications, markAsRead, markAllAsRead };
}

import { create } from 'zustand';
import type { Notification } from '../types';

const API_URL = (window as unknown as Record<string, Record<string, string> | undefined>).__env__?.['API_URL']
  ?? import.meta.env.VITE_API_URL
  ?? 'http://localhost:3001';

const LS_KEY = 'aios_notif_read';

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>): void {
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (token: string) => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (token: string) => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return; // auth-store handles logout
      if (!res.ok) return;            // keep existing notifications on error
      const data = (await res.json()) as Notification[];
      const readIds = getReadIds();
      const notifications = data.map((n) => ({ ...n, read: readIds.has(n.id) }));
      set({ notifications, unreadCount: notifications.filter((n) => !n.read).length });
    } catch {
      // network error — keep existing notifications unchanged
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: (id: string) => {
    const readIds = getReadIds();
    readIds.add(id);
    saveReadIds(readIds);
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
    });
  },

  markAllAsRead: () => {
    set((state) => {
      const readIds = getReadIds();
      state.notifications.forEach((n) => readIds.add(n.id));
      saveReadIds(readIds);
      return {
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      };
    });
  },

  clearAll: () => {
    localStorage.removeItem(LS_KEY);
    set({ notifications: [], unreadCount: 0 });
  },
}));

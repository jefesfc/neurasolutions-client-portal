import { useEffect } from 'react';
import { useAuthStore } from '../store/auth-store';
import { useNotificationStore } from '../store/notification-store';

export function useNotificationPolling() {
  const token = useAuthStore((s) => s.token);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  useEffect(() => {
    if (!token) return;
    void fetchNotifications(token);
    const id = setInterval(() => { void fetchNotifications(token); }, 60_000);
    return () => clearInterval(id);
  }, [token, fetchNotifications]);
}

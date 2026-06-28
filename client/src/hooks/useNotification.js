import { useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export const useNotification = () => {
  const { user, token, getAuthHeaders } = useAuth();

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (user?.notificationSettings?.enableNotifications) {
      requestPermission();
    }
  }, [user, requestPermission]);

  useEffect(() => {
    if (!token || !user?.notificationSettings?.enableNotifications) return;

    const pollNotifications = async () => {
      try {
        const res = await fetch('/api/notifications/due', {
          headers: getAuthHeaders(),
        });
        const data = await res.json();

        if (data.success && data.notifications && data.notifications.length > 0) {
          data.notifications.forEach((notif) => {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(notif.title, {
                body: notif.message,
                tag: notif._id, // avoid duplicate popups
              });
            }
          });
        }
      } catch (err) {
        console.error('Error fetching due notifications:', err);
      }
    };

    pollNotifications();
    const interval = setInterval(pollNotifications, 10000);
    
    return () => clearInterval(interval);
  }, [token, user, getAuthHeaders]);
};

export default useNotification;

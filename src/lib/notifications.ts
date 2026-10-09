/**
 * Hey Ankit Notification Helper
 * Mobile (ServiceWorker) & Desktop notification utility
 */

export interface NotificationOptions {
  senderName?: string;
  preview?: string;
  conversationId?: string;
}

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && ('Notification' in window || 'serviceWorker' in navigator);
};

export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined') return 'denied';
  if (!('Notification' in window)) {
    alert('Notifications on iPhone require adding the app to your Home Screen: Tap the Share button in Safari -> "Add to Home Screen".');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/sw.js').catch(() => null);
    }
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
};

/**
 * Send a privacy-conscious branded notification (Works on mobile & desktop)
 */
export const sendHeyAnkitNotification = async (opts: NotificationOptions = {}) => {
  if (typeof window === 'undefined') return;

  // Haptic feedback on device if supported
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([100, 50, 100]);
    } catch {
      // ignore
    }
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const sender = opts.senderName ? opts.senderName : 'Ankit';
  const title = `Hey Ankit • ${sender}`;
  const body = opts.preview ? opts.preview : 'Sent you a new message';

  const notificationOptions: NotificationOptions & Record<string, unknown> = {
    body,
    icon: '/notification-icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'hey-ankit-message',
    renotify: true,
    data: {
      url: window.location.origin,
      conversationId: opts.conversationId,
    },
    silent: false,
    vibrate: [200, 100, 200],
  };

  // 1. Mobile browsers (Chrome Android, Safari iOS PWA) require Service Worker showNotification
  if ('serviceWorker' in navigator) {
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
      }

      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, notificationOptions as globalThis.NotificationOptions);
        return;
      }
    } catch (swErr) {
      console.warn('Service worker showNotification failed:', swErr);
    }
  }

  // 2. Desktop browser fallback
  try {
    const notification = new Notification(title, notificationOptions as globalThis.NotificationOptions);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (err) {
    console.warn('Could not display window notification:', err);
  }
};

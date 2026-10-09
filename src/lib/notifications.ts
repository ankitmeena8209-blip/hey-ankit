/**
 * Hey Ankit Notification Helper
 * Privacy-conscious, branded notification utility
 */

export interface NotificationOptions {
  senderName?: string;
  preview?: string;
  conversationId?: string;
}

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
};

/**
 * Send a privacy-conscious branded notification
 */
export const sendHeyAnkitNotification = (opts: NotificationOptions = {}) => {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  const sender = opts.senderName ? opts.senderName : 'Ankit';
  const title = `Hey Ankit • ${sender}`;
  const body = opts.preview ? opts.preview : 'Sent you a new message';

  try {
    const notification = new Notification(title, {
      body,
      icon: '/notification-icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'hey-ankit-message',
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (err) {
    console.warn('Could not display notification:', err);
  }
};

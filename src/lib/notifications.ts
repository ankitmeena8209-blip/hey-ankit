/**
 * Linksy Notification Engine — Published by FRZI TOOLS
 * Reliable Multi-Platform Push, Service Worker & PWA Notifications
 */

export interface LinksyNotificationOptions {
  senderName?: string;
  senderAvatar?: string | null;
  preview?: string;
  conversationId?: string;
  silent?: boolean;
}

export type NotificationOptions = LinksyNotificationOptions;

export interface InAppToastPayload {
  id: string;
  senderName: string;
  senderAvatar?: string | null;
  preview: string;
  conversationId?: string;
}

// In-app notification listener registry
type InAppToastListener = (payload: InAppToastPayload) => void;
const toastListeners = new Set<InAppToastListener>();

export const subscribeToInAppNotifications = (listener: InAppToastListener) => {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
};

export const triggerInAppToast = (payload: InAppToastPayload) => {
  toastListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (e) {
      console.warn('Error in in-app toast listener:', e);
    }
  });
};

/**
 * Detect if running on iOS (iPhone, iPad, iPod)
 */
export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

/**
 * Detect if installed on Home Screen as Standalone PWA
 */
export const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    // iOS Safari Home Screen standalone
    ('standalone' in window.navigator && Boolean((window.navigator as unknown as { standalone: boolean }).standalone)) ||
    // Modern display-mode standalone
    window.matchMedia('(display-mode: standalone)').matches
  );
};

/**
 * Check if notifications can be supported in the current environment
 */
export const isNotificationSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  // If on iOS and not standalone, Web Push is available once added to Home Screen
  if (isIOS() && !isStandalonePWA()) {
    return true; // We can show instructions to Add to Home Screen
  }
  return 'Notification' in window || 'serviceWorker' in navigator;
};

/**
 * Get current browser notification permission
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined') return 'denied';
  if (!('Notification' in window)) {
    if (isIOS() && !isStandalonePWA()) return 'default';
    return 'denied';
  }
  return Notification.permission;
};

/**
 * Synthesizes a soft, harmonic notification chime using the Web Audio API
 */
export const playNotificationSound = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => null);
    }

    const now = ctx.currentTime;
    
    // Note 1: High crisp chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Note 2: Warm follow-up tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.08); // E6
    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.4);
  } catch {
    // AudioContext blocked or not allowed by policy
  }
};

/**
 * Trigger device haptic vibration
 */
export const vibrateDevice = (pattern: number[] = [120, 60, 120]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Haptic not supported or disabled
    }
  }
};

/**
 * Update app icon badge if supported
 */
export const setAppBadge = async (count: number) => {
  if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
    try {
      if (count > 0) {
        await (navigator as unknown as { setAppBadge: (c: number) => Promise<void> }).setAppBadge(count);
      } else {
        await (navigator as unknown as { clearAppBadge: () => Promise<void> }).clearAppBadge();
      }
    } catch {
      // Ignore badging errors
    }
  }
};

/**
 * Request notification permissions with iOS Home Screen PWA guidance
 */
export const requestNotificationPermission = async (): Promise<{
  permission: NotificationPermission;
  instruction?: string;
}> => {
  if (typeof window === 'undefined') return { permission: 'denied' };

  // On iOS, if not running as installed PWA, guide user to Add to Home Screen
  if (isIOS() && !isStandalonePWA()) {
    const message =
      'iOS Push Notifications require adding Linksy to your Home Screen:\n1. Tap the Share button in Safari (box with up arrow)\n2. Select "Add to Home Screen"\n3. Open Linksy from your Home Screen to enable notifications.';
    alert(message);
    return { permission: 'default', instruction: message };
  }

  if (!('Notification' in window)) {
    return {
      permission: 'denied',
      instruction: 'Web Notifications are not supported in this browser.',
    };
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted' && 'serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration note:', err);
      });
      // Play a confirmation sound
      playNotificationSound();
      vibrateDevice([100]);
    }

    return { permission };
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return { permission: 'denied' };
  }
};

/**
 * Dispatch branded Linksy notification (Desktop, Android, and iOS PWA)
 */
export const sendLinksyNotification = async (opts: LinksyNotificationOptions = {}) => {
  if (typeof window === 'undefined') return;

  const sender = opts.senderName || 'Linksy';
  const title = `Linksy • ${sender}`;
  const body = opts.preview || 'Sent you a new message';

  // Always emit in-app toast event so user is notified if looking at another screen
  triggerInAppToast({
    id: `${Date.now()}-${Math.random()}`,
    senderName: sender,
    senderAvatar: opts.senderAvatar,
    preview: body,
    conversationId: opts.conversationId,
  });

  // Sound & Haptic
  if (!opts.silent) {
    playNotificationSound();
    vibrateDevice([120, 60, 120]);
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notificationOptions = {
    body,
    icon: opts.senderAvatar || '/pwa-192x192.png',
    badge: '/badge-72x72.png',
    tag: opts.conversationId ? `linksy-${opts.conversationId}` : 'linksy-message',
    renotify: true,
    data: {
      url: window.location.origin,
      conversationId: opts.conversationId,
    },
    silent: Boolean(opts.silent),
    vibrate: [200, 100, 200],
  };

  // 1. Mobile browsers & iOS PWA require Service Worker showNotification
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, notificationOptions as globalThis.NotificationOptions);
        return;
      }
    } catch (swErr) {
      console.warn('Service worker notification fallback triggered:', swErr);
    }
  }

  // 2. Desktop fallback
  try {
    const notification = new Notification(title, notificationOptions as globalThis.NotificationOptions);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (err) {
    console.warn('Window notification display warning:', err);
  }
};

// Backward-compatible alias
export const sendHeyAnkitNotification = sendLinksyNotification;

// Linksy Service Worker
// Published by FRZI TOOLS
// Enables Web Push, Background Notifications & PWA Installation

const CACHE_NAME = 'linksy-pwa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 1. Handle Web Push events (iOS 16.4+ PWA & Modern Browsers)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Linksy',
    body: 'You received a new message',
    conversationId: null,
    icon: '/pwa-192x192.png',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: '/badge-72x72.png',
    tag: payload.conversationId ? `linksy-${payload.conversationId}` : 'linksy-chat',
    renotify: true,
    data: {
      url: payload.conversationId ? `/?conv=${payload.conversationId}` : '/',
      conversationId: payload.conversationId,
    },
    silent: false,
    vibrate: [150, 60, 150],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Linksy', notificationOptions)
  );
});

// 2. Handle Notification Clicks (Focus or Open Chat Window)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const conversationId = event.notification.data?.conversationId;
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a Linksy tab or standalone window is open, focus it and notify of the conversation
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (conversationId && 'postMessage' in client) {
            client.postMessage({
              type: 'LINKSY_OPEN_CONVERSATION',
              conversationId,
            });
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. Message handler for local programmatic triggers from web client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || 'Linksy', options || {});
  }
});

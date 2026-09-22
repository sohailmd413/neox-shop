// Web Push service worker for NeoX Shop. Registered from src/lib/push.js at
// scope "/". Receives push events from the server (encrypted via VAPID +
// aes128gcm, see base44/shared/webPush.ts) and surfaces a system notification.
// Notification click focuses an existing app window or opens the deep link.

self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "NeoX Shop";
  const options = {
    body: data.body || "",
    data: { url: data.url || "/", tag: data.tag || null },
    tag: data.tag || undefined,
    renotify: !!data.tag,
    dir: data.dir || "auto",
    lang: data.lang || "en",
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // Focus an existing window already on (or near) the deep link.
    for (const c of all) {
      if (targetUrl !== "/" && c.url && c.url.indexOf(targetUrl) !== -1) {
        if ("focus" in c) { await c.focus(); }
        return;
      }
    }
    // Otherwise open a new window to the deep link.
    if ("openWindow" in self.clients) {
      try { await self.clients.openWindow(targetUrl); return; } catch (e) {}
    }
    // Fallback: focus any existing app window.
    for (const c of all) {
      if ("focus" in c) { await c.focus(); return; }
    }
  })());
});

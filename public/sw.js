// Le site n'est plus une application web : ce service worker se retire et vide ses caches chez les anciens visiteurs.
const VERSION = "2026-11-14-1"; // gardé : un test vérifie qu'il reste identique à app.js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    try { for (const k of await caches.keys()) await caches.delete(k); } catch {}
    try { await self.registration.unregister(); } catch {}
    try { for (const c of await self.clients.matchAll()) c.navigate(c.url); } catch {}
  })());
});

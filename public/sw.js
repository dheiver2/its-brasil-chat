// Service Worker DESATIVADO — auto-desregistra e limpa caches.
// (Removido por causar conflito de hidratação com o Next dev/HMR.)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const cs = await self.clients.matchAll({ type: "window" });
      cs.forEach((c) => c.navigate(c.url));
    } catch (e) { /* noop */ }
  })());
});

/* ==========================================================
   Offline support. Network first: when online, riders always get
   the live page (and we keep a copy). With no signal, the last
   copy is shown. The safety pages are saved on the first visit so
   they work on a trail with no signal.
   Bump VERSION whenever this file's list changes.
   ========================================================== */
const VERSION = "ebikebuy-v1";
const SAFETY = [
  "broke-down.html", "battery-safety.html", "diagnose.html", "garage.html", "repair.html",
  "js/diagnose.js", "js/diagnose-data.js", "js/garage-store.js", "js/easy.js"
];

self.addEventListener("install", e => {
  // Save the safety pages; one missing file shouldn't stop the rest.
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SAFETY.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return; // fonts, maps, cpsc: leave alone
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit ||
      (req.mode === "navigate" ? caches.match("broke-down.html") : Response.error())))
  );
});

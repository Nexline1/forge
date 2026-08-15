/* =============================================================================
   FORGE — service worker

   Two jobs:
   1. Make repeat visits instant, and work with no connection at all.
   2. Stop the design degrading when Google Fonts is slow or blocked — the
      fonts get cached on first visit and served locally after that.

   Cache-first for our own static files (they're versioned by CACHE name),
   stale-while-revalidate for fonts. Lead submissions always go to the network
   and are never cached.

   Bump CACHE when you deploy a change, or returning visitors keep the old
   copy until their browser evicts it.
   ============================================================================= */

var CACHE = "forge-v7";

var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/css/app.css",
  "./assets/img/aibh-mascot.png",
  "./assets/js/config.js",
  "./assets/js/i18n.js",
  "./assets/js/data/domains.js",
  "./assets/js/data/models.js",
  "./assets/js/data/tools.js",
  "./assets/js/data/formats.js",
  "./assets/js/data/behaviour.js",
  "./assets/js/data/clarifiers.js",
  "./assets/js/data/ar.js",
  "./assets/js/flow.js",
  "./assets/js/compose.js",
  "./assets/js/lead.js",
  "./assets/js/ui.js",
  "./assets/js/app.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        return Promise.all(SHELL.map(function (url) {
          // Two things matter here.
          // 1. addAll is atomic — one 404 throws the whole install away, so we
          //    add individually and tolerate misses.
          // 2. cache:"reload" bypasses the browser's HTTP cache. Without it,
          //    `cache.add()` happily re-stores the STALE copy the browser
          //    already had, so bumping CACHE above would ship nothing. That
          //    bug is invisible until someone can't get your update.
          return fetch(new Request(url, { cache: "reload" }))
            .then(function (res) { if (res && res.ok) return c.put(url, res); })
            .catch(function () { /* skip */ });
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;                       // never touch lead POSTs

  var url = new URL(req.url);
  var isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  var isOurs = url.origin === self.location.origin;
  if (!isFont && !isOurs) return;

  // Fonts: serve cached immediately, refresh in the background.
  if (isFont) {
    e.respondWith(
      caches.open(CACHE).then(function (c) {
        return c.match(req).then(function (hit) {
          var net = fetch(req).then(function (res) {
            if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
            return res;
          }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
    return;
  }

  // Our own files: cache first, fall back to network, then to the shell for
  // navigations so a deep link still works offline.
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return req.mode === "navigate" ? caches.match("./index.html") : undefined;
      });
    })
  );
});

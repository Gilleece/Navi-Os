/* ============================================================
   NAVI-OS — service worker
   Precaches the app shell so the desktop boots offline, then
   keeps same-origin assets fresh with a stale-while-revalidate
   strategy. Bump CACHE_NAME on every deploy that changes the
   precache list — the old cache is swept on activate.

   Fetch strategy, by request class:
     - same-origin GET ......... cache-first, refreshed in the bg
     - BBS worker API (POSTs
       and live data) ........... network-only, never cached
     - Google Fonts + the
       LDNOOBW wordlist ......... network-first, cache fallback
     - navigation (page loads) . cached index.html shell if offline
   Non-GET requests are never touched — they fall straight
   through to the network.
   ============================================================ */

const VERSION    = "v3";
const CACHE_NAME = `navi-${VERSION}`;
const RUNTIME_CACHE = `navi-runtime-${VERSION}`;

/* ---------- app shell — precached on install ----------------- */
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./manifest.webmanifest",
  "./assets/favicon.svg",
  "./assets/og.png",
  "./assets/profile-pic.png",

  "./js/apps/_fx.js",
  "./js/apps/bbs.js",
  "./js/apps/calculator.js",
  "./js/apps/calendar.js",
  "./js/apps/defrag.js",
  "./js/apps/draw.js",
  "./js/apps/files.js",
  "./js/apps/flappy.js",
  "./js/apps/life.js",
  "./js/apps/maze/audio.js",
  "./js/apps/maze/characters/characters.js",
  "./js/apps/maze/characters/custodian.js",
  "./js/apps/maze/characters/dalypso.js",
  "./js/apps/maze/characters/homiss.js",
  "./js/apps/maze/characters/littlebee.js",
  "./js/apps/maze/characters/portrait.js",
  "./js/apps/maze/characters/scally.js",
  "./js/apps/maze/characters/sian.js",
  "./js/apps/maze/characters/story/custodian.beats.js",
  "./js/apps/maze/characters/story/dalypso.beats.js",
  "./js/apps/maze/characters/story/homiss.beats.js",
  "./js/apps/maze/characters/story/littlebee.beats.js",
  "./js/apps/maze/characters/story/scally.beats.js",
  "./js/apps/maze/characters/story/sian.beats.js",
  "./js/apps/maze/creation.js",
  "./js/apps/maze/debug.js",
  "./js/apps/maze/dialogue.js",
  "./js/apps/maze/entities.js",
  "./js/apps/maze/environment.js",
  "./js/apps/maze/generator.js",
  "./js/apps/maze/hands.js",
  "./js/apps/maze/hud.js",
  "./js/apps/maze/journal.js",
  "./js/apps/maze/maze.js",
  "./js/apps/maze/menu.js",
  "./js/apps/maze/minimap.js",
  "./js/apps/maze/palette.js",
  "./js/apps/maze/panel.js",
  "./js/apps/maze/pause.js",
  "./js/apps/maze/player.js",
  "./js/apps/maze/postfx.js",
  "./js/apps/maze/props.js",
  "./js/apps/maze/sanctum.js",
  "./js/apps/maze/state.js",
  "./js/apps/maze/story.js",
  "./js/apps/maze/textures.js",
  "./js/apps/maze/vrbanner.js",
  "./js/apps/notepad.js",
  "./js/apps/oracle.js",
  "./js/apps/scan.js",
  "./js/apps/settings.js",
  "./js/apps/sysmon.js",
  "./js/apps/terminal.js",
  "./js/apps/tracker.js",
  "./js/apps/vector.js",
  "./js/apps/worm.js",
  "./js/achievements.js",
  "./js/boot.js",
  "./js/clock.js",
  "./js/fs.js",
  "./js/main.js",
  "./js/notify.js",
  "./js/palette.js",
  "./js/screensaver.js",
  "./js/sound.js",
  "./js/startmenu.js",
  "./js/store.js",
  "./js/system.js",
  "./js/theme.js",
  "./js/utils.js",
  "./js/vendor/three.r128.min.js",
  "./js/windows.js",
];

/* ---------- request classifiers ------------------------------- */
const isWorkerAPI  = url => url.hostname.includes("workers.dev");
const isGoogleFont = url => url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
const isWordlist   = url => url.hostname === "raw.githubusercontent.com";

/* ---------- install: precache the app shell -------------------
   addAll() aborts the whole batch on a single 404, so we cache
   each file individually and just log stragglers — a missing
   icon shouldn't brick the install.                             */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(PRECACHE_URLS.map(url =>
        cache.add(url).catch(err => console.warn("[sw] precache skipped:", url, err))
      ))
    ).then(() => self.skipWaiting())
  );
});

/* ---------- activate: drop stale caches, take control ---------- */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---------- fetch strategies ------------------------------------ */

// cache-first, refreshed in the background (stale-while-revalidate)
async function staleWhileRevalidate(request, cacheName){
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(response => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

// network-first, falling back to whatever's cached
async function networkFirst(request, cacheName){
  const cache = await caches.open(cacheName);
  try{
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }catch(e){
    const cached = await cache.match(request);
    if (cached) return cached;
    throw e;
  }
}

/* local dev: cache-first would serve edited files one reload stale, which
   makes "why didn't my change take" bugs. On localhost, go to the network
   every time (cache only as an offline fallback) so a single reload always
   runs the code on disk. Production keeps the offline-first strategies. */
const IS_DEV = ["localhost", "127.0.0.1"].includes(self.location.hostname);

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;   // never touch POSTs etc.

  const url = new URL(request.url);

  if (IS_DEV){
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then(r => r || Response.error()))
    );
    return;
  }

  // BBS worker — live data, never cached
  if (isWorkerAPI(url)){
    event.respondWith(fetch(request));
    return;
  }

  // navigation requests — offline falls back to the shell
  if (request.mode === "navigate"){
    event.respondWith(
      fetch(request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Google Fonts + the LDNOOBW wordlist — network-first, cache fallback
  if (isGoogleFont(url) || isWordlist(url)){
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // same-origin — cache-first with a background refresh
  if (url.origin === self.location.origin){
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
    return;
  }

  // anything else cross-origin: just let it through
});

/* 離線快取：安裝後沒有網路也能使用。
   每次更新網站內容時，請把 VERSION 改一個新值，學生端就會出現「有新版本」提示。 */
const VERSION = 'ne300-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/vendor/three.min.js', './js/util.js', './js/state.js', './js/specimens.js', './js/orbit.js',
  './js/model.js', './js/view.js', './js/hands.js', './js/bench.js', './js/wizard.js', './js/scenes.js',
  './js/lessons.js', './js/mobile.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-64.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

// 先用快取（快、可離線），同時在背景向網路更新快取
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const key = req.mode === 'navigate' ? './index.html' : req;
    const hit = await cache.match(key, { ignoreSearch: req.mode === 'navigate' });
    const net = fetch(req).then(res => { if (res && res.ok && res.type === 'basic') cache.put(key, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    return res || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
  }));
});

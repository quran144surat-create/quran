// Cache halaman/aset app ini. Nama diberi awalan 'quran-shell-' supaya hanya cache miliknya yang dibersihkan.
// Cache 'quran-v2' (unduhan halaman mushaf) dan cache milik app lain di alamat yang sama TIDAK dihapus.
const CACHE = 'quran-shell-v1';
const ASSETS = ['./', './index.html', './mushaf.html', './config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k === 'quran-v1' || (k.startsWith('quran-shell-') && k !== CACHE)).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request))
  );
});

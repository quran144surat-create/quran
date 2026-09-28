// Service Worker untuk mode offline "Quran" (index.html + mushaf.html).
// Strategi: app shell (HTML/JS) di-precache saat install. Gambar halaman
// mushaf (dari CDN jsDelivr) di-cache otomatis begitu pernah dibuka —
// jadi halaman yang sudah dibuka bisa dibaca lagi walau sedang offline.
// Menaikkan CACHE lain kali ada perubahan berarti (mis. ubah config.js)
// supaya klien lama tidak nyangkut di versi cache sebelumnya.
const CACHE = 'quran-v1';
const SHELL = ['./', 'index.html', 'mushaf.html', 'config.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith(
    caches.match(req).then((cached) => {
      const fresh = fetch(req).then((res) => {
        // Gambar dari CDN lintas-domain (jsDelivr) biasanya jadi respons
        // "opaque" (tanpa header CORS) — tetap disimpan karena itu wajar,
        // bukan tanda kegagalan.
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);

      // Kalau sudah pernah tersimpan: tampilkan langsung dari cache
      // (cepat + tetap bisa dibuka offline), sambil perbarui di
      // belakang layar untuk kunjungan berikutnya.
      return cached || fresh;
    })
  );
});

// Service Worker "Quran" v2 (index.html + mushaf.html).
// - App shell (HTML/JS) di-precache; dibuka offline walau alamatnya berparameter
//   (mushaf.html?p=50, ?s=2&a=255) karena query diabaikan saat mencocokkan cache.
// - Gambar halaman (CDN jsDelivr, lintas domain): cache-first. Tersimpan otomatis
//   begitu dibuka, atau sekaligus lewat tombol "Simpan untuk offline" di mushaf.html.
// Naikkan CACHE bila ada perubahan berarti (mis. ubah config.js) agar klien lama
// tidak nyangkut di cache sebelumnya.
const CACHE = 'quran-v2';
const SHELL = ['./', 'index.html', 'mushaf.html', 'config.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // allSettled: satu file gagal diunduh tidak menggagalkan seluruh instalasi
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
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

// Navigasi: buang query/hash supaya semua ?p=... memakai satu entri cache.
const keyFor = (req) => {
  if (req.mode !== 'navigate') return req;
  const u = new URL(req.url);
  u.search = ''; u.hash = '';
  return u.href;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;

  if (!sameOrigin) {
    // Gambar CDN: cache-first, tanpa cek ulang ke jaringan (604 gambar tidak berubah).
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        // Respons "opaque" tidak disimpan: kuotanya dihitung ~7 MB per gambar.
        if (res.ok && res.type !== 'opaque') c.put(req, res.clone());
        return res;
      } catch (err) {
        return Response.error(); // gambar belum tersimpan & offline -> onerror di halaman
      }
    })());
    return;
  }

  // Berkas situs sendiri: tampilkan dari cache, perbarui di belakang layar.
  const key = keyFor(req);
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(key);
    const net = fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') c.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === 'navigate') {
      const fb = await c.match('index.html') || await c.match('mushaf.html');
      if (fb) return fb;
    }
    return Response.error();
  })());
});
